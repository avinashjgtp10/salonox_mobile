import { createSlice } from "@reduxjs/toolkit";
import {
  fetchDashboardAll,
  fetchRevenueChart,
  fetchStaffRevenue,
  fetchPaymentModeBreakdown,
} from "../middleware/dashboard/dashboard.thunk";
import type { DashboardAllResponse, StaffRevenueEntry, PaymentModeBreakdown } from "../middleware/dashboard/dashboard.thunk";

const EMPTY_PAYMENT_MODE_BREAKDOWN: PaymentModeBreakdown = { entries: [], total: 0 };

interface DashboardState {
  data: DashboardAllResponse | null;
  loading: boolean;       // full-page initial load
  chartLoading: boolean;  // chart-only reload on period change
  error: string | null;
  chartError: string | null;
  // Staff Revenue card — its own period filter, independent of the Revenue
  // Trend chart above, so it gets its own slice of state.
  staffRevenue: StaffRevenueEntry[];
  staffRevenueLoading: boolean;
  staffRevenueError: string | null;
  // Overall Collection card (payment mode breakdown) — its own
  // Today/Yesterday/Week filter, independent of everything else.
  paymentModeBreakdown: PaymentModeBreakdown;
  paymentModeBreakdownLoading: boolean;
  paymentModeBreakdownError: string | null;
}

const initialState: DashboardState = {
  data: null,
  loading: false,
  chartLoading: false,
  error: null,
  chartError: null,
  staffRevenue: [],
  staffRevenueLoading: false,
  staffRevenueError: null,
  paymentModeBreakdown: EMPTY_PAYMENT_MODE_BREAKDOWN,
  paymentModeBreakdownLoading: false,
  paymentModeBreakdownError: null,
};

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // ── Full dashboard load ────────────────────────────────────────────────────
    builder
      .addCase(fetchDashboardAll.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardAll.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchDashboardAll.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // ── Chart-only reload (period filter) ─────────────────────────────────────
    builder
      .addCase(fetchRevenueChart.pending, (state) => {
        state.chartLoading = true;
        state.chartError = null;
      })
      .addCase(fetchRevenueChart.fulfilled, (state, action) => {
        state.chartLoading = false;
        // Only update the chart slice of data — everything else stays untouched
        if (state.data) {
          state.data.revenueChart = action.payload;
        }
      })
      .addCase(fetchRevenueChart.rejected, (state, action) => {
        state.chartLoading = false;
        state.chartError = action.payload as string;
      });

    // ── Staff Revenue card (own period filter) ─────────────────────────────────
    builder
      .addCase(fetchStaffRevenue.pending, (state) => {
        state.staffRevenueLoading = true;
        state.staffRevenueError = null;
      })
      .addCase(fetchStaffRevenue.fulfilled, (state, action) => {
        state.staffRevenueLoading = false;
        state.staffRevenue = action.payload;
      })
      .addCase(fetchStaffRevenue.rejected, (state, action) => {
        state.staffRevenueLoading = false;
        state.staffRevenueError = action.payload as string;
      });

    // ── Overall Collection card (own Today/Yesterday/Week filter) ─────────────
    builder
      .addCase(fetchPaymentModeBreakdown.pending, (state) => {
        state.paymentModeBreakdownLoading = true;
        state.paymentModeBreakdownError = null;
      })
      .addCase(fetchPaymentModeBreakdown.fulfilled, (state, action) => {
        state.paymentModeBreakdownLoading = false;
        state.paymentModeBreakdown = action.payload;
      })
      .addCase(fetchPaymentModeBreakdown.rejected, (state, action) => {
        state.paymentModeBreakdownLoading = false;
        state.paymentModeBreakdownError = action.payload as string;
      });
  },
});

export default dashboardSlice.reducer;
