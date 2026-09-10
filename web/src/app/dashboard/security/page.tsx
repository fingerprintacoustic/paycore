"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/client";
import { setPinFn } from "@/lib/firebase/functions";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const PIN_REGEX = /^\d{4,6}$/;

export default function SecurityPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [mode, setMode] = useState<"change" | "forgot">("change");

  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, "users", user.uid), (snap) => {
      setHasPin(!!snap.data()?.pinSetAt);
    });
  }, [user]);

  function reset() {
    setPin(""); setConfirmPin(""); setCurrentPin(""); setPassword("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!user) return;

    if (!PIN_REGEX.test(pin)) return setError("PIN must be 4-6 digits.");
    if (pin !== confirmPin) return setError("PINs don't match.");
    if (hasPin && mode === "change" && !PIN_REGEX.test(currentPin)) {
      return setError("Enter your current PIN.");
    }
    if (hasPin && mode === "forgot" && !password) {
      return setError("Enter your account password.");
    }

    setLoading(true);
    try {
      if (hasPin && mode === "forgot") {
        // Prove account ownership with the password; this refreshes
        // auth_time so setPin accepts the change without the old PIN.
        const cred = EmailAuthProvider.credential(user.email ?? "", password);
        await reauthenticateWithCredential(user, cred);
        await setPinFn({ pin });
      } else if (hasPin) {
        await setPinFn({ pin, currentPin });
      } else {
        await setPinFn({ pin });
      }
      setSuccess(true);
      reset();
      router.refresh();
    } catch (err) {
      setError(describeError(err));
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
          {hasPin
            ? "Your PIN confirms every transfer. Changing it needs your current PIN — or your password if you've forgotten it."
            : "Your PIN confirms every transfer. Choose 4-6 digits that aren't easy to guess."}
        </p>

        {success && (
          <p role="status" className="mt-4 text-sm font-medium text-brand-700 dark:text-brand-300">
            {hasPin ? "PIN updated." : "PIN saved. You can now send money."}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
          {hasPin && mode === "change" && (
            <Input
              label="Current PIN"
              type="password"
              name="currentPin"
              inputMode="numeric"
              autoComplete="off"
              revealable
              required
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          )}
          {hasPin && mode === "forgot" && (
            <Input
              label="Account password"
              type="password"
              name="password"
              autoComplete="current-password"
              revealable
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}

          <Input
            label={hasPin ? "New PIN" : "PIN"}
            type="password"
            name="pin"
            inputMode="numeric"
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
            autoComplete="off"
            required
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />

          {error && <p role="alert" className="text-sm text-red-500">{error}</p>}

          <Button type="submit" loading={loading}>
            {hasPin ? "Update PIN" : "Save PIN"}
          </Button>

          {hasPin && (
            <button
              type="button"
              onClick={() => { setMode(mode === "change" ? "forgot" : "change"); setError(null); reset(); }}
              className="w-full text-center text-sm text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-300"
            >
              {mode === "change" ? "Forgot your PIN? Reset with your password" : "I remember my PIN"}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

function describeError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  const msg = err instanceof Error ? err.message : "";
  const hay = `${code} ${msg}`.toLowerCase();
  if (hay.includes("less predictable") || hay.includes("weak")) return "Choose a less predictable PIN.";
  if (hay.includes("wrong-password") || hay.includes("invalid-credential")) return "That password is incorrect.";
  if (hay.includes("too-many-requests")) return "Too many attempts. Wait a few minutes and try again.";
  if (hay.includes("permission-denied") || hay.includes("current pin")) {
    return "Couldn't verify it's you — check your current PIN or password.";
  }
  return "Couldn't update your PIN. Please try again.";
}
