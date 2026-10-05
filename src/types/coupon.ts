export type CouponDiscountType = "percentage" | "flat";

export type Coupon = {
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  expiresAt: string | null;
  id: string;
  isActive: boolean;
  minOrderAmount: number;
};

export type ValidateCouponRequest = {
  code: string;
  orderAmount: number;
};

export type ValidateCouponResult = {
  couponCode: string;
  discountAmount: number;
  discountType: CouponDiscountType;
  discountValue: number;
  finalAmount: number;
  message?: string;
  valid: boolean;
};
