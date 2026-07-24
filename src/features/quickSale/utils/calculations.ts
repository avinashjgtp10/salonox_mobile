import type { CartItem } from "@/features/quickSale/types";

export type BillTotals = {
  couponDiscount: number;
  exCharges: number;
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
  exCharges: number;
  overallDiscount: number;
  taxAmount: number;
  tipAmount: number;
};

export const getCartItemBillableQuantity = (item: CartItem) =>
  item.itemType === "service" && item.packageCoverageRemaining
    ? Math.max(0, item.quantity - item.packageCoverageRemaining)
    : item.quantity;

// Mirrors the backend's own arithmetic exactly (sales.repository.ts `create`):
//   per item:  total_price  = quantity * unit_price - item.discount_amount
//   sale:      subtotal     = sum(total_price)
//              total_amount = subtotal - discount_amount + tax_amount + ex_charges + tip_amount
// `discount_amount` sent to the API is overallDiscount + couponDiscount
// combined (the backend only has one bill-level discount field), which is
// why the two are surfaced as separate summary rows here but folded into one
// number before submission — see useCart's `toCreateSaleRequest`.
export const calculateBillTotals = (items: CartItem[], inputs: BillInputs): BillTotals => {
  const lineSubtotal = items.reduce((total, item) => total + item.unitPrice * getCartItemBillableQuantity(item), 0);
  const itemDiscountTotal = items.reduce((total, item) => total + item.discountAmount, 0);
  const subtotal = Math.max(0, lineSubtotal - itemDiscountTotal);

  const overallDiscount = Math.max(0, inputs.overallDiscount);
  const couponDiscount = Math.max(0, inputs.couponDiscount);
  const taxAmount = Math.max(0, inputs.taxAmount);
  const exCharges = Math.max(0, inputs.exCharges);
  const tipAmount = Math.max(0, inputs.tipAmount);

  const grandTotal = Math.max(0, subtotal - overallDiscount - couponDiscount + taxAmount + exCharges + tipAmount);

  return {
    couponDiscount,
    exCharges,
    grandTotal,
    itemDiscountTotal,
    lineSubtotal,
    overallDiscount,
    subtotal,
    taxAmount,
    tipAmount,
  };
};

// Same per-item tax formula already used for appointment creation elsewhere
// in the app (src/features/appointments/screens.tsx `getServiceTax`): a
// percentage rate takes priority over a flat tax amount, both sourced from
// the catalog item itself (Service/Membership `tax_rate` / `tax_amount`),
// never a typed-in figure. Products/packages carry no tax fields today and
// so contribute 0, matching what the catalog actually reports.
const getLineTaxAmount = (item: CartItem, taxableAmount: number) => {
  const taxRate = Math.max(item.taxRate ?? 0, 0);

  if (taxRate > 0) {
    return (taxableAmount * taxRate) / 100;
  }

  return Math.max(item.taxAmount ?? 0, 0);
};

export const calculateCartTaxAmount = (items: CartItem[]) =>
  items.reduce((total, item) => {
    const taxableAmount = Math.max(
      0,
      item.unitPrice * getCartItemBillableQuantity(item) - item.discountAmount,
    );

    return total + getLineTaxAmount(item, taxableAmount);
  }, 0);
