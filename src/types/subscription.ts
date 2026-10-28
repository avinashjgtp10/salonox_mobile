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

export type PlanTier = "basic" | "advance" | "growth";
export type PlanCycle = "monthly" | "quarterly" | "yearly";

/** One plan from GET /subscriptions/catalog. Prices are in rupees, before GST. */
export type CatalogPlan = {
  slug: PlanTier;
  name: string;
  gstPercent: number;
  prices: Record<PlanCycle, number | null>;
};

export type PlanCheckout = {
  razorpaySubscriptionId: string;
  shortUrl: string;
};

export type PlanPaymentStatus = {
  paid: boolean;
  planName: string | null;
  endsAt: string | null;
};

export type SalonSubscription = {
  id: string;
  salonId: string;
  status: SubscriptionStatus;
  planId: string | null;
  currentPeriodEnd: string | number | null;
  raw: Record<string, unknown>;
};

