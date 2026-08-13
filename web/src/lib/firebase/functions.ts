"use client";

import { getFunctions, httpsCallable } from "firebase/functions";
import { firebaseApp } from "@/lib/firebase/client";

const functions = getFunctions(firebaseApp, "us-central1");

export interface TransferFundsInput {
  requestId: string;
  toUid: string;
  amount: number; // integer minor units (cents)
  note?: string;
}
export interface TransferFundsOutput {
  transactionId: string;
  status: string;
  referenceNumber: string;
  newBalance: number | null;
}

export const transferFundsFn = httpsCallable<TransferFundsInput, TransferFundsOutput>(
  functions,
  "transferFunds"
);

export const verifyPinFn = httpsCallable<{ pin: string }, { status: string }>(functions, "verifyPin");
export const setPinFn = httpsCallable<{ pin: string }, { status: string }>(functions, "setPin");

export const requestWithdrawalFn = httpsCallable<
  { amount: number; payoutDetails: Record<string, string> },
  { requestId: string; status: string }
>(functions, "requestWithdrawal");

/**
 * Client-side helper: generates a v4 UUID to use as the transfer's
 * idempotency key. Generated once per submit attempt and reused across
 * retries of the SAME attempt (e.g. a network timeout retry) — a fresh
 * key must only be generated for a genuinely new transfer.
 */
export function newRequestId(): string {
  return crypto.randomUUID();
}
