// Verified against salon_mgm_backend/src/modules/coupons — a deliberately
// minimal module: list + validate only. There is no create/update/delete
// endpoint (coupons are managed outside the mobile app), and validating a
// coupon only returns a computed discount — it does not attach the coupon to
// a sale. The resulting discount amount must be folded into the sale's own
// discountAmount when the sale is created/updated.
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
