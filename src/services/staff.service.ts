import { API_BASE_URL, ApiError, api } from "@/services/api";
import { STAFF } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";
import type { StaffAvailability, StaffMember, StaffStatus } from "@/data/teamData";
import type {
  CreateEmergencyContactRequest,
  CreateEmergencyContactResponse,
  CreateStaffAddressRequest,
  CreateStaffAddressResponse,
  CreateStaffRequest,
  CreateStaffResponse,
  DeleteEmergencyContactResponse,
  DeleteStaffAddressResponse,
  EmergencyContactListQuery,
  EmergencyContactListResponse,
  StaffListPagination,
  StaffListQuery,
  StaffListResponse,
  DeleteStaffResponse,
  StaffAddressListItem,
  StaffEmergencyContactListItem,
  StaffAddressListQuery,
  StaffAddressListResponse,
  UpdateEmergencyContactRequest,
  UpdateEmergencyContactResponse,
  UpdateStaffAddressRequest,
  UpdateStaffAddressResponse,
  UpdateStaffRequest,
  UpdateStaffResponse,
} from "@/types/staff";
import { isValidStaffId, normalizeStaffId } from "@/utils/staffIds";

type StaffApiService = string | { name?: string | null; title?: string | null };

type StaffAddressApiItem = {
  address?: string | null;
  address_line?: string | null;
  address_line1?: string | null;
  address_line_1?: string | null;
  city?: string | null;
  country?: string | null;
  created_at?: string | null;
  id?: string | number | null;
  is_primary?: boolean | string | null;
  postal_code?: string | number | null;
  staff_id?: string | number | null;
  state?: string | null;
  type?: string | null;
  zip?: string | number | null;
  zip_code?: string | number | null;
};

type StaffEmergencyContactApiItem = {
  address?: string | null;
  created_at?: string | null;
  email?: string | null;
  full_name?: string | null;
  id?: string | number | null;
  is_primary?: boolean | string | null;
  name?: string | null;
  notes?: string | null;
  phone?: string | null;
  phone_number?: string | null;
  relationship?: string | null;
  staff_id?: string | number | null;
};

type StaffApiItem = {
  _id?: string | null;
  attendance?: string | number | null;
  availability?: string | null;
  availability_label?: string | null;
  average_rating?: number | string | null;
  created_at?: string | null;
  email?: string | null;
  first_name?: string | null;
  full_name?: string | null;
  gender?: string | null;
  id?: string | number | null;
  joining_date?: string | null;
  last_name?: string | null;
  leave_balance?: string | number | null;
  monthly_revenue?: number | string | null;
  name?: string | null;
  notes?: string | null;
  phone?: string | null;
  phone_number?: string | null;
  role?: string | null;
  services?: StaffApiService[] | null;
  services_completed?: number | string | null;
  staff_role?: string | null;
  staff_id?: string | number | null;
  staff_uuid?: string | null;
  status?: string | null;
  today_appointments?: number | string | null;
  today_revenue?: number | string | null;
  user?: { _id?: string | number | null; id?: string | number | null } | null;
  user_id?: string | number | null;
  userId?: string | number | null;
  weekly_revenue?: number | string | null;
  work_end_time?: string | null;
  work_start_time?: string | null;
  working_hours?: string | null;
  uuid?: string | null;
  employee_code?: string | null;
};

type StaffApiPagination = {
  has_more?: boolean | null;
  hasMore?: boolean | null;
  limit?: number | string | null;
  next_page?: number | string | null;
  nextPage?: number | string | null;
  page?: number | string | null;
  total?: number | string | null;
  totalCount?: number | string | null;
  total_count?: number | string | null;
  total_pages?: number | string | null;
  totalPages?: number | string | null;
};

