import { adminDb } from "@/lib/firebase/admin";
import { DepositRow } from "@/components/admin/DepositRow";

async function getPendingDeposits() {
  const snap = await adminDb
    .collection("depositRequests")
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
        reference: data.reference ?? "",
        displayName: userSnap.data()?.displayName ?? data.uid,
      };
    })
  );
  return rows;
}

export default async function AdminDepositsPage() {
  const deposits = await getPendingDeposits();

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-white">Deposit requests</h1>
      <p className="text-sm text-slate-400">
        Each of these is a claim, not a verified payment — check the referenced payment before approving.
      </p>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        {deposits.length === 0 ? (
          <p className="text-sm text-slate-500">No pending deposit requests.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {deposits.map((d) => (
              <DepositRow key={d.requestId} {...d} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
