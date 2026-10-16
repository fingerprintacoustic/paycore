"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

export default function DemoReceivePage() {
  // Deferred to an effect so the QR encodes window.location.origin from
  // the browser (the actual deployed domain) rather than guessing it
  // during server rendering.
  const [payLink, setPayLink] = useState("");
  useEffect(() => {
    setPayLink(`${window.location.origin}/demo`);
  }, []);

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-white">Receive money</h1>
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white/70 p-8 backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
        {payLink ? (
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <QRCodeSVG value={payLink} size={200} level="M" />
          </div>
        ) : (
          <div className="h-[232px] w-[232px] animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
        )}
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          In your real wallet, this QR code and link are tied to your account — anyone who scans it can send you
          money directly. This sandbox code just points back to the demo.
        </p>
      </div>
    </div>
  );
}
