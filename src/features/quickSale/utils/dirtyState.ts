import type { CartItem } from "@/features/quickSale/types";

export type QuickSaleDirtyStateInput = {
  appliedCouponCode: string;
  cartItems: CartItem[];
  convenienceFeeInput: string;
  draftDiscountPercent: number;
  draftDiscountType: "flat" | "percentage";
  hasClientSelection: boolean;
  includeGst: boolean;
  otherChargesInput: string;
  overallDiscountInput: string;
  saleNotes: string;
  selectedClientId: string;
  serviceChargeInput: string;
  tipInput: string;
};

const normalizeText = (value: string) => value.trim();

const normalizeAmountInput = (value: string) => {
  const normalized = value.trim();
  if (!normalized) {
    return "";
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed === 0 ? "" : normalized;
};

export const getQuickSaleDirtySignature = ({
  appliedCouponCode,
  cartItems,
  convenienceFeeInput,
  draftDiscountPercent,
  draftDiscountType,
  hasClientSelection,
  includeGst,
  otherChargesInput,
  overallDiscountInput,
  saleNotes,
  selectedClientId,
  serviceChargeInput,
  tipInput,
}: QuickSaleDirtyStateInput) =>
  JSON.stringify({
    appliedCouponCode: normalizeText(appliedCouponCode).toUpperCase(),
    cartItems: cartItems.map((item) => ({
      discountAmount: item.discountAmount,
      duration: item.duration,
      itemId: item.itemId,
      itemType: item.itemType,
      lineId: item.lineId,
      name: item.name,
      note: normalizeText(item.note),
      originalUnitPrice: item.originalUnitPrice,
      quantity: item.quantity,
      staffId: item.staffId,
      unitPrice: item.unitPrice,
    })),
    convenienceFeeInput: normalizeAmountInput(convenienceFeeInput),
    draftDiscountPercent,
    draftDiscountType,
    hasClientSelection,
    includeGst,
    otherChargesInput: normalizeAmountInput(otherChargesInput),
    overallDiscountInput: normalizeAmountInput(overallDiscountInput),
    saleNotes: normalizeText(saleNotes),
    selectedClientId: normalizeText(selectedClientId),
    serviceChargeInput: normalizeAmountInput(serviceChargeInput),
    tipInput: normalizeAmountInput(tipInput),
  });

export const EMPTY_QUICK_SALE_DIRTY_SIGNATURE = getQuickSaleDirtySignature({
  appliedCouponCode: "",
  cartItems: [],
  convenienceFeeInput: "",
  draftDiscountPercent: 0,
  draftDiscountType: "percentage",
  hasClientSelection: false,
  includeGst: true,
  otherChargesInput: "",
  overallDiscountInput: "",
  saleNotes: "",
  selectedClientId: "",
  serviceChargeInput: "",
  tipInput: "",
});
