"use client";

import { useWallet, formatMoney } from "@/hooks/useWallet";
import { AlertTriangle } from "lucide-react";

export function BalanceCard() {
  const { wallet, loading } = useWallet();

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/40 bg-gradient-to-br from-brand-600 to-brand-900 p-6 text-white shadow-xl dark:border-white/10">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <p className="text-sm font-medium text-brand-100">Available balance</p>
      {loading ? (
        <div className="mt-3 h-10 w-48 animate-pulse rounded-lg bg-white/20" />
      ) : (
        <p className="mt-2 font-mono text-4xl font-medium tabular-nums tracking-tight">
          {wallet ? formatMoney(wallet.balance, wallet.currency) : "—"}
        </p>
      )}
      {wallet?.status === "frozen" && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-sm">
          <AlertTriangle size={16} />
          Your wallet is frozen. Contact support for help.
        </div>
      )}
    </div>
  );
}
