"use client";

import { useState, type FormEvent } from "react";
import { transferFundsFn, verifyPinFn, lookupRecipientFn, newRequestId } from "@/lib/firebase/functions";
import type { LookupRecipientResult } from "@/lib/firebase/functions";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type Step = "recipient" | "amount" | "pin" | "success";
type Recipient = LookupRecipientResult;

export default function SendMoneyPage() {
  const [step, setStep] = useState<Step>("recipient");
  const [query_, setQuery] = useState("");
  const [results, setResults] = useState<Recipient[]>([]);
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [pin, setPin] = useState("");
  const [needsPinSetup, setNeedsPinSetup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [requestId, setRequestId] = useState(() => newRequestId());

  async function handleFindRecipient(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const q = query_.trim();
      if (q.length < 3) throw new Error("Enter at least 3 characters to search.");
      const { data } = await lookupRecipientFn({ query: q });
      setResults(data.results);
      if (data.results.length === 0) setError("No account found with that email or phone.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function pickRecipient(r: Recipient) {
    setRecipient(r);
    setError(null);
    setStep("amount");
  }

  function handleContinueToPin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = Number(amount);
    const cents = Math.round(parsed * 100);
    if (!Number.isFinite(parsed) || !Number.isSafeInteger(cents) || cents < 100) {
      setError("Enter an amount of at least $1.00.");
      return;
    }
    if (cents > 50_000_000) {
      setError("Maximum transfer is $500,000.00.");
      return;
    }
    setStep("pin");
  }

  async function handleConfirmSend(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNeedsPinSetup(false);
    if (!recipient) return;
    setLoading(true);
    try {
      const pinResult = await verifyPinFn({ pin });
      const cents = Math.round(Number(amount) * 100);
      await transferFundsFn({
        requestId,
        toUid: recipient.uid,
        amount: cents,
        note: note.trim() || undefined,
        stepUpToken: pinResult.data.stepUpToken,
      });
      setStep("success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transfer failed.";
      if (/No PIN set/i.test(message)) {
        setNeedsPinSetup(true);
        setError("You need to set a transfer PIN before sending money.");
      } else if (/Incorrect PIN/i.test(message)) {
        setError("Incorrect PIN.");
      } else if (/expired/i.test(message)) {
        setError("PIN verification expired. Please try again.");
      } else if (/not active/i.test(message)) {
        setError("That account is not available to receive money yet.");
      } else if (/Insufficient/i.test(message)) {
        setError("Insufficient balance.");
      } else {
        setError("Transfer failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  function startAnotherTransfer() {
    setRecipient(null);
    setResults([]);
    setAmount("");
    setNote("");
    setPin("");
    setError(null);
    setNeedsPinSetup(false);
    setRequestId(newRequestId());
    setStep("recipient");
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
            {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
            <Button type="submit" loading={loading}>
              Find recipient
            </Button>
            {results.length > 0 && (
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 dark:divide-white/5 dark:border-white/10">
                {results.map((r) => (
                  <li key={r.uid}>
                    <button
                      type="button"
                      onClick={() => pickRecipient(r)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-white/5"
                    >
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{r.displayName}</span>
                      <span className="text-xs text-slate-400">{r.maskedEmail ?? r.maskedPhone ?? ""}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </form>
        )}
        {step === "amount" && recipient && (
          <form onSubmit={handleContinueToPin} className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Sending to <span className="font-medium text-slate-800 dark:text-slate-100">{recipient.displayName}</span>
            </p>
            <Input label="Amount" type="number" name="amount" step="0.01" min="1" max="500000" required value={amount} onChange={(e) => setAmount(e.target.value)} />
            <Input label="Note (optional)" name="note" maxLength={280} value={note} onChange={(e) => setNote(e.target.value)} />
            {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
            <Button type="submit">Continue</Button>
          </form>
        )}
        {step === "pin" && recipient && (
          <form onSubmit={handleConfirmSend} className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Confirm sending <span className="font-mono font-medium text-slate-800 dark:text-slate-100">${Number(amount).toFixed(2)}</span> to {recipient.displayName}.
            </p>
            <Input label="Enter your PIN" type="password" inputMode="numeric" pattern="[0-9]*" name="pin" minLength={4} maxLength={6} required value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} />
            {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
            {needsPinSetup && (
              <a href="/dashboard/security" className="block text-sm font-medium text-brand-600 hover:underline dark:text-brand-300">
                Set up your PIN &rarr;
              </a>
            )}
            <Button type="submit" loading={loading}>
              Confirm and send
            </Button>
          </form>
        )}
        {step === "success" && (
          <div className="space-y-4 text-center">
            <p className="text-lg font-semibold text-brand-700 dark:text-brand-300">Transfer complete</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">${Number(amount).toFixed(2)} sent to {recipient?.displayName}.</p>
            <div className="flex justify-center gap-3">
              <Button type="button" variant="secondary" onClick={startAnotherTransfer}>
                Send again
              </Button>
              <a href="/dashboard" className="inline-flex items-center rounded-xl px-4 text-sm font-medium text-brand-600 hover:underline">
                Dashboard
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
