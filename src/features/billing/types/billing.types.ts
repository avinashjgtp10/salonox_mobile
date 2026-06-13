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