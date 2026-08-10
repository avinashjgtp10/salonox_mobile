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
  ClientFilterValue,
  DeleteClientResponse,
  UpdateClientRequest,
  UpdateClientResponse,
  ClientDuplicateGroup,
  ClientDuplicateGroupApi,
  MergeClientsResponse,
  MergeAllDuplicatesResponse,
  BlockClientResponse,
  UnblockClientResponse,
  ClientHistoryItem,
  ClientHistoryItemApi,
  ClientHistoryStats,
  ClientHistoryStatsApi,
  ClientWithHistoryStats,
} from "@/types/client";
import { formatAppDate } from "@/utils/dateTime";

type ClientListApiResponse = ApiResponse<ClientListApiData>;
type CreateClientApiData =
  | ClientApiItem
  | {
      client?: ClientApiItem | null;
      data?: ClientApiItem | null;
    };
type CreateClientApiResponse = ApiResponse<CreateClientApiData>;
type DeleteClientApiResponse = ApiResponse<unknown>;

// GET /clients/search's real validator rejects anything shorter than this
// (400 "q must be at least 2 characters") — checked client-side too so we
// never fire a request that's guaranteed to fail.
const MIN_SEARCH_TERM_LENGTH = 2;

// Trims and collapses incidental extra whitespace (e.g. "John   Doe") without
// stripping spaces entirely — a real space-containing name like "John Doe"
// must still match `LOWER(full_name) LIKE '%john doe%'` on the backend.
const normalizeSearchTerm = (value: string) => value.trim().replace(/\s+/g, " ");

