// Single source of truth for turning a persisted sale/booking's totals into
// the "Payment Breakdown" line list (Subtotal → discounts → tax → charges →
// wallet/points redemptions → Grand Total). Previously ViewBillModal.tsx
// re-derived this waterfall inline and SaleDetailModal.tsx just displayed a
// single flat Tax figure with no breakdown at all — two independent places
// that could (and did) drift out of sync with pricing.engine.ts's actual
// order of operations. Both now call this one function.
//
// Pure/presentation-agnostic: returns already-formatted [label, value,
// color] row tuples (byte-identical to what ViewBillModal always rendered),
// not JSX, so each caller keeps its own markup/CSS (drawer vs. plain modal)
// while sharing the one waterfall + formatting.

export interface TaxBreakdownEntry {
  name: string;
  rate: number;
  amount: number;
  inclusive?: boolean;
}

export interface BillBreakdownInput {
  currencySymbol: string;
  subtotal: number;
  couponDiscount?: number;
  couponCode?: string | null;
  // Sessions already paid for via a purchased package — pre-tax, excluded
  // from the taxable base the same way a membership discount is (see
  // pricing.engine.ts). Omit when the caller has no way to know this (e.g.
  // the Reports API's sale-detail response doesn't carry it today) — the
  // row simply won't render, matching pre-existing behavior there.
  packageCoveredAmount?: number;
  membershipPercentageDiscountAmount?: number;
  membershipLoyaltyDiscountAmount?: number;
  // Preferred: real per-tax-name breakdown (CGST/SGST/IGST...). Falls back
  // to legacyGstAmount when empty/absent — same fallback ViewBillModal
  // always used for a bill saved before per-tax breakdowns existed.
  taxBreakdown?: TaxBreakdownEntry[];
  legacyGstAmount?: number;
  legacyGstRate?: number;
  exCharges?: number;
  // Bill-level Svc/manual discount — a POST-tax deduction.
  discountAmount?: number;
  referralDiscount?: number;
  membershipWalletUsed?: number;
  ewalletUsed?: number;
  rewardPointsValue?: number;
  // Authoritative, already-rounded grand total this sale/booking was
  // actually charged — used only to derive the Round Off display row, never
  // recomputed from scratch (the persisted figure always wins).
  grandTotal: number;
}

export type BillBreakdownRow = [label: string, formattedValue: string, color: string];

export interface BillBreakdownResult {
  rows: BillBreakdownRow[];
  totalTaxAmount: number;
  roundOff: number;
}

function combineTaxRows(rows: TaxBreakdownEntry[]): { label: string; amount: number; rate: number } | null {
  if (rows.length === 0) return null;
  const amount = rows.reduce((s, t) => s + t.amount, 0);
  const rate = rows.reduce((s, t) => s + t.rate, 0);
  const isIgst = rows.some((t) => t.name.toUpperCase().includes("IGST"));
  const distinctNames = Array.from(new Set(rows.map((t) => t.name)));
  return { label: isIgst ? "IGST" : distinctNames.join(" + "), amount, rate };
}

