"use client";

/**
 * Self-contained, in-memory state for the /demo sandbox.
 *
 * Deliberately NOT wired to Firebase at all — no Auth, no Firestore, no
 * Cloud Functions, no App Check. See the September App Check secret-key
 * debugging session: the whole point of a separate /demo route tree
 * (rather than a `?demo=true` flag layered onto /dashboard) is to let a
 * prospect click around without touching any of that. It also sidesteps a
 * specific landmine in src/lib/sessionCookie.ts — Firebase Hosting strips
 * every cookie except `__session` before a request reaches SSR, so a
 * second "is this a demo visit" cookie would silently vanish in
 * production exactly like that App Check mismatch did. A route with no
 * auth/session gate at all avoids that whole class of bug.
 *
 * State resets on every full page load — intentional (per the "entirely
 * fake/local" decision), not a bug. Nothing here ever touches a real
 * user's wallet, balance, or transaction history.
 */

import { useSyncExternalStore } from "react";

export interface DemoRecipient {
  uid: string;
  displayName: string;
  maskedEmail: string | null;
  maskedPhone: string | null;
}

export interface DemoTransaction {
  id: string;
  type: "transfer" | "deposit";
  status: "completed" | "pending";
  amount: number; // minor units (cents)
  currency: string;
  note: string | null;
  referenceNumber: string;
  createdAt: Date;
  direction: "in" | "out";
  counterpartyName: string;
}

// Same cast of names as the landing-page receipt stack
// (src/components/marketing/ReceiptStack.tsx) so the dashboard a prospect
// lands on feels like a continuation of what they just saw, not a
// different app.
export const DEMO_RECIPIENTS: DemoRecipient[] = [
  { uid: "demo-amara", displayName: "Amara K.", maskedEmail: "a***@gmail.com", maskedPhone: null },
  { uid: "demo-kimoyo", displayName: "Kimoyo Traders", maskedEmail: "pay***@kimoyotraders.com", maskedPhone: null },
  { uid: "demo-mensah", displayName: "T. Mensah", maskedEmail: null, maskedPhone: "+1 •••• •••45" },
  {
    uid: "demo-fingerprint",
    displayName: "Fingerprint Acoustic",
    maskedEmail: "hello***@fingerprintacoustic.com",
    maskedPhone: null,
  },
];

let refCounter = 4821;
function nextReference(): string {
  refCounter += 1;
  return `PC-DEMO-${refCounter}`;
}

interface DemoState {
  balance: number;
  currency: string;
  transactions: DemoTransaction[];
}

function seedState(): DemoState {
  const now = Date.now();
  return {
    balance: 124_530, // $1,245.30
    currency: "USD",
    transactions: [
      {
        id: "seed-1",
        type: "transfer",
        status: "completed",
        amount: 4500,
        currency: "USD",
        note: null,
        referenceNumber: "PC-2026-004821",
        createdAt: new Date(now - 1000 * 60 * 60 * 6),
        direction: "out",
        counterpartyName: "Amara K.",
      },
      {
        id: "seed-2",
        type: "transfer",
        status: "completed",
        amount: 128_000,
        currency: "USD",
        note: null,
        referenceNumber: "PC-2026-004819",
        createdAt: new Date(now - 1000 * 60 * 60 * 30),
        direction: "in",
        counterpartyName: "Kimoyo Traders",
      },
      {
        id: "seed-3",
        type: "transfer",
        status: "pending",
        amount: 1250,
        currency: "USD",
        note: null,
        referenceNumber: "PC-2026-004814",
        createdAt: new Date(now - 1000 * 60 * 60 * 48),
        direction: "out",
        counterpartyName: "T. Mensah",
      },
    ],
  };
}

let state: DemoState = seedState();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

/** Exposed for a future "reset sandbox" control; unused for now. */
export function resetDemoStore() {
  state = seedState();
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): DemoState {
  return state;
}

export function useDemoWallet() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    wallet: { balance: snap.balance, currency: snap.currency, status: "active" as const },
    loading: false,
  };
}

export function useDemoTransactions(limit = 20) {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { transactions: snap.transactions.slice(0, limit), loading: false };
}

export function demoLookupRecipient(q: string): DemoRecipient[] {
  const needle = q.trim().toLowerCase();
  if (needle.length < 3) return [];
  return DEMO_RECIPIENTS.filter(
    (r) =>
      r.displayName.toLowerCase().includes(needle) ||
      r.maskedEmail?.toLowerCase().includes(needle) ||
      r.maskedPhone?.toLowerCase().includes(needle)
  );
}

/** Any 4-6 digit PIN "verifies" in the sandbox — there's nothing real to protect. */
export function demoVerifyPin(pin: string): { ok: boolean } {
  return { ok: /^\d{4,6}$/.test(pin) };
}

export function demoTransferFunds(input: { toUid: string; amount: number; note?: string }) {
  const recipient = DEMO_RECIPIENTS.find((r) => r.uid === input.toUid);
  if (!recipient) throw new Error("Unknown recipient.");
  if (input.amount > state.balance) throw new Error("Insufficient balance.");

  const transaction: DemoTransaction = {
    id: `demo-${Date.now()}`,
    type: "transfer",
    status: "completed",
    amount: input.amount,
    currency: state.currency,
    note: input.note ?? null,
    referenceNumber: nextReference(),
    createdAt: new Date(),
    direction: "out",
    counterpartyName: recipient.displayName,
  };

  state = {
    ...state,
    balance: state.balance - input.amount,
    transactions: [transaction, ...state.transactions],
  };
  emit();

  return {
    transactionId: transaction.id,
    referenceNumber: transaction.referenceNumber,
    newBalance: state.balance,
  };
}

export function demoRequestDeposit(input: { amount: number; reference: string }) {
  const transaction: DemoTransaction = {
    id: `demo-${Date.now()}`,
    type: "deposit",
    status: "completed",
    amount: input.amount,
    currency: state.currency,
    note: input.reference,
    referenceNumber: nextReference(),
    createdAt: new Date(),
    direction: "in",
    counterpartyName: "Deposit",
  };

  state = {
    ...state,
    balance: state.balance + input.amount,
    transactions: [transaction, ...state.transactions],
  };
  emit();

  return { transactionId: transaction.id };
}
