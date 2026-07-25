"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ConfirmationResult } from "firebase/auth";
import { useAuth } from "@/context/AuthContext";
import { sendPhoneOtp, confirmAndLinkPhone } from "@/lib/firebase/phoneAuth";
import { AuthCard } from "@/components/ui/AuthCard";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const RECAPTCHA_CONTAINER_ID = "recaptcha-container";

export default function VerifyPhonePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSendOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Expect E.164 format, e.g. +14155551234 — validate/format with a
      // proper phone input component (e.g. react-phone-number-input) rather
      // than trusting free text in production.
      const result = await sendPhoneOtp(phone, RECAPTCHA_CONTAINER_ID);
      setConfirmation(result);
    } catch {
      setError("Couldn't send the code. Check the number and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!confirmation || !user) return;
    setLoading(true);
    try {
      await confirmAndLinkPhone(confirmation, otp, user);
      router.push("/dashboard");
    } catch {
      setError("That code didn't match. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <AuthCard title="Sign in required">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Please <a href="/login" className="text-brand-600 hover:underline dark:text-brand-300">sign in</a> first.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Verify your phone"
      subtitle={confirmation ? `Enter the code sent to ${phone}` : "We'll text you a one-time code."}
    >
      {!confirmation ? (
        <form onSubmit={handleSendOtp} className="space-y-4" noValidate>
          <Input
            label="Phone number"
            type="tel"
            name="phone"
            placeholder="+1 415 555 1234"
            autoComplete="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
          <div id={RECAPTCHA_CONTAINER_ID} />
          <Button type="submit" loading={loading}>
            Send code
          </Button>
        </form>
      ) : (
        <form onSubmit={handleConfirmOtp} className="space-y-4" noValidate>
          <Input
            label="6-digit code"
            type="text"
            name="otp"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
          {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
          <Button type="submit" loading={loading}>
            Verify
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
