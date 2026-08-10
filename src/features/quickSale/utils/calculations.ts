import type { CartItem } from "@/features/quickSale/types";
import { getPackageCoveredQuantity } from "@/features/quickSale/utils/packageCoverage";
import type { CalculateTotalsResponse, TaxBreakdownEntry } from "@/types/pricing";

export type BillTotals = {
  couponDiscount: number;
  exCharges: number;
  grandTotal: number;
  itemDiscountTotal: number;
  lineSubtotal: number;
  overallDiscount: number;
  subtotal: number;
  taxAmount: number;
  taxableAmount: number;
  roundOff: number;
  tipAmount: number;
  taxBreakdown: TaxBreakdownEntry[];
};

export const getCartItemBillableQuantity = (item: CartItem) =>
  Math.max(0, item.quantity - getPackageCoveredQuantity(item));

/**
 * Converts a response from POST /api/v1/pricing/calculate-totals into
 * the UI's BillTotals structure.
 */
export const adaptPricingResponseToBillTotals = (
  response: CalculateTotalsResponse,
  inputs: {
    couponDiscount?: number;
    exCharges?: number;
    overallDiscount?: number;
    tipAmount?: number;
  },
): BillTotals => ({
  couponDiscount: inputs.couponDiscount ?? 0,
  exCharges: response.catalogTotal ? (inputs.exCharges ?? 0) : 0,
  grandTotal: response.grandTotal,
  itemDiscountTotal: response.itemDiscountTotal,
  lineSubtotal: response.catalogTotal,
  overallDiscount: response.manualDiscount,
  subtotal: response.subtotal,
  taxAmount: response.gstAmount,
  taxableAmount: response.taxable,
  roundOff: response.roundOff,
  tipAmount: inputs.tipAmount ?? 0,
  taxBreakdown: response.taxBreakdown || [],
});
