import { api } from "@/services/api";
import { DASHBOARD } from "@/services/api/endpoints";

type DashboardSummaryResponse = {
  quick_sale_revenue?: number | null;
  quickSaleRevenue?: number | null;
  todayAppointmentsCount?: number | null;
  todayRevenue?: number | null;
  totalRevenue?: number | null;
  walkInRevenue?: number | null;
};

type DashboardAppointmentStatus = "completed" | "in-progress" | "upcoming" | "cancelled";

type DashboardAppointmentResponse = {
  amount?: number | null;
  clientName?: string | null;
  id?: string | null;
  service?: string | null;
  staffName?: string | null;
  status?: string | null;
  time?: string | null;
};

type DashboardRevenueGoalResponse = {
  earned?: number | null;
  target?: number | null;
} | null;

type DashboardTopClientResponse = {
  id?: string | number | null;
  initials?: string | null;
  last_visit?: string | null;
  lastVisit?: string | null;
  name?: string | null;
  next_reward_points?: number | null;
  nextRewardPoints?: number | null;
  progress_pct?: number | null;
  progressPct?: number | null;
  tag?: string | null;
  visits?: number | null;
} | null;

type DashboardInventoryAlertResponse = {
  action?: string | null;
  id?: string | number | null;
  level?: string | null;
  name?: string | null;
  sub?: string | null;
};

type DashboardQuickSaleServiceResponse = {
  id?: string | number | null;
  name?: string | null;
  price?: number | string | null;
};

type DashboardApiResponse = {
  data?: {
    inventory_alerts?: DashboardInventoryAlertResponse[] | null;
    inventoryAlerts?: DashboardInventoryAlertResponse[] | null;
    popularServices?: DashboardQuickSaleServiceResponse[] | null;
    quick_sale_services?: DashboardQuickSaleServiceResponse[] | null;
    quickSaleServices?: DashboardQuickSaleServiceResponse[] | null;
    revenue_goal?: DashboardRevenueGoalResponse;
    revenueGoal?: DashboardRevenueGoalResponse;
    stockAlerts?: DashboardInventoryAlertResponse[] | null;
    summary?: DashboardSummaryResponse | null;
    todayAppointments?: DashboardAppointmentResponse[] | null;
    top_client?: DashboardTopClientResponse;
    topClient?: DashboardTopClientResponse;
  } | null;
  message?: string;
  success: boolean;
};

export type DashboardMetrics = {
  bookings: number;
  monthlyRevenue: number;
  todaysRevenue: number;
};

export type DashboardAppointment = {
  amount: number;
  clientName: string;
  id: string;
  service: string;
  staffName: string;
  status: DashboardAppointmentStatus;
  time: string;
};

export type DashboardRevenueGoal = {
  earned: number;
  target: number;
};

export type DashboardTopClient = {
  id: string;
  initials: string;
  lastVisitLabel: string;
  name: string;
  nextRewardPoints: number;
  progressPct: number;
  tag: string;
  visits: number;
};

export type DashboardInventoryAlert = {
  action: string;
  id: string;
  level: "warning" | "error";
  name: string;
  sub: string;
};

export type DashboardQuickSaleService = {
  id: string;
  name: string;
  price: number;
};

const toSafeNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value);

    if (Number.isFinite(parsedValue)) {
      return parsedValue;
    }
  }

  return 0;
};

const toSafeString = (value: unknown, fallback = "") => {
  if (typeof value === "string") {
    const trimmedValue = value.trim();

    if (trimmedValue) {
      return trimmedValue;
    }
  }

  return fallback;
};

const toSafeAppointmentStatus = (value: unknown): DashboardAppointmentStatus => {
  const normalized = toSafeString(value).toLowerCase().replace(/[_\s]+/g, "-");

  switch (normalized) {
    case "completed":
    case "in-progress":
    case "cancelled":
      return normalized;
    case "upcoming":
    default:
      return "upcoming";
  }
};

const toSafeInventoryLevel = (value: unknown): "warning" | "error" =>
  toSafeString(value).toLowerCase() === "error" ? "error" : "warning";

const getInitialsFromName = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "CL";

