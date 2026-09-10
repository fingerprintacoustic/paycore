"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ConfirmationResult } from "firebase/auth";
import { useAuth } from "@/context/AuthContext";
import { sendPhoneOtp, confirmAndLinkPhone } from "@/lib/firebase/phoneAuth";
import { markPhoneVerifiedFn } from "@/lib/firebase/functions";
import { AuthCard } from "@/components/ui/AuthCard";
import { Input } from "@/components/ui/Input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Button } from "@/components/ui/Button";

function describeError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  const msg = err instanceof Error ? err.message : "";
  const hay = `${code} ${msg}`.toLowerCase();
  if (hay.includes("code-expired")) return "That code has expired — request a new one.";
  if (hay.includes("invalid-verification-code")) return "That code didn't match. Please try again.";
  if (hay.includes("provider-already-linked") || hay.includes("one identity for the given provider")) {
    return "This account already has a phone number linked — use “Finish setup” below to sync it.";
  }
  if (hay.includes("credential-already-in-use") || hay.includes("account-exists-with-different-credential")) {
    return "That number is already linked to a different account.";
  }
  if (hay.includes("app-check") || hay.includes("unauthenticated") || hay.includes("failed-precondition")) {
    return "Couldn't reach the server to finish verification. Refresh and try again.";
  }
  return `Verification failed${code ? ` (${code})` : ""}. Please try again.`;
}

export default function VerifyPhonePage() {
  const { user } = useAuth();
  const router = useRouter();
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);
  // Bump to remount the container between attempts so a fresh, empty element
  // is handed to each new RecaptchaVerifier.
  const [recaptchaKey, setRecaptchaKey] = useState(0);
  // Holds the final, properly-formatted E.164 number (e.g. "+263771234567"),
  // built by PhoneInput from whatever country + local number the user picks
  // and typed — sendPhoneOtp never sees raw, unformatted user input.
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSendOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!phone) {
      setError("Enter your phone number.");
      return;
    }
    setLoading(true);
    try {
      if (!recaptchaContainerRef.current) {
        throw new Error("reCAPTCHA container not mounted");
      }
      const result = await sendPhoneOtp(phone, recaptchaContainerRef.current);
      setConfirmation(result);
    } catch {
      setError("Couldn't send the code. Check the number and try again.");
      setRecaptchaKey((k) => k + 1);
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
      // The phone is now on the Auth record; flip the account to active and
      // sync phone/searchTokens so the dashboard, PIN, and transfers unlock.
      await markPhoneVerifiedFn({});
      router.push("/dashboard");
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }

  // When a phone is already on the Auth record, linkWithCredential can't run
  // again — but markPhoneVerified reads the Auth record directly, so it can
  // still sync Firestore (status + searchTokens). This recovers accounts
  // whose onboarding markPhoneVerified call was blocked (e.g. by App Check).
  async function handleFinishSetup() {
    setError(null);
    setLoading(true);
    try {
      await markPhoneVerifiedFn({});
      router.push("/dashboard");
    } catch (err) {
      setError(describeError(err));
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

  const linkedPhone = user.phoneNumber;

  return (
    <AuthCard
      title="Verify your phone"
      subtitle={
        linkedPhone
          ? `${linkedPhone} is on your account`
          : confirmation
            ? `Enter the code sent to ${phone}`
            : "We'll text you a one-time code."
      }
    >
      {linkedPhone ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            This number is verified with Firebase. If people still can't find you by phone,
            finish syncing it to your profile.
          </p>
          {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
          <Button type="button" loading={loading} onClick={handleFinishSetup}>
            Finish setup
          </Button>
        </div>
      ) : !confirmation ? (
        <form onSubmit={handleSendOtp} className="space-y-4" noValidate>
          <PhoneInput onChange={setPhone} required />
          {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
          <div key={recaptchaKey} ref={recaptchaContainerRef} />
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