type StaffListApiData =
  | StaffApiItem[]
  | {
      data?: StaffApiItem[] | null;
      items?: StaffApiItem[] | null;
      pagination?: StaffApiPagination | null;
      rows?: StaffApiItem[] | null;
      staff?: StaffApiItem[] | null;
      staff_members?: StaffApiItem[] | null;
      staffs?: StaffApiItem[] | null;
      total?: number | string | null;
      totalCount?: number | string | null;
      total_count?: number | string | null;
      total_pages?: number | string | null;
    };

type StaffAddressListApiData =
  | StaffAddressApiItem[]
  | {
      addresses?: StaffAddressApiItem[] | null;
      data?: StaffAddressApiItem[] | null;
      items?: StaffAddressApiItem[] | null;
      pagination?: StaffApiPagination | null;
      rows?: StaffAddressApiItem[] | null;
      staff_addresses?: StaffAddressApiItem[] | null;
      total?: number | string | null;
      totalCount?: number | string | null;
      total_count?: number | string | null;
      total_pages?: number | string | null;
    };

type EmergencyContactListApiData =
  | StaffEmergencyContactApiItem[]
  | {
      contacts?: StaffEmergencyContactApiItem[] | null;
      data?: StaffEmergencyContactApiItem[] | null;
      emergency_contacts?: StaffEmergencyContactApiItem[] | null;
      items?: StaffEmergencyContactApiItem[] | null;
      pagination?: StaffApiPagination | null;
      rows?: StaffEmergencyContactApiItem[] | null;
      total?: number | string | null;
      totalCount?: number | string | null;
      total_count?: number | string | null;
      total_pages?: number | string | null;
    };
type EmergencyContactListApiResponse = ApiResponse<EmergencyContactListApiData>;
type DeleteEmergencyContactApiResponse = ApiResponse<unknown>;

type StaffListApiResponse = ApiResponse<StaffListApiData>;
type StaffAddressListApiResponse = ApiResponse<StaffAddressListApiData>;
type CreateStaffAddressApiData =
  | StaffAddressApiItem
  | {
      address?: StaffAddressApiItem | null;
      data?: StaffAddressApiItem | null;
      staff_address?: StaffAddressApiItem | null;
    };
type CreateStaffAddressApiResponse = ApiResponse<CreateStaffAddressApiData>;
type UpdateStaffAddressApiResponse = ApiResponse<CreateStaffAddressApiData>;
type CreateEmergencyContactApiData =
  | StaffEmergencyContactApiItem
  | {
      contact?: StaffEmergencyContactApiItem | null;
      data?: StaffEmergencyContactApiItem | null;
      emergency_contact?: StaffEmergencyContactApiItem | null;
      emergencyContact?: StaffEmergencyContactApiItem | null;
    };
type CreateEmergencyContactApiResponse = ApiResponse<CreateEmergencyContactApiData>;
type UpdateEmergencyContactApiResponse = ApiResponse<CreateEmergencyContactApiData>;
type CreateStaffApiData =
  | StaffApiItem
  | {
      data?: StaffApiItem | null;
      staff?: StaffApiItem | null;
      staff_member?: StaffApiItem | null;
    };
type CreateStaffApiResponse = ApiResponse<CreateStaffApiData>;
type DeleteStaffApiResponse = ApiResponse<unknown>;
type GetStaffApiResponse = ApiResponse<CreateStaffApiData>;
type UpdateStaffApiResponse = ApiResponse<CreateStaffApiData>;

const AVATAR_PALETTE = [
  { background: "#F2EFE9", color: "#726A63" },
  { background: "#F2EFE9", color: "#726A63" },
  { background: "#F2EFE9", color: "#726A63" },
  { background: "#F2EFE9", color: "#726A63" },
  { background: "#F2EFE9", color: "#726A63" },
] as const;

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

const toOptionalBoolean = (value: unknown) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }

  return false;
};

const titleCase = (value: string) =>
  value
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());

const getFullName = (staffMember: StaffApiItem) => {
  const firstName = toSafeString(staffMember.first_name);
  const lastName = toSafeString(staffMember.last_name);
  const composedName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return (
    toSafeString(staffMember.full_name) ||
    toSafeString(staffMember.name) ||
    composedName ||
    "Staff Member"
  );
};

