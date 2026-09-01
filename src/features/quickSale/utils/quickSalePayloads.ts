import type { RedemptionPricingFlags } from "@/features/quickSale/hooks/useRedemptions";
import type {
  CartItem,
  PendingCheckoutPayment,
  QuickSaleSlot,
} from "@/features/quickSale/types";
import type { BillTotals } from "@/features/quickSale/utils/calculations";
import { getCartItemBillableQuantity } from "@/features/quickSale/utils/calculations";
import { toConsumableUsagePayload } from "@/features/quickSale/utils/consumables";
import { getPackageCoveredQuantity } from "@/features/quickSale/utils/packageCoverage";
import type { CreateAppointmentRequest } from "@/types/appointment";
import type { ValidateCouponResult } from "@/types/coupon";
import type { CreatePaymentRequest } from "@/types/payment";
import type {
  CreateSaleRequest,
  SaleLineItemRequest,
} from "@/types/sales";

export const getQuickSaleStaffId = (cartItems: CartItem[], selectedStaffId?: string | null) => {
  const firstServiceStaff = cartItems.find((item) => item.itemType === "service" && item.staffId)?.staffId;
  return firstServiceStaff ?? cartItems.find((item) => item.staffId)?.staffId ?? selectedStaffId ?? null;
};

export const getQuickSaleDurationMinutes = (cartItems: CartItem[]) => {
  const serviceDuration = cartItems.reduce((total, item) => {
    if (item.itemType !== "service") {
      return total;
    }

    const minutes = item.duration?.match(/\d+/)?.[0];
    return total + (minutes ? Number(minutes) * item.quantity : 0);
  }, 0);

  return Math.max(1, serviceDuration || 30);
};

export const buildSaleDraftPayload = ({
  appliedCoupon,
  clientId,
  discountPercent,
  discountType,
  draftId,
  items,
  notes,
  staffId,
  totals,
}: {
  appliedCoupon: ValidateCouponResult | null;
  clientId: string;
  discountPercent: number;
  discountType: "flat" | "percentage";
  draftId?: string;
  items: SaleLineItemRequest[];
  notes: string;
  staffId: string | null;
  totals: BillTotals;
}): CreateSaleRequest => ({
  clientId: clientId || (draftId ? null : undefined),
  couponCode: appliedCoupon?.valid
    ? appliedCoupon.couponCode
    : draftId
      ? null
      : undefined,
  discountAmount: totals.overallDiscount + totals.couponDiscount,
  discountPercent: discountType === "percentage" ? discountPercent : undefined,
  discountType,
  exCharges: totals.exCharges,
  items,
  notes: notes.trim() || (draftId ? null : undefined),
  staffId: staffId ?? undefined,
  status: "draft",
  taxAmount: totals.taxAmount,
  tipAmount: totals.tipAmount,
});

export const buildAppointmentPayload = ({
  cartItems,
  clientId,
  initialSlot,
  notes,
  salonId,
  staffId,
  totals,
}: {
  cartItems: CartItem[];
  clientId: string;
  initialSlot: QuickSaleSlot | null;
  notes: string;
  salonId?: string | null;
  staffId: string | null;
  totals: BillTotals;
}): CreateAppointmentRequest => {
  const durationMinutes = getQuickSaleDurationMinutes(cartItems);
  const slotDate = initialSlot
    ? new Date(`${initialSlot.date}T${initialSlot.time}:00`)
    : null;
  const startDate = slotDate && !Number.isNaN(slotDate.getTime()) ? slotDate : new Date();
  const endDate = new Date(startDate.getTime() + durationMinutes * 60_000);
  const serviceItems = cartItems.filter((item) => item.itemType === "service");
  const packageItems = cartItems.filter((item) => item.itemType === "package");
  const productItems = cartItems.filter((item) => item.itemType === "product");
  const membershipItems = cartItems.filter((item) => item.itemType === "membership");
  const firstService = serviceItems[0];

  return {
    ...(clientId ? { client_id: clientId } : {}),
    discount_type: "flat",
    discount_value: totals.overallDiscount + totals.couponDiscount,
    duration_minutes: durationMinutes,
    end_time: endDate.toISOString(),
    ex_charges: totals.exCharges,
    gst_percent: totals.subtotal > 0 ? Math.min(100, (totals.taxAmount / totals.subtotal) * 100) : 0,
    notes: notes.trim() || undefined,
    package_items: packageItems.map((item) => ({
      name: item.name,
      package_id: item.itemId,
      price: item.unitPrice,
      quantity: item.quantity,
      staff_id: item.staffId ?? undefined,
      staff_name: item.staffName,
      start_time: startDate.toISOString(),
      total: Math.max(0, item.unitPrice * getCartItemBillableQuantity(item) - item.discountAmount),
    })),
    product_items: productItems.map((item) => ({
      name: item.name,
      price: item.unitPrice,
      product_id: item.itemId,
      quantity: item.quantity,
      staff_id: item.staffId ?? undefined,
      staff_name: item.staffName,
      start_time: startDate.toISOString(),
      total: Math.max(0, item.unitPrice * getCartItemBillableQuantity(item) - item.discountAmount),
    })),
    salon_id: salonId ?? undefined,
    scheduled_at: startDate.toISOString(),
    service_id: firstService?.itemId,
    service_name: firstService?.name,
    services: serviceItems.map((item) => ({
      consumables: toConsumableUsagePayload(item.consumables),
      is_package_service: getPackageCoveredQuantity(item) === item.quantity || undefined,
      name: item.name,
      price: item.unitPrice,
      quantity: item.quantity,
      service_id: item.itemId,
      staff_id: item.staffId ?? undefined,
      staff_name: item.staffName,
      time: startDate.toISOString(),
      total: Math.max(0, item.unitPrice * getCartItemBillableQuantity(item) - item.discountAmount),
    })),
    membership_items: membershipItems.map((item) => ({
      membership_id: item.itemId,
      name: item.name,
      price: item.unitPrice,
      quantity: item.quantity,
      staff_id: item.staffId ?? undefined,
      staff_name: item.staffName,
      start_time: startDate.toISOString(),
      total: Math.max(0, item.unitPrice * getCartItemBillableQuantity(item) - item.discountAmount),
    })),
    ...(staffId ? { staff_id: staffId } : {}),
    start_time: startDate.toISOString(),
    status: "booked",
    tip_amount: totals.tipAmount,
  };
};

