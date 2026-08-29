import * as functions from "firebase-functions/v2/https";
import { HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";

const db = getFirestore();

async function requireAdmin(uid: string | undefined): Promise<string> {
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");
  const snap = await db.collection("users").doc(uid).get();
  if (snap.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
  return uid;
}

/** MVP deposit path: an admin manually credits a wallet (e.g. after confirming an out-of-band bank transfer). */
export const adminCreditWallet = functions.onCall<{
  targetUid: string;
  amount: number;
  note?: string;
}>({ enforceAppCheck: true,
  const adminUid = await requireAdmin(request.auth?.uid);
  const { targetUid, amount, note } = request.data;

  if (!Number.isInteger(amount) || amount <= 0) {
    throw new HttpsError("invalid-argument", "Invalid amount.");
  }

  const walletRef = db.collection("wallets").doc(targetUid);
  const txRef = db.collection("transactions").doc();

  await db.runTransaction(async (tx) => {
    const walletSnap = await tx.get(walletRef);
    if (!walletSnap.exists) throw new HttpsError("not-found", "Wallet not found.");

    const wallet = walletSnap.data()!;
    const newBalance = wallet.balance + amount;
    const now = Timestamp.now();

    tx.update(walletRef, { balance: newBalance, version: FieldValue.increment(1), updatedAt: now });

    tx.set(txRef, {
      id: txRef.id,
      type: "deposit",
      status: "completed",
      fromUid: null,
      toUid: targetUid,
      amount,
      currency: wallet.currency,
      note: note ?? null,
      referenceNumber: `PC-DEP-${txRef.id.slice(0, 8).toUpperCase()}`,
      createdAt: now,
      completedAt: now,
      failureReason: null,
      initiatedBy: adminUid,
    });

    const ledgerRef = db.collection("ledgerEntries").doc();
    tx.set(ledgerRef, {
      id: ledgerRef.id,
      transactionId: txRef.id,
      uid: targetUid,
      direction: "credit",
      amount,
      balanceAfter: newBalance,
      createdAt: now,
    });

    const notifRef = db.collection("notifications").doc();
    tx.set(notifRef, {
      uid: targetUid,
      type: "deposit",
      title: "Funds added",
      body: `${(amount / 100).toFixed(2)} ${wallet.currency} was added to your wallet.`,
      read: false,
      createdAt: now,
      data: { transactionId: txRef.id },
    });

    const auditRef = db.collection("auditLogs").doc();
    tx.set(auditRef, {
      id: auditRef.id,
      actorUid: adminUid,
      actorRole: "admin",
      action: "wallet.credit",
      targetType: "wallet",
      targetId: targetUid,
      before: { balance: wallet.balance },
      after: { balance: newBalance },
      ip: null,
      createdAt: now,
    });
  });

  return { status: "ok" };
});

/** User requests a withdrawal — funds are held (debited immediately into a pending state) until admin approval. */
export const requestWithdrawal = functions.onCall<{
  amount: number;
  payoutDetails: Record<string, string>;
}>({ enforceAppCheck: true,
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

  const { amount, payoutDetails } = request.data;
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new HttpsError("invalid-argument", "Invalid amount.");
  }

  const walletRef = db.collection("wallets").doc(uid);
  const requestRef = db.collection("withdrawalRequests").doc();

  await db.runTransaction(async (tx) => {
    const walletSnap = await tx.get(walletRef);
    if (!walletSnap.exists) throw new HttpsError("not-found", "Wallet not found.");
    const wallet = walletSnap.data()!;

    if (wallet.status !== "active") throw new HttpsError("failed-precondition", "Wallet is frozen.");
    if (wallet.balance < amount) throw new HttpsError("failed-precondition", "Insufficient balance.");

    const now = Timestamp.now();
    const newBalance = wallet.balance - amount;

    // Hold the funds immediately so the user can't spend money that's
    // already earmarked for withdrawal, but keep status "pending" until an
    // admin approves the actual payout.
    tx.update(walletRef, { balance: newBalance, version: FieldValue.increment(1), updatedAt: now });

    tx.set(requestRef, {
      id: requestRef.id,
      uid,
      amount,
      status: "pending",
      requestedAt: now,
      reviewedBy: null,
      reviewedAt: null,
      payoutDetails,
    });

    const auditRef = db.collection("auditLogs").doc();
    tx.set(auditRef, {
      id: auditRef.id,
      actorUid: uid,
      actorRole: "user",
      action: "withdrawal.requested",
      targetType: "wallet",
      targetId: uid,
      before: { balance: wallet.balance },
      after: { balance: newBalance, pendingWithdrawal: requestRef.id },
      ip: null,
      createdAt: now,
    });
  });

  return { requestId: requestRef.id, status: "pending" };
});

export const reviewWithdrawal = functions.onCall<{
  requestId: string;
  decision: "approved" | "rejected";
}>({ enforceAppCheck: true,
  const adminUid = await requireAdmin(request.auth?.uid);
  const { requestId, decision } = request.data;

  const requestRef = db.collection("withdrawalRequests").doc(requestId);

  await db.runTransaction(async (tx) => {
    const reqSnap = await tx.get(requestRef);
    if (!reqSnap.exists) throw new HttpsError("not-found", "Withdrawal request not found.");
    const req = reqSnap.data()!;
    if (req.status !== "pending") throw new HttpsError("failed-precondition", "Already reviewed.");

    const now = Timestamp.now();
    tx.update(requestRef, { status: decision, reviewedBy: adminUid, reviewedAt: now });

    if (decision === "rejected") {
      // Return the held funds to the wallet.
      const walletRef = db.collection("wallets").doc(req.uid);
      const walletSnap = await tx.get(walletRef);
      const wallet = walletSnap.data()!;
      const restoredBalance = wallet.balance + req.amount;
      tx.update(walletRef, { balance: restoredBalance, version: FieldValue.increment(1), updatedAt: now });
    }

    const notifRef = db.collection("notifications").doc();
    tx.set(notifRef, {
      uid: req.uid,
      type: "withdrawal_approved",
      title: decision === "approved" ? "Withdrawal approved" : "Withdrawal rejected",
      body:
        decision === "approved"
          ? `Your withdrawal of ${(req.amount / 100).toFixed(2)} has been approved.`
          : `Your withdrawal request was rejected and the funds were returned to your wallet.`,
      read: false,
      createdAt: now,
      data: { requestId },
    });

    const auditRef = db.collection("auditLogs").doc();
    tx.set(auditRef, {
      id: auditRef.id,
      actorUid: adminUid,
      actorRole: "admin",
      action: `withdrawal.${decision}`,
      targetType: "wallet",
      targetId: req.uid,
      before: { status: "pending" },
      after: { status: decision },
      ip: null,
      createdAt: now,
    });
  });

  return { status: "ok" };
});
