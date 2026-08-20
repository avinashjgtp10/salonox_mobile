export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  billing_cycle: "monthly" | "yearly" | "weekly" | "daily";
  features: Record<string, any> | null;
  max_branches: number | null;
  max_staff: number | null;
  max_bookings_per_month: number | null;
  ai_features_enabled: boolean;
  is_active: boolean;
  razorpay_plan_id: string | null;
  created_at: string;
}

export interface Subscription {
  id: string;
  salon_id: string;
  plan_id: string;
  status: "trialing" | "active" | "past_due" | "cancelled" | "inactive";
  quantity: number;
  unit_price: string;
  total_amount: string;
  current_period_start: string;
  current_period_end: string | null;
  trial_ends_at: string | null;
  payment_method: string | null;
  card_holder_name: string | null;
  card_last4: string | null;
  card_brand: string | null;
  card_expiry: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  salon_id: string;
  subscription_id: string | null;
  invoice_number: string;
  status: "draft" | "open" | "paid" | "void";
  quantity: number;
  unit_price: string;
  subtotal: string;
  tax_amount: string;
  total_amount: string;
  period_start: string | null;
  period_end: string | null;
  due_date: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
