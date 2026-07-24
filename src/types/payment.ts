export type PaymentStatus = "completed" | "failed" | "partial" | "pending" | "refunded";

export type PaymentSplitDetails = Record<string, number>;

export type PaymentTaxBreakdownEntry = {
  amount: number;
  inclusive: boolean;
  name: string;
  rate: number;
};

export type CreatePaymentRequest = {
  appointment_id: string;
  apply_membership_wallet?: boolean;
  client_id?: string;
  coupon_code?: string;
  discount_amount?: number;
  due_amount: number;
  ewallet_used?: number;
  gross_amount: number;
  net_amount: number;
  notes?: string;
  paid_amount: number;
  payment_method: string;
  referral_credit_used?: number;
  reward_points_used?: number;
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
