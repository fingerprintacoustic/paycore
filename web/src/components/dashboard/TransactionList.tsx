"use client";

import { ArrowDownLeft, ArrowUpRight, Landmark } from "lucide-react";
import { useTransactions } from "@/hooks/useTransactions";
import { formatMoney } from "@/hooks/useWallet";

function iconFor(type: string, direction: "in" | "out") {
  if (type === "deposit") return <Landmark size={16} />;
  return direction === "in" ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />;
}

export function TransactionList({ limit }: { limit?: number }) {
  const { transactions, loading } = useTransactions(limit ?? 20);

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-white/5" />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400 dark:border-white/10">
        No transactions yet — send or receive money to see activity here.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-100 dark:divide-white/5">
      {transactions.map((tx) => (
        <li key={tx.id} className="flex items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full ${
                tx.direction === "in" ? "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300" : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"
              }`}
            >
              {iconFor(tx.type, tx.direction)}
            </span>
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                {tx.type === "deposit" ? "Deposit" : tx.direction === "in" ? "Money received" : "Money sent"}
              </p>
              <p className="text-xs text-slate-400">
                {tx.referenceNumber} · {tx.createdAt.toLocaleDateString()}
              </p>
            </div>
          </div>
          <p
            className={`font-mono text-sm font-medium tabular-nums ${
              tx.direction === "in" ? "text-brand-700 dark:text-brand-300" : "text-slate-700 dark:text-slate-200"
            }`}
          >
            {tx.direction === "in" ? "+" : "−"}
            {formatMoney(tx.amount, tx.currency)}
          </p>
        </li>
      ))}
    </ul>
  );
}
