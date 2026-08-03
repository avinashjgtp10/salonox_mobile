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
  // First-bill referral welcome discount — unlike couponDiscount above, this
  // is a POST-tax, POST-Svc-Discount deduction (applied after GST and after
  // the manual Svc Discount, before membership wallet/eWallet/reward points).
  // See preRedemptionTotal on TotalsResult for exactly where this lands.
  referralDiscount?: number;
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
  // The fully-reduced bill total — Svc Discount, Extra Charges/Tip, Referral
  // Discount, Membership Wallet, eWallet, and Reward Points have ALL already
  // been applied by the time this is produced. Rounded to the nearest whole
  // rupee — the single rounding point in the whole waterfall (see
  // preRedemptionTotal below). This IS what used to be a separate
  // `effectiveTotal`/"Amount to Pay" — there is no longer a distinct
  // "gross bill before redemptions" concept on this type.
  grandTotal: number;
  roundOff: number;
  // Raw (unrounded) bill total after Svc Discount + Extra Charges/Tip +
  // Referral Discount, but BEFORE membership wallet/eWallet/reward points are
  // subtracted. Callers use this (not grandTotal) as the ceiling to
  // sequentially cap those redemptions against what's actually still owed.
  // Never rounded, never shown as its own Sale Summary row.
  preRedemptionTotal: number;
  // Display-only: subtotal with membership-wallet-covered amounts already
  // netted out, so a service fully paid via membership wallet reads ₹0 here
  // too, matching its own row's ₹0 total.
  displaySubtotal: number;
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
    // `tip` (Staff Tip) is intentionally not destructured — it's display/
    // record-only and never affects any total computed here.
    exCharges, couponDiscount, referralDiscount = 0, eWalletUsed, membershipWalletUsed = 0,
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

  // "Svc Discount" (discountType/discountValue) is a POST-tax deduction —
  // applied to the bill total AFTER GST, not the pre-tax subtotal — matching
  // the backend's pricing.engine.ts computeBillTotals. Coupon discount is
  // unaffected and still reduces the taxable base as before; only this field
  // moved (see manualDiscount/billTotal below, after the tax bucket loop).
  const totalDisc = Math.max(0, couponDiscount);
  const taxable   = Math.max(0, subtotal - totalDisc);

  // Allocate the coupon discount proportionally across item types (by share of
  // subtotal) so each bucket's post-discount amount is taxed, not its raw
  // pre-discount price. Svc Discount no longer participates here (post-tax now).
  const discRatio = subtotal > 0 ? Math.min(1, totalDisc / subtotal) : 0;
  const buckets: { type: BucketType; base: number }[] = [
    { type: "service",    base: serviceBase },
    { type: "packages",   base: packageBase },
    { type: "product",    base: productBase },
    { type: "membership", base: membershipBase },
  ];

  let gstAmount = 0;
  // Exclusive-tax add-on for service+packages+membership only (never product)
  // — feeds the percentage-type Svc Discount's base below, which (matching
  // the pre-existing "never product" rule) needs to be a POST-tax figure now.
  let nonProductExclusiveGst = 0;
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
    if (type !== "product") nonProductExclusiveGst += addOn;
    allBreakdown = allBreakdown.concat(breakdown);
  });

  const taxBreakdown = mergeBreakdown(allBreakdown);

  // "Bill Total" — subtotal (after coupon discount) plus GST, BEFORE Svc
  // Discount. Svc Discount is a bill-level deduction applied here, after tax.
  const billTotal = taxable + gstAmount;
  // Nets out membership-wallet coverage already excluded from the tax base
  // above, so a row already fully covered by the wallet doesn't inflate the
  // % base for a discount that has nothing left to reduce there.
  const serviceTotal = (serviceBase - membershipServiceWalletUsed) + packageBase + membershipBase;
  const svcDiscountBase = serviceTotal + nonProductExclusiveGst;
  const itemDisc =
    discountType === "Percentage (%)"
      ? (svcDiscountBase * discountValue) / 100
      : discountValue;
  const manualDiscount = Math.max(0, itemDisc);

  const afterSvcDiscount = Math.max(0, billTotal - manualDiscount);
  // Extra Charges are excluded from the Bill Discount base above — added here,
  // after the discount, not before. `tip` (Staff Tip) is deliberately NOT
  // added — it's a display-only, record-only figure shown as its own Sale
  // Summary row, never collected as part of the bill and never affecting
  // Grand Total, matching sales.total_amount (revenue) which already
  // excludes it on the backend.
  const withCharges = afterSvcDiscount + exCharges;

  // Referral Discount is a POST-tax, POST-Svc-Discount deduction — applied
  // here, not folded into the pre-tax coupon discount above.
  const referralDisc = Math.max(0, referralDiscount);
  // Raw (unrounded) ceiling for the sequential Membership Wallet → eWallet →
  // Reward Points → Referral Credit capping done by callers. Never rounded,
  // never shown as its own Sale Summary row.
  const preRedemptionTotal = Math.max(0, withCharges - referralDisc);

  // Every remaining deduction happens here, still in raw/unrounded form —
  // rounding happens exactly once, at the very end, not partway through.
  const rawFinalTotal = Math.max(0, preRedemptionTotal
    - membershipWalletUsed - eWalletUsed - rewardPointsRedeemedValue - referralCreditUsed);
  const grandTotal = Math.round(rawFinalTotal);
  const roundOff = grandTotal - rawFinalTotal;

  // Display-only — see TotalsResult.displaySubtotal doc comment.
  const displaySubtotal = Math.max(0, subtotal - membershipWalletUsed);

  return {
    catalogTotal, itemDiscountTotal, subtotal, manualDiscount, totalDisc: manualDiscount + totalDisc,
    taxable, gstAmount, taxBreakdown, grandTotal, roundOff, preRedemptionTotal, displaySubtotal,
  };
}
