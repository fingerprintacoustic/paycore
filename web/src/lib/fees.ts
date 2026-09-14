export type FeeType = "flat" | "percent";

export interface FeeTier {
  minAmount: number; // cents, inclusive
  maxAmount: number | null; // cents, inclusive; null = open-ended
  feeType: FeeType;
  feeValue: number; // cents if "flat"; basis points (1% = 100) if "percent"
}

/**
 * Client-side mirror of functions/src/lib/fees.ts#computeTransferFee, used
 * only to preview the fee before confirming a send. The Cloud Function
 * recomputes and enforces the real fee server-side — this is UX, not the
 * source of truth.
 */
export function computeTransferFee(amount: number, tiers: FeeTier[]): number {
  const tier = tiers.find((t) => amount >= t.minAmount && (t.maxAmount === null || amount <= t.maxAmount));
  if (!tier) return 0;
  const fee = tier.feeType === "flat" ? tier.feeValue : Math.round((amount * tier.feeValue) / 10_000);
  return Math.min(fee, amount);
}
