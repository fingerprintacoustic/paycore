import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import "./setup";

initializeApp({ projectId: "demo-paycore" });
const db = getFirestore();

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { requestWithdrawal, reviewWithdrawal } = require("../deposits_withdrawals");

function callableRequest(data: Record<string, unknown>, uid: string) {
  return { data, auth: { uid, token: {} } } as never;
}
const PAYOUT = { bank: "Demo Bank", account: "1234" };

async function setSettings(patch: Record<string, unknown>) {
  await db.collection("settings").doc("global").set(patch, { merge: true });
}

beforeEach(async () => {
  for (const col of [
    "wallets", "users", "withdrawalRequests", "transactions", "ledgerEntries", "notifications", "auditLogs", "settings",
  ]) {
    const snap = await db.collection(col).get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
  }
  await db.collection("users").doc("alice").set({ uid: "alice", role: "user", status: "active" });
  await db.collection("users").doc("admin").set({ uid: "admin", role: "admin", status: "active" });
  await db
    .collection("wallets")
    .doc("alice")
    .set({ uid: "alice", balance: 10000, currency: "USD", status: "active", version: 0, updatedAt: Timestamp.now() });
});

describe("requestWithdrawal", () => {
  it("holds funds, creates a pending request and a mirrored transaction", async () => {
    const res = await requestWithdrawal.run(callableRequest({ amount: 4000, payoutDetails: PAYOUT }, "alice"));
    expect(res.status).toBe("pending");

    const wallet = (await db.collection("wallets").doc("alice").get()).data()!;
    expect(wallet.balance).toBe(6000);

    const req = (await db.collection("withdrawalRequests").doc(res.requestId).get()).data()!;
    expect(req.status).toBe("pending");
    expect(req.transactionId).toBeDefined();

    const txn = (await db.collection("transactions").doc(req.transactionId).get()).data()!;
    expect(txn.type).toBe("withdrawal");
    expect(txn.status).toBe("pending");
    expect(txn.amount).toBe(4000);
  });

  it("auto-approves when withdrawalRequiresApproval is off", async () => {
    await setSettings({ withdrawalRequiresApproval: false });
    const res = await requestWithdrawal.run(callableRequest({ amount: 4000, payoutDetails: PAYOUT }, "alice"));
    expect(res.status).toBe("approved");
    const req = (await db.collection("withdrawalRequests").doc(res.requestId).get()).data()!;
    const txn = (await db.collection("transactions").doc(req.transactionId).get()).data()!;
    expect(txn.status).toBe("completed");
  });

  it("rejects a withdrawal over the balance", async () => {
    await expect(
      requestWithdrawal.run(callableRequest({ amount: 999999, payoutDetails: PAYOUT }, "alice"))
    ).rejects.toMatchObject({ message: expect.stringContaining("Insufficient balance") });
  });

  it("enforces the admin maximum", async () => {
    await setSettings({ maxTransferAmount: 2000 });
    await expect(
      requestWithdrawal.run(callableRequest({ amount: 5000, payoutDetails: PAYOUT }, "alice"))
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("blocks withdrawals in maintenance mode", async () => {
    await setSettings({ maintenanceMode: true });
    await expect(
      requestWithdrawal.run(callableRequest({ amount: 1000, payoutDetails: PAYOUT }, "alice"))
    ).rejects.toMatchObject({ code: "unavailable" });
  });

  it("rejects empty or oversized payout details", async () => {
    await expect(
      requestWithdrawal.run(callableRequest({ amount: 1000, payoutDetails: {} }, "alice"))
    ).rejects.toMatchObject({ code: "invalid-argument" });
    await expect(
      requestWithdrawal.run(callableRequest({ amount: 1000, payoutDetails: { x: "a".repeat(500) } }, "alice"))
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });
});

describe("reviewWithdrawal", () => {
  async function pending(amount = 4000) {
    const { requestId } = await requestWithdrawal.run(
      callableRequest({ amount, payoutDetails: PAYOUT }, "alice")
    );
    return requestId;
  }

  it("approving completes the request and the transaction, funds stay held", async () => {
    const requestId = await pending();
    await reviewWithdrawal.run(callableRequest({ requestId, decision: "approved" }, "admin"));

    const req = (await db.collection("withdrawalRequests").doc(requestId).get()).data()!;
    expect(req.status).toBe("approved");
    const txn = (await db.collection("transactions").doc(req.transactionId).get()).data()!;
    expect(txn.status).toBe("completed");
    const wallet = (await db.collection("wallets").doc("alice").get()).data()!;
    expect(wallet.balance).toBe(6000);
  });

  it("rejecting restores the funds, reverses the transaction, writes a reversal ledger entry", async () => {
    const requestId = await pending();
    await reviewWithdrawal.run(callableRequest({ requestId, decision: "rejected" }, "admin"));

    const req = (await db.collection("withdrawalRequests").doc(requestId).get()).data()!;
    expect(req.status).toBe("rejected");
    const txn = (await db.collection("transactions").doc(req.transactionId).get()).data()!;
    expect(txn.status).toBe("reversed");
    const wallet = (await db.collection("wallets").doc("alice").get()).data()!;
    expect(wallet.balance).toBe(10000);

    const credits = (await db.collection("ledgerEntries").where("direction", "==", "credit").get()).docs;
    expect(credits.some((d) => d.data().amount === 4000)).toBe(true);
  });

  it("cannot review twice", async () => {
    const requestId = await pending(1000);
    await reviewWithdrawal.run(callableRequest({ requestId, decision: "approved" }, "admin"));
    await expect(
      reviewWithdrawal.run(callableRequest({ requestId, decision: "rejected" }, "admin"))
    ).rejects.toMatchObject({ message: expect.stringContaining("Already reviewed") });
  });

  it("rejects a non-admin reviewer", async () => {
    const requestId = await pending(1000);
    await expect(
      reviewWithdrawal.run(callableRequest({ requestId, decision: "approved" }, "alice"))
    ).rejects.toMatchObject({ message: expect.stringContaining("Admin access required") });
  });
});
