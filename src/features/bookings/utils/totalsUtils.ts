import type { DiscountType } from "../types";

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
  gstPercent: number;
  exCharges: number;
  tip: number;
  couponDiscount: number;
  eWalletUsed: number;
}

export interface TotalsResult {
  subtotal: number;
  totalDisc: number;
  taxable: number;
  gstAmount: number;
  grandTotal: number;
  effectiveTotal: number; // grandTotal - eWalletUsed
}

function rowsTotal(rows: LineItem[]): number {
  return rows.reduce((s, r) => s + (r.total ?? r.price * (r.qty || 1)), 0);
}

export function computeTotals(input: TotalsInput): TotalsResult {
  const {
    serviceRows, packageRows, productRows, membershipRows,
    discountType, discountValue, gstPercent,
    exCharges, couponDiscount, eWalletUsed,
  } = input;

  const subtotal =
    rowsTotal(serviceRows) +
    rowsTotal(packageRows) +
    rowsTotal(productRows) +
    rowsTotal(membershipRows);

  const serviceTotal = rowsTotal(serviceRows) + rowsTotal(packageRows) + rowsTotal(membershipRows);
  const itemDisc =
    discountType === "Percentage (%)"
      ? (serviceTotal * discountValue) / 100
      : discountValue;

  const totalDisc = Math.max(0, itemDisc) + Math.max(0, couponDiscount);
  const taxable   = Math.max(0, subtotal - totalDisc);
  const gstAmount = (taxable * gstPercent) / 100;
  const grandTotal = taxable + gstAmount + exCharges;
  const effectiveTotal = Math.max(0, grandTotal - eWalletUsed);

  return { subtotal, totalDisc, taxable, gstAmount, grandTotal, effectiveTotal };
}
