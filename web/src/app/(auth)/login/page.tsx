"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AuthCard } from "@/components/ui/AuthCard";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

// Only same-origin absolute paths are safe redirect targets. Reject anything
// that could escape the origin: absolute URLs, protocol-relative ("//evil.com"),
// and backslash variants ("/\evil.com", which some browsers normalise to "//").
function safeNext(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return null;
  try {
    const u = new URL(raw, "http://localhost");
    if (u.origin !== "http://localhost") return null;
    const path = u.pathname + u.search + u.hash;
    return path.startsWith("//") ? null : path;
  } catch {
    return null;
  }
}

export default function LoginPage() {
  const { signIn, resetPassword } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [loading, setLoading] = useState(false);

  // Until the client has hydrated, this form's onSubmit handler isn't attached
  // and a click would trigger a native GET submission — a silent reload to
  // /login?email=…&password=… (credentials in the URL). Gating the submit
  // button on hydration makes a pre-hydration click a no-op instead. The
  // middleware bounces every signed-out visitor here via a full document load,
  // so that window is always in play, and it's seconds wide under `next dev`.
  const [hydrated, setHydrated] = useState(false);
  const [nextPath, setNextPath] = useState<string | null>(null);
  useEffect(() => {
    setHydrated(true);
    setNextPath(safeNext(new URLSearchParams(window.location.search).get("next")));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
      router.push(nextPath ?? "/dashboard");
    } catch {
      // Deliberately generic — don't reveal whether the email exists.
      setError("Incorrect email or password.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      setError("Enter your email above first, then tap 'Forgot password'.");
      return;
    }
    await resetPassword(email);
    setResetSent(true);
  }

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to your account.">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          revealable
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
        {resetSent && (
          <p role="status" className="text-sm text-brand-600 dark:text-brand-300">
            Password reset email sent — check your inbox.
          </p>
        )}
        <Button type="submit" loading={loading} disabled={!hydrated}>
          Sign in
        </Button>
        <button
          type="button"
          onClick={handleForgotPassword}
          className="w-full text-center text-sm text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-300"
        >
          Forgot password?
        </button>
      </form>
      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        New here?{" "}
        <a href="/register" className="font-medium text-brand-600 hover:underline dark:text-brand-300">
          Create an account
        </a>
      </p>
    </AuthCard>
  );
}
