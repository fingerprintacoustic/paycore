"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminCreditWalletFn,
  adminDebitWalletFn,
  freezeAccountFn,
  reactivateAccountFn,
} from "@/lib/firebase/adminFunctions";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function AdminUserActions({ uid, status }: { uid: string; status: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runAction(fn: () => Promise<unknown>) {
    setError(null);
    setBusy(true);
    try {
      await fn();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  const cents = Math.round(parseFloat(amount || "0") * 100);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h3 className="mb-3 font-display text-sm font-semibold text-white">Adjust balance</h3>
        <div className="space-y-3">
          <Input label="Amount" type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Input label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={busy || cents <= 0}
              onClick={() => runAction(() => adminCreditWalletFn({ targetUid: uid, amount: cents, note: note || undefined }))}
            >
              Credit
            </Button>
            <Button
              variant="secondary"
              disabled={busy || cents <= 0}
              onClick={() => runAction(() => adminDebitWalletFn({ targetUid: uid, amount: cents, note: note || undefined }))}
            >
              Debit
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h3 className="mb-3 font-display text-sm font-semibold text-white">Account status</h3>
        {status === "frozen" ? (
          <Button onClick={() => runAction(() => reactivateAccountFn({ targetUid: uid }))} disabled={busy}>
            Reactivate account
          </Button>
        ) : (
          <Button
            variant="secondary"
            className="border-red-500/40 text-red-300 hover:bg-red-500/10"
            onClick={() => runAction(() => freezeAccountFn({ targetUid: uid }))}
            disabled={busy}
          >
            Freeze account
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
