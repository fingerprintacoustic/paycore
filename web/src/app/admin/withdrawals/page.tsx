import { adminDb } from "@/lib/firebase/admin";
import { WithdrawalRow } from "@/components/admin/WithdrawalRow";

async function getPendingWithdrawals() {
  const snap = await adminDb
    .collection("withdrawalRequests")
    .where("status", "==", "pending")
    .orderBy("requestedAt", "asc")
    .limit(50)
    .get();

  const rows = await Promise.all(
    snap.docs.map(async (d) => {
      const data = d.data();
      const userSnap = await adminDb.collection("users").doc(data.uid).get();
      return {
        requestId: d.id,
        amount: data.amount,
        payoutDetails: data.payoutDetails ?? {},
        displayName: userSnap.data()?.displayName ?? data.uid,
      };
    })
  );
  return rows;
}

export default async function AdminWithdrawalsPage() {
  const withdrawals = await getPendingWithdrawals();

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-white">Withdrawal requests</h1>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        {withdrawals.length === 0 ? (
          <p className="text-sm text-slate-500">No pending withdrawals.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {withdrawals.map((w) => (
              <WithdrawalRow key={w.requestId} {...w} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
