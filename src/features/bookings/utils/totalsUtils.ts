import type { DiscountType } from "../types";
import type { TaxRow } from "../../settings/utils/taxSettings";

export interface LineItem {
  price: number;
  qty: number;
  discount?: number;
  total?: number;
}

export interface TotalsInput {
  serviceRows: LineItem[];
  packageRows: LineItem[];
  productRows: LineItem[];
  membershipRows: LineItem[];
  discountType: DiscountType;
  discountValue: number;
  taxes: TaxRow[];
  exCharges: number;
  tip: number;
  couponDiscount: number;
  eWalletUsed: number;
  membershipWalletUsed?: number;
  // Split of membershipWalletUsed by bucket (services vs products — membership
  // wallet redemption never touches packages/memberships) — used to exclude the
  // covered portion from the taxable base below. When omitted, no bucket gets a
  // tax reduction (existing callers keep their current, pre-fix behavior).
  membershipServiceWalletUsed?: number;
  membershipProductWalletUsed?: number;
  // Own dedicated, spendable balances now — not folded into eWallet.
  rewardPointsRedeemedValue?: number; // ₹ value of the points being redeemed
  referralCreditUsed?: number;        // ₹
}

export interface TaxBreakdownEntry {
  name: string;
  rate: number;
  amount: number;
  inclusive: boolean;
}

export interface TotalsResult {
  // Pre-discount total: sum of price × qty across every row, before any
  // per-row "Disc %" is applied. Compare against `subtotal` to see how much
  // the per-row discounts saved (see itemDiscountTotal).
  catalogTotal: number;
  // catalogTotal − subtotal — the ₹ saved specifically by per-row "Disc %"
  // fields (Services & Items section), as opposed to manualDiscount below
  // which is the separate bill-level "Svc Discount" (Charges & Discounts
  // section). Both can be active at once and stack — this field lets the UI
  // show that breakdown explicitly instead of silently folding item-level
  // discounts into subtotal with no visible trace.
  itemDiscountTotal: number;
  subtotal: number;
  // Item-level manual discount ONLY (the %/flat field on the booking) —
  // excludes coupon/referral. Use this (not totalDisc) when sending a
  // "manual discount" figure anywhere downstream that separately also sends
  // couponDiscount — totalDisc already has coupon (and any other discount
  // folded into the couponDiscount input) baked in, so combining both would
  // double-count it.
  manualDiscount: number;
  totalDisc: number;
  taxable: number;
  // Sum of exclusive (add-on-top) tax amounts only — this is the portion
  // actually added into grandTotal. Inclusive taxes are already inside the
  // item price, so they don't add anything here (see taxBreakdown for both).
  gstAmount: number;
  taxBreakdown: TaxBreakdownEntry[];
  // Rounded to the nearest whole rupee — the actual amount the client is
  // billed. roundOff is the (small, +/-) adjustment that got folded in to
  // reach that whole number, shown as its own line wherever the bill breaks
  // down its total (TotalsPanel, quick-sale summary, printed receipt).
  grandTotal: number;
  roundOff: number;
  effectiveTotal: number; // grandTotal - eWalletUsed
}

function rowsTotal(rows: LineItem[]): number {
  return rows.reduce((s, r) => s + (r.total ?? r.price * (r.qty || 1)), 0);
}

function rowsCatalogTotal(rows: LineItem[]): number {
  return rows.reduce((s, r) => s + r.price * (r.qty || 1), 0);
}

type BucketType = "service" | "product" | "membership" | "packages";

function computeBucketTax(
  taxableBase: number,
  bucketType: BucketType,
  taxes: TaxRow[]
): { addOn: number; breakdown: TaxBreakdownEntry[] } {
  const applicable = taxes.filter((t) => t.applicable_for[bucketType] && t.tax_value > 0);
  const breakdown: TaxBreakdownEntry[] = [];
  let addOn = 0;

  const inclusiveTaxes = applicable.filter((t) => t.inclusive_taxes);
  const exclusiveTaxes = applicable.filter((t) => !t.inclusive_taxes);

  // Inclusive taxes are already baked into taxableBase — back them out
  // proportionally instead of adding on top.
  const inclusiveRateSum = inclusiveTaxes.reduce((s, t) => s + t.tax_value, 0);
  if (inclusiveRateSum > 0) {
    const inclusiveTotal = (taxableBase * inclusiveRateSum) / (100 + inclusiveRateSum);
    inclusiveTaxes.forEach((t) => {
      const amount = inclusiveTotal * (t.tax_value / inclusiveRateSum);
      breakdown.push({ name: t.tax_name, rate: t.tax_value, amount, inclusive: true });
    });
  }

  exclusiveTaxes.forEach((t) => {
    const amount = (taxableBase * t.tax_value) / 100;
    addOn += amount;
    breakdown.push({ name: t.tax_name, rate: t.tax_value, amount, inclusive: false });
  });

  return { addOn, breakdown };
}

