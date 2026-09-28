import type { CartItem } from "@/features/quickSale/types";
import { getPackageCoveredQuantity } from "@/features/quickSale/utils/packageCoverage";
import type { CalculateTotalsResponse, LineItem, TaxBreakdownEntry } from "@/types/pricing";

export type BillTotals = {
  appliedEWallet: number;
  appliedMembershipDiscount: number;
  appliedMembershipWallet: number;
  appliedReferralCredit: number;
  appliedRewardPointsValue: number;
  couponDiscount: number;
  couponRejectedReason?: string;
  exCharges: number;
  grandTotal: number;
  itemDiscountTotal: number;
  lineSubtotal: number;
  overallDiscount: number;
  discountBase?: number;
  referralCreditRejectedReason?: string;
  subtotal: number;
  taxAmount: number;
  taxableAmount: number;
  roundOff: number;
  tipAmount: number;
  taxBreakdown: TaxBreakdownEntry[];
};

export const getCartItemBillableQuantity = (item: CartItem) =>
  Math.max(0, item.quantity - getPackageCoveredQuantity(item));

export const buildPricingLine = (item: CartItem): LineItem => {
  const billableAmount = item.unitPrice * getCartItemBillableQuantity(item);
  const total = Math.max(0, billableAmount - item.discountAmount);

  return {
    categoryId: item.categoryId ?? undefined,
    itemId: item.itemId || undefined,
    isPackageService: item.itemType === "service" && getCartItemBillableQuantity(item) === 0,
    price: item.unitPrice,
    qty: item.quantity,
    discount: item.unitPrice * item.quantity - total,
    total,
  };
};

export const getExpectedSaleRevenue = (totals: Pick<
  BillTotals,
  "grandTotal" | "tipAmount" | "roundOff" | "appliedEWallet" | "appliedReferralCredit" | "appliedRewardPointsValue"
>) => Math.round(
  totals.grandTotal - totals.tipAmount - totals.roundOff
  + totals.appliedEWallet + totals.appliedReferralCredit + totals.appliedRewardPointsValue,
);

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
  appliedEWallet: response.appliedEWallet || 0,
  appliedMembershipDiscount: response.appliedMembershipDiscount || 0,
  appliedMembershipWallet: response.appliedMembershipWallet || 0,
  appliedReferralCredit: response.appliedReferralCredit || 0,
  appliedRewardPointsValue: response.appliedRewardPointsValue || 0,
  couponDiscount: response.couponRejectedReason ? 0 : Math.max(0, response.totalDisc - response.manualDiscount),
  couponRejectedReason: response.couponRejectedReason,
  exCharges: response.catalogTotal ? (inputs.exCharges ?? 0) : 0,
  grandTotal: response.grandTotal,
  itemDiscountTotal: response.itemDiscountTotal,
  lineSubtotal: response.catalogTotal,
  overallDiscount: response.manualDiscount,
  discountBase: response.discountBase,
  referralCreditRejectedReason: response.referralCreditRejectedReason,
  subtotal: response.subtotal,
  taxAmount: response.gstAmount,
  taxableAmount: response.taxable,
  roundOff: response.roundOff,
  tipAmount: inputs.tipAmount ?? 0,
  taxBreakdown: response.taxBreakdown || [],
});
