export interface DashboardSummary {
  totalRevenue: number;
  totalAppointments: number;
  totalClients: number;
  todayRevenue: number;
  revenueChange?: number;
  appointmentsChange?: number;
  clientsChange?: number;
  todayRevenueChange?: number;
  todayAppointmentsCount?: number;
}

export interface TodayAppointment {
  id: string | number;
  client?: string;
  clientName?: string;
  service?: string;
  serviceName?: string;
  staff?: string;
  staffName?: string;
  time?: string;
  startTime?: string;
  status: "completed" | "in-progress" | "upcoming" | "cancelled" | string;
  amount?: number;
  price?: number;
}

export interface RevenueDataPoint {
  month: string;
  revenue: number;
  expenses: number;
}

export interface TopStaffMember {
  id: string | number;
  name: string;
  role?: string;
  bookings?: number;
  clientCount?: number;
  revenue?: number;
  rating?: number;
  avatar?: string;
}

export interface ServiceMixItem {
  name: string;
  value: number;
  color?: string;
}