function mergeBreakdown(entries: TaxBreakdownEntry[]): TaxBreakdownEntry[] {
  const byKey = new Map<string, TaxBreakdownEntry>();
  entries.forEach((e) => {
    const key = `${e.name}__${e.inclusive}`;
    const existing = byKey.get(key);
    if (existing) existing.amount += e.amount;
    else byKey.set(key, { ...e });
  });
  return Array.from(byKey.values());
}

export function computeTotals(input: TotalsInput): TotalsResult {
  const {
    serviceRows, packageRows, productRows, membershipRows,
    discountType, discountValue, taxes,
    exCharges, tip, couponDiscount, eWalletUsed, membershipWalletUsed = 0,
    membershipServiceWalletUsed = 0, membershipProductWalletUsed = 0,
    rewardPointsRedeemedValue = 0, referralCreditUsed = 0,
  } = input;

  const serviceBase    = rowsTotal(serviceRows);
  const packageBase    = rowsTotal(packageRows);
  const productBase    = rowsTotal(productRows);
  const membershipBase = rowsTotal(membershipRows);
  const subtotal = serviceBase + packageBase + productBase + membershipBase;

  const catalogTotal = rowsCatalogTotal(serviceRows) + rowsCatalogTotal(packageRows)
    + rowsCatalogTotal(productRows) + rowsCatalogTotal(membershipRows);
  const itemDiscountTotal = Math.max(0, catalogTotal - subtotal);

  const serviceTotal = serviceBase + packageBase + membershipBase;
  const itemDisc =
    discountType === "Percentage (%)"
      ? (serviceTotal * discountValue) / 100
      : discountValue;

  const manualDiscount = Math.max(0, itemDisc);
  const totalDisc = manualDiscount + Math.max(0, couponDiscount);
  const taxable   = Math.max(0, subtotal - totalDisc);

  // Allocate the total discount proportionally across item types (by share of
  // subtotal) so each bucket's post-discount amount is taxed, not its raw
  // pre-discount price. Bucket taxable amounts sum back to `taxable` exactly.
  const discRatio = subtotal > 0 ? Math.min(1, totalDisc / subtotal) : 0;
  const buckets: { type: BucketType; base: number }[] = [
    { type: "service",    base: serviceBase },
    { type: "packages",   base: packageBase },
    { type: "product",    base: productBase },
    { type: "membership", base: membershipBase },
  ];

  let gstAmount = 0;
  let allBreakdown: TaxBreakdownEntry[] = [];
  buckets.forEach(({ type, base }) => {
    if (base <= 0) return;
    let bucketTaxable = base - base * discRatio;
    // Membership-wallet-covered amounts are excluded from the taxable base too
    // (not just the discount ratio above) — that portion was never actually
    // charged to the client, so it shouldn't be taxed either. Deliberately NOT
    // subtracted from `taxable`/grandTotal elsewhere — effectiveTotal below
    // already subtracts the full membershipWalletUsed once; doing it here too
    // would double-count it.
    if (type === "service") bucketTaxable -= membershipServiceWalletUsed;
    if (type === "product") bucketTaxable -= membershipProductWalletUsed;
    bucketTaxable = Math.max(0, bucketTaxable);
    const { addOn, breakdown } = computeBucketTax(bucketTaxable, type, taxes);
    gstAmount += addOn;
    allBreakdown = allBreakdown.concat(breakdown);
  });

  const taxBreakdown = mergeBreakdown(allBreakdown);
  // Tip is collected from the client alongside the bill, but passed straight
  // through to staff — it must be part of what's actually charged here, even
  // though it's excluded from salon revenue further downstream (sales.total_amount).
  const rawGrandTotal = taxable + gstAmount + exCharges + tip;
  const grandTotal = Math.round(rawGrandTotal);
  const roundOff = grandTotal - rawGrandTotal;
  const effectiveTotal = Math.max(0, grandTotal - eWalletUsed - membershipWalletUsed - rewardPointsRedeemedValue - referralCreditUsed);

  return { catalogTotal, itemDiscountTotal, subtotal, manualDiscount, totalDisc, taxable, gstAmount, taxBreakdown, grandTotal, roundOff, effectiveTotal };
}