export const buildPaymentPayload = ({
  appointmentId,
  appliedCoupon,
  includeGst,
  isFullyPackageCoveredSale,
  notes,
  packageCatalogTotal,
  payment,
  pricingFlags,
  salonId,
  selectedClientId,
  totals,
}: {
  appointmentId: string;
  appliedCoupon: ValidateCouponResult | null;
  includeGst: boolean;
  isFullyPackageCoveredSale: boolean;
  notes: string;
  packageCatalogTotal: number;
  payment: PendingCheckoutPayment;
  pricingFlags: RedemptionPricingFlags;
  salonId?: string | null;
  selectedClientId: string;
  totals: BillTotals;
}): CreatePaymentRequest => {
  const paidAmount = isFullyPackageCoveredSale
    ? 0
    : Math.max(0, Math.min(payment.paidAmount ?? totals.grandTotal, totals.grandTotal));
  const dueAmount = isFullyPackageCoveredSale ? 0 : Math.max(0, totals.grandTotal - paidAmount);
  const methodLabel =
    isFullyPackageCoveredSale
      ? "Package"
      : payment.method === "split"
        ? "Split"
        : payment.method === "upi"
          ? "UPI"
          : payment.method === "card"
            ? "Card"
            : "Cash";
  const splitDetails =
    isFullyPackageCoveredSale
      ? { Package: packageCatalogTotal }
      : payment.method === "split" && payment.splitEntries?.length
        ? Object.fromEntries(
            payment.splitEntries.map((entry) => [
              entry.method === "upi" ? "UPI" : entry.method === "card" ? "Card" : "Cash",
              entry.amount,
            ]),
          )
        : { [methodLabel]: paidAmount };

  return {
    appointment_id: appointmentId,
    ...(pricingFlags.applyLoyaltyDiscount ? { apply_loyalty_discount: true } : {}),
    ...(pricingFlags.applyMembershipDiscount ? { apply_membership_discount: true } : {}),
    ...(pricingFlags.applyMembershipWallet
      ? { apply_membership_wallet: true, membership_wallet_requested: pricingFlags.membershipWalletRequested }
      : {}),
    client_id: selectedClientId || undefined,
    coupon_code: appliedCoupon?.valid ? appliedCoupon.couponCode : undefined,
    coupon_discount_amount: totals.couponDiscount || undefined,
    discount_amount: totals.overallDiscount + totals.couponDiscount,
    due_amount: dueAmount,
    ...(pricingFlags.applyEwallet ? { ewallet_used: totals.appliedEWallet } : {}),
    gross_amount: isFullyPackageCoveredSale ? packageCatalogTotal : totals.lineSubtotal,
    include_gst: includeGst,
    manual_discount_amount: totals.overallDiscount || undefined,
    net_amount: isFullyPackageCoveredSale ? 0 : totals.grandTotal,
    notes: notes.trim() || undefined,
    ...(isFullyPackageCoveredSale ? { package_covered_amount: packageCatalogTotal } : {}),
    paid_amount: paidAmount,
    payment_method: methodLabel,
    ...(pricingFlags.applyReferralCredit ? { referral_credit_used: totals.appliedReferralCredit } : {}),
    ...(pricingFlags.applyRewardPoints
      ? {
          reward_points_used: pricingFlags.rewardPointsToRedeem,
          reward_points_value: totals.appliedRewardPointsValue,
        }
      : {}),
    salon_id: salonId ?? undefined,
    split_details: splitDetails,
    status: dueAmount > 0 ? "partial" : "completed",
    tax_breakdown: totals.taxBreakdown.length > 0 ? totals.taxBreakdown : undefined,
  };
};
