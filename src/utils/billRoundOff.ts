// Mirrors the web's computeBillBreakdown (components/shared/billBreakdown.ts)
// round-off: the persisted, already-rounded total minus the same bill
// waterfall recomputed from its parts. Shown only when it is at least half a paisa.

type TaxEntry = { amount: number; inclusive: boolean };

export type BillRoundOffInput = {
  couponDiscount?: number;
  discountAmount?: number;
  ewalletUsed?: number;
  exCharges?: number;
  /** Amount actually left to collect after redemptions, already rounded. */
  grandTotal: number;
  legacyTaxAmount?: number;
  membershipDiscount?: number;
  membershipWalletUsed?: number;
  referralDiscount?: number;
  rewardPointsValue?: number;
  subtotal: number;
  taxBreakdown?: unknown;
};

const num = (value: unknown) => {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : 0;
};

const toTaxEntries = (value: unknown): TaxEntry[] =>
  (Array.isArray(value) ? value : []).flatMap((entry) => {
    const record = entry as { amount?: unknown; inclusive?: unknown } | null;
    const amount = num(record?.amount);
    return amount > 0 ? [{ amount, inclusive: record?.inclusive === true }] : [];
  });

export function computeBillRoundOff(input: BillRoundOffInput): number {
  const exclusiveTax = toTaxEntries(input.taxBreakdown).filter((entry) => !entry.inclusive);
  // Same legacy fallback as the web: a single blended tax amount when no
  // per-tax breakdown was recorded.
  const totalTax = exclusiveTax.length
    ? exclusiveTax.reduce((sum, entry) => sum + entry.amount, 0)
    : num(input.legacyTaxAmount);

  const taxable = Math.max(0, num(input.subtotal) - num(input.couponDiscount) - num(input.membershipDiscount));
  const afterDiscount = Math.max(0, taxable + totalTax - num(input.discountAmount));
  const afterReferral = Math.max(0, afterDiscount + num(input.exCharges) - num(input.referralDiscount));
  const rawTotal = Math.max(
    0,
    afterReferral - num(input.membershipWalletUsed) - num(input.ewalletUsed) - num(input.rewardPointsValue),
  );
  const roundOff = num(input.grandTotal) - rawTotal;
  return Math.abs(roundOff) >= 0.005 ? Math.round(roundOff * 100) / 100 : 0;
}
