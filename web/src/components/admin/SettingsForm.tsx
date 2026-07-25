"use client";

import { useState, type FormEvent } from "react";
import { updateSettingsFn } from "@/lib/firebase/adminFunctions";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export interface GlobalSettings {
  maintenanceMode: boolean;
  minTransferAmount: number; // cents
  maxTransferAmount: number; // cents
  dailyTransferLimit: number; // cents
  withdrawalRequiresApproval: boolean;
}

export function SettingsForm({ initial }: { initial: GlobalSettings }) {
  const [settings, setSettings] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    try {
      await updateSettingsFn(settings as unknown as Record<string, unknown>);
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
      <Input
        label="Minimum transfer ($)"
        type="number"
        step="0.01"
        value={(settings.minTransferAmount / 100).toString()}
        onChange={(e) => setSettings((s) => ({ ...s, minTransferAmount: Math.round(parseFloat(e.target.value) * 100) }))}
      />
      <Input
        label="Maximum transfer ($)"
        type="number"
        step="0.01"
        value={(settings.maxTransferAmount / 100).toString()}
        onChange={(e) => setSettings((s) => ({ ...s, maxTransferAmount: Math.round(parseFloat(e.target.value) * 100) }))}
      />
      <Input
        label="Daily transfer limit ($)"
        type="number"
        step="0.01"
        value={(settings.dailyTransferLimit / 100).toString()}
        onChange={(e) => setSettings((s) => ({ ...s, dailyTransferLimit: Math.round(parseFloat(e.target.value) * 100) }))}
      />
      <label className="flex items-center gap-2 text-sm text-slate-200">
        <input
          type="checkbox"
          checked={settings.withdrawalRequiresApproval}
          onChange={(e) => setSettings((s) => ({ ...s, withdrawalRequiresApproval: e.target.checked }))}
        />
        Withdrawals require manual approval
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-200">
        <input
          type="checkbox"
          checked={settings.maintenanceMode}
          onChange={(e) => setSettings((s) => ({ ...s, maintenanceMode: e.target.checked }))}
        />
        Maintenance mode
      </label>
      {saved && <p className="text-sm text-brand-400">Saved.</p>}
      <Button type="submit" loading={busy}>
        Save settings
      </Button>
    </form>
  );
}
