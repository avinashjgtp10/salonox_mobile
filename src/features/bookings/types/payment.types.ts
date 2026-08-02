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
  // Staff-chosen cap on how much of the membership wallet to actually use —
  // the backend still clamps further by real balance/eligible items; this
  // only limits the request, never trusted as the final deducted amount.
  membership_wallet_requested?: number;
  // Percentage/loyalty membership discount — intent only. No matching
  // "requested" field: the amount is fully determined server-side by the
  // plan's percentage, the eligible line total, and any discount balance left.
  apply_membership_discount?: boolean;
  // Independent sibling flag for the salon-wide Loyalty discount — stacks
  // additively with apply_membership_discount above when both are checked.
  apply_loyalty_discount?: boolean;
  // Own dedicated, spendable balances now — not folded into eWallet.
  reward_points_used?: number; // points count
  referral_credit_used?: number; // ₹
  tax_breakdown?: { name: string; rate: number; amount: number; inclusive: boolean }[];
  // Whether staff had "Include GST in this bill" checked for THIS payment —
  // the backend must skip its own tax computation entirely when false, or
  // due_amount/status end up computed against a GST-inclusive total the
  // customer was never actually charged (see payments.service.ts::create()).
  include_gst?: boolean;
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
