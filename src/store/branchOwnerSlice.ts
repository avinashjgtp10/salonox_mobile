import { createSlice } from "@reduxjs/toolkit";
import { fetchMySalonsThunk, fetchBranchOwnerDashboardThunk, fetchBranchOwnerPaymentsThunk, deleteSalonThunk } from "../middleware/branchOwner/branchOwner.thunk";

export interface BranchOwnerSalon {
  id: string;
  name: string;
  location?: string | null;
  owner_email?: string;
  owner_name?: string;
  status: string;
  created_at: string;
  staff_count?: number;
  client_count?: number;
  appointments_today?: number;
  revenue_today?: number;
  has_active_plan?: boolean;
  /** trial_end (while trialing) or current_period_end (once paid) from the
   * salon's latest Razorpay-hosted subscription row — null if it never had
   * one. Drives the "Expired on {date}" plan status, independent of
   * `status` (the salon account's own active/inactive flag). */
  plan_expires_at?: string | null;
  subscription_status?: string | null;
  plan_name?: string | null;
}

export interface BranchOwnerStats {
  total_salons: number;
  active_salons: number;
  inactive_salons: number;
  total_staff: number;
  total_clients: number;
  total_revenue: number;
  total_bookings: number;
  bookings_today: number;
  revenue_today: number;
  new_clients_today: number;
  active_subscriptions: number;
}

export interface BranchOwnerPayment {
  id: string;
  salon_name: string;
  salon_id?: string;
  amount: number;
  status: string;
  payment_method: string;
  created_at: string;
  invoice_number?: string | null;
  client_name?: string | null;
  client_phone?: string | null;
}

export interface BranchOwnerRevenuePoint {
  day: string;
  revenue: number;
}

export interface BranchOwnerInventorySummary {
  total_products: number;
  total_stock_value: number;
  low_stock_count: number;
  pending_transfers_count: number;
}

export interface BranchOwnerAttentionMetrics {
  unpaid_invoices_count: number;
  unpaid_invoices_amount: number;
  pending_bookings: number;
  pending_staff_requests: number;
}

// Shape of GET /api/v1/branch-owner/dashboard — one combined payload for
// everything BranchOwnerDashboardPage needs, instead of separate calls.
// inventorySummary was a second, separate GET from the dashboard page until
// it was folded into this same response (see branch-owner.service.ts).
export interface BranchOwnerDashboard {
  salons: BranchOwnerSalon[];
  stats: BranchOwnerStats;
  payments: BranchOwnerPayment[];
  revenueTrend: BranchOwnerRevenuePoint[];
  inventorySummary: BranchOwnerInventorySummary;
  attention: BranchOwnerAttentionMetrics;
}

interface BranchOwnerState {
  salons: BranchOwnerSalon[];
  stats: BranchOwnerStats | null;
  payments: BranchOwnerPayment[];
  revenueTrend: BranchOwnerRevenuePoint[];
  inventorySummary: BranchOwnerInventorySummary | null;
  attention: BranchOwnerAttentionMetrics | null;
  loading: {
    salons: boolean;
    stats: boolean;
    payments: boolean;
  };
  error: string | null;
}

const initialState: BranchOwnerState = {
  salons: [],
  stats: null,
  payments: [],
  revenueTrend: [],
  inventorySummary: null,
  attention: null,
  loading: { salons: false, stats: false, payments: false },
  error: null,
};

const branchOwnerSlice = createSlice({
  name: "branchOwner",
  initialState,
  reducers: {
    clearBranchOwnerError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMySalonsThunk.pending,   (state) => { state.loading.salons = true; })
      .addCase(fetchMySalonsThunk.fulfilled, (state, { payload }) => { state.loading.salons = false; state.salons = payload; })
      .addCase(fetchMySalonsThunk.rejected,  (state, { payload }) => { state.loading.salons = false; state.error = payload ?? null; });

    builder
      .addCase(fetchBranchOwnerDashboardThunk.pending, (state) => {
        state.loading.stats = true;
        state.loading.payments = true;
      })
      .addCase(fetchBranchOwnerDashboardThunk.fulfilled, (state, { payload }) => {
        state.loading.stats = false;
        state.loading.payments = false;
        state.stats = payload.stats;
        state.payments = payload.payments;
        state.revenueTrend = payload.revenueTrend ?? [];
        state.inventorySummary = payload.inventorySummary ?? null;
        state.attention = payload.attention ?? null;
        // The dashboard payload already includes the salon list — keep it in
        // sync here too so a page that only dispatches this thunk (not also
        // fetchMySalonsThunk) still has it.
        if (payload.salons) state.salons = payload.salons;
      })
      .addCase(fetchBranchOwnerDashboardThunk.rejected, (state, { payload }) => {
        state.loading.stats = false;
        state.loading.payments = false;
        state.error = payload ?? null;
      });

    builder
      .addCase(fetchBranchOwnerPaymentsThunk.pending,   (state) => { state.loading.payments = true; })
      .addCase(fetchBranchOwnerPaymentsThunk.fulfilled, (state, { payload }) => { state.loading.payments = false; state.payments = payload; })
      .addCase(fetchBranchOwnerPaymentsThunk.rejected,  (state, { payload }) => { state.loading.payments = false; state.error = payload ?? null; });

    builder
      .addCase(deleteSalonThunk.fulfilled, (state, { payload: salonId }) => {
        state.salons = state.salons.filter((s) => s.id !== salonId);
      });
  },
});

export const { clearBranchOwnerError } = branchOwnerSlice.actions;
export default branchOwnerSlice.reducer;
