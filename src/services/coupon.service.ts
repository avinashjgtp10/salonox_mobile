import { api } from "@/services/api";
import { COUPON } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";
import type { Coupon, ValidateCouponRequest, ValidateCouponResult } from "@/types/coupon";
import { asRecord, firstArray, firstValue, toSafeNumber, toSafeString } from "@/utils/apiNormalize";

type UnknownRecord = Record<string, unknown>;
type CouponListApiData = UnknownRecord[] | { coupons?: UnknownRecord[] | null; data?: UnknownRecord[] | null };
type ValidateCouponApiData = UnknownRecord | null;

const normalizeCoupon = (entry: UnknownRecord): Coupon => {
  const rawType = toSafeString(firstValue(entry, ["discount_type", "discountType", "type"])).toLowerCase();

  return {
    code: toSafeString(firstValue(entry, ["code", "coupon_code", "couponCode"])).toUpperCase(),
    discountType: rawType.includes("percent") ? "percentage" : "flat",
    discountValue: toSafeNumber(firstValue(entry, ["discount_value", "discountValue", "value"])),
    expiresAt: toSafeString(firstValue(entry, ["expires_at", "expiresAt"])) || null,
    id: toSafeString(firstValue(entry, ["id", "_id"])),
    isActive: firstValue(entry, ["is_active", "isActive"]) !== false,
    minOrderAmount: toSafeNumber(firstValue(entry, ["min_order_amount", "minOrderAmount"])),
  };
};

const getCouponArray = (payload: CouponListApiData): UnknownRecord[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  return firstArray(payload, ["coupons", "data"]);
};

export const couponService = {
  async getCoupons(): Promise<Coupon[]> {
    const response = await api.get<ApiResponse<CouponListApiData>>(COUPON.LIST);

    return getCouponArray(response.data.data ?? []).map(normalizeCoupon);
  },

  async validateCoupon(payload: ValidateCouponRequest): Promise<ValidateCouponResult> {
    const response = await api.post<ApiResponse<ValidateCouponApiData>>(COUPON.VALIDATE, {
      code: payload.code,
      orderAmount: payload.orderAmount,
    });

    const data = asRecord(response.data.data);
    const rawType = toSafeString(firstValue(data, ["discountType", "discount_type"])).toLowerCase();

    return {
      couponCode: toSafeString(firstValue(data, ["couponCode", "coupon_code"]), payload.code.toUpperCase()),
      discountAmount: toSafeNumber(firstValue(data, ["discountAmount", "discount_amount"])),
      discountType: rawType.includes("percent") ? "percentage" : "flat",
      discountValue: toSafeNumber(firstValue(data, ["discountValue", "discount_value"])),
      finalAmount: toSafeNumber(firstValue(data, ["finalAmount", "final_amount"])),
      message: toSafeString(firstValue(data, ["message"])) || undefined,
      valid: firstValue(data, ["valid"]) === true,
    };
  },
};
