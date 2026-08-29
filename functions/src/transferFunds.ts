import * as functions from "firebase-functions/v2/https";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import type { TransferFundsRequest, TransferFundsResponse } from "./types";

const db = getFirestore();
const MIN_TRANSFER = 100;
const MAX_TRANSFER = 500_000_00;
const REQUEST_ID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function generateReferenceNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 1_000_000).toString().padStart(6, "0");
  return `PC-${year}-${rand}`;
}

export const transferFunds = functions.onCall<TransferFundsRequest>(
  { region: "us-central1", enforceAppCheck: false },
  async (request): Promise<TransferFundsResponse> => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

    const { requestId, toUid, amount, note, stepUpToken } = request.data;
    if (!REQUEST_ID_REGEX.test(requestId ?? "")) {
      throw new HttpsError("invalid-argument", "Invalid requestId.");
    }
    if (!toUid || typeof toUid !== "string" || toUid.length > 128) {
      throw new HttpsError("invalid-argument", "Invalid recipient.");
    }
    if (toUid === uid) throw new HttpsError("invalid-argument", "Cannot transfer to yourself.");
    if (!Number.isSafeInteger(amount) || amount < MIN_TRANSFER || amount > MAX_TRANSFER) {
      throw new HttpsError("invalid-argument", "Invalid amount.");
    }
    if (note !== undefined && (typeof note !== "string" || note.length > 280)) {
      throw new HttpsError("invalid-argument", "Note too long.");
    }
    if (!stepUpToken || typeof stepUpToken !== "string" || stepUpToken.length > 128) {
      throw new HttpsError("failed-precondition", "PIN verification required.");
    }

    const fromWalletRef = db.collection("wallets").doc(uid);
    const toWalletRef = db.collection("wallets").doc(toUid);
    const toUserRef = db.collection("users").doc(toUid);
    const txRef = db.collection("transactions").doc(requestId);
    const stepUpRef = db.collection("stepUpTokens").doc(stepUpToken);

    const result = await db.runTransaction(async (tx) => {
      const existingTx = await tx.get(txRef);
      if (existingTx.exists) {
        const data = existingTx.data()!;
        // Never reveal another user's transaction through an attacker-chosen
        // idempotency key.
        if (data.initiatedBy !== uid || data.fromUid !== uid) {
          throw new HttpsError("already-exists", "Request ID has already been used.");
        }
        return {
          transactionId: existingTx.id,
          status: data.status,
          referenceNumber: data.referenceNumber,
          newBalance: null,
        } as TransferFundsResponse;
      }

      const [stepUpSnap, fromWalletSnap, toWalletSnap, toUserSnap] = await Promise.all([
        tx.get(stepUpRef),
        tx.get(fromWalletRef),
        tx.get(toWalletRef),
        tx.get(toUserRef),
      ]);

      if (!stepUpSnap.exists) throw new HttpsError("permission-denied", "PIN verification required.");
      const stepUp = stepUpSnap.data()!;
      if (stepUp.uid !== uid || stepUp.purpose !== "transfer") {
        throw new HttpsError("permission-denied", "Invalid verification token.");
      }
      if (stepUp.expiresAt.toMillis() <= Date.now()) {
        throw new HttpsError("deadline-exceeded", "PIN verification expired. Please verify again.");
      }
      if (stepUp.usedAt) throw new HttpsError("already-exists", "Verification token already used.");

      if (!fromWalletSnap.exists) throw new HttpsError("failed-precondition", "Sender wallet not found.");
      if (!toWalletSnap.exists || !toUserSnap.exists) throw new HttpsError("not-found", "Recipient not found.");

      const fromWallet = fromWalletSnap.data()!;
      const toWallet = toWalletSnap.data()!;
      const recipient = toUserSnap.data()!;

      if (recipient.status && recipient.status !== "active") {
        throw new HttpsError("failed-precondition", "Recipient account is not active.");
      }
      if (fromWallet.status !== "active") throw new HttpsError("failed-precondition", "Your wallet is frozen.");
      if (toWallet.status !== "active") throw new HttpsError("failed-precondition", "Recipient wallet is frozen.");
      if (fromWallet.currency !== toWallet.currency) throw new HttpsError("failed-precondition", "Currency mismatch.");
      if (!Number.isSafeInteger(fromWallet.balance) || fromWallet.balance < amount) {
        throw new HttpsError("failed-precondition", "Insufficient balance.");
      }

      const newFromBalance = fromWallet.balance - amount;
      const newToBalance = toWallet.balance + amount;
      if (!Number.isSafeInteger(newToBalance)) throw new HttpsError("out-of-range", "Amount is too large.");
      const referenceNumber = generateReferenceNumber();
      const now = Timestamp.now();

      tx.update(fromWalletRef, { balance: newFromBalance, version: FieldValue.increment(1), updatedAt: now });
      tx.update(toWalletRef, { balance: newToBalance, version: FieldValue.increment(1), updatedAt: now });
      tx.update(stepUpRef, { usedAt: now });

      tx.set(txRef, {
        id: requestId,
        type: "transfer",
        status: "completed",
        fromUid: uid,
        toUid,
        amount,
        currency: fromWallet.currency,
        note: note ?? null,
        referenceNumber,
        createdAt: now,
        completedAt: now,
        failureReason: null,
        initiatedBy: uid,
      });

      const debitEntryRef = db.collection("ledgerEntries").doc();
      const creditEntryRef = db.collection("ledgerEntries").doc();
      tx.set(debitEntryRef, { id: debitEntryRef.id, transactionId: requestId, uid, direction: "debit", amount, balanceAfter: newFromBalance, createdAt: now });
      tx.set(creditEntryRef, { id: creditEntryRef.id, transactionId: requestId, uid: toUid, direction: "credit", amount, balanceAfter: newToBalance, createdAt: now });

      const senderNotifRef = db.collection("notifications").doc();
      tx.set(senderNotifRef, { uid, type: "transfer_sent", title: "Transfer sent", body: `You sent ${(amount / 100).toFixed(2)} ${fromWallet.currency} — ${referenceNumber}`, read: false, createdAt: now, data: { transactionId: requestId } });
      const recipientNotifRef = db.collection("notifications").doc();
      tx.set(recipientNotifRef, { uid: toUid, type: "transfer_received", title: "Money received", body: `You received ${(amount / 100).toFixed(2)} ${fromWallet.currency} — ${referenceNumber}`, read: false, createdAt: now, data: { transactionId: requestId } });

      const auditRef = db.collection("auditLogs").doc();
      tx.set(auditRef, { id: auditRef.id, actorUid: uid, actorRole: "user", action: "transaction.transfer", targetType: "transaction", targetId: requestId, before: null, after: { fromUid: uid, toUid, amount, referenceNumber }, ip: null, createdAt: now });

      return { transactionId: requestId, status: "completed", referenceNumber, newBalance: newFromBalance } as TransferFundsResponse;
    });

    return result;
  }
);
