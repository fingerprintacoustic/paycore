"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { setPinFn } from "@/lib/firebase/functions";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const PIN_REGEX = /^\d{4,6}$/;

export default function SecurityPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSetPin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!PIN_REGEX.test(pin)) {
      setError("PIN must be 4-6 digits.");
      return;
    }
    if (pin !== confirmPin) {
      setError("PINs don't match.");
      return;
    }
    setLoading(true);
    try {
      await setPinFn({ pin });
      setSuccess(true);
      setPin("");
      setConfirmPin("");
      // Return to wherever the user was headed (usually the send flow).
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error && /less predictable|weak/i.test(err.message)
          ? "Choose a less predictable PIN."
          : "Couldn't set your PIN. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-white">Security</h1>

      <div className="rounded-2xl border border-slate-200 bg-white/70 p-6 backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
        <h2 className="font-display text-sm font-semibold text-slate-800 dark:text-slate-100">Transfer PIN</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Your PIN confirms every transfer. Choose 4-6 digits that aren't easy to guess.
        </p>

        {success && (
          <p role="status" className="mt-4 text-sm font-medium text-brand-700 dark:text-brand-300">
            PIN saved. You can now send money.
          </p>
        )}

        <form onSubmit={handleSetPin} className="mt-4 space-y-4" noValidate>
          <Input
            label="New PIN"
            type="password"
            name="pin"
            inputMode="numeric"
            pattern="[0-9]*"
            minLength={4}
            maxLength={6}
            autoComplete="off"
            required
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
          <Input
            label="Confirm PIN"
            type="password"
            name="confirmPin"
            inputMode="numeric"
            pattern="[0-9]*"
            minLength={4}
            maxLength={6}
            autoComplete="off"
            required
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
          {error && (
            <p role="alert" className="text-sm text-red-500">
              {error}
            </p>
          )}
          <Button type="submit" loading={loading}>
            Save PIN
          </Button>
        </form>
      </div>
    </div>
  );
}
