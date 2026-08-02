import { api } from "@/services/api";
import { APPOINTMENT } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";
import { normalizeSaleId } from "@/utils/apiNormalize";
import type {
  AppointmentApiItem,
  AppointmentDetailApiData,
  AppointmentDetailResponse,
  AppointmentHistoryResponse,
  AppointmentListApiData,
  AppointmentListItem,
  AppointmentListPagination,
  AppointmentListQuery,
  AppointmentListResponse,
  AppointmentMutationResponse,
  AppointmentStatus,
  CancelAppointmentRequest,
  CreateAppointmentRequest,
  RescheduleAppointmentRequest,
  UpdateAppointmentRequest,
} from "@/types/appointment";

type AppointmentListApiResponse = ApiResponse<AppointmentListApiData>;
type AppointmentDetailApiResponse = ApiResponse<AppointmentDetailApiData>;

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

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return fallback;
};

const toOptionalBoolean = (value: unknown) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }

  return false;
};

const toDurationMinutes = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalizedValue = value.trim().toLowerCase();
    const directNumber = Number(normalizedValue);

    if (Number.isFinite(directNumber)) {
      return directNumber;
    }

    const hourMatch = normalizedValue.match(/(\d+(?:\.\d+)?)\s*h/);
    const minuteMatch = normalizedValue.match(/(\d+)\s*m/);
    const hours = hourMatch ? Number(hourMatch[1]) * 60 : 0;
    const minutes = minuteMatch ? Number(minuteMatch[1]) : 0;

    if (hours || minutes) {
      return Math.round(hours + minutes);
    }
  }

  return null;
};

const formatDuration = (minutes: number | null) => {
  if (!minutes || minutes <= 0) {
    return "-";
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes ? `${hours} hr ${remainingMinutes} min` : `${hours} hr`;
};

const titleCase = (value: string) =>
  value
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());

const ACTIVE_APPOINTMENT_STATUSES: ReadonlySet<AppointmentStatus> = new Set([
  "Upcoming",
  "Confirmed",
  "Waiting",
  "Checked In",
  "In Service",
  "In Progress",
]);

const APPOINTMENT_STATUS_API_VALUE: Record<AppointmentStatus, string> = {
  "Checked In": "in_progress",
  "Cancelled": "cancelled",
  "Confirmed": "confirmed",
  "Completed": "paid",
  "Deleted": "deleted",
  "In Progress": "in_progress",
  "In Service": "in_progress",
  "Missed": "no-show",
  "Partial": "partial",
  "Unknown": "",
  "Upcoming": "booked",
  "Waiting": "booked",
};

export const isActiveAppointmentStatus = (status: AppointmentStatus) =>
  ACTIVE_APPOINTMENT_STATUSES.has(status);

export const appointmentStatusToApiValue = (status: AppointmentStatus) =>
  APPOINTMENT_STATUS_API_VALUE[status];

export const appointmentStatusToListApiValue = (status: AppointmentStatus) =>
  status === "Upcoming" || status === "Deleted" || status === "Unknown"
    ? undefined
    : appointmentStatusToApiValue(status);

export const appointmentStatusMatchesFilter = (
  appointmentStatus: AppointmentStatus,
  filterStatus: "All" | AppointmentStatus,
) => {
  if (appointmentStatus === "Deleted" || appointmentStatus === "Unknown") {
    return false;
  }

  if (filterStatus === "All") {
    return true;
  }

  if (filterStatus === "Upcoming") {
    return isActiveAppointmentStatus(appointmentStatus);
  }

  return appointmentStatus === filterStatus;
};

const warnedUnknownStatuses = new Set<string>();

export const toAppointmentStatus = (value: unknown): AppointmentStatus => {
  const rawStatus = toSafeString(value);
  const normalizedStatus = rawStatus
    .replace(/[_-]+/g, " ")
    .toLowerCase();

  switch (normalizedStatus) {
    case "checked in":
      return "Checked In";
    case "in service":
      return "In Service";
    case "in progress":
    case "inprogress":
    case "ongoing":
      return "In Progress";
    case "confirmed":
      return "Confirmed";
    case "booked":
    case "pending":
    case "scheduled":
    case "upcoming":
      return "Upcoming";
    case "waiting":
      return "Waiting";
    case "paid":
    case "complete":
    case "completed":
    case "done":
    case "finished":
      return "Completed";
    case "partial":
      return "Partial";
    case "cancelled":
    case "canceled":
      return "Cancelled";
    case "expired":
    case "missed":
    case "no show":
    case "noshow":
      return "Missed";
    case "deleted":
      return "Deleted";
    default:
      if (rawStatus && !warnedUnknownStatuses.has(rawStatus)) {
        warnedUnknownStatuses.add(rawStatus);
        console.warn("[Appointments] Unknown appointment status received", { status: rawStatus });
      }

      return "Unknown";
  }
};