const normalizeAppointment = (
  appointment: DashboardAppointmentResponse,
  index: number,
): DashboardAppointment => ({
  amount: toSafeNumber(appointment.amount),
  clientName: toSafeString(appointment.clientName, "Walk-in Client"),
  id: toSafeString(appointment.id, `dashboard-appointment-${index + 1}`),
  service: toSafeString(appointment.service, "Service not added"),
  staffName: toSafeString(appointment.staffName, "Staff not assigned"),
  status: toSafeAppointmentStatus(appointment.status),
  time: toSafeString(appointment.time, "--:--"),
});

const normalizeRevenueGoal = (goal: DashboardRevenueGoalResponse): DashboardRevenueGoal => ({
  earned: toSafeNumber(goal?.earned),
  target: toSafeNumber(goal?.target),
});

const normalizeTopClient = (client: DashboardTopClientResponse): DashboardTopClient | null => {
  if (!client) {
    return null;
  }

  const name = toSafeString(client.name);
  const id = toSafeString(client.id);

  if (!name && !id) {
    return null;
  }

  return {
    id: id || name.toLowerCase().replace(/\s+/g, "-"),
    initials: toSafeString(client.initials) || getInitialsFromName(name || "Client"),
    lastVisitLabel: toSafeString(client.lastVisit ?? client.last_visit, "-"),
    name: name || "Client",
    nextRewardPoints: toSafeNumber(client.nextRewardPoints ?? client.next_reward_points),
    progressPct: Math.min(
      100,
      Math.max(0, toSafeNumber(client.progressPct ?? client.progress_pct)),
    ),
    tag: toSafeString(client.tag),
    visits: toSafeNumber(client.visits),
  };
};

const normalizeInventoryAlert = (
  alert: DashboardInventoryAlertResponse,
  index: number,
): DashboardInventoryAlert => ({
  action: toSafeString(alert.action, "View"),
  id: toSafeString(alert.id, `inventory-alert-${index + 1}`),
  level: toSafeInventoryLevel(alert.level),
  name: toSafeString(alert.name, "Stock alert"),
  sub: toSafeString(alert.sub),
});

const normalizeQuickSaleService = (
  service: DashboardQuickSaleServiceResponse,
  index: number,
): DashboardQuickSaleService => ({
  id: toSafeString(service.id, `quick-sale-service-${index + 1}`),
  name: toSafeString(service.name, `Service ${index + 1}`),
  price: toSafeNumber(service.price),
});

const formatDateForDashboard = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const dashboardService = {
  getDashboardQueryParams(date = new Date()) {
    return {
      period: "monthly" as const,
      date: formatDateForDashboard(date),
    };
  },

  async getOwnerDashboard(date = new Date(), salonId?: string | null) {
    const params = this.getDashboardQueryParams(date);
    const requestParams = {
      ...params,
      ...(salonId ? { salon_id: salonId } : {}),
    };

    const response = await api.get<DashboardApiResponse>(DASHBOARD.ALL, {
      params: requestParams,
    });
    const data = response.data.data;
    const summary = data?.summary;

    const metrics: DashboardMetrics = {
      bookings: toSafeNumber(summary?.todayAppointmentsCount),
      monthlyRevenue: toSafeNumber(summary?.totalRevenue),
      todaysRevenue: toSafeNumber(summary?.todayRevenue),
    };
    const todayAppointments = (data?.todayAppointments ?? []).map(normalizeAppointment);

    const revenueGoal = normalizeRevenueGoal(data?.revenueGoal ?? data?.revenue_goal ?? null);
    const topClient = normalizeTopClient(data?.topClient ?? data?.top_client ?? null);
    const inventoryAlerts = (
      data?.inventoryAlerts ?? data?.inventory_alerts ?? data?.stockAlerts ?? []
    ).map(normalizeInventoryAlert);
    const quickSaleServices = (
      data?.quickSaleServices ?? data?.quick_sale_services ?? data?.popularServices ?? []
    ).map(normalizeQuickSaleService);

    const hasQuickSaleRevenueField =
      summary?.quickSaleRevenue !== undefined ||
      summary?.quick_sale_revenue !== undefined ||
      summary?.walkInRevenue !== undefined;
    const quickSaleRevenueToday = hasQuickSaleRevenueField
      ? toSafeNumber(summary?.quickSaleRevenue ?? summary?.quick_sale_revenue ?? summary?.walkInRevenue)
      : metrics.todaysRevenue;

    return {
      inventoryAlerts,
      metrics,
      quickSaleRevenueToday,
      quickSaleServices,
      requestedDate: params.date,
      revenueGoal,
      todayAppointments,
      topClient,
    };
  },
};
