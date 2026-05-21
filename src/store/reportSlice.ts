import { createSlice } from "@reduxjs/toolkit";
import type {
  RevenueReport,
  AppointmentsReport,
  ClientsReport,
  StaffReport,
  ServicesReport,
  ReportsDashboard,
} from "../types/report.types";
import {
  fetchRevenueReportThunk,
  fetchAppointmentsReportThunk,
  fetchClientsReportThunk,
  fetchStaffReportThunk,
  fetchServicesReportThunk,
  exportReportThunk,
  fetchReportsDashboardThunk,
} from "../middleware/report/report.thunk";

// ── State ─────────────────────────────────────────────────────────────────────
export interface ReportState {
  revenue: RevenueReport | null;
  appointments: AppointmentsReport | null;
  clients: ClientsReport | null;
  staff: StaffReport | null;
  services: ServicesReport | null;
  reportsDashboard: ReportsDashboard | null;
  loading: {
    revenue: boolean;
    appointments: boolean;
    clients: boolean;
    staff: boolean;
    services: boolean;
    export: boolean;
    dashboard: boolean;
  };
  error: string | null;
}

const initialState: ReportState = {
  revenue: null,
  appointments: null,
  clients: null,
  staff: null,
  services: null,
  reportsDashboard: null,
  loading: {
    revenue: false,
    appointments: false,
    clients: false,
    staff: false,
    services: false,
    export: false,
    dashboard: false,
  },
  error: null,
};

// ── Slice ─────────────────────────────────────────────────────────────────────
const reportSlice = createSlice({
  name: "report",
  initialState,
  reducers: {
    clearReportError(state) {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    // ── Revenue ──────────────────────────────────────────────────────────────
    builder
      .addCase(fetchRevenueReportThunk.pending, (state) => {
        state.loading.revenue = true;
        state.error = null;
      })
      .addCase(fetchRevenueReportThunk.fulfilled, (state, { payload }) => {
        state.loading.revenue = false;
        state.revenue = payload;
      })
      .addCase(fetchRevenueReportThunk.rejected, (state, { payload }) => {
        state.loading.revenue = false;
        state.error = payload ?? "Failed to fetch revenue report";
      });

    // ── Appointments ──────────────────────────────────────────────────────────
    builder
      .addCase(fetchAppointmentsReportThunk.pending, (state) => {
        state.loading.appointments = true;
        state.error = null;
      })
      .addCase(fetchAppointmentsReportThunk.fulfilled, (state, { payload }) => {
        state.loading.appointments = false;
        state.appointments = payload;
      })
      .addCase(fetchAppointmentsReportThunk.rejected, (state, { payload }) => {
        state.loading.appointments = false;
        state.error = payload ?? "Failed to fetch appointments report";
      });

    // ── Clients ───────────────────────────────────────────────────────────────
    builder
      .addCase(fetchClientsReportThunk.pending, (state) => {
        state.loading.clients = true;
        state.error = null;
      })
      .addCase(fetchClientsReportThunk.fulfilled, (state, { payload }) => {
        state.loading.clients = false;
        state.clients = payload;
      })
      .addCase(fetchClientsReportThunk.rejected, (state, { payload }) => {
        state.loading.clients = false;
        state.error = payload ?? "Failed to fetch clients report";
      });

    // ── Staff ─────────────────────────────────────────────────────────────────
    builder
      .addCase(fetchStaffReportThunk.pending, (state) => {
        state.loading.staff = true;
        state.error = null;
      })
      .addCase(fetchStaffReportThunk.fulfilled, (state, { payload }) => {
        state.loading.staff = false;
        state.staff = payload;
      })
      .addCase(fetchStaffReportThunk.rejected, (state, { payload }) => {
        state.loading.staff = false;
        state.error = payload ?? "Failed to fetch staff report";
      });

    // ── Services ──────────────────────────────────────────────────────────────
    builder
      .addCase(fetchServicesReportThunk.pending, (state) => {
        state.loading.services = true;
        state.error = null;
      })
      .addCase(fetchServicesReportThunk.fulfilled, (state, { payload }) => {
        state.loading.services = false;
        state.services = payload;
      })
      .addCase(fetchServicesReportThunk.rejected, (state, { payload }) => {
        state.loading.services = false;
        state.error = payload ?? "Failed to fetch services report";
      });

    // ── Export ────────────────────────────────────────────────────────────────
    builder
      .addCase(exportReportThunk.pending, (state) => {
        state.loading.export = true;
        state.error = null;
      })
      .addCase(exportReportThunk.fulfilled, (state) => {
        state.loading.export = false;
      })
      .addCase(exportReportThunk.rejected, (state, { payload }) => {
        state.loading.export = false;
        state.error = payload ?? "Failed to export report";
      });

    // ── Reports Dashboard ─────────────────────────────────────────────────────
    builder
      .addCase(fetchReportsDashboardThunk.pending, (state) => {
        state.loading.dashboard = true;
        state.error = null;
      })
      .addCase(fetchReportsDashboardThunk.fulfilled, (state, { payload }) => {
        state.loading.dashboard = false;
        state.reportsDashboard = payload;
      })
      .addCase(fetchReportsDashboardThunk.rejected, (state, { payload }) => {
        state.loading.dashboard = false;
        state.error = payload ?? "Failed to fetch reports dashboard";
      });
  },
});

export const { clearReportError } = reportSlice.actions;
export default reportSlice.reducer;