const getClientName = (appointment: AppointmentApiItem) =>
  toSafeString(appointment.client_name) ||
  toSafeString(appointment.client?.full_name) ||
  toSafeString(appointment.client?.name) ||
  [appointment.client?.first_name, appointment.client?.last_name]
    .map((value) => toSafeString(value))
    .filter(Boolean)
    .join(" ") ||
  "Walk-in Client";

const getStaffName = (appointment: AppointmentApiItem) =>
  toSafeString(appointment.staff_name) ||
  toSafeString(appointment.staff?.name) ||
  [appointment.staff?.firstName ?? appointment.staff?.first_name, appointment.staff?.lastName ?? appointment.staff?.last_name]
    .map((value) => toSafeString(value))
    .filter(Boolean)
    .join(" ") ||
  "Staff not assigned";

const getService = (appointment: AppointmentApiItem) => {
  const firstService = appointment.services?.[0];
  const serviceObject = typeof appointment.service === "object" ? appointment.service : null;
  const serviceName =
    toSafeString(appointment.service_name) ||
    toSafeString(firstService?.name) ||
    toSafeString(serviceObject?.name) ||
    toSafeString(serviceObject?.title) ||
    (typeof appointment.service === "string" ? appointment.service : "") ||
    "Service not selected";
  const serviceId =
    toSafeString(appointment.service_id) ||
    toSafeString(firstService?.id) ||
    toSafeString(firstService?.service_id) ||
    toSafeString(serviceObject?.id) ||
    toSafeString(serviceObject?.service_id);
  const servicePrice =
    toSafeNumber(firstService?.price) ||
    toSafeNumber(serviceObject?.price) ||
    toSafeNumber(appointment.price);
  const serviceDuration =
    toDurationMinutes(firstService?.duration) ??
    toDurationMinutes(serviceObject?.duration) ??
    toDurationMinutes(appointment.duration);

  return {
    duration: serviceDuration,
    id: serviceId,
    name: serviceName,
    price: servicePrice,
  };
};

const getAppointmentArray = (payload: AppointmentListApiData) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  return payload.appointments ?? payload.items ?? payload.rows ?? payload.data ?? [];
};

const isAppointmentEnvelope = (
  payload: AppointmentDetailApiData,
): payload is { appointment?: AppointmentApiItem | null; data?: AppointmentApiItem | null } =>
  "appointment" in payload || "data" in payload;

const getAppointmentFromPayload = (payload: AppointmentDetailApiData) => {
  if (isAppointmentEnvelope(payload)) {
    return payload.appointment ?? payload.data ?? {};
  }

  return payload;
};

const getTotalCount = (payload: AppointmentListApiData, fallbackCount: number) => {
  if (Array.isArray(payload)) {
    return fallbackCount;
  }

  return (
    toSafeNumber(payload.totalCount) ||
    toSafeNumber(payload.total_count) ||
    toSafeNumber(payload.total) ||
    toSafeNumber(payload.pagination?.totalCount) ||
    toSafeNumber(payload.pagination?.total_count) ||
    toSafeNumber(payload.pagination?.total) ||
    fallbackCount
  );
};

const getPagination = (
  payload: AppointmentListApiData,
  query: AppointmentListQuery,
  pageCount: number,
  totalCount: number,
): AppointmentListPagination => {
  const payloadPagination = Array.isArray(payload) ? null : payload.pagination;
  const page = toSafeNumber(payloadPagination?.page) || query.page;
  const limit = toSafeNumber(payloadPagination?.limit) || query.limit;
  const totalPages =
    toSafeNumber(payloadPagination?.totalPages) ||
    toSafeNumber(payloadPagination?.total_pages) ||
    (totalCount > 0 ? Math.ceil(totalCount / limit) : null);
  const nextPage =
    toSafeNumber(payloadPagination?.nextPage) ||
    toSafeNumber(payloadPagination?.next_page) ||
    page + 1;
  const explicitHasMore =
    toOptionalBoolean(payloadPagination?.hasMore) || toOptionalBoolean(payloadPagination?.has_more);
  const hasMore =
    explicitHasMore ||
    (totalPages ? page < totalPages : totalCount > 0 ? page * limit < totalCount : pageCount >= limit);

  return {
    hasMore,
    limit,
    nextPage,
    page,
    totalCount,
    totalPages,
  };
};

