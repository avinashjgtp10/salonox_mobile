// Frontend types for the Plans & Subscriptions admin screen. Backed by
// /api/v1/salon-plans/* (modules/salon-plans on the backend) — deliberately
// separate from billing.types.ts (SubscriptionPlan/Subscription), which
// models the self-serve Razorpay checkout a salon owner uses themselves.
// Field names here match the API's snake_case response shape directly
// (no camelCase remapping) so components can pass API responses straight
// through without a translation layer.

export type PlanTier = "basic" | "advance" | "pro";
export const PLAN_TIER_ORDER: PlanTier[] = ["basic", "advance", "pro"];

export interface FeatureKeyEntry {
  key: string;
  label: string;
}

export interface PlanDefinition {
  tier: PlanTier;
  name: string;
  tagline: string | null;
  price: string; // numeric comes back as a string from pg — parse with Number() before arithmetic
  features: string[];
  // Stable {key, label} pairs — .key is the actual enforcement source of
  // truth requirePlanFeature()/hasFeature() check against on the backend;
  // .label is admin-editable display text. Deliberately NOT the same list
  // as "features" above (pricing-card marketing copy — different count,
  // different wording). See Migration/fix_feature_keys_shape.sql.
  feature_keys: FeatureKeyEntry[];
  default_staff_limit: number | null;
  default_customer_limit: number | null;
  default_appointment_limit: number | null;
  default_branch_limit: number | null;
  default_storage_limit_gb: number | null;
}

export function planIncludesFeatureKey(definitions: PlanDefinition[], tier: PlanTier, featureKey: string): boolean {
  const idx = PLAN_TIER_ORDER.indexOf(tier);
  return definitions
    .filter((d) => PLAN_TIER_ORDER.indexOf(d.tier) <= idx)
    .some((d) => d.feature_keys.some((f) => f.key === featureKey));
}

// Every {key, label} pair across all 3 tiers — the shape the Salon
// Customization toggle grid and comparison table iterate.
export function allFeatureRows(definitions: PlanDefinition[]): FeatureKeyEntry[] {
  return definitions.flatMap((d) => d.feature_keys);
}

export interface SalonPlanCustomization {
  id: string | null; // null = unsaved (no row yet, tab shows base tier's plain defaults)
  salon_id: string;
  base_tier: PlanTier;
  custom_price: string | null;
  staff_limit: number | null; // null = unlimited
  customer_limit: number | null;
  appointment_limit: number | null;
  branch_limit: number | null;
  storage_limit_gb: number | null;
  feature_overrides: Record<string, boolean>;
  start_date: string;
  expiry_date: string | null;
}

export interface SalonCustomizationListRow extends SalonPlanCustomization {
  salon_name: string;
  owner_email: string | null;
  is_customized: boolean;
}

export type InvoiceStatus = "paid" | "open" | "overdue" | "void";

export interface SalonPlanInvoice {
  id: string;
  invoice_number: string;
  salon_id: string;
  salon_name: string;
  plan_tier: PlanTier;
  amount: string;
  status: InvoiceStatus;
  issued_date: string;
  due_date: string | null;
}

export interface InvoiceSummary {
  total: number;
  collected: number;
  outstanding: number;
}
