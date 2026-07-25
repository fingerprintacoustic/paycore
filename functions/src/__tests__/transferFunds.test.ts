import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import "./setup";

initializeApp({ projectId: "demo-paycore" });
const db = getFirestore();

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { transferFunds } = require("../transferFunds");

async function seedWallet(uid: string, balance: number, status: "active" | "frozen" = "active") {
  await db.collection("wallets").doc(uid).set({ uid, balance, currency: "USD", status, version: 0, updatedAt: Timestamp.now() });
}
async function seedUser(uid: string) {
  await db.collection("users").doc(uid).set({ uid, displayName: uid, role: "user", status: "active" });
}

function callableRequest(data: Record<string, unknown>, uid: string) {
  // Matches the shape firebase-functions v2's `.run()` test helper expects:
  // a CallableRequest with `data` and `auth`.
  return { data, auth: { uid, token: {} } } as never;
}

beforeEach(async () => {
  const collections = ["wallets", "users", "transactions", "ledgerEntries", "notifications", "auditLogs"];
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
    const result = await transferFunds.run(
      callableRequest({ requestId: "req-1", toUid: "bob", amount: 2500 }, "alice")
    );

    expect(result.status).toBe("completed");
    expect(result.newBalance).toBe(7500);

    const aliceWallet = (await db.collection("wallets").doc("alice").get()).data()!;
    const bobWallet = (await db.collection("wallets").doc("bob").get()).data()!;
    expect(aliceWallet.balance).toBe(7500);
    expect(bobWallet.balance).toBe(2500);

    const tx = (await db.collection("transactions").doc("req-1").get()).data()!;
    expect(tx.status).toBe("completed");
    expect(tx.amount).toBe(2500);
  });

  it("is idempotent - replaying the same requestId does not double-spend", async () => {
    const request = callableRequest({ requestId: "req-2", toUid: "bob", amount: 1000 }, "alice");

    await transferFunds.run(request);
    await transferFunds.run(request); // simulate a client retry

    const aliceWallet = (await db.collection("wallets").doc("alice").get()).data()!;
    // Balance should reflect exactly ONE transfer of 1000, not two.
    expect(aliceWallet.balance).toBe(9000);
  });

  it("rejects a transfer that exceeds the sender's balance", async () => {
    await expect(
      transferFunds.run(callableRequest({ requestId: "req-3", toUid: "bob", amount: 999999 }, "alice"))
    ).rejects.toBeInstanceOf(HttpsError);

    const aliceWallet = (await db.collection("wallets").doc("alice").get()).data()!;
    expect(aliceWallet.balance).toBe(10000); // untouched
  });

  it("rejects a transfer from a frozen wallet", async () => {
    await db.collection("wallets").doc("alice").update({ status: "frozen" });
    await expect(
      transferFunds.run(callableRequest({ requestId: "req-4", toUid: "bob", amount: 100 }, "alice"))
    ).rejects.toBeInstanceOf(HttpsError);
  });

  it("rejects sending money to yourself", async () => {
    await expect(
      transferFunds.run(callableRequest({ requestId: "req-5", toUid: "alice", amount: 100 }, "alice"))
    ).rejects.toBeInstanceOf(HttpsError);
  });

  it("rejects an unauthenticated request", async () => {
    const request = { data: { requestId: "req-6", toUid: "bob", amount: 100 }, auth: undefined } as never;
    await expect(transferFunds.run(request)).rejects.toBeInstanceOf(HttpsError);
  });
});
