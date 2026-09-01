export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "cancelled"
  | "canceled"
  | "past_due"
  | "inactive"
  | "expired"
  | "pending"
  | string;

export type SubscriptionPlan = {
  id: string;
  name: string;
  description: string;
  amount: number;
  currency: string;
  interval: string;
  intervalCount: number;
  totalCount: number;
  raw: Record<string, unknown>;
};

export type SalonSubscription = {
  id: string;
  salonId: string;
  status: SubscriptionStatus;
  planId: string | null;
  currentPeriodEnd: string | number | null;
  raw: Record<string, unknown>;
};

export type CreateSubscriptionRequest = {
  plan_id: string;
  salon_id: string;
  total_count: number;
};

export type CreateSubscriptionResponse = {
  razorpaySubscriptionId: string;
  shortUrl: string;
  raw: Record<string, unknown>;
};

export type VerifySubscriptionRequest = {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
};

export type VerifySubscriptionResponse = {
  subscription: SalonSubscription | null;
  raw: Record<string, unknown>;
};
