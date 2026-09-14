import { computeTransferFee, validateFeeTiers, type FeeTier } from "../lib/fees";

const TIERS: FeeTier[] = [
  { minAmount: 100, maxAmount: 999, feeType: "flat", feeValue: 10 }, // $1–$9.99: $0.10 flat
  { minAmount: 1000, maxAmount: 5000, feeType: "percent", feeValue: 250 }, // $10–$50: 2.5%
  { minAmount: 5001, maxAmount: null, feeType: "percent", feeValue: 100 }, // $50.01+: 1%
];

describe("computeTransferFee", () => {
  it("returns 0 when there are no tiers configured", () => {
    expect(computeTransferFee(5000, [])).toBe(0);
  });

  it("applies a flat fee for a tier that matches", () => {
    expect(computeTransferFee(500, TIERS)).toBe(10); // $5.00 -> $0.10 flat
  });

  it("applies a percent fee, rounded to the nearest cent", () => {
    expect(computeTransferFee(3333, TIERS)).toBe(83); // $33.33 * 2.5% = 83.325 -> 83
  });

  it("applies the open-ended top tier to large amounts", () => {
    expect(computeTransferFee(1_000_000, TIERS)).toBe(10_000); // $10,000 * 1%
  });

  it("returns 0 for an amount below every tier's minimum", () => {
    expect(computeTransferFee(50, TIERS)).toBe(0); // $0.50, below the $1.00 floor
  });

  it("never charges more than the transfer amount itself", () => {
    const runaway: FeeTier[] = [{ minAmount: 0, maxAmount: null, feeType: "percent", feeValue: 20_000 }]; // 200%, clamped by validation normally
    expect(computeTransferFee(100, runaway)).toBe(100);
  });
});

describe("validateFeeTiers", () => {
  it("accepts a well-formed, non-overlapping set of tiers", () => {
    expect(validateFeeTiers(TIERS)).toEqual(TIERS);
  });

  it("sorts tiers by minAmount regardless of input order", () => {
    const shuffled = [TIERS[2], TIERS[0], TIERS[1]];
    expect(validateFeeTiers(shuffled)).toEqual(TIERS);
  });

  it("rejects a non-array value", () => {
    expect(() => validateFeeTiers({})).toThrow(/must be an array/);
  });

  it("rejects a tier with maxAmount not greater than minAmount", () => {
    expect(() =>
      validateFeeTiers([{ minAmount: 1000, maxAmount: 500, feeType: "flat", feeValue: 10 }])
    ).toThrow(/must be blank .* or greater than/);
  });

  it("rejects overlapping tiers", () => {
    expect(() =>
      validateFeeTiers([
        { minAmount: 0, maxAmount: 1000, feeType: "flat", feeValue: 10 },
        { minAmount: 500, maxAmount: 2000, feeType: "flat", feeValue: 10 },
      ])
    ).toThrow(/overlap/);
  });

  it("rejects more than one open-ended tier", () => {
    expect(() =>
      validateFeeTiers([
        { minAmount: 0, maxAmount: null, feeType: "flat", feeValue: 10 },
        { minAmount: 1000, maxAmount: null, feeType: "flat", feeValue: 10 },
      ])
    ).toThrow(/open-ended/);
  });

  it("rejects an unknown fee type", () => {
    expect(() =>
      validateFeeTiers([{ minAmount: 0, maxAmount: 1000, feeType: "weird", feeValue: 10 }])
    ).toThrow(/flat.*or.*percent/);
  });

  it("rejects a percent fee above 50%", () => {
    expect(() =>
      validateFeeTiers([{ minAmount: 0, maxAmount: null, feeType: "percent", feeValue: 5001 }])
    ).toThrow(/50%/);
  });

  it("rejects a negative minAmount", () => {
    expect(() =>
      validateFeeTiers([{ minAmount: -100, maxAmount: null, feeType: "flat", feeValue: 10 }])
    ).toThrow(/non-negative/);
  });

  it("rejects more than 20 tiers", () => {
    const many = Array.from({ length: 21 }, (_, i) => ({
      minAmount: i * 100,
      maxAmount: i * 100 + 99,
      feeType: "flat" as const,
      feeValue: 5,
    }));
    expect(() => validateFeeTiers(many)).toThrow(/No more than/);
  });
});
