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
} from "../../types/report.types";

// ── Revenue report ─────────────────────────────────────────────────────────────
export const fetchRevenueReportThunk = createAsyncThunk<
  RevenueReport,
  Pick<FetchReportPayload, "period">,
  { rejectValue: string }
>("report/fetchRevenue", async ({ period }, { rejectWithValue }) => {
  try {
    const res = await api.get<RevenueReportResponse>(REPORT.REVENUE(period));
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch revenue report");
  }
});

// ── Appointments report ────────────────────────────────────────────────────────
export const fetchAppointmentsReportThunk = createAsyncThunk<
  AppointmentsReport,
  Pick<FetchReportPayload, "period">,
  { rejectValue: string }
>("report/fetchAppointments", async ({ period }, { rejectWithValue }) => {
  try {
    const res = await api.get<AppointmentsReportResponse>(REPORT.APPOINTMENTS(period));
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch appointments report");
  }
});

// ── Clients report ────────────────────────────────────────────────────────────
export const fetchClientsReportThunk = createAsyncThunk<
  ClientsReport,
  Pick<FetchReportPayload, "period">,
  { rejectValue: string }
>("report/fetchClients", async ({ period }, { rejectWithValue }) => {
  try {
    const res = await api.get<ClientsReportResponse>(REPORT.CLIENTS(period));
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch clients report");
  }
});

// ── Staff report ──────────────────────────────────────────────────────────────
export const fetchStaffReportThunk = createAsyncThunk<
  StaffReport,
  Pick<FetchReportPayload, "period">,
  { rejectValue: string }
>("report/fetchStaff", async ({ period }, { rejectWithValue }) => {
  try {
    const res = await api.get<StaffReportResponse>(REPORT.STAFF(period));
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch staff report");
  }
});

// ── Services report ───────────────────────────────────────────────────────────
export const fetchServicesReportThunk = createAsyncThunk<
  ServicesReport,
  Pick<FetchReportPayload, "period">,
  { rejectValue: string }
>("report/fetchServices", async ({ period }, { rejectWithValue }) => {
  try {
    const res = await api.get<ServicesReportResponse>(REPORT.SERVICES(period));
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch services report");
  }
});

// ── Export report ─────────────────────────────────────────────────────────────
export const exportReportThunk = createAsyncThunk<
  void,
  ExportReportPayload,
  { rejectValue: string }
>("report/export", async ({ tab, period, format }, { rejectWithValue }) => {
  try {
    const res = await api.get(REPORT.EXPORT(tab, period, format), {
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
