"use client";

import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function ReceivePage() {
  const { user } = useAuth();
  const [requestAmount, setRequestAmount] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const payLink = useMemo(() => {
    if (!user || typeof window === "undefined") return "";
    const parsed = Number(requestAmount);
    const cents = Math.round(parsed * 100);
    if (!requestAmount) return `${window.location.origin}/pay/${user.uid}`;
    if (!Number.isFinite(parsed) || !Number.isSafeInteger(cents) || cents < 100 || cents > 50_000_000) return "";
    return `${window.location.origin}/pay/${user.uid}?amount=${cents}`;
  }, [user, requestAmount]);

  if (!user) return null;

  async function handleCopy() {
    if (!payLink) { setError("Enter an amount between $1.00 and $500,000.00, or leave it blank."); return; }
    try { await navigator.clipboard.writeText(payLink); setCopied(true); setError(null); setTimeout(() => setCopied(false), 2000); }
    catch { setError("Could not copy the link. Please copy it manually."); }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-white">Receive money</h1>
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white/70 p-8 backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
        {payLink ? <div className="rounded-2xl bg-white p-4 shadow-sm"><QRCodeSVG value={payLink} size={200} level="M" /></div> : <div className="flex h-[232px] w-[232px] items-center justify-center rounded-2xl border border-dashed border-slate-300 text-center text-sm text-slate-400">Enter a valid amount to generate the QR code.</div>}
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">Have someone scan this to send you money{requestAmount && payLink ? ` — requesting $${Number(requestAmount).toFixed(2)}` : ""}.</p>
        <div className="w-full space-y-3 border-t border-slate-100 pt-4 dark:border-white/10">
          <Input label="Request a specific amount (optional)" type="number" step="0.01" min="1" max="500000" value={requestAmount} onChange={(e) => setRequestAmount(e.target.value)} />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="button" variant="secondary" onClick={handleCopy}><span className="flex items-center gap-2">{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "Copied" : "Copy link"}</span></Button>
        </div>
      </div>
    </div>
  );
}
