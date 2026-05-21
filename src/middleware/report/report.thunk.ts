import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { REPORT } from "../../services/api/endpoints";
import { ApiError } from "../../services/api/interceptors";
import { downloadBlob } from "../../utils/downloadBlob";
import type {
  FetchReportPayload,
  ExportReportPayload,
  RevenueReport,
  AppointmentsReport,
  ClientsReport,
  StaffReport,
  ServicesReport,
  RevenueReportResponse,
  AppointmentsReportResponse,
  ClientsReportResponse,
  StaffReportResponse,
  ServicesReportResponse,
  ReportsDashboard,
  ReportsDashboardResponse,
  FetchReportsDashboardPayload,
} from "../../types/report.types";

type FetchPayload = Pick<FetchReportPayload, "period" | "from" | "to">;

// ── Revenue report ─────────────────────────────────────────────────────────────
export const fetchRevenueReportThunk = createAsyncThunk<
  RevenueReport,
  FetchPayload,
  { rejectValue: string }
>("report/fetchRevenue", async ({ period, from, to }, { rejectWithValue }) => {
  try {
    const res = await api.get<RevenueReportResponse>(REPORT.REVENUE(period, from, to));
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch revenue report");
  }
});

// ── Appointments report ────────────────────────────────────────────────────────
export const fetchAppointmentsReportThunk = createAsyncThunk<
  AppointmentsReport,
  FetchPayload,
  { rejectValue: string }
>("report/fetchAppointments", async ({ period, from, to }, { rejectWithValue }) => {
  try {
    const res = await api.get<AppointmentsReportResponse>(REPORT.APPOINTMENTS(period, from, to));
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch appointments report");
  }
});

// ── Clients report ────────────────────────────────────────────────────────────
export const fetchClientsReportThunk = createAsyncThunk<
  ClientsReport,
  FetchPayload,
  { rejectValue: string }
>("report/fetchClients", async ({ period, from, to }, { rejectWithValue }) => {
  try {
    const res = await api.get<ClientsReportResponse>(REPORT.CLIENTS(period, from, to));
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch clients report");
  }
});

// ── Staff report ──────────────────────────────────────────────────────────────
export const fetchStaffReportThunk = createAsyncThunk<
  StaffReport,
  FetchPayload,
  { rejectValue: string }
>("report/fetchStaff", async ({ period, from, to }, { rejectWithValue }) => {
  try {
    const res = await api.get<StaffReportResponse>(REPORT.STAFF(period, from, to));
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch staff report");
  }
});

// ── Services report ───────────────────────────────────────────────────────────
export const fetchServicesReportThunk = createAsyncThunk<
  ServicesReport,
  FetchPayload,
  { rejectValue: string }
>("report/fetchServices", async ({ period, from, to }, { rejectWithValue }) => {
  try {
    const res = await api.get<ServicesReportResponse>(REPORT.SERVICES(period, from, to));
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch services report");
  }
});

// ── Reports Dashboard ─────────────────────────────────────────────────────────
export const fetchReportsDashboardThunk = createAsyncThunk<
  ReportsDashboard,
  FetchReportsDashboardPayload | undefined,
  { rejectValue: string }
>("report/fetchDashboard", async (params, { rejectWithValue }) => {
  try {
    const res = await api.get<ReportsDashboardResponse>(REPORT.DASHBOARD(params));
    return res.data.reportsDashboard;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch reports dashboard");
  }
});

// ── Export report ─────────────────────────────────────────────────────────────
export const exportReportThunk = createAsyncThunk<
  void,
  ExportReportPayload & { from?: string; to?: string },
  { rejectValue: string }
>("report/export", async ({ tab, period, format, from, to }, { rejectWithValue }) => {
  try {
    const res = await api.get(REPORT.EXPORT(tab, period, format, from, to), {
      responseType: "blob",
    });
    downloadBlob(
      res.data,
      `report-${tab}-${period}.${format === "excel" ? "xlsx" : "csv"}`,
    );
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to export report");
  }
});
