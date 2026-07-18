// ─── Single-method options ────────────────────────────────────────────────────
export type SingleMethod = "Cash" | "Card" | "UPI";
export const SINGLE_METHODS: SingleMethod[] = ["Cash", "Card", "UPI"];

// ─── Split payment entry ──────────────────────────────────────────────────────
export interface SplitEntry {
  method: SingleMethod;
  amount: string; // string so input can be empty/partial while typing
}

// ─── What gets sent to POST /api/v1/payments ─────────────────────────────────
export interface PaymentPayload {
  salon_id?: string;
  appointment_id: string | number;
  client_id?: string;
  gross_amount: number;
  discount_amount?: number;
  ewallet_used?: number;
  net_amount: number;
  paid_amount: number;
  due_amount: number;
  coupon_code?: string;
  payment_method: string;
  split_details?: Record<string, number>;
  status: "completed" | "partial";
  notes?: string;
  apply_membership_wallet?: boolean;
  // Own dedicated, spendable balances now — not folded into eWallet.
  reward_points_used?: number; // points count
  referral_credit_used?: number; // ₹
  tax_breakdown?: { name: string; rate: number; amount: number; inclusive: boolean }[];
}

// ─── Result of clearing a prior due ─────────────────────────────────────────
export interface ClearDueResult {
  bookingId: string | number;
  clearedAmount: number;
  success: boolean;
}

// ─── Coupon ──────────────────────────────────────────────────────────────────
export interface CouponResponse {
  code: string;
  discount_type: "percentage" | "flat";
  discount_value: number;
  discount_amount: number; // computed against current subtotal
  message?: string;
}
