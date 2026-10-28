import { ApiError, api } from "@/services/api";
import { SUBSCRIPTION } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";
import type {
  CatalogPlan,
  PlanCheckout,
  PlanCycle,
  PlanPaymentStatus,
  PlanTier,
  SalonSubscription,
} from "@/types/subscription";

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);
const PLAN_TIERS: PlanTier[] = ["basic", "advance", "growth"];
export const PLAN_CYCLES: PlanCycle[] = ["monthly", "quarterly", "yearly"];
const DEFAULT_GST_PERCENT = 18;

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const firstRecord = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = record[key];

    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }

  return record;
};

const collectArrays = (value: unknown): unknown[] => {
  if (Array.isArray(value)) {
    return value;
  }

  const record = asRecord(value);

  for (const key of ["subscriptions", "subscription", "items", "data", "rows", "results"]) {
    const entry = record[key];

    if (Array.isArray(entry)) {
      return entry;
    }

    if (entry && typeof entry === "object") {
      const nested = collectArrays(entry);

      if (nested.length > 0) {
        return nested;
      }
    }
  }

  return Object.keys(record).length > 0 ? [record] : [];
};

const toSafeString = (value: unknown, fallback = "") => {
  if (typeof value === "string") {
    const trimmedValue = value.trim();

    return trimmedValue || fallback;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return fallback;
};

const toPrice = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const amount = Number(value);

  return Number.isFinite(amount) && amount > 0 ? amount : null;
};

const normalizeCatalogPlan = (value: unknown): CatalogPlan | null => {
  const plan = asRecord(value);
  const slug = toSafeString(plan.slug).toLowerCase() as PlanTier;

  if (!PLAN_TIERS.includes(slug)) {
    return null;
  }

  const prices = asRecord(plan.prices);
  const gstPercent = Number(plan.gst_percent);

  return {
    gstPercent: Number.isFinite(gstPercent) ? gstPercent : DEFAULT_GST_PERCENT,
    name: toSafeString(plan.name, slug.charAt(0).toUpperCase() + slug.slice(1)),
    prices: {
      monthly: toPrice(prices.monthly),
      quarterly: toPrice(prices.quarterly),
      yearly: toPrice(prices.yearly),
    },
    slug,
  };
};

const normalizeSubscription = (value: unknown): SalonSubscription | null => {
  const subscription = firstRecord(asRecord(value), ["subscription", "data"]);
  const id = toSafeString(subscription.id ?? subscription.subscription_id ?? subscription.razorpay_subscription_id);
  const status = toSafeString(subscription.status ?? subscription.subscription_status, "inactive").toLowerCase();
  const currentPeriodEnd =
    subscription.current_period_end ??
    subscription.currentPeriodEnd ??
    subscription.current_end ??
    subscription.currentEnd ??
    subscription.end_at ??
    subscription.endAt ??
    null;

  if (!id && !status) {
    return null;
  }

  return {
    id,
    currentPeriodEnd: typeof currentPeriodEnd === "string" || typeof currentPeriodEnd === "number" ? currentPeriodEnd : null,
    planId: toSafeString(subscription.plan_id ?? subscription.planId) || null,
    raw: subscription,
    salonId: toSafeString(subscription.salon_id ?? subscription.salonId),
    status,
  };
};

const isCurrentPeriodValid = (currentPeriodEnd: SalonSubscription["currentPeriodEnd"]) => {
  if (currentPeriodEnd === null || currentPeriodEnd === "") {
    return true;
  }

  const timestamp =
    typeof currentPeriodEnd === "number"
      ? currentPeriodEnd < 10_000_000_000
        ? currentPeriodEnd * 1000
        : currentPeriodEnd
      : Date.parse(currentPeriodEnd);

  return Number.isFinite(timestamp) && timestamp > Date.now();
};

export const isSubscriptionActive = (subscription?: SalonSubscription | null) =>
  ACTIVE_SUBSCRIPTION_STATUSES.has(subscription?.status?.toLowerCase() ?? "") &&
  isCurrentPeriodValid(subscription?.currentPeriodEnd ?? null);

const normalizeSubscriptions = (value: unknown) =>
  collectArrays(value)
    .map(normalizeSubscription)
    .filter((subscription): subscription is SalonSubscription => Boolean(subscription));

const findValidSubscription = (value: unknown) =>
  normalizeSubscriptions(value).find(isSubscriptionActive) ?? null;

export const subscriptionService = {
  /** Basic / Advance / Growth with their prices, as set on the web's Super Admin Plans page. */
  async getCatalog(): Promise<CatalogPlan[]> {
    const response = await api.get<ApiResponse<unknown>>(SUBSCRIPTION.CATALOG);
    const plans = Array.isArray(response.data.data) ? response.data.data : [];

    return plans
      .map(normalizeCatalogPlan)
      .filter((plan): plan is CatalogPlan => Boolean(plan && PLAN_CYCLES.some((cycle) => plan.prices[cycle] !== null)));
  },

  /** Creates the Razorpay subscription and returns its hosted payment page. */
  async startCheckout(tier: PlanTier, cycle: PlanCycle): Promise<PlanCheckout> {
    const response = await api.post<ApiResponse<unknown>>(SUBSCRIPTION.CHECKOUT, { cycle, tier });
    const data = asRecord(response.data.data);
    const shortUrl = toSafeString(data.short_url);

    if (!shortUrl) {
      throw new Error("Razorpay did not return a payment link. Please try again.");
    }

    return { razorpaySubscriptionId: toSafeString(data.razorpay_subscription_id), shortUrl };
  },

  /** Paid is set only by the backend's Razorpay webhook; the app never decides it. */
  async getPaymentStatus(): Promise<PlanPaymentStatus> {
    const response = await api.get<ApiResponse<unknown>>(SUBSCRIPTION.MY_STATUS);
    const data = asRecord(response.data.data);

    return {
      endsAt: toSafeString(data.ends_at) || null,
      paid: data.paid === true,
      planName: toSafeString(data.plan_name) || null,
    };
  },

  async getSalonSubscription(salonId: string): Promise<SalonSubscription | null> {
    try {
      const response = await api.get<ApiResponse<unknown>>(SUBSCRIPTION.SALON(salonId));

      return findValidSubscription(response.data.data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }

      throw error;
    }
  },
};
