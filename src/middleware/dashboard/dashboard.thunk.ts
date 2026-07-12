import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";

export interface DashboardAllResponse {
  summary: {
    totalRevenue: number;
    allTimeRevenue: number;
    totalAppointments: number;
    totalClients: number;
    todayRevenue: number;
    revenueChange: number | null;
    appointmentsChange: number | null;
    clientsChange: number | null;
    todayRevenueChange: number | null;
    todayAppointmentsCount: number;
    avgBillValue: number;
    avgBillValueChange: number | null;
    lastMonthRevenue: number;
    yesterdayRevenue: number;
    newClientsToday: number;
    newClientsThisMonth: number;
  };
  todayAppointments: Array<{
    id: string;
    clientName: string;
    service: string;
    staffName: string;
    time: string;
    status: "completed" | "in-progress" | "upcoming" | "cancelled" | "no-show" | "deleted";
    amount: number;
  }>;
  revenueChart: Array<{ month: string; revenue: number; expenses: number }>;
  topStaff: Array<{
    id: string;
    name: string;
    role: string;
    avatar: string;
    clientCount: number;
    revenue: number;
    bookings: number;
  }>;
  serviceMix: Array<{ name: string; value: number }>;
  services: Array<{
    id: string | number;
    name: string;
    price: string | number;
    duration: number;
    category_name: string | null;
    price_type?: "fixed" | "from" | "free";
    is_active: boolean;
  }>;
  todayOverview: {
    bookings: number;
    waiting: number;
    delayed: number;
    paymentDue: number;
    runningLate: number;
  };
  todayTimeline: Array<{ hour: string; count: number }>;
  pendingPayments: { count: number; amount: number };
  todaysBirthdays: { count: number; clients: Array<{ id: string; name: string }> };
  inactiveClients: { count: number };
  recentActivity: Array<{ id: string; type: string; title: string; body: string | null; createdAt: string }>;
}

// Full dashboard load — called once on mount
export const fetchDashboardAll = createAsyncThunk<
  DashboardAllResponse,
  { period?: string; date?: string }
>(
  "dashboard/fetchAll",
  async (params, { rejectWithValue }) => {
    try {
      const { period = "monthly", date } = params;
      const query = new URLSearchParams({ period });
      if (date) query.set("date", date);
      const res = await api.get(`/api/v1/dashboard/all?${query.toString()}`);
      return res.data.data as DashboardAllResponse;
    } catch (err: any) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

// Chart-only reload — called when the period filter changes
export const fetchRevenueChart = createAsyncThunk<
  Array<{ month: string; revenue: number; expenses: number }>,
  { period: string }
>(
  "dashboard/fetchRevenueChart",
  async ({ period }, { rejectWithValue }) => {
    try {
      const res = await api.get(`/api/v1/dashboard/revenue?period=${period}`);
      // Backend may return { data: [...] } or [...] directly
      const payload = res.data.data ?? res.data;
      return Array.isArray(payload) ? payload : [];
    } catch (err: any) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export interface StaffRevenueEntry {
  id: string;
  name: string;
  role: string;
  revenue: number;
}

// Staff Revenue card — its own period filter, independent of the Revenue Trend chart's.
export const fetchStaffRevenue = createAsyncThunk<
  StaffRevenueEntry[],
  { period: string }
>(
  "dashboard/fetchStaffRevenue",
  async ({ period }, { rejectWithValue }) => {
    try {
      const res = await api.get(`/api/v1/dashboard/staff/revenue?period=${period}`);
      const payload = res.data.data ?? res.data;
      return Array.isArray(payload) ? payload : [];
    } catch (err: any) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);
