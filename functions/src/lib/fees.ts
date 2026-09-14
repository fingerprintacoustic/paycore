import { HttpsError } from "firebase-functions/v2/https";

export type FeeType = "flat" | "percent";

export interface FeeTier {
  minAmount: number; // cents, inclusive
  maxAmount: number | null; // cents, inclusive; null = open-ended (highest tier only)
  feeType: FeeType;
  feeValue: number; // cents if feeType is "flat"; basis points (1% = 100) if "percent"
}

const MAX_TIERS = 20;
const MAX_FLAT_FEE = 500_000_00; // same absolute ceiling as other admin-configurable amounts
const MAX_PERCENT_BPS = 5000; // 50% — a sane upper bound, not a realistic fee

/**
 * Validates admin-submitted fee tiers and returns them sorted by minAmount.
 * Tiers must not overlap, and only the highest tier may be open-ended
 * (maxAmount: null) — otherwise a gap or ambiguous overlap could leave a
 * transfer amount matching zero or multiple tiers.
 */
export function validateFeeTiers(value: unknown): FeeTier[] {
  if (!Array.isArray(value)) throw new HttpsError("invalid-argument", "transferFeeTiers must be an array.");
  if (value.length > MAX_TIERS) throw new HttpsError("invalid-argument", `No more than ${MAX_TIERS} fee tiers.`);

  const tiers = value.map((raw, i) => {
    if (typeof raw !== "object" || raw === null) throw new HttpsError("invalid-argument", `Tier ${i + 1} is invalid.`);
    const { minAmount, maxAmount, feeType, feeValue } = raw as Record<string, unknown>;

    if (!Number.isInteger(minAmount) || (minAmount as number) < 0) {
      throw new HttpsError("invalid-argument", `Tier ${i + 1}: "from" must be a non-negative whole number of cents.`);
    }
    if (maxAmount !== null && (!Number.isInteger(maxAmount) || (maxAmount as number) <= (minAmount as number))) {
      throw new HttpsError("invalid-argument", `Tier ${i + 1}: "to" must be blank (no limit) or greater than "from".`);
    }
    if (feeType !== "flat" && feeType !== "percent") {
      throw new HttpsError("invalid-argument", `Tier ${i + 1}: fee type must be "flat" or "percent".`);
    }
    if (!Number.isInteger(feeValue) || (feeValue as number) < 0) {
      throw new HttpsError("invalid-argument", `Tier ${i + 1}: fee must be a non-negative whole number.`);
    }
    if (feeType === "flat" && (feeValue as number) > MAX_FLAT_FEE) {
      throw new HttpsError("invalid-argument", `Tier ${i + 1}: flat fee is too large.`);
    }
    if (feeType === "percent" && (feeValue as number) > MAX_PERCENT_BPS) {
      throw new HttpsError("invalid-argument", `Tier ${i + 1}: percent fee can't exceed 50%.`);
    }

    return { minAmount, maxAmount, feeType, feeValue } as FeeTier;
  });

  const sorted = [...tiers].sort((a, b) => a.minAmount - b.minAmount);
  sorted.forEach((tier, i) => {
    const next: FeeTier | undefined = sorted[i + 1];
    if (tier.maxAmount === null && i !== sorted.length - 1) {
      throw new HttpsError("invalid-argument", "Only the highest fee tier can be open-ended (no \"to\" amount).");
    }
    if (next && tier.maxAmount !== null && next.minAmount <= tier.maxAmount) {
      throw new HttpsError("invalid-argument", "Fee tiers can't overlap.");
    }
  });

  return sorted;
}

/** The fee for a transfer of `amount` cents, given the admin's configured tiers. Never exceeds the amount itself. */
export function computeTransferFee(amount: number, tiers: FeeTier[]): number {
  const tier = tiers.find((t) => amount >= t.minAmount && (t.maxAmount === null || amount <= t.maxAmount));
  if (!tier) return 0;
  const fee = tier.feeType === "flat" ? tier.feeValue : Math.round((amount * tier.feeValue) / 10_000);
  return Math.min(fee, amount);
}
