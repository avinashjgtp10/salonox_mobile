import { createSlice } from "@reduxjs/toolkit";
import {
  fetchDashboardCombined,
  fetchRevenueChart,
} from "../middleware/dashboard/dashboard.thunk";
import type { DashboardCombinedResponse } from "../middleware/dashboard/dashboard.thunk";

interface DashboardState {
  data: DashboardCombinedResponse | null;
  loading: boolean;       // full-page initial load (also covers Overall Collection filter changes)
  chartLoading: boolean;  // chart-only reload on period/gender change
  error: string | null;
  chartError: string | null;
}

const initialState: DashboardState = {
  data: null,
  loading: false,
  chartLoading: false,
  error: null,
  chartError: null,
};

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // ── Combined dashboard load (summary, today's appointments, chart,
    // pending payments, birthdays, Overall Collection) ────────────────────────
    builder
      .addCase(fetchDashboardCombined.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardCombined.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchDashboardCombined.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // ── Chart-only reload (Revenue Overview's own period/gender filter) ───────
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
  },
});

export default dashboardSlice.reducer;