const getInitials = (name: string) => {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "SM";
};

const getAvatarTone = (id: string) => {
  const hash = id.split("").reduce((total, character) => total + character.charCodeAt(0), 0);

  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
};

const toStaffStatus = (value: unknown): StaffStatus => {
  const normalized = toSafeString(value).toLowerCase().replace(/[_-]+/g, " ");

  switch (normalized) {
    case "available":
      return "Available";
    case "busy":
      return "Busy";
    case "break":
      return "Break";
    case "on leave":
      return "On Leave";
    case "inactive":
      return "Inactive";
    case "working":
    case "active":
    default:
      return "Working";
  }
};

const toStaffAvailability = (
  value: unknown,
  status: StaffStatus,
): StaffAvailability => {
  const normalized = toSafeString(value).toLowerCase().replace(/[_-]+/g, " ");

  switch (normalized) {
    case "available":
      return "Available";
    case "busy":
      return "Busy";
    case "on leave":
      return "On Leave";
    case "offline":
      return "Offline";
    default:
      if (status === "On Leave") {
        return "On Leave";
      }

      if (status === "Inactive") {
        return "Offline";
      }

      if (status === "Busy" || status === "Break") {
        return "Busy";
      }

      return "Available";
  }
};

const formatDate = (value: unknown) => {
  const rawDate = toSafeString(value);

  if (!rawDate) {
    return "-";
  }

  const parsedDate = new Date(rawDate);

  if (Number.isNaN(parsedDate.getTime())) {
    return rawDate;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
};

const getWorkingHours = (staffMember: StaffApiItem) => {
  const workingHours = toSafeString(staffMember.working_hours);

  if (workingHours) {
    return workingHours;
  }

  const startTime = toSafeString(staffMember.work_start_time);
  const endTime = toSafeString(staffMember.work_end_time);

  return [startTime, endTime].filter(Boolean).join(" - ") || "-";
};

const getAvailabilityLabel = (staffMember: StaffApiItem, availability: StaffAvailability) => {
  const label = toSafeString(staffMember.availability_label);

  if (label) {
    return label;
  }

  switch (availability) {
    case "Available":
      return "Ready for the next client";
    case "Busy":
      return "Currently assigned";
    case "On Leave":
      return "On approved leave";
    case "Offline":
    default:
      return "Not scheduled right now";
  }
};

const getAssignedServices = (services: StaffApiItem["services"]) => {
  if (!Array.isArray(services)) {
    return [];
  }

  return services
    .map((service) =>
      typeof service === "string"
        ? toSafeString(service)
        : toSafeString(service.name) || toSafeString(service.title),
    )
    .filter(Boolean);
};

const getStaffArray = (payload: StaffListApiData) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  return payload.staff ?? payload.staffs ?? payload.staff_members ?? payload.items ?? payload.rows ?? payload.data ?? [];
};

const getStaffAddressArray = (payload: StaffAddressListApiData) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  return payload.addresses ?? payload.staff_addresses ?? payload.items ?? payload.rows ?? payload.data ?? [];
};

const getEmergencyContactArray = (payload: EmergencyContactListApiData) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  return (
    payload.contacts ??
    payload.emergency_contacts ??
    payload.items ??
    payload.rows ??
    payload.data ??
    []
  );
};

const isCreatedStaffEnvelope = (
  payload: CreateStaffApiData,
): payload is { data?: StaffApiItem | null; staff?: StaffApiItem | null; staff_member?: StaffApiItem | null } =>
  "data" in payload || "staff" in payload || "staff_member" in payload;

const getCreatedStaff = (payload: CreateStaffApiData): StaffApiItem => {
  if (isCreatedStaffEnvelope(payload)) {
    return payload.staff ?? payload.staff_member ?? payload.data ?? {};
  }

  return payload;
};

