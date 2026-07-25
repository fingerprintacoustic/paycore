"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reviewWithdrawalFn } from "@/lib/firebase/adminFunctions";
import { Button } from "@/components/ui/Button";

export function WithdrawalRow({
  requestId,
  displayName,
  amount,
  payoutDetails,
}: {
  requestId: string;
  displayName: string;
  amount: number;
  payoutDetails: Record<string, string>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function decide(decision: "approved" | "rejected") {
    setBusy(true);
    try {
      await reviewWithdrawalFn({ requestId, decision });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex items-center justify-between gap-4 py-4">
      <div>
        <p className="text-sm font-medium text-white">{displayName}</p>
        <p className="text-xs text-slate-500">{JSON.stringify(payoutDetails)}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm text-white">${(amount / 100).toFixed(2)}</span>
        <Button variant="secondary" disabled={busy} onClick={() => decide("approved")} className="w-auto px-3 py-1.5 text-xs">
          Approve
        </Button>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => decide("rejected")}
          className="w-auto border-red-500/40 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10"
        >
          Reject
        </Button>
      </div>
    </li>
  );
}
