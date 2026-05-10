import { createSlice } from "@reduxjs/toolkit";
import type {
  DashboardSummary,
  TodayAppointment,
  RevenueDataPoint,
  TopStaffMember,
  ServiceMixItem,
} from "../types/dashboard.types";
import {
  fetchDashboardSummaryThunk,
  fetchTodayAppointmentsThunk,
  fetchRevenueChartThunk,
  fetchTopStaffThunk,
  fetchServiceMixThunk,
} from "../middleware/dashboard/dashboard.thunk";

interface DashboardState {
  summary: DashboardSummary | null;
  appointments: TodayAppointment[];
  revenue: RevenueDataPoint[];
  topStaff: TopStaffMember[];
  serviceMix: ServiceMixItem[];
  loading: {
    summary: boolean;
    appointments: boolean;
    revenue: boolean;
    topStaff: boolean;
    serviceMix: boolean;
  };
  error: {
    summary: string | null;
    appointments: string | null;
    revenue: string | null;
    topStaff: string | null;
    serviceMix: string | null;
  };
}

const initialState: DashboardState = {
  summary: null,
  appointments: [],
  revenue: [],
  topStaff: [],
  serviceMix: [],
  loading: {
    summary: false,
    appointments: false,
    revenue: false,
    topStaff: false,
    serviceMix: false,
  },
  error: {
    summary: null,
    appointments: null,
    revenue: null,
    topStaff: null,
    serviceMix: null,
  },
};

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // ── Summary ──────────────────────────────────────────────────────────────
    builder
      .addCase(fetchDashboardSummaryThunk.pending, (state) => {
        state.loading.summary = true;
        state.error.summary = null;
      })
      .addCase(fetchDashboardSummaryThunk.fulfilled, (state, { payload }) => {
        state.loading.summary = false;
        state.summary = payload;
      })
      .addCase(fetchDashboardSummaryThunk.rejected, (state, { payload }) => {
        state.loading.summary = false;
        state.error.summary = payload ?? "Failed to load summary";
      });

    // ── Today's Appointments ─────────────────────────────────────────────────
    builder
      .addCase(fetchTodayAppointmentsThunk.pending, (state) => {
        state.loading.appointments = true;
        state.error.appointments = null;
      })
      .addCase(
        fetchTodayAppointmentsThunk.fulfilled,
        (state, { payload }) => {
          state.loading.appointments = false;
          state.appointments = payload;
        }
      )
      .addCase(
        fetchTodayAppointmentsThunk.rejected,
        (state, { payload }) => {
          state.loading.appointments = false;
          state.error.appointments = payload ?? "Failed to load appointments";
        }
      );

    // ── Revenue Chart ────────────────────────────────────────────────────────
    builder
      .addCase(fetchRevenueChartThunk.pending, (state) => {
        state.loading.revenue = true;
        state.error.revenue = null;
      })
      .addCase(fetchRevenueChartThunk.fulfilled, (state, { payload }) => {
        state.loading.revenue = false;
        state.revenue = payload;
      })
      .addCase(fetchRevenueChartThunk.rejected, (state, { payload }) => {
        state.loading.revenue = false;
        state.error.revenue = payload ?? "Failed to load revenue";
      });

    // ── Top Staff ────────────────────────────────────────────────────────────
    builder
      .addCase(fetchTopStaffThunk.pending, (state) => {
        state.loading.topStaff = true;
        state.error.topStaff = null;
      })
      .addCase(fetchTopStaffThunk.fulfilled, (state, { payload }) => {
        state.loading.topStaff = false;
        state.topStaff = payload;
      })
      .addCase(fetchTopStaffThunk.rejected, (state, { payload }) => {
        state.loading.topStaff = false;
        state.error.topStaff = payload ?? "Failed to load top staff";
      });

    // ── Service Mix ──────────────────────────────────────────────────────────
    builder
      .addCase(fetchServiceMixThunk.pending, (state) => {
        state.loading.serviceMix = true;
        state.error.serviceMix = null;
      })
      .addCase(fetchServiceMixThunk.fulfilled, (state, { payload }) => {
        state.loading.serviceMix = false;
        state.serviceMix = payload;
      })
      .addCase(fetchServiceMixThunk.rejected, (state, { payload }) => {
        state.loading.serviceMix = false;
        state.error.serviceMix = payload ?? "Failed to load service mix";
      });
  },
});

export default dashboardSlice.reducer;
