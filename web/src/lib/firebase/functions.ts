"use client";

import { getFunctions, httpsCallable } from "firebase/functions";
import { firebaseApp } from "@/lib/firebase/client";

const functions = getFunctions(firebaseApp, "us-central1");

export interface TransferFundsInput {
  requestId: string;
  toUid: string;
  amount: number;
  note?: string;
  stepUpToken: string;
}
export interface TransferFundsOutput {
  transactionId: string;
  status: string;
  referenceNumber: string;
  newBalance: number | null;
}

export const transferFundsFn = httpsCallable<TransferFundsInput, TransferFundsOutput>(functions, "transferFunds");

export const verifyPinFn = httpsCallable<
  { pin: string },
  { status: string; stepUpToken: string; expiresInSeconds: number }
>(functions, "verifyPin");

export const setPinFn = httpsCallable<{ pin: string }, { status: string }>(functions, "setPin");

export const markPhoneVerifiedFn = httpsCallable<Record<string, never>, { status: string }>(
  functions,
  "markPhoneVerified"
);

export interface LookupRecipientResult {
  uid: string;
  displayName: string;
  maskedEmail: string | null;
  maskedPhone: string | null;
}
export const lookupRecipientFn = httpsCallable<{ query: string }, { results: LookupRecipientResult[] }>(
  functions,
  "lookupRecipient"
);

export const requestWithdrawalFn = httpsCallable<
  { amount: number; payoutDetails: Record<string, string> },
  { requestId: string; status: string }
>(functions, "requestWithdrawal");

export function newRequestId(): string {
  return crypto.randomUUID();
}