const isCreatedStaffAddressEnvelope = (
  payload: CreateStaffAddressApiData,
): payload is {
  address?: StaffAddressApiItem | null;
  data?: StaffAddressApiItem | null;
  staff_address?: StaffAddressApiItem | null;
} => "address" in payload || "data" in payload || "staff_address" in payload;

const getCreatedStaffAddress = (
  payload: CreateStaffAddressApiData,
): StaffAddressApiItem => {
  if (isCreatedStaffAddressEnvelope(payload)) {
    return payload.address ?? payload.staff_address ?? payload.data ?? {};
  }

  return payload;
};

const isCreatedEmergencyContactEnvelope = (
  payload: CreateEmergencyContactApiData,
): payload is {
  contact?: StaffEmergencyContactApiItem | null;
  data?: StaffEmergencyContactApiItem | null;
  emergency_contact?: StaffEmergencyContactApiItem | null;
  emergencyContact?: StaffEmergencyContactApiItem | null;
} =>
  "contact" in payload ||
  "data" in payload ||
  "emergency_contact" in payload ||
  "emergencyContact" in payload;

const getCreatedEmergencyContact = (
  payload: CreateEmergencyContactApiData,
): StaffEmergencyContactApiItem => {
  if (isCreatedEmergencyContactEnvelope(payload)) {
    return (
      payload.emergency_contact ??
      payload.emergencyContact ??
      payload.contact ??
      payload.data ??
      {}
    );
  }

  return payload;
};

