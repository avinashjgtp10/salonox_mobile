import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";

export interface PaymentModeBreakdownEntry {
  method: string;
  amount: number;
  percentage: number;
}
export interface PaymentModeBreakdown {
  entries: PaymentModeBreakdownEntry[];
  total: number;
}

// Raw enriched appointment row shape — same as GET /api/v1/appointments
// (appointmentsService.list output), consumed via the shared mapApiBooking()
// normalizer rather than a dashboard-specific shape.
export type DashboardRawAppointment = Record<string, unknown>;

export interface DashboardCombinedResponse {
  summary: {
    totalRevenue: number;
    allTimeRevenue: number;
    todayRevenue: number;
    revenueChange: number | null;
    todayRevenueChange: number | null;
    todayAppointmentsCount: number;
    yesterdayAppointmentsCount: number;
    lastMonthRevenue: number;
    yesterdayRevenue: number;
    newClientsToday: number;
    newClientsThisMonth: number;
  };
  todayAppointments: DashboardRawAppointment[];
  revenueChart: Array<{ month: string; fullLabel: string; revenue: number }>;
  pendingPayments: { count: number; amount: number };
  todaysBirthdays: { clients: Array<{ id: string; name: string; phone: string | null; phoneCountryCode: string | null }> };
  paymentModeBreakdown: PaymentModeBreakdown;
}

// Single combined load — called once on mount, and again whenever the
// Overall Collection card's filter changes (collectionPeriod travels in the
// body alongside it, so that filter click doesn't need its own round trip).
// Replaces the previous 3 separate calls: GET /dashboard/all, the live
// GET /appointments (today's appointments table), and
// GET /dashboard/payment-mode-breakdown.
export const fetchDashboardCombined = createAsyncThunk<
  DashboardCombinedResponse,
  { period?: string; date?: string; collectionPeriod?: string }
>(
  "dashboard/fetchCombined",
  async (params, { rejectWithValue }) => {
    try {
      const { period = "monthly", date, collectionPeriod = "today" } = params;
      const res = await api.post("/api/v1/dashboard", { period, date, collectionPeriod });
      return res.data.data as DashboardCombinedResponse;
    } catch (err: any) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

// Chart-only reload — called when the Revenue Overview's own period/gender
// filter changes, independent of the combined load above.
export const fetchRevenueChart = createAsyncThunk<
  Array<{ month: string; fullLabel: string; revenue: number }>,
  { period: string; gender?: string }
>(
  "dashboard/fetchRevenueChart",
  async ({ period, gender }, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams({ period });
      if (gender && gender !== "all") query.set("gender", gender);
      const res = await api.get(`/api/v1/dashboard/revenue?${query.toString()}`);
      // Backend may return { data: [...] } or [...] directly
      const payload = res.data.data ?? res.data;
      return Array.isArray(payload) ? payload : [];
    } catch (err: any) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

