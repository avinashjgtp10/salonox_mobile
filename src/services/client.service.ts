import { api } from "@/services/api";
import { CLIENT } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";
import type {
  ClientApiItem,
  CreateClientRequest,
  CreateClientResponse,
  ClientListApiData,
  ClientListItem,
  ClientListPagination,
  ClientListQuery,
  ClientListResponse,
} from "@/types/client";

type ClientListApiResponse = ApiResponse<ClientListApiData>;
type CreateClientApiData =
  | ClientApiItem
  | {
      client?: ClientApiItem | null;
      data?: ClientApiItem | null;
    };
type CreateClientApiResponse = ApiResponse<CreateClientApiData>;

const AVATAR_PALETTE = [
  { background: "#FBF3E5", color: "#8A5A0E" },
  { background: "#EAF5EF", color: "#2E7049" },
  { background: "#F1EEF8", color: "#6B52C1" },
  { background: "#FAECE7", color: "#712B13" },
  { background: "#EEF4F1", color: "#365046" },
] as const;

const toSafeString = (value: unknown, fallback = "") => {
  if (typeof value === "string") {
    const trimmedValue = value.trim();

    if (trimmedValue) {
      return trimmedValue;
    }
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

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return false;
};

const getClientArray = (payload: ClientListApiData) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  return payload.clients ?? payload.items ?? payload.rows ?? payload.data ?? [];
};

const isCreatedClientEnvelope = (
  payload: CreateClientApiData,
): payload is { client?: ClientApiItem | null; data?: ClientApiItem | null } =>
  "client" in payload || "data" in payload;

const getCreatedClient = (payload: CreateClientApiData): ClientApiItem => {
  if (isCreatedClientEnvelope(payload)) {
    return payload.client ?? payload.data ?? {};
  }

  return payload;
};

const getTotalCount = (payload: ClientListApiData, fallbackCount: number) => {
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

const getMembershipLabel = (membership: ClientApiItem["membership"], membershipName?: string | null) => {
  if (typeof membership === "string") {
    return toSafeString(membership) || null;
  }

  return (
    toSafeString(membership?.name) ||
    toSafeString(membership?.title) ||
    toSafeString(membershipName) ||
    null
  );
};

const getMembershipName = (client: ClientApiItem) =>
  getMembershipLabel(client.membership, toSafeString(client.membership_name) || null);

const getFullName = (client: ClientApiItem) => {
  const firstName = toSafeString(client.first_name);
  const lastName = toSafeString(client.last_name);
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return (
    toSafeString(client.full_name) ||
    toSafeString(client.name) ||
    fullName ||
    "Walk-in Client"
  );
};

const getInitials = (fullName: string) => {
  const parts = fullName
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return "CL";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
};

const getJoinedDaysAgo = (createdAt: string | null) => {
  if (!createdAt) {
    return null;
  }

  const parsedDate = new Date(createdAt);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  const differenceInMs = Date.now() - parsedDate.getTime();

  return Math.max(0, Math.floor(differenceInMs / (1000 * 60 * 60 * 24)));
};

const formatCreatedDate = (createdAt: string | null) => {
  if (!createdAt) {
    return "-";
  }

  const parsedDate = new Date(createdAt);

  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
};

const getStatusLabel = (client: ClientApiItem) => {
  const rawStatus = toSafeString(client.status);

  if (rawStatus) {
    return rawStatus
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }

  return (
    toOptionalBoolean(client.inactive) || toOptionalBoolean(client.is_inactive)
  )
    ? "Inactive"
    : "Active";
};

const normalizeClient = (client: ClientApiItem): ClientListItem => {
  const createdAt = toSafeString(client.created_at) || null;
  const fullName = getFullName(client);

  return {
    createdAt,
    createdDateLabel: formatCreatedDate(createdAt),
    email: toSafeString(client.email, "-"),
    fullName,
    gender: toSafeString(client.gender, "-"),
    id: toSafeString(client.id, fullName.toLowerCase().replace(/\s+/g, "-")),
    inactive: toOptionalBoolean(client.inactive) || toOptionalBoolean(client.is_inactive),
    initials: getInitials(fullName),
    isVip: toOptionalBoolean(client.is_vip),
    joinedDaysAgo: getJoinedDaysAgo(createdAt),
    membership: getMembershipName(client),
    phone: toSafeString(client.phone) || toSafeString(client.phone_number) || "-",
    status: getStatusLabel(client),
    totalVisits: toSafeNumber(client.total_visits) || toSafeNumber(client.visits),
  };
};

const getPagination = (
  payload: ClientListApiData,
  query: ClientListQuery,
  pageCount: number,
  totalCount: number,
): ClientListPagination => {
  const payloadOffset = Array.isArray(payload)
    ? query.offset
    : toSafeNumber(payload.pagination?.offset);
  const payloadLimit = Array.isArray(payload) ? query.limit : toSafeNumber(payload.pagination?.limit);
  const payloadNextOffset = Array.isArray(payload)
    ? query.offset + pageCount
    : toSafeNumber(payload.pagination?.next_offset);
  const payloadHasMore = Array.isArray(payload)
    ? false
    : toOptionalBoolean(payload.pagination?.has_more);

  const offset = payloadOffset || query.offset;
  const limit = payloadLimit || query.limit;
  const nextOffset = payloadNextOffset || offset + limit;
  const hasMore =
    payloadHasMore || (totalCount > 0 ? nextOffset < totalCount : pageCount >= limit);

  return {
    hasMore,
    limit,
    nextOffset,
    offset,
  };
};

export const clientService = {
  getAvatarTone(clientId: string) {
    const hash = clientId.split("").reduce((total, character) => total + character.charCodeAt(0), 0);

    return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
  },

  async createClient(payload: CreateClientRequest): Promise<CreateClientResponse> {
    const response = await api.post<CreateClientApiResponse>(CLIENT.CREATE, payload);
    const client = normalizeClient(getCreatedClient(response.data.data));

    return {
      client,
      message: response.data.message,
    };
  },

  async getClients(query: ClientListQuery, salonId?: string | null): Promise<ClientListResponse> {
    const searchQuery = query.search ?? "";
    const requestParams = {
      ...query,
      search: searchQuery,
      ...(salonId ? { salon_id: salonId } : {}),
    };

    const response = await api.get<ClientListApiResponse>(CLIENT.LIST, {
      params: requestParams,
    });

    const apiClients = getClientArray(response.data.data);
    const clients = apiClients.map(normalizeClient);
    const totalCount = getTotalCount(response.data.data, clients.length);
    const pagination = getPagination(response.data.data, query, clients.length, totalCount);

    return {
      clients,
      pagination,
      query,
      totalCount,
    };
  },

  async getClient(clientId: string): Promise<ClientListItem> {
    const response = await api.get<ApiResponse<CreateClientApiData>>(`/clients/${clientId}`);
    return normalizeClient(getCreatedClient(response.data.data));
  },
};
