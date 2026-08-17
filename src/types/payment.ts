export type PaymentStatus = "completed" | "failed" | "partial" | "pending" | "refunded";

export type PaymentSplitDetails = Record<string, number>;

export type PaymentTaxBreakdownEntry = {
  amount: number;
  inclusive: boolean;
  name: string;
  rate: number;
};

export type CreatePaymentRequest = {
  apply_loyalty_discount?: boolean;
  apply_membership_discount?: boolean;
  appointment_id: string;
  apply_membership_wallet?: boolean;
  client_id?: string;
  coupon_code?: string;
  coupon_discount_amount?: number;
  discount_amount?: number;
  due_amount: number;
  ewallet_used?: number;
  gross_amount: number;
  include_gst?: boolean;
  manual_discount_amount?: number;
  membership_wallet_requested?: number;
  net_amount: number;
  notes?: string;
  package_covered_amount?: number;
  paid_amount: number;
  payment_method: string;
  referral_credit_used?: number;
  reward_points_used?: number;
  reward_points_value?: number;
  salon_id?: string;
  split_details?: PaymentSplitDetails;
  status: Extract<PaymentStatus, "completed" | "partial">;
  tax_breakdown?: PaymentTaxBreakdownEntry[];
};

export type PaymentApiData = {
  id?: string | number;
  appointment_id?: string | number | null;
  due_amount?: number | string | null;
  paid_amount?: number | string | null;
  payment_method?: string | null;
  receipt_number?: string | null;
  status?: PaymentStatus | string | null;
  [key: string]: unknown;
};

export type CreatePaymentResponse = {
  data: PaymentApiData;
  message?: string;
};
