import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { AdminUserActions } from "@/components/admin/AdminUserActions";

async function getUserDetail(uid: string) {
  const [userSnap, walletSnap, sentSnap, receivedSnap] = await Promise.all([
    adminDb.collection("users").doc(uid).get(),
    adminDb.collection("wallets").doc(uid).get(),
    adminDb.collection("transactions").where("fromUid", "==", uid).orderBy("createdAt", "desc").limit(10).get(),
    adminDb.collection("transactions").where("toUid", "==", uid).orderBy("createdAt", "desc").limit(10).get(),
  ]);

  if (!userSnap.exists) return null;

  const transactions = [...sentSnap.docs, ...receivedSnap.docs]
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
    .slice(0, 10);

  return { user: userSnap.data()!, wallet: walletSnap.data(), transactions };
}

export default async function AdminUserDetailPage({ params }: { params: { uid: string } }) {
  const detail = await getUserDetail(params.uid);
  if (!detail) notFound();
  const { user, wallet, transactions } = detail;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white">{user.displayName}</h1>
          <p className="text-sm text-slate-400">
            {user.email} {user.phone ? `· ${user.phone}` : ""}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm text-slate-400">Wallet balance</p>
          <p className="mt-1 font-mono text-3xl font-medium text-white">
            {wallet ? `$${(wallet.balance / 100).toLocaleString()}` : "—"}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-3 font-display text-sm font-semibold text-white">Recent transactions</h2>
          {transactions.length === 0 ? (
            <p className="text-sm text-slate-500">No transactions yet.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {transactions.map((tx: any) => (
                <li key={tx.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-slate-300">{tx.referenceNumber}</span>
                  <span className="font-mono text-slate-200">${(tx.amount / 100).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div>
        <AdminUserActions uid={params.uid} status={user.status} />
      </div>
    </div>
  );
}
