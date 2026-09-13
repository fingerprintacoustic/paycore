import * as functions from "firebase-functions/v2/https";
import { HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getSettings, assertNotInMaintenance, outboundLast24h } from "./lib/limits";

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
}>({ enforceAppCheck: true }, async (request) => {
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

const ABS_MAX_DEPOSIT = 500_000_00;
const MIN_REFERENCE_LEN = 3;
const MAX_REFERENCE_LEN = 280;

function validateReference(reference: unknown): string {
  if (typeof reference !== "string") {
    throw new HttpsError("invalid-argument", "Tell us how you sent the money.");
  }
  const trimmed = reference.trim();
  if (trimmed.length < MIN_REFERENCE_LEN || trimmed.length > MAX_REFERENCE_LEN) {
    throw new HttpsError("invalid-argument", "Describe how you sent the money (3-280 characters).");
  }
  return trimmed;
}

/**
 * A user claims they've sent money outside the app (bank transfer, cash,
 * etc.) and wants it credited. This moves no money — it's purely a
 * notification mechanism so an admin knows to go verify the out-of-band
 * payment and, if it checks out, credit it via reviewDeposit. Nothing is
 * held against the wallet, unlike requestWithdrawal, because nothing has
 * been credited yet.
 */
export const requestDeposit = functions.onCall<{
  amount: number;
  reference: string;
}>({ enforceAppCheck: true }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

  const { amount } = request.data;
  if (!Number.isInteger(amount) || amount <= 0 || amount > ABS_MAX_DEPOSIT) {
    throw new HttpsError("invalid-argument", "Invalid amount.");
  }
  const reference = validateReference(request.data.reference);

  const settings = await getSettings();
  assertNotInMaintenance(settings);

  const walletSnap = await db.collection("wallets").doc(uid).get();
  if (!walletSnap.exists) throw new HttpsError("not-found", "Wallet not found.");
  if (walletSnap.data()!.status !== "active") {
    throw new HttpsError("failed-precondition", "Your wallet is frozen.");
  }

  const [userSnap, adminsSnap] = await Promise.all([
    db.collection("users").doc(uid).get(),
    db.collection("users").where("role", "==", "admin").limit(50).get(),
  ]);
  const requesterName: string = userSnap.data()?.displayName || userSnap.data()?.email || uid;

  const requestRef = db.collection("depositRequests").doc();
  const now = Timestamp.now();
  const batch = db.batch();

  batch.set(requestRef, {
    id: requestRef.id,
    uid,
    amount,
    reference,
    status: "pending",
    requestedAt: now,
    reviewedBy: null,
    reviewedAt: null,
    transactionId: null,
  });

  // Notify every admin so someone actually goes and checks the out-of-band
  // payment — this is the whole point of the feature.
  for (const adminDoc of adminsSnap.docs) {
    const notifRef = db.collection("notifications").doc();
    batch.set(notifRef, {
      uid: adminDoc.id,
      type: "deposit_requested",
      title: "Deposit request",
      body: `${requesterName} says they sent $${(amount / 100).toFixed(2)} — "${reference}"`,
      read: false,
      createdAt: now,
      data: { depositRequestId: requestRef.id },
    });
  }

  const auditRef = db.collection("auditLogs").doc();
  batch.set(auditRef, {
    id: auditRef.id,
    actorUid: uid,
    actorRole: "user",
    action: "deposit.requested",
    targetType: "wallet",
    targetId: uid,
    before: null,
    after: { amount, reference, depositRequestId: requestRef.id },
    ip: null,
    createdAt: now,
  });

  await batch.commit();
  return { requestId: requestRef.id, status: "pending" };
});

/** Admin verifies the out-of-band payment and approves or rejects the claim. */
export const reviewDeposit = functions.onCall<{
  requestId: string;
  decision: "approved" | "rejected";
}>({ enforceAppCheck: true }, async (request) => {
  const adminUid = await requireAdmin(request.auth?.uid);
  const { requestId, decision } = request.data;
  if (decision !== "approved" && decision !== "rejected") {
    throw new HttpsError("invalid-argument", "Invalid decision.");
  }

  const requestRef = db.collection("depositRequests").doc(requestId);

  await db.runTransaction(async (tx) => {
    const reqSnap = await tx.get(requestRef);
    if (!reqSnap.exists) throw new HttpsError("not-found", "Deposit request not found.");
    const req = reqSnap.data()!;
    if (req.status !== "pending") throw new HttpsError("failed-precondition", "Already reviewed.");

    // Reads before writes: only fetch the wallet if we're about to credit it.
    const walletRef = db.collection("wallets").doc(req.uid);
    const walletSnap = decision === "approved" ? await tx.get(walletRef) : null;
    if (decision === "approved" && !walletSnap!.exists) {
      throw new HttpsError("not-found", "Wallet not found.");
    }

    const now = Timestamp.now();
    let txRef: FirebaseFirestore.DocumentReference | null = null;

    if (decision === "approved") {
      const wallet = walletSnap!.data()!;
      const newBalance = wallet.balance + req.amount;
      txRef = db.collection("transactions").doc();

      tx.update(walletRef, { balance: newBalance, version: FieldValue.increment(1), updatedAt: now });

      tx.set(txRef, {
        id: txRef.id,
        type: "deposit",
        status: "completed",
        fromUid: null,
        toUid: req.uid,
        amount: req.amount,
        currency: wallet.currency,
        note: req.reference ?? null,
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
        uid: req.uid,
        direction: "credit",
        amount: req.amount,
        balanceAfter: newBalance,
        createdAt: now,
      });
    }

    tx.update(requestRef, {
      status: decision,
      reviewedBy: adminUid,
      reviewedAt: now,
      transactionId: txRef ? txRef.id : null,
    });

    const notifRef = db.collection("notifications").doc();
    tx.set(notifRef, {
      uid: req.uid,
      type: decision === "approved" ? "deposit" : "deposit_rejected",
      title: decision === "approved" ? "Deposit credited" : "Deposit not verified",
      body:
        decision === "approved"
          ? `$${(req.amount / 100).toFixed(2)} was added to your wallet.`
          : `We couldn't verify your deposit of $${(req.amount / 100).toFixed(2)}. Contact support if you think this is a mistake.`,
      read: false,
      createdAt: now,
      data: { depositRequestId: requestId },
    });

    const auditRef = db.collection("auditLogs").doc();
    tx.set(auditRef, {
      id: auditRef.id,
      actorUid: adminUid,
      actorRole: "admin",
      action: `deposit.${decision}`,
      targetType: "wallet",
      targetId: req.uid,
      before: null,
      after: { status: decision },
      ip: null,
      createdAt: now,
    });
  });

  return { status: "ok" };
});

const MAX_PAYOUT_DETAIL_KEYS = 12;
const MAX_PAYOUT_DETAIL_LEN = 200;

function validatePayoutDetails(details: unknown): Record<string, string> {
  if (typeof details !== "object" || details === null || Array.isArray(details)) {
    throw new HttpsError("invalid-argument", "Invalid payout details.");
  }
  const entries = Object.entries(details as Record<string, unknown>);
  if (entries.length === 0 || entries.length > MAX_PAYOUT_DETAIL_KEYS) {
    throw new HttpsError("invalid-argument", "Invalid payout details.");
  }
  const clean: Record<string, string> = {};
  for (const [k, v] of entries) {
    if (typeof v !== "string" || v.length > MAX_PAYOUT_DETAIL_LEN || k.length > 64) {
      throw new HttpsError("invalid-argument", "Invalid payout details.");
    }
    clean[k] = v;
  }
  return clean;
}

/**
 * User requests a withdrawal. Funds are held (debited immediately) so they
 * can't be double-spent. If settings.withdrawalRequiresApproval is true the
 * request waits for an admin; otherwise it's marked approved on the spot.
 * Either way the actual payout is out of band — this only tracks intent.
 */
export const requestWithdrawal = functions.onCall<{
  amount: number;
  payoutDetails: Record<string, string>;
}>({ enforceAppCheck: true }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

  const { amount } = request.data;
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new HttpsError("invalid-argument", "Invalid amount.");
  }
  const payoutDetails = validatePayoutDetails(request.data.payoutDetails);

  const settings = await getSettings();
  assertNotInMaintenance(settings);
  if (amount < settings.minTransferAmount) {
    throw new HttpsError("invalid-argument", `Minimum withdrawal is ${(settings.minTransferAmount / 100).toFixed(2)}.`);
  }
  if (amount > settings.maxTransferAmount) {
    throw new HttpsError("invalid-argument", `Maximum withdrawal is ${(settings.maxTransferAmount / 100).toFixed(2)}.`);
  }
  if ((await outboundLast24h(uid)) + amount > settings.dailyTransferLimit) {
    throw new HttpsError("resource-exhausted", "This would exceed your daily limit. Try again later or with a smaller amount.");
  }

  const autoApprove = !settings.withdrawalRequiresApproval;
  const walletRef = db.collection("wallets").doc(uid);
  const requestRef = db.collection("withdrawalRequests").doc();
  const txRef = db.collection("transactions").doc();

  await db.runTransaction(async (tx) => {
    const walletSnap = await tx.get(walletRef);
    if (!walletSnap.exists) throw new HttpsError("not-found", "Wallet not found.");
    const wallet = walletSnap.data()!;

    if (wallet.status !== "active") throw new HttpsError("failed-precondition", "Wallet is frozen.");
    if (wallet.balance < amount) throw new HttpsError("failed-precondition", "Insufficient balance.");

    const now = Timestamp.now();
    const newBalance = wallet.balance - amount;

    tx.update(walletRef, { balance: newBalance, version: FieldValue.increment(1), updatedAt: now });

    tx.set(requestRef, {
      id: requestRef.id,
      uid,
      amount,
      status: autoApprove ? "approved" : "pending",
      transactionId: txRef.id,
      requestedAt: now,
      reviewedBy: autoApprove ? "system" : null,
      reviewedAt: autoApprove ? now : null,
      payoutDetails,
    });

    // Mirror it into transactions so it shows in the user's history.
    tx.set(txRef, {
      id: txRef.id,
      type: "withdrawal",
      status: autoApprove ? "completed" : "pending",
      fromUid: uid,
      toUid: null,
      amount,
      currency: wallet.currency,
      note: null,
      referenceNumber: `PC-WD-${txRef.id.slice(0, 8).toUpperCase()}`,
      createdAt: now,
      completedAt: autoApprove ? now : null,
      failureReason: null,
      initiatedBy: uid,
    });

    const ledgerRef = db.collection("ledgerEntries").doc();
    tx.set(ledgerRef, {
      id: ledgerRef.id,
      transactionId: txRef.id,
      uid,
      direction: "debit",
      amount,
      balanceAfter: newBalance,
      createdAt: now,
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
      after: { balance: newBalance, withdrawalRequest: requestRef.id, autoApproved: autoApprove },
      ip: null,
      createdAt: now,
    });
  });

  return { requestId: requestRef.id, status: autoApprove ? "approved" : "pending" };
});

