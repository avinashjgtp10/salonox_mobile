import { createSlice } from "@reduxjs/toolkit";

import { fetchDashboardThunk } from "@/middleware/dashboard/dashboard.thunk";
import {
  cancelAppointmentThunk,
  confirmAppointmentThunk,
  createAppointmentThunk,
  rescheduleAppointmentThunk,
  startAppointmentThunk,
  updateAppointmentThunk,
} from "@/middleware/appointment/appointment.thunk";
import {
  createStaffThunk,
  deleteStaffThunk,
  updateStaffThunk,
} from "@/middleware/staff/staff.thunk";
import type { RootState } from "@/store";
import type {
  DashboardAppointment,
  DashboardInventoryAlert,
  DashboardMetrics,
  DashboardQuickSaleService,
  DashboardTopClient,
} from "@/services/dashboard.service";

const DASHBOARD_STALE_MS = 5 * 60 * 1000;

const EMPTY_DASHBOARD_METRICS: DashboardMetrics = {
  bookings: 0,
  lastMonthRevenue: 0,
  monthlyRevenue: 0,
  revenueChange: 0,
  todaysRevenue: 0,
};

type DashboardState = {
  appointments: DashboardAppointment[];
  error: string | null;
  inventoryAlerts: DashboardInventoryAlert[];
  isRefreshing: boolean;
  lastFetchedAt: number | null;
  metrics: DashboardMetrics;
  quickSaleRevenueToday: number;
  quickSaleServices: DashboardQuickSaleService[];
  requestedDate: string | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  topClient: DashboardTopClient | null;
};

const initialState: DashboardState = {
  appointments: [],
  error: null,
  inventoryAlerts: [],
  isRefreshing: false,
  lastFetchedAt: null,
  metrics: EMPTY_DASHBOARD_METRICS,
  quickSaleRevenueToday: 0,
  quickSaleServices: [],
  requestedDate: null,
  status: "idle",
  topClient: null,
};

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardThunk.pending, (state) => {
        const hasExistingData = state.lastFetchedAt !== null;

        state.error = null;
        state.isRefreshing = hasExistingData;
        state.status = hasExistingData ? "succeeded" : "loading";
      })
      .addCase(fetchDashboardThunk.fulfilled, (state, action) => {
        state.error = null;
        state.isRefreshing = false;
        state.lastFetchedAt = Date.now();
        state.appointments = action.payload.todayAppointments;
        state.inventoryAlerts = action.payload.inventoryAlerts;
        state.metrics = action.payload.metrics;
        state.quickSaleRevenueToday = action.payload.quickSaleRevenueToday;
        state.quickSaleServices = action.payload.quickSaleServices;
        state.requestedDate = action.payload.requestedDate;
        state.status = "succeeded";
        state.topClient = action.payload.topClient;
      })
      .addCase(fetchDashboardThunk.rejected, (state, action) => {
        if (action.payload?.silent) {
          state.error = null;
          state.isRefreshing = false;
          state.status = state.lastFetchedAt ? "succeeded" : "idle";
          return;
        }

        state.error =
          action.payload?.message ?? action.error.message ?? "Unable to load dashboard.";
        state.isRefreshing = false;
        state.status = state.lastFetchedAt ? "succeeded" : "failed";
      })
      .addMatcher(
        (action) =>
          action.type === createAppointmentThunk.fulfilled.type ||
          action.type === rescheduleAppointmentThunk.fulfilled.type ||
          action.type === cancelAppointmentThunk.fulfilled.type ||
          action.type === confirmAppointmentThunk.fulfilled.type ||
          action.type === startAppointmentThunk.fulfilled.type ||
          action.type === updateAppointmentThunk.fulfilled.type ||
          action.type === createStaffThunk.fulfilled.type ||
          action.type === updateStaffThunk.fulfilled.type ||
          action.type === deleteStaffThunk.fulfilled.type,
        (state) => {
          state.status = "idle";
          state.lastFetchedAt = null;
        }
      );
  },
});

export const selectDashboardMetrics = (state: RootState) => state.dashboard.metrics;
export const selectDashboardAppointments = (state: RootState) => state.dashboard.appointments;
export const selectDashboardError = (state: RootState) => state.dashboard.error;
export const selectDashboardRequestedDate = (state: RootState) => state.dashboard.requestedDate;
export const selectDashboardStatus = (state: RootState) => state.dashboard.status;
export const selectDashboardRefreshing = (state: RootState) => state.dashboard.isRefreshing;
export const selectDashboardIsLoading = (state: RootState) =>
  state.dashboard.status === "loading";
export const selectDashboardLastFetchedAt = (state: RootState) => state.dashboard.lastFetchedAt;
export const selectDashboardIsStale = (state: RootState) =>
  state.dashboard.lastFetchedAt === null ||
  Date.now() - state.dashboard.lastFetchedAt > DASHBOARD_STALE_MS;
export default dashboardSlice.reducer;
