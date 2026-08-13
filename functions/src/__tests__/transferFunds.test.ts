import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { randomUUID } from "node:crypto";
import "./setup";

initializeApp({ projectId: "demo-paycore" });
const db = getFirestore();

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { transferFunds } = require("../transferFunds");

async function seedWallet(uid: string, balance: number, status: "active" | "frozen" = "active") {
  await db.collection("wallets").doc(uid).set({ uid, balance, currency: "USD", status, version: 0, updatedAt: Timestamp.now() });
}
async function seedUser(uid: string, status: "active" | "frozen" = "active") {
  await db.collection("users").doc(uid).set({ uid, displayName: uid, role: "user", status });
}

/**
 * transferFunds now requires a stepUpToken (see functions/src/pin.ts,
 * which is what actually creates these in production). Tests seed the
 * token doc directly rather than going through a real bcrypt PIN check,
 * since that's a separate concern already covered by pin.test.ts.
 */
async function seedStepUpToken(
  uid: string,
  opts: { purpose?: string; expiresInMs?: number; usedAt?: Timestamp | null } = {}
): Promise<string> {
  const token = `test-token-${uid}-${Math.random().toString(36).slice(2)}`;
  const now = Date.now();
  await db.collection("stepUpTokens").doc(token).set({
    uid,
    purpose: opts.purpose ?? "transfer",
    createdAt: Timestamp.fromMillis(now),
    expiresAt: Timestamp.fromMillis(now + (opts.expiresInMs ?? 5 * 60 * 1000)),
    usedAt: opts.usedAt ?? null,
  });
  return token;
}

function callableRequest(data: Record<string, unknown>, uid: string) {
  // Matches the shape firebase-functions v2's `.run()` test helper expects:
  // a CallableRequest with `data` and `auth`.
  return { data, auth: { uid, token: {} } } as never;
}

beforeEach(async () => {
  const collections = ["wallets", "users", "transactions", "ledgerEntries", "notifications", "auditLogs", "stepUpTokens"];
  for (const col of collections) {
    const snap = await db.collection(col).get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
  }
  await seedUser("alice");
  await seedUser("bob");
  await seedWallet("alice", 10000); // $100.00
  await seedWallet("bob", 0);
});

