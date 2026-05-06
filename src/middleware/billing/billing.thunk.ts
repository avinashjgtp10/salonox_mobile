import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { BILLING } from "../../services/api/endpoints";
import { ApiError } from "../../services/api/interceptors";

export interface BillingPlan {
  id: string;
  name: string;
  description: string | null;
  price_per_unit: string;
  billing_unit: string;
  interval: "monthly" | "yearly";
  trial_days: number;
  features: Record<string, boolean> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BillingSubscription {
  id: string;
  salon_id: string;
  plan_id: string;
  status: "trialing" | "active" | "past_due" | "cancelled" | "inactive";
  quantity: number;
  unit_price: string;
  total_amount: string;
  current_period_start: string;
  current_period_end: string;
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

export interface BillingInvoice {
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

interface ApiResp<T> { success: boolean; data: T; message?: string }

export const fetchBillingPlansThunk = createAsyncThunk<
  BillingPlan[], void, { rejectValue: string }
>("billing/fetchPlans", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get<ApiResp<BillingPlan[]>>(BILLING.PLANS);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch billing plans");
  }
});

export const fetchSubscriptionThunk = createAsyncThunk<
  BillingSubscription | null, string, { rejectValue: string }
>("billing/fetchSubscription", async (salonId, { rejectWithValue }) => {
  try {
    const res = await api.get<ApiResp<BillingSubscription | null>>(
      `${BILLING.SUBSCRIPTION}?salon_id=${salonId}`
    );
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch subscription");
  }
});

export const fetchInvoicesThunk = createAsyncThunk<
  BillingInvoice[], string, { rejectValue: string }
>("billing/fetchInvoices", async (salonId, { rejectWithValue }) => {
  try {
    const res = await api.get<ApiResp<{ items?: BillingInvoice[]; data?: BillingInvoice[] }>>(
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
