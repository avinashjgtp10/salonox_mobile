import { createSlice } from "@reduxjs/toolkit";
import { logout } from "./authSlice";
import {
  fetchBillingPlansThunk,
  fetchSubscriptionThunk,
  fetchInvoicesThunk,
  cancelSubscriptionThunk,
  type BillingPlan,
  type BillingSubscription,
  type BillingInvoice,
} from "../middleware/billing/billing.thunk";

interface BillingState {
  plans: BillingPlan[];
  subscription: BillingSubscription | null;
  invoices: BillingInvoice[];
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
      .addCase(fetchBillingPlansThunk.pending,  (s) => { s.loading.plans = true; })
      .addCase(fetchBillingPlansThunk.fulfilled, (s, { payload }) => { s.loading.plans = false; s.plans = payload; })
      .addCase(fetchBillingPlansThunk.rejected,  (s, { payload }) => { s.loading.plans = false; s.error = payload ?? null; });

    builder
      .addCase(fetchSubscriptionThunk.pending,  (s) => { s.loading.subscription = true; })
      .addCase(fetchSubscriptionThunk.fulfilled, (s, { payload }) => {
        s.loading.subscription = false;
        s.subscription = payload;
        if (payload?.status === "active" || payload?.status === "trialing") {
          s.subscriptionExpired = false;
        }
      })
      .addCase(fetchSubscriptionThunk.rejected,  (s, { payload }) => { s.loading.subscription = false; s.error = payload ?? null; });

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