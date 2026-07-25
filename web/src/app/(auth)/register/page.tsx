"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AuthCard } from "@/components/ui/AuthCard";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function RegisterPage() {
  const { registerWithEmail } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 10) {
      setError("Password must be at least 10 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      await registerWithEmail(email, password);
      router.push("/verify-phone");
    } catch (err) {
      setError(err instanceof Error ? mapAuthError(err.message) : "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Create your account" subtitle="Takes about a minute.">
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
          autoComplete="new-password"
          required
          minLength={10}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          label="Confirm password"
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        {error && (
          <p role="alert" className="text-sm text-red-500">
            {error}
          </p>
        )}
        <Button type="submit" loading={loading}>
          Continue
        </Button>
      </form>
      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        Already have an account?{" "}
        <a href="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-300">
          Sign in
        </a>
      </p>
    </AuthCard>
  );
}

function mapAuthError(message: string): string {
  if (message.includes("email-already-in-use")) return "An account with this email already exists.";
  if (message.includes("weak-password")) return "Please choose a stronger password.";
  if (message.includes("invalid-email")) return "That email address doesn't look right.";
  return "Something went wrong. Please try again.";
}