export const reviewWithdrawal = functions.onCall<{
  requestId: string;
  decision: "approved" | "rejected";
}>({ enforceAppCheck: true }, async (request) => {
  const adminUid = await requireAdmin(request.auth?.uid);
  const { requestId, decision } = request.data;

  const requestRef = db.collection("withdrawalRequests").doc(requestId);

  await db.runTransaction(async (tx) => {
    const reqSnap = await tx.get(requestRef);
    if (!reqSnap.exists) throw new HttpsError("not-found", "Withdrawal request not found.");
    const req = reqSnap.data()!;
    if (req.status !== "pending") throw new HttpsError("failed-precondition", "Already reviewed.");

    // All reads must come before any write in a Firestore transaction —
    // read the wallet up front, whether or not we end up refunding.
    const walletRef = db.collection("wallets").doc(req.uid);
    const walletSnap = decision === "rejected" ? await tx.get(walletRef) : null;
    if (decision === "rejected" && !walletSnap!.exists) {
      throw new HttpsError("not-found", "Wallet not found.");
    }

    const now = Timestamp.now();
    tx.update(requestRef, { status: decision, reviewedBy: adminUid, reviewedAt: now });

    // Keep the mirrored transaction record in sync.
    if (req.transactionId) {
      const txDocRef = db.collection("transactions").doc(req.transactionId);
      tx.update(txDocRef, {
        status: decision === "approved" ? "completed" : "reversed",
        completedAt: decision === "approved" ? now : null,
        failureReason: decision === "rejected" ? "rejected_by_admin" : null,
      });
    }

    if (decision === "rejected") {
      // Return the held funds to the wallet.
      const wallet = walletSnap!.data()!;
      const restoredBalance = wallet.balance + req.amount;
      tx.update(walletRef, { balance: restoredBalance, version: FieldValue.increment(1), updatedAt: now });

      const reversalRef = db.collection("ledgerEntries").doc();
      tx.set(reversalRef, {
        id: reversalRef.id,
        transactionId: req.transactionId ?? requestId,
        uid: req.uid,
        direction: "credit",
        amount: req.amount,
        balanceAfter: restoredBalance,
        createdAt: now,
      });
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