const getTotalCount = (payload: StaffListApiData, fallbackCount: number) => {
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
  payload: StaffListApiData,
  query: StaffListQuery,
  pageCount: number,
  totalCount: number,
): StaffListPagination => {
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

const getAddressPagination = (
  payload: StaffAddressListApiData,
  query: StaffAddressListQuery,
  pageCount: number,
  totalCount: number,
): StaffListPagination => {
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

const getEmergencyContactPagination = (
  payload: EmergencyContactListApiData,
  query: EmergencyContactListQuery,
  pageCount: number,
  totalCount: number,
): StaffListPagination => {
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

const normalizeStaffMember = (staffMember: StaffApiItem, index: number): StaffMember => {
  const name = getFullName(staffMember);
  const userId =
    toSafeString(staffMember.user_id) ||
    toSafeString(staffMember.userId) ||
    toSafeString(staffMember.user?.id) ||
    toSafeString(staffMember.user?._id) ||
    null;
  const staffIdAliases = Array.from(
    new Set(
      [
        normalizeStaffId(staffMember.id),
        normalizeStaffId(staffMember.uuid),
        normalizeStaffId(staffMember.staff_uuid),
        normalizeStaffId(staffMember.staff_id),
        normalizeStaffId(staffMember._id),
      ].filter(Boolean),
    ),
  );
  const id =
    staffIdAliases.find(isValidStaffId) ??
    staffIdAliases[0] ??
    `staff-${index + 1}`;
  const status = toStaffStatus(staffMember.status);
  const availability = toStaffAvailability(staffMember.availability, status);
  const avatarTone = getAvatarTone(id);

  return {
    assignedServices: getAssignedServices(staffMember.services),
    attendance: toSafeString(staffMember.attendance, "-"),
    availability,
    availabilityLabel: getAvailabilityLabel(staffMember, availability),
    avatarBg: avatarTone.background,
    avatarColor: avatarTone.color,
    averageRating: toSafeNumber(staffMember.average_rating),
    email: toSafeString(staffMember.email, "-"),
    gender: titleCase(toSafeString(staffMember.gender, "-")),
    id,
    initials: getInitials(name),
    joiningDate: formatDate(staffMember.joining_date ?? staffMember.created_at),
    lastSeen: availability === "Offline" ? "Offline" : "On floor",
    leaveBalance: toSafeString(staffMember.leave_balance, "-"),
    monthlyRevenue: toSafeNumber(staffMember.monthly_revenue),
    name,
    notes: toSafeString(staffMember.notes),
    phone: toSafeString(staffMember.phone) || toSafeString(staffMember.phone_number) || "-",
    role: toSafeString(staffMember.role) || toSafeString(staffMember.staff_role) || "Staff",
    servicesCompleted: toSafeNumber(staffMember.services_completed),
    staffIdAliases,
    status,
    todayAppointments: toSafeNumber(staffMember.today_appointments),
    todayRevenue: toSafeNumber(staffMember.today_revenue),
    todayScheduleNote: getAvailabilityLabel(staffMember, availability),
    userId,
    weeklyRevenue: toSafeNumber(staffMember.weekly_revenue),
    workingHours: getWorkingHours(staffMember),
    employeeCode: toSafeString(staffMember.employee_code, "-"),
  };
};

const getAddressLine = (address: StaffAddressApiItem) =>
  toSafeString(address.address_line) ||
  toSafeString(address.address_line_1) ||
  toSafeString(address.address_line1) ||
  toSafeString(address.address) ||
  "-";

const normalizeStaffAddress = (
  address: StaffAddressApiItem,
  index: number,
  staffId: string,
  fallbackId?: string,
): StaffAddressListItem => ({
  addressLine: getAddressLine(address),
  city: toSafeString(address.city, "-"),
  country: toSafeString(address.country, "-"),
  createdAt: toSafeString(address.created_at) || null,
  id: toSafeString(address.id, fallbackId ?? `${staffId}-address-${index + 1}`),
  isPrimary: toOptionalBoolean(address.is_primary),
  postalCode:
    toSafeString(address.postal_code) ||
    toSafeString(address.zip_code) ||
    toSafeString(address.zip, "-"),
  staffId: toSafeString(address.staff_id, staffId),
  state: toSafeString(address.state, "-"),
  type: titleCase(toSafeString(address.type, "Address")),
});

const getEmergencyContactName = (contact: StaffEmergencyContactApiItem) =>
  toSafeString(contact.full_name) || toSafeString(contact.name) || "-";

const normalizeEmergencyContact = (
  contact: StaffEmergencyContactApiItem,
  index: number,
  staffId: string,
  fallbackId?: string,
): StaffEmergencyContactListItem => ({
  address: toSafeString(contact.address),
  createdAt: toSafeString(contact.created_at) || null,
  email: toSafeString(contact.email),
  fullName: getEmergencyContactName(contact),
  id: toSafeString(contact.id, fallbackId ?? `${staffId}-emergency-contact-${index + 1}`),
  isPrimary: toOptionalBoolean(contact.is_primary),
  notes: toSafeString(contact.notes),
  phone: toSafeString(contact.phone) || toSafeString(contact.phone_number),
  relationship: toSafeString(contact.relationship),
  staffId: toSafeString(contact.staff_id, staffId),
});

const assertValidAddressStaffId = (staffId: string) => {
  if (!isValidStaffId(staffId)) {
    throw new ApiError("A valid staff UUID is required for staff address requests.", 400);
  }
};

const getRequestUrl = (endpoint: string, query?: Record<string, string | number>) => {
  const queryString = query
    ? Object.entries(query)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        .join("&")
    : "";

  return `${API_BASE_URL}${endpoint}${queryString ? `?${queryString}` : ""}`;
};

const logStaffAddressRequest = ({
  endpoint,
  method,
  query,
  staffId,
}: {
  endpoint: string;
  method: "DELETE" | "GET" | "PATCH" | "POST";
  query?: Record<string, string | number>;
  staffId: string;
}) => {
  console.info("[Staff] Staff address request", {
    method,
    staffId,
    url: getRequestUrl(endpoint, query),
  });
};

export const staffService = {
  async createStaff(payload: CreateStaffRequest): Promise<CreateStaffResponse> {
    const response = await api.post<CreateStaffApiResponse>(STAFF.CREATE, payload);
    const staffMember = normalizeStaffMember(getCreatedStaff(response.data.data), 0);

    return {
      message: response.data.message,
      staffMember,
    };
  },

  async createStaffAddress(
    staffId: string,
    payload: CreateStaffAddressRequest,
  ): Promise<CreateStaffAddressResponse> {
    assertValidAddressStaffId(staffId);

    const endpoint = STAFF.ADDRESSES(staffId);

    logStaffAddressRequest({
      endpoint,
      method: "POST",
      staffId,
    });

    const response = await api.post<CreateStaffAddressApiResponse>(
      endpoint,
      payload,
    );
    const address = normalizeStaffAddress(getCreatedStaffAddress(response.data.data), 0, staffId);

    return {
      address,
      message: response.data.message,
      staffId,
    };
  },

  async createEmergencyContact(
    staffId: string,
    payload: CreateEmergencyContactRequest,
  ): Promise<CreateEmergencyContactResponse> {
    const response = await api.post<CreateEmergencyContactApiResponse>(
      STAFF.EMERGENCY_CONTACTS(staffId),
      payload,
    );
    const emergencyContact = normalizeEmergencyContact(
      getCreatedEmergencyContact(response.data.data),
      0,
      staffId,
    );

    return {
      emergencyContact,
      message: response.data.message,
      staffId,
    };
  },

  async updateStaff(staffId: string, payload: UpdateStaffRequest): Promise<UpdateStaffResponse> {
    const response = await api.patch<UpdateStaffApiResponse>(`${STAFF.UPDATE}/${staffId}`, payload);
    const staffMember = normalizeStaffMember(getCreatedStaff(response.data.data), 0);

    return {
      message: response.data.message,
      staffMember,
    };
  },

  async updateEmergencyContact(
    staffId: string,
    recordId: string,
    payload: UpdateEmergencyContactRequest,
  ): Promise<UpdateEmergencyContactResponse> {
    const response = await api.patch<UpdateEmergencyContactApiResponse>(
      STAFF.EMERGENCY_CONTACT(staffId, recordId),
      payload,
    );
    const emergencyContact = normalizeEmergencyContact(
      getCreatedEmergencyContact(response.data.data),
      0,
      staffId,
      recordId,
    );

    return {
      emergencyContact,
      message: response.data.message,
      recordId,
      staffId,
    };
  },

  async getEmergencyContacts(
    staffId: string,
    query: Pick<EmergencyContactListQuery, "limit" | "page">,
  ): Promise<EmergencyContactListResponse> {
    const requestQuery: EmergencyContactListQuery = {
      limit: query.limit,
      page: query.page,
      sort_by: "created_at",
      sort_order: "DESC",
    };

    const response = await api.get<EmergencyContactListApiResponse>(
      STAFF.EMERGENCY_CONTACTS(staffId),
      { params: requestQuery },
    );
    const apiContacts = getEmergencyContactArray(response.data.data);
    const contacts = apiContacts.map((contact, index) =>
      normalizeEmergencyContact(contact, index, staffId),
    );
    const totalCount = getTotalCount(response.data.data, contacts.length);
    const pagination = getEmergencyContactPagination(
      response.data.data,
      requestQuery,
      contacts.length,
      totalCount,
    );

    return {
      contacts,
      pagination,
      query: requestQuery,
      staffId,
    };
  },

  async deleteEmergencyContact(
    staffId: string,
    recordId: string,
  ): Promise<DeleteEmergencyContactResponse> {
    const response = await api.delete<DeleteEmergencyContactApiResponse>(
      STAFF.EMERGENCY_CONTACT(staffId, recordId),
    );

    return {
      message: response.data.message,
      recordId,
      staffId,
    };
  },

  async updateStaffAddress(
    staffId: string,
    recordId: string,
    payload: UpdateStaffAddressRequest,
  ): Promise<UpdateStaffAddressResponse> {
    assertValidAddressStaffId(staffId);

    const endpoint = STAFF.ADDRESS(staffId, recordId);

    logStaffAddressRequest({
      endpoint,
      method: "PATCH",
      staffId,
    });

    const response = await api.patch<UpdateStaffAddressApiResponse>(
      endpoint,
      payload,
    );
    const address = normalizeStaffAddress(
      getCreatedStaffAddress(response.data.data),
      0,
      staffId,
      recordId,
    );

    return {
      address,
      message: response.data.message,
      recordId,
      staffId,
    };
  },

  async deleteStaffAddress(
    staffId: string,
    recordId: string,
  ): Promise<DeleteStaffAddressResponse> {
    assertValidAddressStaffId(staffId);

    const endpoint = STAFF.ADDRESS(staffId, recordId);

    logStaffAddressRequest({
      endpoint,
      method: "DELETE",
      staffId,
    });

    const response = await api.delete<DeleteStaffApiResponse>(endpoint);

    return {
      message: response.data.message,
      recordId,
      staffId,
    };
  },

  async deleteStaff(staffId: string): Promise<DeleteStaffResponse> {
    const response = await api.delete<DeleteStaffApiResponse>(`${STAFF.DELETE}/${staffId}`);

    return {
      message: response.data.message,
      staffId,
    };
  },

  async getStaffMember(staffId: string): Promise<StaffMember> {
    const response = await api.get<GetStaffApiResponse>(`/staff/${staffId}`);
    return normalizeStaffMember(getCreatedStaff(response.data.data), 0);
  },

  async getStaff(
    query: Pick<StaffListQuery, "limit" | "page">,
    salonId?: string | null,
  ): Promise<StaffListResponse> {
    const requestQuery: StaffListQuery = {
      limit: query.limit,
      page: query.page,
      sort_by: "created_at",
      sort_order: "DESC",
    };
    const params: Record<string, unknown> = { ...requestQuery };
    if (salonId) params.salon_id = salonId;

    const response = await api.get<StaffListApiResponse>(STAFF.LIST, {
      params,
    });
    const apiStaffMembers = getStaffArray(response.data.data);
    const staffMembers = apiStaffMembers.map(normalizeStaffMember).filter((staffMember) => {
      const hasValidId = isValidStaffId(staffMember.id);

      if (!hasValidId) {
        console.warn("[Staff] Ignoring staff list item without a valid staff UUID", {
          staffId: staffMember.id,
          staffName: staffMember.name,
        });
      }

      return hasValidId;
    });
    const totalCount = getTotalCount(response.data.data, staffMembers.length);
    const pagination = getPagination(response.data.data, requestQuery, staffMembers.length, totalCount);

    return {
      pagination,
      query: requestQuery,
      staffMembers,
    };
  },

  async getStaffAddresses(
    staffId: string,
    query: Pick<StaffAddressListQuery, "limit" | "page">,
  ): Promise<StaffAddressListResponse> {
    assertValidAddressStaffId(staffId);

    const requestQuery: StaffAddressListQuery = {
      limit: query.limit,
      page: query.page,
      sort_by: "created_at",
      sort_order: "DESC",
    };
    const endpoint = STAFF.ADDRESSES(staffId);
    logStaffAddressRequest({
      endpoint,
      method: "GET",
      query: requestQuery,
      staffId,
    });

    const response = await api.get<StaffAddressListApiResponse>(endpoint, {
      params: requestQuery,
    });
    const apiAddresses = getStaffAddressArray(response.data.data);
    const addresses = apiAddresses.map((address, index) =>
      normalizeStaffAddress(address, index, staffId),
    );
    const totalCount = getTotalCount(response.data.data, addresses.length);
    const pagination = getAddressPagination(
      response.data.data,
      requestQuery,
      addresses.length,
      totalCount,
    );

    return {
      addresses,
      pagination,
      query: requestQuery,
      staffId,
    };
  },
};
