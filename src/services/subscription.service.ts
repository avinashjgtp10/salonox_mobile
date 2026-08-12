import { ApiError, api } from "@/services/api";
import { SUBSCRIPTION } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";
import type {
  CreateSubscriptionRequest,
  CreateSubscriptionResponse,
  SalonSubscription,
  SubscriptionPlan,
  VerifySubscriptionRequest,
  VerifySubscriptionResponse,
} from "@/types/subscription";

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);

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

const firstArray = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = record[key];

    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
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

const toSafeNumber = (value: unknown, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value);

    if (Number.isFinite(parsedValue)) {
      return parsedValue;
    }
  }

  return fallback;
};

const normalizePlan = (value: unknown): SubscriptionPlan => {
  const plan = asRecord(value);
  const item = asRecord(plan.item);
  const notes = asRecord(plan.notes);
  const id = toSafeString(plan.id ?? plan.plan_id ?? plan.razorpay_plan_id);
  const amount = toSafeNumber(plan.amount ?? item.amount ?? notes.amount);
  const interval = toSafeString(plan.interval ?? item.interval ?? notes.interval, "monthly");
  const totalCount = toSafeNumber(plan.total_count ?? plan.totalCount ?? notes.total_count, 12);

  return {
    amount,
    currency: toSafeString(plan.currency ?? item.currency, "INR").toUpperCase(),
    description: toSafeString(plan.description ?? item.description ?? notes.description),
    id,
    interval,
    intervalCount: toSafeNumber(plan.interval_count ?? plan.intervalCount ?? item.interval_count, 1),
    name: toSafeString(plan.name ?? item.name ?? notes.name, "SalonOX Plan"),
    raw: plan,
    totalCount,
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

const normalizeCreateSubscription = (value: unknown): CreateSubscriptionResponse => {
  const payload = firstRecord(asRecord(value), ["subscription", "data"]);

  return {
    raw: payload,
    razorpaySubscriptionId: toSafeString(
      payload.razorpay_subscription_id ??
        payload.razorpaySubscriptionId ??
        payload.subscription_id ??
        payload.id,
    ),
    shortUrl: toSafeString(
      payload.short_url ??
        payload.shortUrl ??
        payload.razorpay_short_url ??
        payload.payment_url ??
        payload.url,
    ),
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
  async createSubscription(payload: CreateSubscriptionRequest): Promise<CreateSubscriptionResponse> {
    const response = await api.post<ApiResponse<unknown>>(SUBSCRIPTION.CREATE, payload);

    return normalizeCreateSubscription(response.data.data);
  },

  async getPlans(): Promise<SubscriptionPlan[]> {
    const response = await api.get<ApiResponse<unknown>>(SUBSCRIPTION.PLANS);
    const data = asRecord(response.data.data);
    const plans = Array.isArray(response.data.data)
      ? response.data.data
      : firstArray(data, ["plans", "items", "data", "rows"]);

    return plans.map(normalizePlan).filter((plan) => plan.id);
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

  async verifySubscription(
    salonId: string,
    payload: VerifySubscriptionRequest,
  ): Promise<VerifySubscriptionResponse> {
    const response = await api.post<ApiResponse<unknown>>(SUBSCRIPTION.VERIFY(salonId), payload);
    const data = asRecord(response.data.data);

    return {
      raw: data,
      subscription: normalizeSubscription(
        data.subscription ??
          data.data ??
          data,
      ),
    };
  },

  readRazorpayValuesFromUrl(url: string): VerifySubscriptionRequest | null {
    const queryString = url.includes("?") ? url.split("?")[1] : url.split("#")[1] ?? "";
    const params = new URLSearchParams(queryString);
    const razorpayPaymentId = params.get("razorpay_payment_id") ?? params.get("payment_id");
    const razorpaySubscriptionId =
      params.get("razorpay_subscription_id") ?? params.get("subscription_id");
    const razorpaySignature = params.get("razorpay_signature") ?? params.get("signature");

    if (!razorpayPaymentId || !razorpaySubscriptionId || !razorpaySignature) {
      return null;
    }

    return {
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
      razorpay_subscription_id: razorpaySubscriptionId,
    };
  },

  getPlanAmountLabel(plan: SubscriptionPlan) {
    const amount = plan.amount > 1000 ? plan.amount / 100 : plan.amount;

    return new Intl.NumberFormat("en-IN", {
      currency: plan.currency || "INR",
      maximumFractionDigits: 0,
      style: "currency",
    }).format(amount);
  },

  getPlanIntervalLabel(plan: SubscriptionPlan) {
    const interval = plan.interval.toLowerCase();

    return plan.intervalCount > 1 ? `/${plan.intervalCount} ${interval}s` : `/${interval}`;
  },

  getSubscriptionStatusFromUnknown(value: unknown) {
    return toSafeString(value).toLowerCase();
  },
};
