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

beforeEach(async () => {
  for (const col of ["wallets", "users", "withdrawalRequests", "notifications", "auditLogs"]) {
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
  it("holds the funds immediately and creates a pending request", async () => {
    const res = await requestWithdrawal.run(
      callableRequest({ amount: 4000, payoutDetails: { bank: "Demo" } }, "alice")
    );
    expect(res.status).toBe("pending");

    const wallet = (await db.collection("wallets").doc("alice").get()).data()!;
    expect(wallet.balance).toBe(6000);

    const req = (await db.collection("withdrawalRequests").doc(res.requestId).get()).data()!;
    expect(req.status).toBe("pending");
    expect(req.amount).toBe(4000);
  });

  it("rejects a withdrawal that exceeds the balance", async () => {
    await expect(
      requestWithdrawal.run(callableRequest({ amount: 999999, payoutDetails: {} }, "alice"))
    ).rejects.toMatchObject({ message: expect.stringContaining("Insufficient balance") });
    const wallet = (await db.collection("wallets").doc("alice").get()).data()!;
    expect(wallet.balance).toBe(10000);
  });
});

describe("reviewWithdrawal", () => {
  it("approving marks the request approved and keeps the funds held", async () => {
    const { requestId } = await requestWithdrawal.run(
      callableRequest({ amount: 4000, payoutDetails: {} }, "alice")
    );
    await reviewWithdrawal.run(callableRequest({ requestId, decision: "approved" }, "admin"));

    const req = (await db.collection("withdrawalRequests").doc(requestId).get()).data()!;
    expect(req.status).toBe("approved");
    const wallet = (await db.collection("wallets").doc("alice").get()).data()!;
    expect(wallet.balance).toBe(6000); // still held — payout happens out of band
  });

  it("rejecting returns the held funds to the wallet", async () => {
    const { requestId } = await requestWithdrawal.run(
      callableRequest({ amount: 4000, payoutDetails: {} }, "alice")
    );
    await reviewWithdrawal.run(callableRequest({ requestId, decision: "rejected" }, "admin"));

    const req = (await db.collection("withdrawalRequests").doc(requestId).get()).data()!;
    expect(req.status).toBe("rejected");
    const wallet = (await db.collection("wallets").doc("alice").get()).data()!;
    expect(wallet.balance).toBe(10000); // fully restored
  });

  it("cannot review the same request twice", async () => {
    const { requestId } = await requestWithdrawal.run(
      callableRequest({ amount: 1000, payoutDetails: {} }, "alice")
    );
    await reviewWithdrawal.run(callableRequest({ requestId, decision: "approved" }, "admin"));
    await expect(
      reviewWithdrawal.run(callableRequest({ requestId, decision: "rejected" }, "admin"))
    ).rejects.toMatchObject({ message: expect.stringContaining("Already reviewed") });
  });

  it("rejects a non-admin reviewer", async () => {
    const { requestId } = await requestWithdrawal.run(
      callableRequest({ amount: 1000, payoutDetails: {} }, "alice")
    );
    await expect(
      reviewWithdrawal.run(callableRequest({ requestId, decision: "approved" }, "alice"))
    ).rejects.toMatchObject({ message: expect.stringContaining("Admin access required") });
  });
});
