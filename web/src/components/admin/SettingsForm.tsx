"use client";

import { useState, type FormEvent } from "react";
import { updateSettingsFn } from "@/lib/firebase/adminFunctions";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export type FeeType = "flat" | "percent";

export interface FeeTier {
  minAmount: number; // cents, inclusive
  maxAmount: number | null; // cents, inclusive; null = no upper bound
  feeType: FeeType;
  feeValue: number; // cents if feeType is "flat"; basis points (1% = 100) if "percent"
}

export interface GlobalSettings {
  maintenanceMode: boolean;
  minTransferAmount: number; // cents
  maxTransferAmount: number; // cents
  dailyTransferLimit: number; // cents
  withdrawalRequiresApproval: boolean;
  transferFeeTiers: FeeTier[];
}

// A starting point matching a typical small/medium/large tiering — the
// admin is free to edit, add, or remove any of these before saving.
const EXAMPLE_TIERS: FeeTier[] = [
  { minAmount: 100, maxAmount: 999, feeType: "flat", feeValue: 10 }, // $1.00–$9.99: $0.10 flat
  { minAmount: 1000, maxAmount: 5000, feeType: "percent", feeValue: 250 }, // $10–$50: 2.5%
  { minAmount: 5001, maxAmount: 10000, feeType: "percent", feeValue: 200 }, // $50.01–$100: 2%
  { minAmount: 10001, maxAmount: 50000, feeType: "percent", feeValue: 150 }, // $100.01–$500: 1.5%
  { minAmount: 50001, maxAmount: 100000, feeType: "percent", feeValue: 125 }, // $500.01–$1,000: 1.25%
  { minAmount: 100001, maxAmount: null, feeType: "percent", feeValue: 100 }, // $1,000.01+: 1%
];

function blankTier(startingAt: number): FeeTier {
  return { minAmount: startingAt, maxAmount: null, feeType: "percent", feeValue: 100 };
}

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

function inputToCents(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) ? Math.max(0, Math.round(n * 100)) : 0;
}

export function SettingsForm({ initial }: { initial: GlobalSettings }) {
  const [settings, setSettings] = useState<GlobalSettings>(initial);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    setError(null);
    try {
      await updateSettingsFn(settings as unknown as Record<string, unknown>);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings.");
    } finally {
      setBusy(false);
    }
  }

  function updateTier(index: number, patch: Partial<FeeTier>) {
    setSettings((s) => ({
      ...s,
      transferFeeTiers: s.transferFeeTiers.map((t, i) => (i === index ? { ...t, ...patch } : t)),
    }));
  }

  function addTier() {
    const last = settings.transferFeeTiers[settings.transferFeeTiers.length - 1];
    const startingAt = last ? (last.maxAmount ?? last.minAmount) + 1 : 100;
    setSettings((s) => ({ ...s, transferFeeTiers: [...s.transferFeeTiers, blankTier(startingAt)] }));
  }

  function removeTier(index: number) {
    setSettings((s) => ({ ...s, transferFeeTiers: s.transferFeeTiers.filter((_, i) => i !== index) }));
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div className="max-w-md space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
        <Input
          label="Minimum transfer ($)"
          type="number"
          step="0.01"
          value={centsToInput(settings.minTransferAmount)}
          onChange={(e) => setSettings((s) => ({ ...s, minTransferAmount: inputToCents(e.target.value) }))}
        />
        <Input
          label="Maximum transfer ($)"
          type="number"
          step="0.01"
          value={centsToInput(settings.maxTransferAmount)}
          onChange={(e) => setSettings((s) => ({ ...s, maxTransferAmount: inputToCents(e.target.value) }))}
        />
        <Input
          label="Daily transfer limit ($)"
          type="number"
          step="0.01"
          value={centsToInput(settings.dailyTransferLimit)}
          onChange={(e) => setSettings((s) => ({ ...s, dailyTransferLimit: inputToCents(e.target.value) }))}
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
      </div>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-white">Transfer fees</h2>
            <p className="mt-1 text-xs text-slate-400">
              Charged on top of what the sender enters — the recipient always gets the full amount. Tiers apply by the
              transfer amount, so a $20 send and a $2,000 send can carry different fees. No tiers means transfers are free.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSettings((s) => ({ ...s, transferFeeTiers: EXAMPLE_TIERS }))}
            className="shrink-0 text-xs font-medium text-brand-400 hover:underline"
          >
            Use example tiers
          </button>
        </div>

        {settings.transferFeeTiers.length === 0 && (
          <p className="text-sm text-slate-500">No fee tiers configured — transfers are free.</p>
        )}

        <div className="space-y-3">
          {settings.transferFeeTiers.map((tier, i) => (
            <div key={i} className="grid grid-cols-2 gap-3 rounded-xl border border-white/10 p-4 sm:grid-cols-5 sm:items-end">
              <Input
                label="From ($)"
                type="number"
                step="0.01"
                min="0"
                value={centsToInput(tier.minAmount)}
                onChange={(e) => updateTier(i, { minAmount: inputToCents(e.target.value) })}
              />
              <Input
                label="To ($, blank = no limit)"
                type="number"
                step="0.01"
                min="0"
                placeholder="No limit"
                value={tier.maxAmount === null ? "" : centsToInput(tier.maxAmount)}
                onChange={(e) => updateTier(i, { maxAmount: e.target.value === "" ? null : inputToCents(e.target.value) })}
              />
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-200">
                Fee type
                <select
                  value={tier.feeType}
                  onChange={(e) => updateTier(i, { feeType: e.target.value as FeeType })}
                  className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-sm text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                >
                  <option value="percent">Percent</option>
                  <option value="flat">Flat</option>
                </select>
              </label>
              <Input
                label={tier.feeType === "flat" ? "Fee ($)" : "Fee (%)"}
                type="number"
                step="0.01"
                min="0"
                value={centsToInput(tier.feeValue)}
                onChange={(e) => updateTier(i, { feeValue: inputToCents(e.target.value) })}
              />
              <Button type="button" variant="secondary" onClick={() => removeTier(i)}>
                Remove
              </Button>
            </div>
          ))}
        </div>

        <Button type="button" variant="secondary" onClick={addTier}>
          + Add tier
        </Button>
      </div>

      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
      {saved && <p className="text-sm text-brand-400">Saved.</p>}
      <Button type="submit" loading={busy}>
        Save settings
      </Button>
    </form>
  );
}
