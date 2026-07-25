"use client";

import { useState, type FormEvent } from "react";
import { collection, query, where, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { transferFundsFn, verifyPinFn, newRequestId } from "@/lib/firebase/functions";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type Step = "recipient" | "amount" | "pin" | "success";

interface Recipient {
  uid: string;
  displayName: string;
  email: string | null;
}

export default function SendMoneyPage() {
  const [step, setStep] = useState<Step>("recipient");
  const [query_, setQuery] = useState("");
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [amount, setAmount] = useState(""); // display string, e.g. "25.00"
  const [note, setNote] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [requestId] = useState(newRequestId); // fixed for this whole attempt — see functions.ts

  async function handleFindRecipient(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Matches against the same searchTokens field the admin search uses
      // (see functions/src/auth.ts) — an exact-match query on lowercase
      // email is the simple case; broaden to prefix search if needed.
      const q = query(
        collection(db, "users"),
        where("searchTokens", "array-contains", query_.trim().toLowerCase()),
        limit(1)
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        setError("No account found with that email or phone.");
        return;
      }
      const docSnap = snap.docs[0]!;
      const data = docSnap.data();
      setRecipient({ uid: docSnap.id, displayName: data.displayName, email: data.email });
      setStep("amount");
    } catch {
      setError("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleContinueToPin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const cents = Math.round(parseFloat(amount) * 100);
    if (!cents || cents <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    setStep("pin");
  }

  async function handleConfirmSend(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!recipient) return;
    setLoading(true);
    try {
      // Step-up auth: the PIN itself isn't sent to transferFunds — it's
      // verified separately first. transferFunds trusts the caller's
      // Firebase Auth session (already established), not the PIN; the PIN
      // check is the "are you really you, right now" gate before we let
      // that session move money.
      await verifyPinFn({ pin });

      const cents = Math.round(parseFloat(amount) * 100);
      await transferFundsFn({
        requestId,
        toUid: recipient.uid,
        amount: cents,
        note: note || undefined,
      });
      setStep("success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transfer failed.";
      setError(message.includes("Incorrect PIN") ? "Incorrect PIN." : "Transfer failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 font-display text-2xl font-semibold text-slate-900 dark:text-white">Send money</h1>

      <div className="rounded-2xl border border-slate-200 bg-white/70 p-6 backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
        {step === "recipient" && (
          <form onSubmit={handleFindRecipient} className="space-y-4">
            <Input
              label="Recipient email or phone"
              name="query"
              required
              value={query_}
              onChange={(e) => setQuery(e.target.value)}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" loading={loading}>
              Find recipient
            </Button>
          </form>
        )}

        {step === "amount" && recipient && (
          <form onSubmit={handleContinueToPin} className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Sending to <span className="font-medium text-slate-800 dark:text-slate-100">{recipient.displayName}</span>
            </p>
            <Input
              label="Amount"
              type="number"
              name="amount"
              step="0.01"
              min="1"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Input
              label="Note (optional)"
              name="note"
              maxLength={280}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit">Continue</Button>
          </form>
        )}

        {step === "pin" && recipient && (
          <form onSubmit={handleConfirmSend} className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Confirm sending <span className="font-mono font-medium text-slate-800 dark:text-slate-100">${amount}</span> to{" "}
              {recipient.displayName}
            </p>
            <Input
              label="Enter your PIN"
              type="password"
              inputMode="numeric"
              name="pin"
              maxLength={6}
              required
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" loading={loading}>
              Confirm and send
            </Button>
          </form>
        )}

        {step === "success" && (
          <div className="space-y-3 text-center">
            <p className="text-lg font-semibold text-brand-700 dark:text-brand-300">Transfer complete</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              ${amount} sent to {recipient?.displayName}.
            </p>
            <a href="/dashboard" className="inline-block text-sm font-medium text-brand-600 hover:underline">
              Back to dashboard
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
