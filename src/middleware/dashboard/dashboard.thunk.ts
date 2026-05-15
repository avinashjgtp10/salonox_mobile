import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";

export interface DashboardAllResponse {
  summary: {
    totalRevenue: number;
    totalAppointments: number;
    totalClients: number;
    todayRevenue: number;
    revenueChange: number | null;
    appointmentsChange: number | null;
    clientsChange: number | null;
    todayRevenueChange: number | null;
    todayAppointmentsCount: number;
  };
  todayAppointments: Array<{
    id: string;
    clientName: string;
    service: string;
    staffName: string;
    time: string;
    status: "completed" | "in-progress" | "upcoming" | "cancelled";
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
}

export const fetchDashboardAll = createAsyncThunk(
  "dashboard/fetchAll",
  async (
    params: { salonId: string; period?: string; date?: string },
    { rejectWithValue }
  ) => {
    try {
      const { salonId, period = "monthly", date } = params;
      const query = new URLSearchParams({ salon_id: salonId, period });
      if (date) query.set("date", date);

      const res = await api.get(`/api/v1/dashboard/all?${query.toString()}`);
      return res.data.data as DashboardAllResponse;
    } catch (err: any) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);