describe("transferFunds", () => {
  it("moves balance atomically and writes a completed transaction", async () => {
    const stepUpToken = await seedStepUpToken("alice");
    const requestId = randomUUID();
    const result = await transferFunds.run(
      callableRequest({ requestId, toUid: "bob", amount: 2500, stepUpToken }, "alice")
    );

    expect(result.status).toBe("completed");
    expect(result.newBalance).toBe(7500);

    const aliceWallet = (await db.collection("wallets").doc("alice").get()).data()!;
    const bobWallet = (await db.collection("wallets").doc("bob").get()).data()!;
    expect(aliceWallet.balance).toBe(7500);
    expect(bobWallet.balance).toBe(2500);

    const tx = (await db.collection("transactions").doc(requestId).get()).data()!;
    expect(tx.status).toBe("completed");
    expect(tx.amount).toBe(2500);

    // The token must be marked used, not deletable/reusable.
    const usedToken = (await db.collection("stepUpTokens").doc(stepUpToken).get()).data()!;
    expect(usedToken.usedAt).not.toBeNull();
  });

  it("is idempotent - replaying the same requestId does not double-spend", async () => {
    const stepUpToken = await seedStepUpToken("alice");
    const requestId = randomUUID();
    const request = callableRequest({ requestId, toUid: "bob", amount: 1000, stepUpToken }, "alice");

    await transferFunds.run(request);
    await transferFunds.run(request); // simulate a client retry with the same requestId

    const aliceWallet = (await db.collection("wallets").doc("alice").get()).data()!;
    // Balance should reflect exactly ONE transfer of 1000, not two.
    expect(aliceWallet.balance).toBe(9000);
  });

  it("rejects a transfer that exceeds the sender's balance", async () => {
    const stepUpToken = await seedStepUpToken("alice");
    await expect(
      transferFunds.run(callableRequest({ requestId: randomUUID(), toUid: "bob", amount: 999999, stepUpToken }, "alice"))
    ).rejects.toMatchObject({ message: expect.stringContaining("Insufficient balance") });

    const aliceWallet = (await db.collection("wallets").doc("alice").get()).data()!;
    expect(aliceWallet.balance).toBe(10000); // untouched
  });

  it("rejects a transfer from a frozen wallet", async () => {
    await db.collection("wallets").doc("alice").update({ status: "frozen" });
    const stepUpToken = await seedStepUpToken("alice");
    await expect(
      transferFunds.run(callableRequest({ requestId: randomUUID(), toUid: "bob", amount: 100, stepUpToken }, "alice"))
    ).rejects.toMatchObject({ message: expect.stringContaining("frozen") });
  });

  it("rejects sending money to yourself", async () => {
    const stepUpToken = await seedStepUpToken("alice");
    await expect(
      transferFunds.run(callableRequest({ requestId: randomUUID(), toUid: "alice", amount: 100, stepUpToken }, "alice"))
    ).rejects.toMatchObject({ message: expect.stringContaining("yourself") });
  });

  it("rejects an unauthenticated request", async () => {
    const request = { data: { requestId: randomUUID(), toUid: "bob", amount: 100, stepUpToken: "irrelevant" }, auth: undefined } as never;
    await expect(transferFunds.run(request)).rejects.toBeInstanceOf(HttpsError);
  });

  it("rejects a malformed (non-UUID) requestId", async () => {
    const stepUpToken = await seedStepUpToken("alice");
    await expect(
      transferFunds.run(callableRequest({ requestId: "not-a-uuid", toUid: "bob", amount: 100, stepUpToken }, "alice"))
    ).rejects.toMatchObject({ message: expect.stringContaining("Invalid requestId") });
  });

  // ---- step-up token specific coverage ----

  it("rejects a transfer with no step-up token at all", async () => {
    await expect(
      transferFunds.run(callableRequest({ requestId: randomUUID(), toUid: "bob", amount: 100 }, "alice"))
    ).rejects.toMatchObject({ message: expect.stringContaining("PIN verification required") });
  });

  it("rejects an expired step-up token", async () => {
    const stepUpToken = await seedStepUpToken("alice", { expiresInMs: -1000 }); // already expired
    await expect(
      transferFunds.run(callableRequest({ requestId: randomUUID(), toUid: "bob", amount: 100, stepUpToken }, "alice"))
    ).rejects.toMatchObject({ message: expect.stringContaining("expired") });
  });

  it("rejects a step-up token belonging to a different user", async () => {
    const bobsToken = await seedStepUpToken("bob");
    await expect(
      // alice tries to use bob's token
      transferFunds.run(callableRequest({ requestId: randomUUID(), toUid: "bob", amount: 100, stepUpToken: bobsToken }, "alice"))
    ).rejects.toMatchObject({ message: expect.stringContaining("Invalid verification token") });
  });

  it("rejects a step-up token that was created for a different purpose", async () => {
    const stepUpToken = await seedStepUpToken("alice", { purpose: "withdrawal" });
    await expect(
      transferFunds.run(callableRequest({ requestId: randomUUID(), toUid: "bob", amount: 100, stepUpToken }, "alice"))
    ).rejects.toMatchObject({ message: expect.stringContaining("Invalid verification token") });
  });

  it("rejects reusing an already-used step-up token", async () => {
    const stepUpToken = await seedStepUpToken("alice");
    await transferFunds.run(callableRequest({ requestId: randomUUID(), toUid: "bob", amount: 100, stepUpToken }, "alice"));

    // Same token, a second (different) transfer attempt.
    await expect(
      transferFunds.run(callableRequest({ requestId: randomUUID(), toUid: "bob", amount: 100, stepUpToken }, "alice"))
    ).rejects.toMatchObject({ message: expect.stringContaining("already used") });
  });
});
