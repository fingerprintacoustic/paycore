"use client";

import { useState, type FormEvent } from "react";
import { demoLookupRecipient, demoVerifyPin, demoTransferFunds, type DemoRecipient } from "@/lib/demo/store";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type Step = "recipient" | "amount" | "pin" | "success";

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function DemoSendMoneyPage() {
  const [step, setStep] = useState<Step>("recipient");
  const [query_, setQuery] = useState("");
  const [results, setResults] = useState<DemoRecipient[]>([]);
  const [recipient, setRecipient] = useState<DemoRecipient | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sentTotal, setSentTotal] = useState(0);

  async function handleFindRecipient(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const q = query_.trim();
    if (q.length < 3) {
      setError("Enter at least 3 characters to search.");
      return;
    }
    setLoading(true);
    await wait(400); // mimics the real search's network latency
    const matches = demoLookupRecipient(q);
    setResults(matches);
    if (matches.length === 0) {
      setError('Try "Amara", "Kimoyo", "Mensah", or "Fingerprint" — this sandbox only knows a few sample contacts.');
    }
    setLoading(false);
  }

  function pickRecipient(r: DemoRecipient) {
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
    setStep("pin");
  }

  async function handleConfirmSend(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!recipient) return;
    setLoading(true);
    await wait(500);
    if (!demoVerifyPin(pin).ok) {
      setError("Enter a 4-6 digit PIN — any digits work in this sandbox.");
      setLoading(false);
      return;
    }
    try {
      const cents = Math.round(Number(amount) * 100);
      demoTransferFunds({ toUid: recipient.uid, amount: cents, note: note.trim() || undefined });
      setSentTotal(cents);
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transfer failed.");
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
    setSentTotal(0);
    setStep("recipient");
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 font-display text-2xl font-semibold text-slate-900 dark:text-white">Send money</h1>
      <div className="rounded-2xl border border-slate-200 bg-white/70 p-6 backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
        {step === "recipient" && (
          <form onSubmit={handleFindRecipient} className="space-y-4">
            <Input
              label="Recipient name"
              name="query"
              placeholder='Try "Amara" or "Kimoyo"'
              required
              value={query_}
              onChange={(e) => setQuery(e.target.value)}
            />
            <p className="-mt-1 text-xs text-slate-400">
              This sandbox has a few sample contacts to search — your real wallet searches your actual contacts.
            </p>
            {error && (
              <p role="alert" className="text-sm text-red-500">
                {error}
              </p>
            )}
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
              Sending to{" "}
              <span className="font-medium text-slate-800 dark:text-slate-100">{recipient.displayName}</span>
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
            {error && (
              <p role="alert" className="text-sm text-red-500">
                {error}
              </p>
            )}
            <Button type="submit">Continue</Button>
          </form>
        )}
        {step === "pin" && recipient && (
          <form onSubmit={handleConfirmSend} className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Confirm sending{" "}
              <span className="font-mono font-medium text-slate-800 dark:text-slate-100">
                ${Number(amount).toFixed(2)}
              </span>{" "}
              to {recipient.displayName}.
            </p>
            <Input
              label="Enter any PIN (sandbox)"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              name="pin"
              minLength={4}
              maxLength={6}
              required
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
            {error && (
              <p role="alert" className="text-sm text-red-500">
                {error}
              </p>
            )}
            <Button type="submit" loading={loading}>
              Confirm and send
            </Button>
          </form>
        )}
        {step === "success" && (
          <div className="space-y-4 text-center">
            <p className="text-lg font-semibold text-brand-700 dark:text-brand-300">Transfer complete</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              ${(sentTotal / 100).toFixed(2)} sent to {recipient?.displayName}.
            </p>
            <div className="flex justify-center gap-3">
              <Button type="button" variant="secondary" onClick={startAnotherTransfer}>
                Send again
              </Button>
              <a href="/demo" className="inline-flex items-center rounded-xl px-4 text-sm font-medium text-brand-600 hover:underline">
                Dashboard
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
