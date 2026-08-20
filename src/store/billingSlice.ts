import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { logout } from "./authSlice";
import api from "../services/api/axios";
import { BILLING } from "../services/api/endpoints/billing.endpoints";
import { ApiError } from "../services/api/interceptors";
import type { SubscriptionPlan, Subscription, Invoice } from "../features/billing/types/billing.types";

interface ApiResp<T> { success: boolean; data: T; message?: string }

export const fetchPlansThunk = createAsyncThunk<
  SubscriptionPlan[], void, { rejectValue: string }
>("billing/fetchPlans", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get<ApiResp<SubscriptionPlan[]>>(BILLING.PLANS);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch plans");
  }
});

export const fetchSubscriptionThunk = createAsyncThunk<
  Subscription | null, string, { rejectValue: string }
>("billing/fetchSubscription", async (salonId, { rejectWithValue }) => {
  try {
    const res = await api.get<ApiResp<Subscription | null>>(
      `${BILLING.SUBSCRIPTION}?salon_id=${salonId}`
    );
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch subscription");
  }
});

export const fetchInvoicesThunk = createAsyncThunk<
  Invoice[], string, { rejectValue: string }
>("billing/fetchInvoices", async (salonId, { rejectWithValue }) => {
  try {
    const res = await api.get<ApiResp<{ items?: Invoice[]; data?: Invoice[] }>>(
      `${BILLING.INVOICES}?salon_id=${salonId}`
    );
    const payload = res.data.data;
    return Array.isArray(payload) ? payload : (payload?.items ?? payload?.data ?? []);
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch invoices");
  }
});

export const cancelSubscriptionThunk = createAsyncThunk<
  void, { id: string; reason?: string }, { rejectValue: string }
>("billing/cancel", async ({ id, reason }, { rejectWithValue }) => {
  try {
    await api.post(BILLING.CANCEL_SUB(id), { reason });
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to cancel subscription");
  }
});

export const createSubscriptionThunk = createAsyncThunk<
  { short_url: string; razorpay_subscription_id: string },
  { plan_id: string; salon_id: string; total_count: number },
  { rejectValue: string }
>("billing/createSubscription", async (body, { rejectWithValue }) => {
  try {
    const res = await api.post<ApiResp<{ short_url: string; razorpay_subscription_id: string }>>(
      BILLING.CREATE_SUB, body
    );
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to initiate payment");
  }
});

// Salon counts as active if ANY of its subscription records is currently
// active/trialing — not just the single one /billing/subscription returns.
// Missing current_period_end fails open (treated as not-yet-expired).
export const fetchSubscriptionStatusThunk = createAsyncThunk<
  boolean, string, { rejectValue: string }
>("billing/fetchSubscriptionStatus", async (salonId, { rejectWithValue }) => {
  try {
    const res = await api.get<ApiResp<Array<{ status: string; current_period_end: string | null }>>>(
      BILLING.STATUS(salonId)
    );
    const subs = res.data.data ?? [];
    return subs.some((s) => {
      if (!["active", "trialing"].includes(s.status)) return false;
      if (!s.current_period_end) return true;
      return new Date() < new Date(s.current_period_end);
    });
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch subscription status");
  }
});

export const verifySubscriptionThunk = createAsyncThunk<
  { status: string },
  { salonId: string; razorpay_payment_id: string | null; razorpay_subscription_id: string | null; razorpay_signature: string | null },
  { rejectValue: string }
>("billing/verifySubscription", async ({ salonId, ...body }, { rejectWithValue }) => {
  try {
    const res = await api.post<ApiResp<{ status: string }>>(BILLING.VERIFY_SUB(salonId), body);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Could not verify payment");
  }
});

interface BillingState {
  plans: SubscriptionPlan[];
  subscription: Subscription | null;
  invoices: Invoice[];
  loading: {
    plans: boolean;
    subscription: boolean;
    invoices: boolean;
    cancel: boolean;
  };
  error: string | null;
  subscriptionExpired: boolean;
}

const initialState: BillingState = {
  plans: [],
  subscription: null,
  invoices: [],
  loading: { plans: false, subscription: false, invoices: false, cancel: false },
  error: null,
  subscriptionExpired: false,
};

const billingSlice = createSlice({
  name: "billing",
  initialState,
  reducers: {
    clearBillingError(state) { state.error = null; },
    setSubscriptionExpired(state, action: { payload: boolean }) {
      state.subscriptionExpired = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlansThunk.pending,  (s) => { s.loading.plans = true; })
      .addCase(fetchPlansThunk.fulfilled, (s, { payload }) => { s.loading.plans = false; s.plans = payload; })
      .addCase(fetchPlansThunk.rejected,  (s, { payload }) => { s.loading.plans = false; s.error = payload ?? null; });

    builder
      .addCase(fetchSubscriptionThunk.pending,  (s) => { s.loading.subscription = true; })
      .addCase(fetchSubscriptionThunk.fulfilled, (s, { payload }) => {
        s.loading.subscription = false;
        s.subscription = payload;
        // Only clears the expiry gate, never sets it — this endpoint returns
        // a single subscription record which may not be the salon's current
        // one (see fetchSubscriptionStatusThunk, the actual gate source).
        if (payload?.status === "active" || payload?.status === "trialing") {
          s.subscriptionExpired = false;
        }
      })
      .addCase(fetchSubscriptionThunk.rejected,  (s, { payload }) => { s.loading.subscription = false; s.error = payload ?? null; });

    builder
      .addCase(fetchSubscriptionStatusThunk.fulfilled, (s, { payload }) => { s.subscriptionExpired = !payload; });

    builder
      .addCase(fetchInvoicesThunk.pending,  (s) => { s.loading.invoices = true; })
      .addCase(fetchInvoicesThunk.fulfilled, (s, { payload }) => { s.loading.invoices = false; s.invoices = payload; })
      .addCase(fetchInvoicesThunk.rejected,  (s, { payload }) => { s.loading.invoices = false; s.error = payload ?? null; });

    builder
      .addCase(cancelSubscriptionThunk.pending,  (s) => { s.loading.cancel = true; })
      .addCase(cancelSubscriptionThunk.fulfilled, (s) => { s.loading.cancel = false; if (s.subscription) s.subscription.status = "cancelled"; })
      .addCase(cancelSubscriptionThunk.rejected,  (s, { payload }) => { s.loading.cancel = false; s.error = payload ?? null; });

    builder.addCase(logout, (s) => { s.subscriptionExpired = false; });
  },
});

export const { clearBillingError, setSubscriptionExpired } = billingSlice.actions;
export default billingSlice.reducer;
