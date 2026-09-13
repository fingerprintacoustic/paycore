"use client";

import { useState, type FormEvent } from "react";
import { requestDepositFn } from "@/lib/firebase/functions";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function AddFundsPage() {
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const parsed = Number(amount);
    const cents = Math.round(parsed * 100);
    if (!Number.isFinite(parsed) || !Number.isSafeInteger(cents) || cents < 1) {
      setError("Enter a valid amount.");
      return;
    }
    if (reference.trim().length < 3) {
      setError("Tell us how you sent the money — e.g. bank transfer, reference number.");
      return;
    }

    setLoading(true);
    try {
      await requestDepositFn({ amount: cents, reference: reference.trim() });
      setSuccess(true);
      setAmount("");
      setReference("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't submit your request. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-white">Add funds</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Sent money outside the app? Let us know and we&apos;ll credit your wallet once it&apos;s verified.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white/70 p-6 backdrop-blur-sm dark:border-white/10 dark:bg-white/5"
        noValidate
      >
        <Input
          label="Amount"
          type="number"
          name="amount"
          step="0.01"
          min="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Input
          label="How did you send it?"
          name="reference"
          placeholder="e.g. Bank transfer, ref #4821"
          maxLength={280}
          required
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
        {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
        {success && (
          <p role="status" className="text-sm font-medium text-brand-700 dark:text-brand-300">
            Request sent — we&apos;ll credit your wallet once it&apos;s verified.
          </p>
        )}
        <Button type="submit" loading={loading}>
          Submit request
        </Button>
      </form>
    </div>
  );
}
