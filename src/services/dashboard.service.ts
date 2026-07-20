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

type DashboardAppointmentStatus =
  | "cancelled"
  | "completed"
  | "deleted"
  | "expired"
  | "in-progress"
  | "no-show"
  | "partial"
  | "unknown"
  | "upcoming";

type DashboardAppointmentResponse = {
  amount?: number | null;
  // Candidate fields for the appointment's actual scheduled start datetime.
  // Deliberately does NOT include created_at/updated_at/booking_time — those
  // are record bookkeeping timestamps, not the scheduled start time.
  appointmentDate?: string | null;
  appointmentDateTime?: string | null;
  appointmentTime?: string | null;
  appointment_date?: string | null;
  appointment_date_time?: string | null;
  appointment_time?: string | null;
  clientName?: string | null;
  datetime?: string | null;
  id?: string | null;
  scheduledAt?: string | null;
  scheduledDateTime?: string | null;
  scheduledStart?: string | null;
  scheduled_at?: string | null;
  scheduled_date_time?: string | null;
  scheduled_start?: string | null;
  service?: string | null;
  staffName?: string | null;
  startTime?: string | null;
  start_time?: string | null;
  status?: string | null;
  time?: string | null;
};

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
  // Epoch ms for the appointment's scheduled start, when a parseable
  // scheduled-datetime field was present on the raw record. Null when the
  // backend only provided a pre-formatted time string.
  scheduledAtMs: number | null;
  service: string;
  staffName: string;
  status: DashboardAppointmentStatus;
  time: string;
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

const warnedUnknownAppointmentStatuses = new Set<string>();

const toSafeAppointmentStatus = (value: unknown): DashboardAppointmentStatus => {
  const rawStatus = toSafeString(value);
  const normalized = rawStatus.toLowerCase().replace(/[_\s]+/g, "-");

  switch (normalized) {
    case "paid":
    case "completed":
    case "complete":
    case "done":
    case "finished":
      return "completed";
    case "partial":
      return "partial";
    case "in-progress":
    case "inprogress":
    case "ongoing":
      return "in-progress";
    case "cancelled":
    case "canceled":
      return "cancelled";
    case "no-show":
    case "noshow":
      return "no-show";
    case "deleted":
      return "deleted";
    case "expired":
      return "expired";
    case "upcoming":
    case "confirmed":
    case "booked":
    case "scheduled":
    case "pending":
      return "upcoming";
    default:
      if (rawStatus && !warnedUnknownAppointmentStatuses.has(rawStatus)) {
        warnedUnknownAppointmentStatuses.add(rawStatus);
        console.warn("[Dashboard] Unknown appointment status received", { status: rawStatus });
      }

      return "unknown";
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

const firstDefined = (...values: unknown[]) =>
  values.find((value) => value !== undefined && value !== null);

// Parses the appointment's real scheduled-start value (never
// created_at/updated_at/booking_time) into an absolute instant. JS Date
// always stores an absolute instant regardless of the source string's
// timezone/offset, so downstream local-time getters (see formatLocalTime)
// automatically render it in the device's local timezone.
const parseScheduledAtMs = (appointment: DashboardAppointmentResponse): number | null => {
  const rawValue = firstDefined(
    appointment.scheduledAt,
    appointment.scheduled_at,
    appointment.startTime,
    appointment.start_time,
    appointment.appointmentDateTime,
    appointment.appointment_date_time,
    appointment.scheduledDateTime,
    appointment.scheduled_date_time,
    appointment.scheduledStart,
    appointment.scheduled_start,
    appointment.datetime,
    appointment.appointmentTime,
    appointment.appointment_time,
    appointment.appointmentDate,
    appointment.appointment_date,
  );

  if (typeof rawValue !== "string" && typeof rawValue !== "number") {
    return null;
  }

  const parsedMs = new Date(rawValue).getTime();

  return Number.isFinite(parsedMs) ? parsedMs : null;
};

// Formats an absolute instant using the device's local timezone (never the
// backend server's timezone), matching the "H:MM AM/PM" shape the dashboard
// UI already parses.
const formatLocalTime = (scheduledAtMs: number) => {
  const date = new Date(scheduledAtMs);
  const hours24 = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;

  return `${hours12}:${String(minutes).padStart(2, "0")} ${ampm}`;
};

const normalizeAppointment = (
  appointment: DashboardAppointmentResponse,
  index: number,
): DashboardAppointment => {
  const scheduledAtMs = parseScheduledAtMs(appointment);

  return {
    amount: toSafeNumber(appointment.amount),
    clientName: toSafeString(appointment.clientName, "Walk-in Client"),
    id: toSafeString(appointment.id, `dashboard-appointment-${index + 1}`),
    scheduledAtMs,
    service: toSafeString(appointment.service, "Service not added"),
    staffName: toSafeString(appointment.staffName, "Staff not assigned"),
    status: toSafeAppointmentStatus(appointment.status),
    // Prefer deriving the display time from the real scheduled datetime; only
    // fall back to the backend's own pre-formatted string when no parseable
    // scheduled datetime field was found at all.
    time: scheduledAtMs !== null ? formatLocalTime(scheduledAtMs) : toSafeString(appointment.time, "--:--"),
  };
};

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
    // Ascending by scheduled start time; appointments with no parseable
    // scheduled datetime sort last rather than being dropped.
    const todayAppointments = (data?.todayAppointments ?? [])
      .map(normalizeAppointment)
      .sort((a, b) => (a.scheduledAtMs ?? Infinity) - (b.scheduledAtMs ?? Infinity));

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
      todayAppointments,
      topClient,
    };
  },
};
