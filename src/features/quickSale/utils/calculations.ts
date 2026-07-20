import type { CartItem } from "@/features/quickSale/types";

export type BillTotals = {
  couponDiscount: number;
  grandTotal: number;
  itemDiscountTotal: number;
  lineSubtotal: number;
  overallDiscount: number;
  subtotal: number;
  taxAmount: number;
  tipAmount: number;
};

export type BillInputs = {
  couponDiscount: number;
  overallDiscount: number;
  taxAmount: number;
  tipAmount: number;
};

// Mirrors the backend's own arithmetic exactly (sales.repository.ts `create`):
//   per item:  total_price  = quantity * unit_price - item.discount_amount
//   sale:      subtotal     = sum(total_price)
//              total_amount = subtotal - discount_amount + tax_amount + tip_amount
// `discount_amount` sent to the API is overallDiscount + couponDiscount
// combined (the backend only has one bill-level discount field), which is
// why the two are surfaced as separate summary rows here but folded into one
// number before submission — see useCart's `toCreateSaleRequest`.
export const calculateBillTotals = (items: CartItem[], inputs: BillInputs): BillTotals => {
  const lineSubtotal = items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
  const itemDiscountTotal = items.reduce((total, item) => total + item.discountAmount, 0);
  const subtotal = Math.max(0, lineSubtotal - itemDiscountTotal);

  const overallDiscount = Math.max(0, inputs.overallDiscount);
  const couponDiscount = Math.max(0, inputs.couponDiscount);
  const taxAmount = Math.max(0, inputs.taxAmount);
  const tipAmount = Math.max(0, inputs.tipAmount);

  const grandTotal = Math.max(0, subtotal - overallDiscount - couponDiscount + taxAmount + tipAmount);

  return {
    couponDiscount,
    grandTotal,
    itemDiscountTotal,
    lineSubtotal,
    overallDiscount,
    subtotal,
    taxAmount,
    tipAmount,
  };
};