export function computeBillBreakdown(input: BillBreakdownInput): BillBreakdownResult {
  const {
    currencySymbol: c, subtotal, couponDiscount = 0, couponCode, packageCoveredAmount = 0,
    membershipPercentageDiscountAmount = 0, membershipLoyaltyDiscountAmount = 0,
    taxBreakdown = [], legacyGstAmount = 0, legacyGstRate = 0,
    exCharges = 0, discountAmount = 0, referralDiscount = 0,
    membershipWalletUsed = 0, ewalletUsed = 0, rewardPointsValue = 0, grandTotal,
  } = input;

  const membershipDiscountAmount = membershipPercentageDiscountAmount + membershipLoyaltyDiscountAmount;

  const rawTaxRows = taxBreakdown.filter((t) => t.amount > 0);
  const exclusiveTaxRows = rawTaxRows.filter((t) => !t.inclusive);
  const inclusiveTaxRows = rawTaxRows.filter((t) => t.inclusive);
  const combinedExclusiveTax = combineTaxRows(exclusiveTaxRows);
  const combinedInclusiveTax = combineTaxRows(inclusiveTaxRows);
  // Legacy fallback: a sale/booking that only ever carried a single blended
  // gstAmount, never a real per-tax-name breakdown — no component name
  // survives from that era, so "GST" is the honest generic label rather
  // than guessing a CGST+SGST split that was never actually recorded.
  const legacyGst = (!combinedExclusiveTax && legacyGstAmount > 0)
    ? { label: "GST", amount: legacyGstAmount, rate: legacyGstRate }
    : null;
  const totalTaxAmount = combinedExclusiveTax?.amount ?? legacyGst?.amount ?? 0;

  // Same waterfall order as pricing.engine.ts's computeBillTotals: taxable
  // base excludes coupon/membership-discount/package-covered amounts (all
  // pre-tax), tax is added, then Svc Discount/Extra Charges/Referral/wallet
  // redemptions are applied post-tax, in that order.
  const taxable = Math.max(0, subtotal - couponDiscount - membershipDiscountAmount - packageCoveredAmount);
  const billTotal = taxable + totalTaxAmount;
  const afterSvcDiscount = Math.max(0, billTotal - discountAmount);
  const withCharges = afterSvcDiscount + exCharges;
  const afterReferral = Math.max(0, withCharges - referralDiscount);
  const rawTotal = Math.max(0, afterReferral - membershipWalletUsed - ewalletUsed - rewardPointsValue);
  const roundOff = grandTotal - rawTotal;

  const rows: BillBreakdownRow[] = ([
    subtotal ? ["Subtotal", `${c}${subtotal.toFixed(2)}`, "#6b7280"] : null,
    couponDiscount ? [`Coupon${couponCode ? ` (${couponCode})` : ""}`, `−${c}${couponDiscount.toFixed(2)}`, "#22c55e"] : null,
    packageCoveredAmount ? ["Package Covered", `−${c}${packageCoveredAmount.toFixed(2)}`, "#7c3aed"] : null,
    membershipPercentageDiscountAmount ? ["Membership Discount", `−${c}${membershipPercentageDiscountAmount.toFixed(2)}`, "#ef4444"] : null,
    membershipLoyaltyDiscountAmount ? ["Membership Loyalty", `−${c}${membershipLoyaltyDiscountAmount.toFixed(2)}`, "#ef4444"] : null,
    combinedExclusiveTax ? [`${combinedExclusiveTax.label} (${combinedExclusiveTax.rate}%)`, `+${c}${combinedExclusiveTax.amount.toFixed(2)}`, "#374151"] : null,
    combinedInclusiveTax ? [`${combinedInclusiveTax.label} (${combinedInclusiveTax.rate}%, incl.)`, `${c}${combinedInclusiveTax.amount.toFixed(2)}`, "#6b7280"] : null,
    legacyGst ? [`${legacyGst.label}${legacyGst.rate ? ` (${legacyGst.rate}%)` : ""}`, `+${c}${legacyGst.amount.toFixed(2)}`, "#374151"] : null,
    (combinedExclusiveTax || legacyGst) ? ["Total Tax", `${c}${totalTaxAmount.toFixed(2)}`, "#111827"] : null,
    ["Extra Charges", `+${c}${exCharges.toFixed(2)}`, "#374151"],
    discountAmount ? ["Discount", `−${c}${discountAmount.toFixed(2)}`, "#ef4444"] : null,
    referralDiscount ? ["Referral Discount", `−${c}${referralDiscount.toFixed(2)}`, "#22c55e"] : null,
    membershipWalletUsed ? ["Membership Wallet Used", `−${c}${membershipWalletUsed.toFixed(2)}`, "#15803d"] : null,
    ewalletUsed ? ["eWallet Used", `−${c}${ewalletUsed.toFixed(2)}`, "#2563eb"] : null,
    rewardPointsValue ? ["Reward Points Used", `−${c}${rewardPointsValue.toFixed(2)}`, "#7c3aed"] : null,
    Math.abs(roundOff) >= 0.005
      ? ["Round Off", `${roundOff >= 0 ? "+" : "-"}${c}${Math.abs(roundOff).toFixed(2)}`, "#6b7280"]
      : null,
  ] as Array<BillBreakdownRow | null>).filter((r): r is BillBreakdownRow => r !== null);

  return { rows, totalTaxAmount, roundOff };
}
