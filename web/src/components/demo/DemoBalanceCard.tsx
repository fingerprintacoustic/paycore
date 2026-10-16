"use client";

import { useDemoWallet } from "@/lib/demo/store";
import { formatMoney } from "@/hooks/useWallet";

export function DemoBalanceCard() {
  const { wallet } = useDemoWallet();

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/40 bg-gradient-to-br from-brand-600 to-brand-900 p-6 text-white shadow-xl dark:border-white/10">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <p className="text-sm font-medium text-brand-100">Available balance</p>
      <p className="mt-2 font-mono text-4xl font-medium tabular-nums tracking-tight">
        {formatMoney(wallet.balance, wallet.currency)}
      </p>
    </div>
  );
}
