import { BalanceCard } from "@/components/dashboard/BalanceCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { TransactionList } from "@/components/dashboard/TransactionList";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BalanceCard />
      <QuickActions />
      <div className="rounded-2xl border border-slate-200 bg-white/70 p-5 backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
        <h2 className="mb-2 font-display text-base font-semibold text-slate-800 dark:text-slate-100">
          Recent activity
        </h2>
        <TransactionList limit={10} />
      </div>
    </div>
  );
}
