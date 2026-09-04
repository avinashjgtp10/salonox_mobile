// ─── Single-method options ────────────────────────────────────────────────────
export type SingleMethod = "Cash" | "Card" | "UPI";
export const SINGLE_METHODS: SingleMethod[] = ["Cash", "Card", "UPI"];

// ─── Payment Machine (POS terminal) ───────────────────────────────────────────
// Deliberately NOT part of SingleMethod/SINGLE_METHODS — a split-payment leg
// makes no sense for an async terminal confirmation, so it stays a sibling
// type only single-mode selection widens to accept (see AppointmentModal's
// singleMethod state, typed PaymentMethodSelection, not SingleMethod).
export const POS_MACHINE_METHOD = "Payment Machine" as const;
export type PaymentMethodSelection = SingleMethod | typeof POS_MACHINE_METHOD;

export type PosPaymentStatus =
  | "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED" | "CANCELLED" | "EXPIRED" | "REFUNDED";

export interface PosPaymentRequest {
  id: string;
  salon_id: string;
  branch_id: string | null;
  appointment_id: string | null;
  client_id: string | null;
  sale_id: string | null;
  payment_id: string | null;
  terminal_id: string | null;
  payment_reference: string;
  provider: string;
  provider_transaction_id: string | null;
  amount: number;
  currency: string;
  status: PosPaymentStatus;
  needs_review: boolean;
  review_reason: string | null;
  created_at: string;
  completed_at: string | null;
}

// ─── What gets sent to POST /api/v1/pos-payments ─────────────────────────────
export interface CreatePosPaymentPayload {
  appointment_id: string | number;
  client_id?: string;
  branch_id?: string;
  terminal_id?: string;
  provider: string;
  amount: number;
  // The exact same PaymentPayload Cash/Card/UPI would have posted immediately
  // — stored server-side and replayed once the provider confirms success.
  payload: PaymentPayload;
}

export interface PaymentTerminal {
  id: string;
  salon_id: string;
  branch_id: string | null;
  provider: string;
  terminal_label: string;
  provider_terminal_id: string | null;
  serial_number: string | null;
  is_active: boolean;
}

export interface PaymentProviderConfig {
  id: string;
  salon_id: string;
  provider: string;
  environment: "sandbox" | "production";
  merchant_id: string | null;
  credentials: Record<string, string> | null; // redacted by the backend, never real secrets
  is_enabled: boolean;
  last_tested_at: string | null;
  last_test_result: string | null;
}

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
  // Combined manual Svc Discount + coupon discount — kept for backward compat
  // and revenue netting; prefer manual_discount_amount below to isolate the
  // manual-only portion so the backend can keep coupon on its own pre-tax
  // channel (see payments.service.ts's frontendCouponDiscount derivation).
  discount_amount?: number;
  // Manual Svc Discount ONLY, excluding coupon — when omitted, the backend
  // treats the whole of discount_amount as manual (older-client fallback).
  manual_discount_amount?: number;
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
