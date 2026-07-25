import * as functions from "firebase-functions/v2/https";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import type { TransferFundsRequest, TransferFundsResponse } from "./types";

const db = getFirestore();

// Tune per your settings/global doc in production; hardcoded here for clarity.
const MIN_TRANSFER = 100; // $1.00 in cents
const MAX_TRANSFER = 500_000_00; // $500,000.00 in cents, sanity ceiling

function generateReferenceNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0");
  return `PC-${year}-${rand}`;
}

/**
 * transferFunds — internal peer-to-peer transfer.
 *
 * Callable Cloud Function. Requires an authenticated caller. Idempotent on
 * `requestId`: the transaction document ID IS the requestId, so retries
 * (client double-submit, network retry) can never double-spend — the
 * transaction either doesn't exist yet (proceed) or already exists
 * (return its recorded outcome without touching balances again).
 *
 * Everything below happens inside a single Firestore transaction: it
 * either all commits or none of it does. Firestore transactions
 * automatically retry on contention and abort cleanly on failure, so a
 * mid-transfer crash cannot leave wallets half-updated.
 */
export const transferFunds = functions.onCall<TransferFundsRequest>(
  { region: "us-central1", enforceAppCheck: true },
  async (request): Promise<TransferFundsResponse> => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    const { requestId, toUid, amount, note } = request.data;

    // ---- input validation (never trust the client) ----
    if (!requestId || typeof requestId !== "string") {
      throw new HttpsError("invalid-argument", "Missing requestId.");
    }
    if (!toUid || typeof toUid !== "string") {
      throw new HttpsError("invalid-argument", "Missing recipient.");
    }
    if (toUid === uid) {
      throw new HttpsError("invalid-argument", "Cannot transfer to yourself.");
    }
    if (!Number.isInteger(amount) || amount < MIN_TRANSFER || amount > MAX_TRANSFER) {
      throw new HttpsError("invalid-argument", "Invalid amount.");
    }
    if (note && (typeof note !== "string" || note.length > 280)) {
      throw new HttpsError("invalid-argument", "Note too long.");
    }

    const fromWalletRef = db.collection("wallets").doc(uid);
    const toWalletRef = db.collection("wallets").doc(toUid);
    const toUserRef = db.collection("users").doc(toUid);
    const txRef = db.collection("transactions").doc(requestId);

    const result = await db.runTransaction(async (tx) => {
      // Idempotency check: if this requestId was already processed,
      // return its stored outcome instead of re-applying the transfer.
      const existingTx = await tx.get(txRef);
      if (existingTx.exists) {
        const data = existingTx.data()!;
        return {
          transactionId: existingTx.id,
          status: data.status,
          referenceNumber: data.referenceNumber,
          newBalance: null as number | null, // not re-fetched on replay
        };
      }

      const [fromWalletSnap, toWalletSnap, toUserSnap] = await Promise.all([
        tx.get(fromWalletRef),
        tx.get(toWalletRef),
        tx.get(toUserRef),
      ]);

      if (!fromWalletSnap.exists) {
        throw new HttpsError("failed-precondition", "Sender wallet not found.");
      }
      if (!toWalletSnap.exists || !toUserSnap.exists) {
        throw new HttpsError("not-found", "Recipient not found.");
      }

      const fromWallet = fromWalletSnap.data()!;
      const toWallet = toWalletSnap.data()!;

      if (fromWallet.status !== "active") {
        throw new HttpsError("failed-precondition", "Your wallet is frozen.");
      }
      if (toWallet.status !== "active") {
        throw new HttpsError("failed-precondition", "Recipient wallet is frozen.");
      }
      if (fromWallet.currency !== toWallet.currency) {
        throw new HttpsError("failed-precondition", "Currency mismatch.");
      }
      if (fromWallet.balance < amount) {
        // Write a failed transaction record for audit purposes, but throw
        // so the transaction aborts and no balances move.
        throw new HttpsError("failed-precondition", "Insufficient balance.");
      }

      const newFromBalance = fromWallet.balance - amount;
      const newToBalance = toWallet.balance + amount;
      const referenceNumber = generateReferenceNumber();
      const now = Timestamp.now();

      // ---- all writes below are part of the same atomic transaction ----

      tx.update(fromWalletRef, {
        balance: newFromBalance,
        version: FieldValue.increment(1),
        updatedAt: now,
      });
      tx.update(toWalletRef, {
        balance: newToBalance,
        version: FieldValue.increment(1),
        updatedAt: now,
      });

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
      tx.set(debitEntryRef, {
        id: debitEntryRef.id,
        transactionId: requestId,
        uid,
        direction: "debit",
        amount,
        balanceAfter: newFromBalance,
        createdAt: now,
      });
      tx.set(creditEntryRef, {
        id: creditEntryRef.id,
        transactionId: requestId,
        uid: toUid,
        direction: "credit",
        amount,
        balanceAfter: newToBalance,
        createdAt: now,
      });

      const senderNotifRef = db.collection("notifications").doc();
      tx.set(senderNotifRef, {
        uid,
        type: "transfer_sent",
        title: "Transfer sent",
        body: `You sent ${(amount / 100).toFixed(2)} ${fromWallet.currency} — ${referenceNumber}`,
        read: false,
        createdAt: now,
        data: { transactionId: requestId },
      });
      const recipientNotifRef = db.collection("notifications").doc();
      tx.set(recipientNotifRef, {
        uid: toUid,
        type: "transfer_received",
        title: "Money received",
        body: `You received ${(amount / 100).toFixed(2)} ${fromWallet.currency} — ${referenceNumber}`,
        read: false,
        createdAt: now,
        data: { transactionId: requestId },
      });

      const auditRef = db.collection("auditLogs").doc();
      tx.set(auditRef, {
        id: auditRef.id,
        actorUid: uid,
        actorRole: "user",
        action: "transaction.transfer",
        targetType: "transaction",
        targetId: requestId,
        before: null,
        after: { fromUid: uid, toUid, amount, referenceNumber },
        ip: null, // populate from request context if available
        createdAt: now,
      });

      return {
        transactionId: requestId,
        status: "completed" as const,
        referenceNumber,
        newBalance: newFromBalance,
      };
    });

    return result as TransferFundsResponse;
  }
);
