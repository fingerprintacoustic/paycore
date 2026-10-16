import { DemoBalanceCard } from "@/components/demo/DemoBalanceCard";
import { DemoQuickActions } from "@/components/demo/DemoQuickActions";
import { DemoTransactionList } from "@/components/demo/DemoTransactionList";

export default function DemoDashboardPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <DemoBalanceCard />
      <DemoQuickActions />
      <div className="rounded-2xl border border-slate-200 bg-white/70 p-5 backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
        <h2 className="mb-2 font-display text-base font-semibold text-slate-800 dark:text-slate-100">
          Recent activity
        </h2>
        <DemoTransactionList limit={10} />
      </div>
    </div>
  );
}
