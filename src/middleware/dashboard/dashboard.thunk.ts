import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { DASHBOARD } from "../../services/api/endpoints";
import type {
  DashboardSummary,
  TodayAppointment,
  RevenueDataPoint,
  TopStaffMember,
  ServiceMixItem,
} from "../../types/dashboard.types";

// Extract salon_id from Redux state and append as query param
function salonParam(getState: () => unknown): string {
  const state = getState() as any;
  const id = state.salon?.currentSalon?.id;
  return id ? `?salon_id=${encodeURIComponent(id)}` : "";
}

export const fetchDashboardSummaryThunk = createAsyncThunk<
  DashboardSummary,
  void,
  { rejectValue: string }
>("dashboard/fetchSummary", async (_, { rejectWithValue, getState }) => {
  try {
    const res = await api.get<{ data: DashboardSummary }>(
      `${DASHBOARD.SUMMARY}${salonParam(getState)}`
    );
    return res.data.data;
  } catch {
    return rejectWithValue("Failed to load dashboard summary");
  }
});

export const fetchTodayAppointmentsThunk = createAsyncThunk<
  TodayAppointment[],
  void,
  { rejectValue: string }
>("dashboard/fetchTodayAppointments", async (_, { rejectWithValue, getState }) => {
  try {
    const res = await api.get<{ data: TodayAppointment[] }>(
      `${DASHBOARD.APPOINTMENTS_TODAY}${salonParam(getState)}`
    );
    return res.data.data;
  } catch {
    return rejectWithValue("Failed to load today's appointments");
  }
});

export const fetchRevenueChartThunk = createAsyncThunk<
  RevenueDataPoint[],
  void,
  { rejectValue: string }
>("dashboard/fetchRevenue", async (_, { rejectWithValue, getState }) => {
  try {
    const res = await api.get<{ data: RevenueDataPoint[] }>(
      `${DASHBOARD.REVENUE}${salonParam(getState)}`
    );
    return res.data.data;
  } catch {
    return rejectWithValue("Failed to load revenue chart");
  }
});

export const fetchTopStaffThunk = createAsyncThunk<
  TopStaffMember[],
  void,
  { rejectValue: string }
>("dashboard/fetchTopStaff", async (_, { rejectWithValue, getState }) => {
  try {
    const res = await api.get<{ data: TopStaffMember[] }>(
      `${DASHBOARD.STAFF_TOP}${salonParam(getState)}`
    );
    return res.data.data;
  } catch {
    return rejectWithValue("Failed to load top staff");
  }
});

export const fetchServiceMixThunk = createAsyncThunk<
  ServiceMixItem[],
  void,
  { rejectValue: string }
>("dashboard/fetchServiceMix", async (_, { rejectWithValue, getState }) => {
  try {
    const res = await api.get<{ data: ServiceMixItem[] }>(
      `${DASHBOARD.SERVICES_MIX}${salonParam(getState)}`
    );
    return res.data.data;
  } catch {
    return rejectWithValue("Failed to load service mix");
  }
});