export const normalizeAppointment = (
  appointment: AppointmentApiItem,
  index = 0,
): AppointmentListItem => {
  const service = getService(appointment);
  const durationMinutes = service.duration ?? toDurationMinutes(appointment.duration);
  const amount =
    toSafeNumber(appointment.amount) ||
    toSafeNumber(appointment.total) ||
    service.price;
  const clientName = getClientName(appointment);
  const cancelledAt = toSafeString(appointment.cancelled_at) || toSafeString(appointment.cancelledAt) || null;
  const completedAt = toSafeString(appointment.completed_at) || toSafeString(appointment.completedAt) || null;
  const status = cancelledAt
    ? "Cancelled"
    : completedAt
      ? "Completed"
      : toAppointmentStatus(appointment.status);

  return {
    amount,
    cancelledAt,
    cancellationReason: toSafeString(appointment.cancellation_reason) || toSafeString(appointment.cancel_reason),
    clientEmail: toSafeString(appointment.client?.email),
    clientId: toSafeString(appointment.client_id) || toSafeString(appointment.client?.id),
    clientName,
    createdAt: toSafeString(appointment.created_at) || null,
    discount: toSafeNumber(appointment.discount),
    durationLabel: formatDuration(durationMinutes),
    durationMinutes,
    endTime: toSafeString(appointment.end_time) || null,
    id: toSafeString(appointment.id, `appointment-${index + 1}`),
    notes: toSafeString(appointment.notes),
    paidAmount: toSafeNumber(appointment.paid_amount),
    paymentMethod: titleCase(toSafeString(appointment.payment_method, "-")),
    paymentStatus: titleCase(toSafeString(appointment.payment_status, "-")),
    phone:
      toSafeString(appointment.client_phone) ||
      toSafeString(appointment.client?.phone) ||
      toSafeString(appointment.client?.phone_number) ||
      toSafeString(appointment.phone) ||
      toSafeString(appointment.mobile),
    raw: appointment,
    scheduledAt: toSafeString(appointment.scheduled_at) || toSafeString(appointment.start_time) || null,
    serviceId: service.id,
    serviceName: service.name,
    staffId: toSafeString(appointment.staff_id) || toSafeString(appointment.staff?.id),
    staffName: getStaffName(appointment),
    startTime: toSafeString(appointment.start_time) || toSafeString(appointment.scheduled_at) || null,
    status,
    tax: toSafeNumber(appointment.tax),
    title: toSafeString(appointment.title) || `${service.name} with ${clientName}`,
    total: toSafeNumber(appointment.total) || amount,
    updatedAt: toSafeString(appointment.updated_at) || null,
  };
};

const getCompatibleStatusQueries = (status?: string) => {
  switch (status) {
    case "paid":
      return ["paid", "completed"];
    case "no-show":
      return ["no-show", "no_show"];
    default:
      return [status];
  }
};

const mergeUniqueAppointments = (appointmentGroups: AppointmentListItem[][]) => {
  const seenIds = new Set<string>();

  return appointmentGroups.flat().filter((appointment) => {
    if (seenIds.has(appointment.id)) {
      return false;
    }

    seenIds.add(appointment.id);
    return true;
  });
};

const fetchAppointmentList = async (
  query: AppointmentListQuery,
  salonId?: string | null,
) => {
  const response = await api.get<AppointmentListApiResponse>(APPOINTMENT.LIST, {
    params: {
      ...query,
      ...(salonId ? { salon_id: salonId } : {}),
    },
  });
  const appointments = getAppointmentArray(response.data.data).map(normalizeAppointment);
  const totalCount = getTotalCount(response.data.data, appointments.length);

  return { appointments, response, totalCount };
};

