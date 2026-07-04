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
}

export interface TaxBreakdownEntry {
  name: string;
  rate: number;
  amount: number;
  inclusive: boolean;
}

export interface TotalsResult {
  subtotal: number;
  totalDisc: number;
  taxable: number;
  // Sum of exclusive (add-on-top) tax amounts only — this is the portion
  // actually added into grandTotal. Inclusive taxes are already inside the
  // item price, so they don't add anything here (see taxBreakdown for both).
  gstAmount: number;
  taxBreakdown: TaxBreakdownEntry[];
  grandTotal: number;
  effectiveTotal: number; // grandTotal - eWalletUsed
}

function rowsTotal(rows: LineItem[]): number {
  return rows.reduce((s, r) => s + (r.total ?? r.price * (r.qty || 1)), 0);
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
    exCharges, couponDiscount, eWalletUsed, membershipWalletUsed = 0,
  } = input;

  const serviceBase    = rowsTotal(serviceRows);
  const packageBase    = rowsTotal(packageRows);
  const productBase    = rowsTotal(productRows);
  const membershipBase = rowsTotal(membershipRows);
  const subtotal = serviceBase + packageBase + productBase + membershipBase;

  const serviceTotal = serviceBase + packageBase + membershipBase;
  const itemDisc =
    discountType === "Percentage (%)"
      ? (serviceTotal * discountValue) / 100
      : discountValue;

  const totalDisc = Math.max(0, itemDisc) + Math.max(0, couponDiscount);
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
    const bucketTaxable = base - base * discRatio;
    const { addOn, breakdown } = computeBucketTax(bucketTaxable, type, taxes);
    gstAmount += addOn;
    allBreakdown = allBreakdown.concat(breakdown);
  });

  const taxBreakdown = mergeBreakdown(allBreakdown);
  const grandTotal = taxable + gstAmount + exCharges;
  const effectiveTotal = Math.max(0, grandTotal - eWalletUsed - membershipWalletUsed);

  return { subtotal, totalDisc, taxable, gstAmount, taxBreakdown, grandTotal, effectiveTotal };
}
