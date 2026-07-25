import { adminDb } from "@/lib/firebase/admin";

async function getRecentTransactions() {
  const snap = await adminDb.collection("transactions").orderBy("createdAt", "desc").limit(100).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export default async function AdminTransactionsPage() {
  const transactions = await getRecentTransactions();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-white">Transactions</h1>
        <a
          href="/api/admin/reports/transactions"
          className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/5"
        >
          Export CSV
        </a>
      </div>
      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Reference</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-slate-200">
            {transactions.map((tx: any) => (
              <tr key={tx.id}>
                <td className="px-4 py-3 font-mono text-xs">{tx.referenceNumber}</td>
                <td className="px-4 py-3 capitalize">{tx.type}</td>
                <td className="px-4 py-3 capitalize">{tx.status}</td>
                <td className="px-4 py-3 font-mono">${(tx.amount / 100).toFixed(2)}</td>
                <td className="px-4 py-3 text-slate-400">{tx.createdAt.toDate().toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
