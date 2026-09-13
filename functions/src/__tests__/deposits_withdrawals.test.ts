import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import "./setup";

initializeApp({ projectId: "demo-paycore" });
const db = getFirestore();

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { requestWithdrawal, reviewWithdrawal, requestDeposit, reviewDeposit } = require("../deposits_withdrawals");

function callableRequest(data: Record<string, unknown>, uid: string) {
  return { data, auth: { uid, token: {} } } as never;
}
const PAYOUT = { bank: "Demo Bank", account: "1234" };

async function setSettings(patch: Record<string, unknown>) {
  await db.collection("settings").doc("global").set(patch, { merge: true });
}

beforeEach(async () => {
  for (const col of [
    "wallets", "users", "withdrawalRequests", "depositRequests", "transactions", "ledgerEntries", "notifications", "auditLogs", "settings",
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

describe("requestDeposit", () => {
  it("creates a pending claim and notifies every admin — moves no money", async () => {
    const res = await requestDeposit.run(
      callableRequest({ amount: 5000, reference: "Bank transfer, ref #4821" }, "alice")
    );
    expect(res.status).toBe("pending");

    const req = (await db.collection("depositRequests").doc(res.requestId).get()).data()!;
    expect(req.status).toBe("pending");
    expect(req.amount).toBe(5000);
    expect(req.reference).toBe("Bank transfer, ref #4821");

    const wallet = (await db.collection("wallets").doc("alice").get()).data()!;
    expect(wallet.balance).toBe(10000); // untouched — nothing credited yet

    const adminNotifs = (
      await db.collection("notifications").where("uid", "==", "admin").get()
    ).docs;
    expect(adminNotifs.some((d) => d.data().type === "deposit_requested")).toBe(true);
  });

  it("rejects an invalid amount", async () => {
    await expect(
      requestDeposit.run(callableRequest({ amount: 0, reference: "test" }, "alice"))
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("rejects a missing or too-short reference", async () => {
    await expect(
      requestDeposit.run(callableRequest({ amount: 1000, reference: "hi" }, "alice"))
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("blocks requests in maintenance mode", async () => {
    await setSettings({ maintenanceMode: true });
    await expect(
      requestDeposit.run(callableRequest({ amount: 1000, reference: "Bank transfer" }, "alice"))
    ).rejects.toMatchObject({ code: "unavailable" });
  });

  it("blocks a frozen wallet", async () => {
    await db.collection("wallets").doc("alice").update({ status: "frozen" });
    await expect(
      requestDeposit.run(callableRequest({ amount: 1000, reference: "Bank transfer" }, "alice"))
    ).rejects.toMatchObject({ code: "failed-precondition" });
  });
});

describe("reviewDeposit", () => {
  async function pendingDeposit(amount = 5000) {
    const { requestId } = await requestDeposit.run(
      callableRequest({ amount, reference: "Bank transfer, ref #4821" }, "alice")
    );
    return requestId;
  }

  it("approving credits the wallet and mirrors a completed transaction", async () => {
    const requestId = await pendingDeposit();
    await reviewDeposit.run(callableRequest({ requestId, decision: "approved" }, "admin"));

    const req = (await db.collection("depositRequests").doc(requestId).get()).data()!;
    expect(req.status).toBe("approved");
    expect(req.transactionId).toBeDefined();

    const wallet = (await db.collection("wallets").doc("alice").get()).data()!;
    expect(wallet.balance).toBe(15000);

    const txn = (await db.collection("transactions").doc(req.transactionId).get()).data()!;
    expect(txn.type).toBe("deposit");
    expect(txn.status).toBe("completed");
    expect(txn.amount).toBe(5000);
  });

  it("rejecting leaves the wallet untouched and creates no transaction", async () => {
    const requestId = await pendingDeposit();
    await reviewDeposit.run(callableRequest({ requestId, decision: "rejected" }, "admin"));

    const req = (await db.collection("depositRequests").doc(requestId).get()).data()!;
    expect(req.status).toBe("rejected");
    expect(req.transactionId).toBeNull();

    const wallet = (await db.collection("wallets").doc("alice").get()).data()!;
    expect(wallet.balance).toBe(10000); // nothing was ever credited

    const txns = (await db.collection("transactions").get()).docs;
    expect(txns.length).toBe(0);
  });

  it("cannot review the same request twice", async () => {
    const requestId = await pendingDeposit(1000);
    await reviewDeposit.run(callableRequest({ requestId, decision: "approved" }, "admin"));
    await expect(
      reviewDeposit.run(callableRequest({ requestId, decision: "rejected" }, "admin"))
    ).rejects.toMatchObject({ message: expect.stringContaining("Already reviewed") });
  });

  it("rejects a non-admin reviewer", async () => {
    const requestId = await pendingDeposit(1000);
    await expect(
      reviewDeposit.run(callableRequest({ requestId, decision: "approved" }, "alice"))
    ).rejects.toMatchObject({ message: expect.stringContaining("Admin access required") });
  });
});