export const appointmentService = {
  async getAppointments(query: AppointmentListQuery, salonId?: string | null): Promise<AppointmentListResponse> {
    const [primaryStatus, ...legacyStatuses] = getCompatibleStatusQueries(query.status);
    const primaryResult = await fetchAppointmentList({ ...query, status: primaryStatus }, salonId);
    const legacyResults = await Promise.all(
      legacyStatuses.map((status) => fetchAppointmentList({ ...query, status }, salonId)),
    );
    const appointments = mergeUniqueAppointments([
      primaryResult.appointments,
      ...legacyResults.map((result) => result.appointments),
    ]);
    const totalCount = legacyResults.length > 0 ? appointments.length : primaryResult.totalCount;
    const pagination = getPagination(
      primaryResult.response.data.data,
      query,
      appointments.length,
      totalCount,
    );

    return {
      appointments,
      pagination,
      query,
      totalCount,
    };
  },

  async getAppointment(appointmentId: string): Promise<AppointmentDetailResponse> {
    const response = await api.get<AppointmentDetailApiResponse>(APPOINTMENT.DETAIL(appointmentId));
    return {
      appointment: normalizeAppointment(getAppointmentFromPayload(response.data.data)),
      message: response.data.message,
    };
  },

  async createAppointment(payload: CreateAppointmentRequest): Promise<AppointmentMutationResponse> {
    const {
      duration: _duration,
      durationMinutes: _durationMinutes,
      totalDuration: _totalDuration,
      ...requestPayload
    } = payload as CreateAppointmentRequest & {
      duration?: unknown;
      durationMinutes?: unknown;
      totalDuration?: unknown;
    };

    if (!Number.isInteger(requestPayload.duration_minutes) || requestPayload.duration_minutes <= 0) {
      throw new Error("duration_minutes is required and must be a positive integer.");
    }

    if (__DEV__) {
      console.log("[Appointments] Final create payload", JSON.stringify(requestPayload, null, 2));
    }

    const response = await api.post<AppointmentDetailApiResponse>(APPOINTMENT.CREATE, requestPayload);
    return {
      appointment: normalizeAppointment(getAppointmentFromPayload(response.data.data)),
      message: response.data.message,
    };
  },

  async updateAppointment(
    appointmentId: string,
    payload: UpdateAppointmentRequest,
  ): Promise<AppointmentMutationResponse> {
    const response = await api.patch<AppointmentDetailApiResponse>(
      APPOINTMENT.UPDATE(appointmentId),
      payload,
    );
    return {
      appointment: normalizeAppointment(getAppointmentFromPayload(response.data.data)),
      message: response.data.message,
    };
  },

  async cancelAppointment(
    appointmentId: string,
    payload: CancelAppointmentRequest,
  ): Promise<AppointmentMutationResponse> {
    const response = await api.post<AppointmentDetailApiResponse>(
      APPOINTMENT.CANCEL(appointmentId),
      payload,
    );
    return {
      appointment: normalizeAppointment(getAppointmentFromPayload(response.data.data)),
      message: response.data.message,
    };
  },

  async confirmAppointment(
    appointmentId: string,
  ): Promise<AppointmentMutationResponse> {
    const response = await api.post<AppointmentDetailApiResponse>(
      APPOINTMENT.CONFIRM(appointmentId),
    );
    return {
      appointment: normalizeAppointment(getAppointmentFromPayload(response.data.data)),
      message: response.data.message,
    };
  },

  async startAppointment(
    appointmentId: string,
  ): Promise<AppointmentMutationResponse> {
    const response = await api.post<AppointmentDetailApiResponse>(
      APPOINTMENT.START(appointmentId),
    );
    return {
      appointment: normalizeAppointment(getAppointmentFromPayload(response.data.data)),
      message: response.data.message,
    };
  },

  async completeAppointment(
    appointmentId: string,
  ): Promise<AppointmentMutationResponse> {
    const response = await api.post<AppointmentDetailApiResponse>(
      APPOINTMENT.COMPLETE(appointmentId),
    );
    return {
      appointment: normalizeAppointment(getAppointmentFromPayload(response.data.data)),
      message: response.data.message,
    };
  },

  async checkoutAppointment(
    appointmentId: string,
  ): Promise<AppointmentMutationResponse> {
    const response = await api.post<AppointmentDetailApiResponse>(
      APPOINTMENT.CHECKOUT(appointmentId),
      {},
    );
    const payload = response.data.data;
    const saleId = normalizeSaleId(payload);

    return {
      appointment: normalizeAppointment(getAppointmentFromPayload(payload)),
      message: response.data.message,
      ...(saleId ? { saleId } : {}),
    };
  },

  async rescheduleAppointment(
    appointmentId: string,
    payload: RescheduleAppointmentRequest,
  ): Promise<AppointmentMutationResponse> {
    const response = await api.patch<AppointmentDetailApiResponse>(
      APPOINTMENT.RESCHEDULE(appointmentId),
      payload,
    );
    return {
      appointment: normalizeAppointment(getAppointmentFromPayload(response.data.data)),
      message: response.data.message,
    };
  },

  async getAppointmentHistory(clientId?: string): Promise<AppointmentHistoryResponse> {
    const response = await api.get<AppointmentListApiResponse>(APPOINTMENT.HISTORY, {
      params: clientId ? { client_id: clientId } : undefined,
    });
    return {
      appointments: getAppointmentArray(response.data.data).map(normalizeAppointment),
      clientId,
    };
  },
};
