"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function ReceivePage() {
  const { user } = useAuth();
  const [requestAmount, setRequestAmount] = useState("");
  const [copied, setCopied] = useState(false);

  if (!user) return null;

  // Deep link the mobile app / web app can parse to prefill the send flow.
  // amount is optional — omit it for a generic "pay me" QR.
  const payLink = `https://paycore.app/pay/${user.uid}${requestAmount ? `?amount=${Math.round(parseFloat(requestAmount) * 100)}` : ""}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(payLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-white">Receive money</h1>

      <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white/70 p-8 backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <QRCodeSVG value={payLink} size={200} level="M" />
        </div>
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          Have someone scan this to send you money{requestAmount && ` — requesting $${requestAmount}`}.
        </p>

        <div className="w-full space-y-3 border-t border-slate-100 pt-4 dark:border-white/10">
          <Input
            label="Request a specific amount (optional)"
            type="number"
            step="0.01"
            min="0"
            value={requestAmount}
            onChange={(e) => setRequestAmount(e.target.value)}
          />
          <Button type="button" variant="secondary" onClick={handleCopy}>
            <span className="flex items-center gap-2">
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Copied" : "Copy link"}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
