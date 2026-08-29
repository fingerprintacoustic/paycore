import * as functions from "firebase-functions/v2/https";
import { HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { requireAdmin, writeAuditLog } from "./lib/adminGuard";

const db = getFirestore();

export const adminDebitWallet = functions.onCall<{
  targetUid: string;
  amount: number;
  note?: string;
}>({ enforceAppCheck: false }, async (request) => {
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

    if (wallet.balance < amount) {
      throw new HttpsError("failed-precondition", "Debit exceeds current balance.");
    }

    const newBalance = wallet.balance - amount;
    const now = Timestamp.now();

    tx.update(walletRef, { balance: newBalance, version: FieldValue.increment(1), updatedAt: now });

    tx.set(txRef, {
      id: txRef.id,
      type: "withdrawal",
      status: "completed",
      fromUid: targetUid,
      toUid: null,
      amount,
      currency: wallet.currency,
      note: note ?? null,
      referenceNumber: `PC-ADJ-${txRef.id.slice(0, 8).toUpperCase()}`,
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
      direction: "debit",
      amount,
      balanceAfter: newBalance,
      createdAt: now,
    });

    const notifRef = db.collection("notifications").doc();
    tx.set(notifRef, {
      uid: targetUid,
      type: "security_alert",
      title: "Balance adjusted",
      body: `${(amount / 100).toFixed(2)} ${wallet.currency} was debited from your wallet by an administrator.`,
      read: false,
      createdAt: now,
      data: { transactionId: txRef.id },
    });
  });

  await writeAuditLog({
    actorUid: adminUid,
    actorRole: "admin",
    action: "wallet.debit",
    targetType: "wallet",
    targetId: targetUid,
    after: { amount, note: note ?? null },
  });

  return { status: "ok" };
});

/**
 * Freezing does two things: flips Firestore status (which every protected
 * route and Firestore rule already checks) AND revokes the user's refresh
 * tokens, so any session they currently hold stops working within
 * minutes rather than waiting for their token to naturally expire.
 */
export const freezeAccount = functions.onCall<{ targetUid: string; reason?: string }>(
  { enforceAppCheck: false },
  async (request) => {
    const adminUid = await requireAdmin(request.auth?.uid);
    const { targetUid, reason } = request.data;

    const now = Timestamp.now();
    await Promise.all([
      db.collection("users").doc(targetUid).update({ status: "frozen", updatedAt: now }),
      db.collection("wallets").doc(targetUid).update({ status: "frozen", updatedAt: now }),
      getAuth().revokeRefreshTokens(targetUid),
    ]);

    await writeAuditLog({
      actorUid: adminUid,
      actorRole: "admin",
      action: "user.freeze",
      targetType: "user",
      targetId: targetUid,
      after: { reason: reason ?? null },
    });

    return { status: "ok" };
  }
);

export const reactivateAccount = functions.onCall<{ targetUid: string }>(
  { enforceAppCheck: false },
  async (request) => {
    const adminUid = await requireAdmin(request.auth?.uid);
    const { targetUid } = request.data;

    const now = Timestamp.now();
    await Promise.all([
      db.collection("users").doc(targetUid).update({ status: "active", updatedAt: now }),
      db.collection("wallets").doc(targetUid).update({ status: "active", updatedAt: now }),
    ]);

    await writeAuditLog({
      actorUid: adminUid,
      actorRole: "admin",
      action: "user.reactivate",
      targetType: "user",
      targetId: targetUid,
    });

    return { status: "ok" };
  }
);
