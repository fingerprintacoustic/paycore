import { TransactionList } from "@/components/dashboard/TransactionList";

export default function WalletHistoryPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-white">Wallet history</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your latest wallet activity.</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white/70 p-5 backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
        <TransactionList limit={100} />
      </div>
    </div>
  );
}
