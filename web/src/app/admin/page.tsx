import { adminDb } from "@/lib/firebase/admin";
import { Timestamp, AggregateField } from "firebase-admin/firestore";
import { Users, Landmark, Clock, AlertTriangle } from "lucide-react";

async function getStats() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const todayCutoff = Timestamp.fromDate(startOfDay);

  const [
    userCountSnap,
    frozenCountSnap,
    pendingWithdrawalsSnap,
    todayTxSnap,
    balanceSumSnap,
  ] = await Promise.all([
    adminDb.collection("users").count().get(),
    adminDb.collection("users").where("status", "==", "frozen").count().get(),
    adminDb.collection("withdrawalRequests").where("status", "==", "pending").count().get(),
    adminDb.collection("transactions").where("createdAt", ">=", todayCutoff).count().get(),
    adminDb.collection("wallets").aggregate({ totalBalance: AggregateField.sum("balance") }).get(),
  ]);

  return {
    totalUsers: userCountSnap.data().count,
    frozenAccounts: frozenCountSnap.data().count,
    pendingWithdrawals: pendingWithdrawalsSnap.data().count,
    transactionsToday: todayTxSnap.data().count,
    totalBalance: balanceSumSnap.data().totalBalance ?? 0,
  };
}

export default async function AdminOverviewPage() {
  const stats = await getStats();

  const cards = [
    { label: "Total users", value: stats.totalUsers.toLocaleString(), icon: Users },
    { label: "Total wallet balance", value: `$${(stats.totalBalance / 100).toLocaleString()}`, icon: Landmark },
    { label: "Transactions today", value: stats.transactionsToday.toLocaleString(), icon: Clock },
    { label: "Pending withdrawals", value: stats.pendingWithdrawals.toLocaleString(), icon: AlertTriangle, alert: stats.pendingWithdrawals > 0 },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-white">Overview</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, alert }) => (
          <div
            key={label}
            className={`rounded-2xl border p-5 ${
              alert ? "border-amber-500/40 bg-amber-500/10" : "border-white/10 bg-white/5"
            }`}
          >
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${alert ? "bg-amber-500/20 text-amber-300" : "bg-brand-500/20 text-brand-300"}`}>
              <Icon size={18} />
            </span>
            <p className="mt-3 font-mono text-2xl font-semibold text-white">{value}</p>
            <p className="mt-1 text-sm text-slate-400">{label}</p>
          </div>
        ))}
      </div>
      {stats.frozenAccounts > 0 && (
        <p className="text-sm text-slate-400">
          {stats.frozenAccounts} account{stats.frozenAccounts === 1 ? "" : "s"} currently frozen.
        </p>
      )}
    </div>
  );
}
