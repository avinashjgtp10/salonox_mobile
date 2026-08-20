import type { DiscountScope, DiscountType } from "../types";
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
  // Which buckets the bill-level discount applies to (the "Apply to"
  // checkboxes), as stored on the appointment.
  //
  // UNDEFINED = legacy scope, and it is NOT equivalent to passing
  // ["service","packages","membership"]: percentage hits service+packages+
  // membership, but flat is UNCAPPED and so reaches product value too. That
  // inconsistency is the bug this field fixes, but bills predating the
  // appointments.discount_applies_to column were genuinely charged under it,
  // so replaying one (a receipt reprint, ViewBillModal) has to reproduce it
  // rather than re-price it. Mirrors the backend engine exactly — see
  // ComputeBillTotalsInput.discountAppliesTo.
  //
  // "bill" is an exclusive scope meaning the whole bill total rather than a
  // sum of buckets; when present the bucket names are ignored.
  discountAppliesTo?: DiscountScope[];
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
  // Post-tax value the bill discount was computed against (selected buckets'
  // totals + their exclusive GST) — mirrors BillTotalsResult.discountBase.
  discountBase: number;
  totalDisc: number;
  taxable: number;
  // Sum of exclusive (add-on-top) tax amounts only — this is the portion
  // actually added into grandTotal. Inclusive taxes are already inside the
  // item price, so they don't add anything here (see taxBreakdown for both).
  gstAmount: number;
  taxBreakdown: TaxBreakdownEntry[];
  // Taxable base + exclusive GST, i.e. the bill total at the moment tax has
  // been added but BEFORE any post-tax deduction (Svc/Bill Discount, Extra
  // Charges, Referral, wallets, points). Shown as the "Total Bill" Sale
  // Summary row directly under the GST rows.
  billTotal: number;
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
    discountType, discountValue, discountAppliesTo, taxes,
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

  // Bill-discount scope — `legacyDiscountScope` gates the flat cap below, the
  // one place the new rule and the old one diverge for an otherwise identical
  // bucket selection. See TotalsInput.discountAppliesTo.
  const legacyDiscountScope = discountAppliesTo === undefined;
  const discountScope = new Set<DiscountScope>(
    discountAppliesTo ?? ["service", "packages", "membership"],
  );
  // Whole-bill scope short-circuits the per-bucket base below — billTotal
  // already includes all GST, so selectedExclusiveGst stays unused there.
  const wholeBillScope = discountScope.has("bill");

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
  // Exclusive-tax add-on for the buckets the bill discount actually applies
  // to — feeds that discount's base below, which needs to be a POST-tax
  // figure. Follows `discountScope`, so ticking Product discounts the
  // product's tax as well as its price.
  let selectedExclusiveGst = 0;
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
    if (discountScope.has(type)) selectedExclusiveGst += addOn;
    allBreakdown = allBreakdown.concat(breakdown);
  });

  const taxBreakdown = mergeBreakdown(allBreakdown);

  // "Bill Total" — subtotal (after coupon discount) plus GST, BEFORE Svc
  // Discount. Svc Discount is a bill-level deduction applied here, after tax.
  const billTotal = taxable + gstAmount;
  // The bill discount's base: the selected buckets' POST-tax value, netting
  // out membership-wallet coverage already excluded from the tax base above so
  // a row already fully covered by the wallet doesn't inflate the base for a
  // discount that has nothing left to reduce there. Each bucket floors at 0 on
  // its own so an over-covered bucket can't eat another bucket's value.
  const selectedBucketBase =
    (discountScope.has("service") ? Math.max(0, serviceBase - membershipServiceWalletUsed) : 0)
    + (discountScope.has("packages") ? Math.max(0, packageBase) : 0)
    + (discountScope.has("membership") ? Math.max(0, membershipBase) : 0)
    + (discountScope.has("product") ? Math.max(0, productBase - membershipProductWalletUsed) : 0);
  const svcDiscountBase = wholeBillScope
    ? Math.max(0, billTotal)
    : Math.max(0, selectedBucketBase + selectedExclusiveGst);
  const itemDisc =
    discountType === "Percentage (%)"
      ? (svcDiscountBase * discountValue) / 100
      // Capped at the same base the percentage uses, so unticking a bucket
      // actually protects it. Legacy bills keep the uncapped subtraction they
      // were charged under — see TotalsInput.discountAppliesTo.
      : legacyDiscountScope ? discountValue : Math.min(discountValue, svcDiscountBase);
  const manualDiscount = Math.max(0, itemDisc);

  const afterSvcDiscount = Math.max(0, billTotal - manualDiscount);
  // Extra Charges are excluded from the Bill Discount base above — added
  // here, after the discount, not before. `tip` (Staff Tip) is NEVER added
  // to the bill total — it stays a display-only, record-only figure shown
  // as its own Sale Summary row, passed straight to staff. There was
  // previously an "Add Tip to Salon" toggle that let it opt into the total;
  // that control has been removed and this exclusion is now unconditional —
  // matches pricing.engine.ts's identical (now also unconditional) exclusion.
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
    catalogTotal, itemDiscountTotal, subtotal, manualDiscount,
    discountBase: svcDiscountBase, totalDisc: manualDiscount + totalDisc,
    taxable, gstAmount, taxBreakdown, billTotal, grandTotal, roundOff, preRedemptionTotal, displaySubtotal,
  };
}
