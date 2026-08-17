import type { CartItem } from "@/features/quickSale/types";
import { getPackageCoveredQuantity } from "@/features/quickSale/utils/packageCoverage";
import type { CalculateTotalsResponse, TaxBreakdownEntry } from "@/types/pricing";

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
  couponDiscount: inputs.couponDiscount ?? 0,
  couponRejectedReason: response.couponRejectedReason,
  exCharges: response.catalogTotal ? (inputs.exCharges ?? 0) : 0,
  grandTotal: response.grandTotal,
  itemDiscountTotal: response.itemDiscountTotal,
  lineSubtotal: response.catalogTotal,
  overallDiscount: response.manualDiscount,
  referralCreditRejectedReason: response.referralCreditRejectedReason,
  subtotal: response.subtotal,
  taxAmount: response.gstAmount,
  taxableAmount: response.taxable,
  roundOff: response.roundOff,
  tipAmount: inputs.tipAmount ?? 0,
  taxBreakdown: response.taxBreakdown || [],
});
