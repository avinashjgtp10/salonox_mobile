import { useCallback, useEffect, useMemo, useState } from "react";

import type { RedemptionPricingFlags } from "@/features/quickSale/hooks/useRedemptions";
import type { CartItem } from "@/features/quickSale/types";
import {
  adaptPricingResponseToBillTotals,
  type BillTotals,
} from "@/features/quickSale/utils/calculations";
import { parseAmount } from "@/features/quickSale/utils/money";
import { pricingService } from "@/services/pricing.service";
import type { ValidateCouponResult } from "@/types/coupon";
import type { CalculateTotalsResponse, LineItem as ApiLineItem } from "@/types/pricing";

type UseQuickSalePricingInput = {
  appliedCoupon: ValidateCouponResult | null;
  buildPricingFlags: () => RedemptionPricingFlags;
  cartItems: CartItem[];
  convenienceFeeInput: string;
  discountPercent: number;
  discountType: "flat" | "percentage";
  includeGst: boolean;
  otherChargesInput: string;
  overallDiscountInput: string;
  selectedClientId: string;
  serviceChargeInput: string;
  tipInput: string;
};

const createEmptyTotals = (
  appliedCoupon: ValidateCouponResult | null,
  extraChargesTotal: number,
  overallDiscountInput: string,
  tipInput: string,
): BillTotals => ({
  appliedEWallet: 0,
  appliedMembershipDiscount: 0,
  appliedMembershipWallet: 0,
  appliedReferralCredit: 0,
  appliedRewardPointsValue: 0,
  couponDiscount: appliedCoupon?.valid ? appliedCoupon.discountAmount : 0,
  exCharges: extraChargesTotal,
  grandTotal: 0,
  itemDiscountTotal: 0,
  lineSubtotal: 0,
  overallDiscount: parseAmount(overallDiscountInput),
  subtotal: 0,
  taxAmount: 0,
  taxableAmount: 0,
  roundOff: 0,
  tipAmount: parseAmount(tipInput),
  taxBreakdown: [],
});

export const useQuickSalePricing = ({
  appliedCoupon,
  buildPricingFlags,
  cartItems,
  convenienceFeeInput,
  discountPercent,
  discountType,
  includeGst,
  otherChargesInput,
  overallDiscountInput,
  selectedClientId,
  serviceChargeInput,
  tipInput,
}: UseQuickSalePricingInput) => {
  const [backendTotalsResponse, setBackendTotalsResponse] = useState<CalculateTotalsResponse | null>(null);
  const [isPricingLoading, setIsPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const extraChargesTotal = useMemo(
    () => parseAmount(serviceChargeInput) + parseAmount(convenienceFeeInput) + parseAmount(otherChargesInput),
    [convenienceFeeInput, otherChargesInput, serviceChargeInput],
  );

  useEffect(() => {
    let isSubscribed = true;

    if (cartItems.length === 0) {
      setBackendTotalsResponse(null);
      setIsPricingLoading(false);
      setPricingError(null);
      return;
    }

    setIsPricingLoading(true);
    setPricingError(null);

    const timer = setTimeout(async () => {
      try {
        const serviceRows: ApiLineItem[] = [];
        const productRows: ApiLineItem[] = [];
        const packageRows: ApiLineItem[] = [];
        const membershipRows: ApiLineItem[] = [];

        cartItems.forEach((item) => {
          const qty = Math.max(1, item.quantity);
          const line: ApiLineItem = {
            price: item.unitPrice,
            qty,
            discount: item.discountAmount,
            total: item.unitPrice * qty - item.discountAmount,
          };
          if (item.itemType === "service") serviceRows.push(line);
          else if (item.itemType === "product") productRows.push(line);
          else if (item.itemType === "package") packageRows.push(line);
          else if (item.itemType === "membership") membershipRows.push(line);
        });

        const response = await pricingService.calculateTotals({
          client_id: selectedClientId || undefined,
          serviceRows,
          packageRows,
          productRows,
          membershipRows,
          discountType,
          discountValue:
            discountType === "percentage"
              ? discountPercent
              : parseAmount(overallDiscountInput),
          couponCode: appliedCoupon?.valid ? appliedCoupon.couponCode : undefined,
          exCharges: extraChargesTotal,
          tip: parseAmount(tipInput),
          includeGst,
          ...buildPricingFlags(),
        });

        if (isSubscribed) {
          setBackendTotalsResponse(response);
          setIsPricingLoading(false);
        }
      } catch (error) {
        if (isSubscribed) {
          setPricingError(error instanceof Error ? error.message : "Unable to calculate pricing.");
          setIsPricingLoading(false);
        }
      }
    }, 500);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [
    appliedCoupon,
    buildPricingFlags,
    cartItems,
    discountPercent,
    discountType,
    extraChargesTotal,
    includeGst,
    overallDiscountInput,
    selectedClientId,
    tipInput,
  ]);

  const totals = useMemo(() => {
    if (backendTotalsResponse) {
      return adaptPricingResponseToBillTotals(backendTotalsResponse, {
        couponDiscount: appliedCoupon?.valid ? appliedCoupon.discountAmount : 0,
        exCharges: extraChargesTotal,
        overallDiscount: parseAmount(overallDiscountInput),
        tipAmount: parseAmount(tipInput),
      });
    }

    return createEmptyTotals(appliedCoupon, extraChargesTotal, overallDiscountInput, tipInput);
  }, [backendTotalsResponse, appliedCoupon, extraChargesTotal, overallDiscountInput, tipInput]);

  const resetPricing = useCallback(() => {
    setBackendTotalsResponse(null);
    setIsPricingLoading(false);
    setPricingError(null);
  }, []);

  return {
    extraChargesTotal,
    isPricingLoading,
    pricingError,
    resetPricing,
    totals,
  };
};