const AVATAR_PALETTE = [
  { background: "#F2EFE9", color: "#726A63" },
  { background: "#F2EFE9", color: "#726A63" },
  { background: "#F2EFE9", color: "#726A63" },
  { background: "#F2EFE9", color: "#726A63" },
  { background: "#F2EFE9", color: "#1C1917" },
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
  return formatAppDate(createdAt, "-");
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

// Used as a local fallback when the real search API call fails (network
// error, backend unavailable) — filters whatever client list is already
// available in memory instead of just showing an error with no results.
// Space- and case-insensitive on both sides, and (unlike the backend query)
// safe to strip all whitespace here since this never touches a SQL pattern.
export const matchesClientSearch = (client: ClientListItem, rawQuery: string) => {
  const normalizedQuery = rawQuery.trim().toLowerCase().replace(/\s+/g, "");

  if (!normalizedQuery) {
    return true;
  }

  const normalizedName = client.fullName.toLowerCase().replace(/\s+/g, "");
  const normalizedPhone = client.phone.toLowerCase().replace(/\s+/g, "");

  return normalizedName.includes(normalizedQuery) || normalizedPhone.includes(normalizedQuery);
};

const normalizeDuplicateGroup = (group: ClientDuplicateGroupApi): ClientDuplicateGroup => {
  return {
    id: group.id,
    type: group.type || group.field || "unknown",
    value: group.value || "",
    clients: (group.clients || []).map(normalizeClient),
  };
};

const normalizeHistoryItem = (item: ClientHistoryItemApi): ClientHistoryItem => {
  const rawDate = item.date || item.created_at || null;
  const dateLabel = formatCreatedDate(rawDate);
  return {
    id: item.id || String(Math.random()),
    date: rawDate || "",
    type: (item.type as ClientHistoryItem["type"]) || "visit",
    title: item.title || "Visit",
    description: item.description || "",
    amount: toSafeNumber(item.amount),
    status: item.status || "",
    items: (item.items || []).map(i => ({
      name: i.name || "",
      type: (i.type as "service" | "product") || "service",
      price: toSafeNumber(i.price),
    })),
    staffName: item.staff_name || item.staffName || "",
    dateLabel,
  };
};

const normalizeHistoryStats = (stats: ClientHistoryStatsApi | null | undefined): ClientHistoryStats => {
  return {
    lifetimeSpend: toSafeNumber(stats?.lifetime_spend ?? stats?.lifetimeSpend),
    totalVisits: toSafeNumber(stats?.total_visits ?? stats?.totalVisits),
    lastVisit: stats?.last_visit ?? stats?.lastVisit ?? null,
    totalAppointments: toSafeNumber(stats?.total_appointments ?? stats?.totalAppointments),
    averageSpend: toSafeNumber(stats?.average_spend ?? stats?.averageSpend),
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

const getClientList = async (
  endpoint: string,
  query: ClientListQuery,
  salonId?: string | null,
  additionalParams?: Record<string, unknown>,
): Promise<ClientListResponse> => {
  const requestParams = {
    ...query,
    ...additionalParams,
    ...(salonId ? { salon_id: salonId } : {}),
  };

  const response = await api.get<ClientListApiResponse>(endpoint, {
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
};

export const clientService = {
  getAvatarTone(clientId: string) {
    const hash = clientId.split("").reduce((total, character) => total + character.charCodeAt(0), 0);

    return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
  },

  async createClient(payload: CreateClientRequest): Promise<CreateClientResponse> {
    console.log("Create Client Payload", payload);
    const response = await api.post<CreateClientApiResponse>(CLIENT.CREATE, payload);
    const client = normalizeClient(getCreatedClient(response.data.data));

    return {
      client,
      message: response.data.message,
    };
  },

  async getClients(query: ClientListQuery, salonId?: string | null): Promise<ClientListResponse> {
    return getClientList(CLIENT.LIST, query, salonId);
  },

  // GET /clients/search has its own contract, distinct from GET /clients:
  // it only accepts `q` (not `search`) and `limit` — sending `search` (as
  // the shared getClientList() would) means the backend's own validator
  // never sees a query at all and rejects every request with 400 "q query
  // param is required". It also has no OFFSET support server-side, so
  // there is never a "next page" to load for a search result set.
  async searchClients(
    query: ClientListQuery,
    salonId?: string | null,
  ): Promise<ClientListResponse> {
    const term = normalizeSearchTerm(query.search);

    if (term.length < MIN_SEARCH_TERM_LENGTH) {
      return {
        clients: [],
        pagination: { hasMore: false, limit: query.limit, nextOffset: 0, offset: 0 },
        query,
        totalCount: 0,
      };
    }

    const response = await api.get<ClientListApiResponse>(CLIENT.SEARCH, {
      params: {
        limit: query.limit,
        q: term,
        ...(salonId ? { salon_id: salonId } : {}),
      },
    });

    const clients = getClientArray(response.data.data).map(normalizeClient);

    return {
      clients,
      pagination: { hasMore: false, limit: query.limit, nextOffset: clients.length, offset: 0 },
      query,
      totalCount: clients.length,
    };
  },

  async filterClients(
    query: ClientListQuery,
    filter: ClientFilterValue,
    salonId?: string | null,
    options?: { membership?: "all" | "has" | "none"; status?: "active" | "all" | "blocked" | "inactive" },
  ): Promise<ClientListResponse> {
    return getClientList(CLIENT.FILTER, query, salonId, {
      filter,
      ...(options?.status && options.status !== "all" ? { status: options.status, status_filter: options.status } : {}),
      ...(options?.membership && options.membership !== "all"
        ? { membership: options.membership, membership_filter: options.membership }
        : {}),
    });
  },

  async getClient(clientId: string): Promise<ClientListItem> {
    const response = await api.get<ApiResponse<CreateClientApiData>>(`${CLIENT.DETAIL}/${clientId}`);
    return normalizeClient(getCreatedClient(response.data.data));
  },

  async updateClient(
    clientId: string,
    payload: UpdateClientRequest,
  ): Promise<UpdateClientResponse> {
    const response = await api.patch<CreateClientApiResponse>(
      `${CLIENT.UPDATE}/${clientId}`,
      payload,
    );

    return {
      client: normalizeClient(getCreatedClient(response.data.data)),
      message: response.data.message,
    };
  },

  async deleteClient(clientId: string): Promise<DeleteClientResponse> {
    const response = await api.delete<DeleteClientApiResponse>(`${CLIENT.DELETE}/${clientId}`);

    return {
      clientId,
      message: response.data.message,
    };
  },

  async getDuplicates(phoneNumber?: string | null): Promise<ClientDuplicateGroup[]> {
    const trimmedPhoneNumber = phoneNumber?.trim();

    if (!trimmedPhoneNumber) {
      return [];
    }

    const response = await api.get<ApiResponse<ClientDuplicateGroupApi[]>>(CLIENT.DUPLICATES, {
      params: {
        phone_number: trimmedPhoneNumber,
      },
    });
    const groups = response.data.data || [];
    return groups.map(normalizeDuplicateGroup);
  },

  async mergeClients(primaryId: string, secondaryId: string): Promise<MergeClientsResponse> {
    const response = await api.post<ApiResponse<any>>(CLIENT.MERGE, {
      primary_client_id: primaryId,
      secondary_client_id: secondaryId,
      primaryClientId: primaryId,
      secondaryClientId: secondaryId,
    });
    const data = response.data.data || {};
    return {
      primaryClient: normalizeClient(data.primaryClient || data.client || data),
      message: response.data.message,
    };
  },

  async mergeDuplicates(): Promise<MergeAllDuplicatesResponse> {
    const response = await api.post<ApiResponse<MergeAllDuplicatesResponse>>(CLIENT.MERGE_DUPLICATES);
    return response.data.data || response.data || {};
  },

  async blockClient(clientId: string, reason?: string): Promise<BlockClientResponse> {
    const response = await api.post<ApiResponse<any>>(CLIENT.BLOCK, {
      client_id: clientId,
      clientId,
      reason,
    });
    const data = response.data.data || {};
    return {
      client: normalizeClient(data.client || data),
      message: response.data.message,
    };
  },

  async updateBlockStatus(clientId: string, reason: string): Promise<BlockClientResponse> {
    const response = await api.patch<ApiResponse<any>>(CLIENT.BLOCK, {
      client_id: clientId,
      clientId,
      reason,
    });
    const data = response.data.data || {};
    return {
      client: normalizeClient(data.client || data),
      message: response.data.message,
    };
  },

  async unblockClient(clientId: string): Promise<UnblockClientResponse> {
    const response = await api.post<ApiResponse<any>>(CLIENT.UNBLOCK, {
      client_id: clientId,
      clientId,
    });
    const data = response.data.data || {};
    return {
      client: normalizeClient(data.client || data),
      message: response.data.message,
    };
  },

  async getClientHistory(clientId: string): Promise<ClientHistoryItem[]> {
    const response = await api.get<ApiResponse<ClientHistoryItemApi[]>>(`${CLIENT.DETAIL}/${clientId}/history`);
    const history = response.data.data || [];
    return history.map(normalizeHistoryItem);
  },

  async getClientsWithHistoryStats(
    query: ClientListQuery,
    salonId?: string | null
  ): Promise<ClientListResponse & { clientsWithStats: ClientWithHistoryStats[] }> {
    const requestParams = {
      ...query,
      ...(salonId ? { salon_id: salonId } : {}),
    };

    const response = await api.get<ApiResponse<any>>(CLIENT.WITH_HISTORY_STATS, {
      params: requestParams,
    });

    const apiItems = getClientArray(response.data.data);
    const clientsWithStats = apiItems.map((item: any) => {
      const client = normalizeClient(item);
      const stats = normalizeHistoryStats(item.stats ?? item.history_stats ?? item);
      return { client, stats };
    });

    const totalCount = getTotalCount(response.data.data, clientsWithStats.length);
    const pagination = getPagination(response.data.data, query, clientsWithStats.length, totalCount);

    return {
      clients: clientsWithStats.map((c: any) => c.client),
      clientsWithStats,
      pagination,
      query,
      totalCount,
    };
  }
};
