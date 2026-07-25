"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function Contact() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form)),
      });
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section id="contact" className="mx-auto max-w-2xl px-6 py-20">
      <h2 className="font-display text-3xl font-bold text-slate-900 dark:text-white">Get in touch</h2>
      <p className="mt-3 text-slate-600 dark:text-slate-300">
        Questions about setting up a business or community wallet? Send us a note.
      </p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-white/70 p-6 backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
        <Input label="Name" name="name" required />
        <Input label="Email" name="email" type="email" required />
        <div className="space-y-1.5">
          <label htmlFor="message" className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Message
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={4}
            className="w-full rounded-xl border border-slate-200 bg-white/70 px-4 py-2.5 text-sm text-slate-900 backdrop-blur-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100"
          />
        </div>
        {status === "sent" && <p className="text-sm text-brand-600 dark:text-brand-300">Message sent — we'll get back to you soon.</p>}
        {status === "error" && <p className="text-sm text-red-500">Something went wrong. Please try again.</p>}
        <Button type="submit" loading={status === "sending"}>
          Send message
        </Button>
      </form>
    </section>
  );
}
