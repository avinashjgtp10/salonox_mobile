export const COUPON = {
  VALIDATE: "/api/v1/coupons/validate",
  LIST: "/api/v1/coupons",
  MINE: "/api/v1/coupons/mine",
  BASE: "/api/v1/coupons",
  BULK: "/api/v1/coupons/bulk",
  BY_ID: (id: string | number) => `/api/v1/coupons/${id}`,
  BY_BATCH: (batchId: string) => `/api/v1/coupons/batch/${batchId}`,
} as const;

export type CouponType = "percentage" | "flat";

export interface Coupon {
  id: string;
  salon_id: string | null;
  code: string;
  type: CouponType;
  value: number;
  min_order_amount: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string;
  is_active: boolean;
  batch_id: string | null;
  batch_label: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCouponPayload {
  code: string;
  type: CouponType;
  value: number;
  min_order_amount?: number;
  max_uses?: number | null;
  expires_at: string;
  is_active?: boolean;
}

export type UpdateCouponPayload = Partial<CreateCouponPayload>;

export interface CreateBulkCouponsPayload {
  prefix: string;
  count: number;
  type: CouponType;
  value: number;
  min_order_amount?: number;
  max_uses?: number | null;
  expires_at: string;
  is_active?: boolean;
}
