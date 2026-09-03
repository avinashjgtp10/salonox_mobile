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
  ClientAppointmentLineItem,
  ClientAppointmentRecord,
  ClientHistoryClient,
  ClientHistoryClientApi,
  ClientHistoryItem,
  ClientHistoryItemApi,
  ClientHistoryReferrer,
  ClientHistoryResult,
  ClientHistoryStats,
  ClientHistoryStatsApi,
  ClientHistorySummary,
  ClientHistorySummaryApi,
  ClientMembershipRecord,
  ClientNote,
  ClientNoteApi,
  ClientPackageRecord,
  ClientPackageServiceRecord,
  ClientSaleItem,
  ClientSaleRecord,
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
type ClientHistoryApiData =
  | ClientHistoryItemApi[]
  | (ClientHistorySummaryApi & {
      appointments?: unknown[] | null;
      data?: ClientHistoryItemApi[] | null;
      history?: ClientHistoryItemApi[] | null;
      items?: ClientHistoryItemApi[] | null;
      memberships?: unknown[] | null;
      packages?: unknown[] | null;
      records?: ClientHistoryItemApi[] | null;
      rows?: ClientHistoryItemApi[] | null;
      sales?: unknown[] | null;
      stats?: ClientHistoryStatsApi | null;
      timeline?: ClientHistoryItemApi[] | null;
      // Some responses nest the client summary fields under `client` instead
      // of putting them flat alongside `history` — check both locations.
      client?: ClientHistoryClientApi | null;
    })
  | null
  | undefined;

// GET /clients/search's real validator rejects anything shorter than this
// (400 "q must be at least 2 characters") — checked client-side too so we
// never fire a request that's guaranteed to fail.
const MIN_SEARCH_TERM_LENGTH = 2;
const CLIENT_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

const getValidClientId = (client: ClientApiItem, fullName: string) => {
  const id = toSafeString(client.id);

  if (CLIENT_UUID_PATTERN.test(id)) {
    return id;
  }

  if (__DEV__) {
    console.warn("[Clients] Ignoring invalid client id from API response", {
      fullName,
      id,
    });
  }

  return "";
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

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {};

const firstValue = (record: UnknownRecord, keys: string[]) => {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) {
      return record[key];
    }
  }

  return undefined;
};

const firstArray = (record: UnknownRecord, keys: string[]) => {
  for (const key of keys) {
    const value = record[key];

    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
};

const getClientArray = (payload: ClientListApiData) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  return payload.clients ?? payload.items ?? payload.rows ?? payload.data ?? [];
};

const getClientHistoryArray = (payload: ClientHistoryApiData) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  const record = asRecord(payload);
  const structuredHistory = [
    ...firstArray(record, ["appointments"]).map(normalizeAppointmentHistoryItem),
    ...firstArray(record, ["sales"]).map(normalizeSaleHistoryItem),
    ...firstArray(record, ["packages"]).map(normalizePackageHistoryItem),
    ...firstArray(record, ["memberships"]).map(normalizeMembershipHistoryItem),
  ].sort(sortHistoryItemsByDateDesc);

  if (structuredHistory.length > 0) {
    return structuredHistory;
  }

  return payload?.history ?? payload?.timeline ?? payload?.items ?? payload?.records ?? payload?.rows ?? payload?.data ?? [];
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

const isClientBlocked = (client: ClientApiItem) =>
  toOptionalBoolean(client.blocked) ||
  toOptionalBoolean(client.isBlocked) ||
  toOptionalBoolean(client.is_blocked);

const getStatusLabel = (client: ClientApiItem) => {
  if (isClientBlocked(client)) {
    return "Blocked";
  }

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
  const id = getValidClientId(client, fullName);

  return {
    createdAt,
    createdDateLabel: formatCreatedDate(createdAt),
    email: toSafeString(client.email, "-"),
    fullName,
    gender: toSafeString(client.gender, "-"),
    hasValidId: Boolean(id),
    id,
    inactive:
      isClientBlocked(client) ||
      toOptionalBoolean(client.inactive) ||
      toOptionalBoolean(client.is_inactive),
    initials: getInitials(fullName),
    isVip: toOptionalBoolean(client.is_vip),
    joinedDaysAgo: getJoinedDaysAgo(createdAt),
    membership: getMembershipName(client),
    phone: toSafeString(client.phone) || toSafeString(client.phone_number) || "-",
    phoneCountryCode: toSafeString(client.phone_country_code) || null,
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

const getNestedName = (value: unknown, fallback = "") => {
  const record = asRecord(value);

  return (
    toSafeString(value) ||
    toSafeString(firstValue(record, ["name", "title", "service_name", "serviceName", "package_name", "packageName", "membership_name", "membershipName"])) ||
    fallback
  );
};

const getStaffNameFromRecord = (record: UnknownRecord) => {
  const staffValue = firstValue(record, ["staff_name", "staffName", "staff", "employee"]);
  const staffRecord = asRecord(staffValue);

  return (
    toSafeString(staffValue) ||
    toSafeString(firstValue(staffRecord, ["name", "full_name", "fullName"])) ||
    [firstValue(staffRecord, ["first_name", "firstName"]), firstValue(staffRecord, ["last_name", "lastName"])]
      .map((part) => toSafeString(part))
      .filter(Boolean)
      .join(" ")
  );
};

const getHistoryDate = (record: UnknownRecord) =>
  toSafeString(firstValue(record, [
    "date",
    "appointment_date",
    "appointmentDate",
    "scheduled_at",
    "scheduledAt",
    "start_time",
    "startTime",
    "created_at",
    "createdAt",
    "purchase_date",
    "purchaseDate",
    "assigned_at",
    "assignedAt",
    "updated_at",
    "updatedAt",
  ])) || null;

const getHistoryAmount = (record: UnknownRecord) =>
  toSafeNumber(firstValue(record, [
    "amount",
    "total",
    "total_amount",
    "totalAmount",
    "net_amount",
    "netAmount",
    "paid_amount",
    "paidAmount",
    "price",
    "base_price",
    "basePrice",
  ]));

const normalizeHistorySubItem = (
  value: unknown,
  fallbackType: ClientHistoryItem["items"][number]["type"],
) => {
  const record = asRecord(value);
  const type = toSafeString(firstValue(record, ["type", "item_type", "itemType"])).toLowerCase();

  return {
    name: getNestedName(firstValue(record, ["name", "title", "service", "product", "membership", "package"]), "Item"),
    type:
      type === "membership" || type === "package" || type === "product" || type === "service"
        ? type
        : fallbackType,
    price: toSafeNumber(firstValue(record, ["price", "amount", "total", "total_price", "totalPrice", "unit_price", "unitPrice"])),
  };
};

function normalizeAppointmentHistoryItem(value: unknown, index: number): ClientHistoryItemApi {
  const record = asRecord(value);
  const services = firstArray(record, ["services", "items", "line_items", "lineItems"]);
  const serviceName =
    toSafeString(firstValue(record, ["service_name", "serviceName"])) ||
    getNestedName(firstValue(record, ["service"]), "");
  const items = services.length > 0
    ? services.map((item) => normalizeHistorySubItem(item, "service"))
    : serviceName
      ? [{ name: serviceName, type: "service" as const, price: toSafeNumber(firstValue(record, ["price", "amount", "total"])) }]
      : [];
  const date = getHistoryDate(record);

  return {
    amount: getHistoryAmount(record),
    created_at: date,
    date,
    description: toSafeString(firstValue(record, ["notes", "description", "status"])) || "",
    id: toSafeString(firstValue(record, ["id", "_id"]), `appointment-${index}`),
    items,
    staff_name: getStaffNameFromRecord(record),
    status: toSafeString(firstValue(record, ["status"])),
    title: serviceName || toSafeString(firstValue(record, ["title"]), "Appointment"),
    type: "appointment",
  };
}

function normalizeSaleHistoryItem(value: unknown, index: number): ClientHistoryItemApi {
  const record = asRecord(value);
  const items = firstArray(record, ["items", "line_items", "lineItems"]).map((item) =>
    normalizeHistorySubItem(item, "service"),
  );
  const receiptNumber = toSafeString(firstValue(record, ["invoice_number", "invoiceNumber", "receipt_number", "receiptNumber"]));
  const date = getHistoryDate(record);

  return {
    amount: getHistoryAmount(record),
    created_at: date,
    date,
    description: toSafeString(firstValue(record, ["notes", "description"])) || (receiptNumber ? `Receipt ${receiptNumber}` : ""),
    id: toSafeString(firstValue(record, ["id", "_id", "sale_id", "saleId"]), `sale-${index}`),
    items,
    staff_name: getStaffNameFromRecord(record),
    status: toSafeString(firstValue(record, ["status"])),
    title: receiptNumber ? `Sale ${receiptNumber}` : "Sale",
    type: "sale",
  };
}

function normalizePackageHistoryItem(value: unknown, index: number): ClientHistoryItemApi {
  const record = asRecord(value);
  const services = firstArray(record, ["services", "items"]).map((item) => normalizeHistorySubItem(item, "service"));
  const packageName =
    toSafeString(firstValue(record, ["package_name", "packageName", "name", "title"])) ||
    getNestedName(firstValue(record, ["package", "template"]), "Package");
  const date = getHistoryDate(record);

  return {
    amount: getHistoryAmount(record),
    created_at: date,
    date,
    description: toSafeString(firstValue(record, ["description", "status"])) || "",
    id: toSafeString(firstValue(record, ["id", "_id", "client_package_id", "clientPackageId"]), `package-${index}`),
    items: services.length > 0 ? services : [{ name: packageName, type: "package", price: getHistoryAmount(record) }],
    staff_name: getStaffNameFromRecord(record),
    status: toSafeString(firstValue(record, ["status"])),
    title: packageName,
    type: "package",
  };
}

function normalizeMembershipHistoryItem(value: unknown, index: number): ClientHistoryItemApi {
  const record = asRecord(value);
  const membershipName =
    toSafeString(firstValue(record, ["membership_name", "membershipName", "name", "title"])) ||
    getNestedName(firstValue(record, ["membership"]), "Membership");
  const date = getHistoryDate(record);

  return {
    amount: getHistoryAmount(record),
    created_at: date,
    date,
    description: toSafeString(firstValue(record, ["description", "status", "valid_for", "validFor"])) || "",
    id: toSafeString(firstValue(record, ["id", "_id", "client_membership_id", "clientMembershipId"]), `membership-${index}`),
    items: [{ name: membershipName, type: "membership", price: getHistoryAmount(record) }],
    staff_name: getStaffNameFromRecord(record),
    status: toSafeString(firstValue(record, ["status"])),
    title: membershipName,
    type: "membership",
  };
}

const getHistoryTime = (item: ClientHistoryItemApi) => {
  const date = item.date || item.created_at;
  const time = date ? new Date(date).getTime() : 0;

  return Number.isNaN(time) ? 0 : time;
};

function sortHistoryItemsByDateDesc(left: ClientHistoryItemApi, right: ClientHistoryItemApi) {
  return getHistoryTime(right) - getHistoryTime(left);
}

const normalizeHistoryItem = (item: ClientHistoryItemApi): ClientHistoryItem => {
  const rawDate = item.date || item.created_at || null;
  const dateLabel = formatCreatedDate(rawDate);
  const items = Array.isArray(item.items) ? item.items : [];
  const normalizedType = toSafeString(item.type).toLowerCase();
  const type: ClientHistoryItem["type"] =
    normalizedType === "appointment" ||
    normalizedType === "sale" ||
    normalizedType === "package" ||
    normalizedType === "membership" ||
    normalizedType === "note" ||
    normalizedType === "visit"
      ? normalizedType
      : "visit";

  return {
    id: item.id || String(Math.random()),
    date: rawDate || "",
    type,
    title: item.title || "Visit",
    description: item.description || "",
    amount: toSafeNumber(item.amount),
    status: item.status || "",
    items: items.map(i => ({
      name: i.name || "",
      type:
        i.type === "membership" || i.type === "package" || i.type === "product" || i.type === "service"
          ? i.type
          : "service",
      price: toSafeNumber(i.price),
    })),
    staffName: item.staff_name || item.staffName || "",
    dateLabel,
  };
};

const normalizeHistorySummary = (
  payload: ClientHistoryApiData,
): ClientHistorySummary => {
  const record = Array.isArray(payload) || !payload ? null : payload;
  // Some backends nest these fields under `client`, others put them flat
  // alongside `history` — prefer the flat value, fall back to `client.*`.
  const client: ClientHistorySummaryApi = record?.client ?? {};

  const pick = (flatKey: keyof ClientHistorySummaryApi, nestedKey: keyof ClientHistorySummaryApi) =>
    record?.[flatKey] ?? record?.[nestedKey] ?? client[flatKey] ?? client[nestedKey];

  return {
    walletBalance: toSafeNumber(pick("wallet_balance", "walletBalance")),
    rewardPointsBalance: toSafeNumber(pick("reward_points_balance", "rewardPointsBalance")),
    referralBalance: toSafeNumber(pick("referral_balance", "referralBalance")),
    referralCode: toSafeString(pick("referral_code", "referralCode")) || null,
    totalReferralEarnings: toSafeNumber(pick("total_referral_earnings", "totalReferralEarnings")),
    totalSuccessfulReferrals: toSafeNumber(pick("total_successful_referrals", "totalSuccessfulReferrals")),
  };
};

// `/clients/:id/history` names the paid/partial visit count
// `completed_appointments` and the last-visit timestamp `last_visit_at`; the
// older `/clients/with-history-stats` rows use `last_visit_at` too but carry
// no counts at all. Both spellings are accepted so either response parses.
//
// `average_spend` is returned by no endpoint — Web derives it as
// spend / visits, so it is derived here too rather than read off the wire.
const normalizeHistoryStats = (stats: ClientHistoryStatsApi | null | undefined): ClientHistoryStats => {
  const lifetimeSpend = toSafeNumber(stats?.lifetime_spend ?? stats?.lifetimeSpend);
  const completedAppointments = toSafeNumber(stats?.completed_appointments);
  const totalVisits = toSafeNumber(stats?.total_visits ?? stats?.totalVisits) || completedAppointments;
  const explicitAverage = toSafeNumber(stats?.average_spend ?? stats?.averageSpend);

  return {
    lifetimeSpend,
    totalVisits,
    lastVisit: stats?.last_visit_at ?? stats?.last_visit ?? stats?.lastVisit ?? null,
    totalAppointments: toSafeNumber(stats?.total_appointments ?? stats?.totalAppointments),
    averageSpend: explicitAverage || (totalVisits > 0 ? lifetimeSpend / totalVisits : 0),
    completedAppointments,
    noShows: toSafeNumber(stats?.no_shows),
    cancellations: toSafeNumber(stats?.cancellations),
    totalSales: toSafeNumber(stats?.total_sales),
    activePackages: toSafeNumber(stats?.active_packages),
    activeMemberships: toSafeNumber(stats?.active_memberships),
  };
};

// ─── Structured record normalizers ─────────────────────────────────────────
// These keep the per-row detail the flattened timeline drops. Field names read
// here are exactly those returned by clients.controller.ts getHistory.

const toNullableString = (value: unknown): string | null => toSafeString(value) || null;

const normalizeAppointmentLineItem = (value: unknown): ClientAppointmentLineItem => {
  const record = asRecord(value);

  return {
    name: toSafeString(firstValue(record, ["name", "service_name", "product_name", "package_name", "membership_name", "title"])),
    price: toSafeNumber(firstValue(record, ["total", "price", "unit_price", "amount"])),
    quantity: toSafeNumber(firstValue(record, ["quantity", "qty"])) || 1,
    serviceId: toNullableString(firstValue(record, ["service_id", "product_id", "package_id", "membership_id"])),
    staffId: toNullableString(firstValue(record, ["staff_id"])),
  };
};

const normalizeAppointmentRecord = (value: unknown): ClientAppointmentRecord => {
  const record = asRecord(value);
  const rawNet = firstValue(record, ["net_amount"]);

  return {
    id: toSafeString(record.id),
    scheduledAt: toNullableString(record.scheduled_at),
    status: toSafeString(record.status),
    durationMinutes: toSafeNumber(record.duration_minutes),
    notes: toSafeString(record.notes),
    cancelReason: toSafeString(record.cancel_reason),
    staffId: toNullableString(record.staff_id),
    staffName: getStaffNameFromRecord(record),
    amountPaid: toSafeNumber(record.amount_paid),
    dueAmount: toSafeNumber(record.due_amount),
    // Preserve the null the backend deliberately sends for "not billed yet" —
    // collapsing it to 0 would make an unbilled visit look genuinely free.
    netAmount: rawNet === null || rawNet === undefined ? null : toSafeNumber(rawNet),
    paymentStatus: toSafeString(record.payment_status),
    paymentMethod: toSafeString(record.payment_method),
    ewalletUsed: toSafeNumber(record.ewallet_used),
    membershipWalletUsed: toSafeNumber(record.membership_wallet_used),
    linkedMembershipName: toSafeString(record.linked_membership_name),
    linkedPackageName: toSafeString(record.linked_package_name),
    services: firstArray(record, ["services"]).map(normalizeAppointmentLineItem),
    productItems: firstArray(record, ["product_items"]).map(normalizeAppointmentLineItem),
    packageItems: firstArray(record, ["package_items"]).map(normalizeAppointmentLineItem),
    membershipItems: firstArray(record, ["membership_items"]).map(normalizeAppointmentLineItem),
  };
};

const SALE_ITEM_TYPES = new Set<ClientSaleItem["itemType"]>([
  "service",
  "product",
  "package",
  "membership",
  "gift_card",
  "quick",
]);

const normalizeSaleItem = (value: unknown): ClientSaleItem => {
  const record = asRecord(value);
  const rawType = toSafeString(record.item_type).toLowerCase() as ClientSaleItem["itemType"];
  const rawDiscount = firstValue(record, ["discount_amount"]);
  const rawTax = firstValue(record, ["tax_amount"]);

  return {
    name: toSafeString(record.name),
    itemType: SALE_ITEM_TYPES.has(rawType) ? rawType : "other",
    quantity: toSafeNumber(record.quantity) || 1,
    unitPrice: toSafeNumber(record.unit_price),
    totalPrice: toSafeNumber(record.total_price),
    discountAmount: rawDiscount === null || rawDiscount === undefined ? null : toSafeNumber(rawDiscount),
    taxAmount: rawTax === null || rawTax === undefined ? null : toSafeNumber(rawTax),
    staffId: toNullableString(record.staff_id),
  };
};

const normalizeSaleRecord = (value: unknown): ClientSaleRecord => {
  const record = asRecord(value);

  return {
    id: toSafeString(record.id),
    invoiceNumber: toSafeString(record.invoice_number),
    status: toSafeString(record.status),
    subtotal: toSafeNumber(record.subtotal),
    discountAmount: toSafeNumber(record.discount_amount),
    tipAmount: toSafeNumber(record.tip_amount),
    taxAmount: toSafeNumber(record.tax_amount),
    totalAmount: toSafeNumber(record.total_amount),
    paymentMethod: toSafeString(record.payment_method),
    paymentReference: toSafeString(record.payment_reference),
    notes: toSafeString(record.notes),
    createdAt: toNullableString(record.created_at),
    appointmentId: toNullableString(record.appointment_id),
    couponCode: toSafeString(record.coupon_code),
    manualDiscountAmount: toSafeNumber(record.manual_discount_amount),
    couponDiscountAmount: toSafeNumber(record.coupon_discount_amount),
    referralDiscountAmount: toSafeNumber(record.referral_discount_amount),
    items: firstArray(record, ["items"]).map(normalizeSaleItem),
  };
};

const normalizePackageServiceRecord = (value: unknown): ClientPackageServiceRecord => {
  const record = asRecord(value);

  return {
    serviceName: toSafeString(record.service_name),
    totalSessions: toSafeNumber(record.total_sessions),
    completedSessions: toSafeNumber(record.completed_sessions),
  };
};

const normalizePackageRecord = (value: unknown): ClientPackageRecord => {
  const record = asRecord(value);
  const services = firstArray(record, ["services"]).map(normalizePackageServiceRecord);
  // client_packages has no overall session pool of its own — it is the sum of
  // its per-service rows (unlike client_memberships, which does).
  const totalSessions = services.reduce((sum, service) => sum + service.totalSessions, 0);
  const completedSessions = services.reduce((sum, service) => sum + service.completedSessions, 0);

  return {
    id: toSafeString(record.id),
    packageName: toSafeString(record.package_name, "Package"),
    status: toSafeString(record.status),
    totalAmount: toSafeNumber(record.total_amount),
    paidAmount: toSafeNumber(record.paid_amount),
    pendingAmount: toSafeNumber(record.pending_amount),
    paymentStatus: toSafeString(record.payment_status),
    expiryDate: toNullableString(record.expiry_date),
    createdDate: toNullableString(record.created_date),
    staffId: toNullableString(record.staff_id),
    saleId: toNullableString(record.sale_id),
    appointmentId: toNullableString(record.appointment_id),
    services,
    totalSessions,
    completedSessions,
    remainingSessions: Math.max(0, totalSessions - completedSessions),
  };
};

const normalizeMembershipRecord = (value: unknown): ClientMembershipRecord => {
  const record = asRecord(value);
  const totalSessions = toSafeNumber(record.total_sessions);
  const usedSessions = toSafeNumber(record.used_sessions);

  return {
    id: toSafeString(record.id),
    membershipName: toSafeString(record.membership_name, "Membership"),
    status: toSafeString(record.status),
    pricePaid: toSafeNumber(record.price_paid),
    expiresAt: toNullableString(record.expires_at),
    purchasedAt: toNullableString(record.purchased_at),
    totalSessions,
    usedSessions,
    remainingSessions: Math.max(0, totalSessions - usedSessions),
    membershipWalletBalance: toSafeNumber(record.membership_wallet_balance),
    discountBalanceRemaining: toSafeNumber(record.discount_balance_remaining),
    staffId: toNullableString(record.staff_id),
    saleId: toNullableString(record.sale_id),
    appointmentId: toNullableString(record.appointment_id),
  };
};

const normalizeReferrer = (value: unknown): ClientHistoryReferrer | null => {
  const record = asRecord(value);
  const fullName = toSafeString(firstValue(record, ["full_name", "fullName", "name"]));

  if (!fullName && !toSafeString(record.id)) {
    return null;
  }

  return {
    id: toSafeString(record.id),
    fullName,
    phoneNumber: toSafeString(firstValue(record, ["phone_number", "phoneNumber"])),
  };
};

const normalizeHistoryClient = (
  payload: ClientHistoryApiData,
  summary: ClientHistorySummary,
): ClientHistoryClient | null => {
  if (!payload || Array.isArray(payload) || !payload.client) {
    return null;
  }

  const client = payload.client;
  const birthdayYear = toSafeNumber(client.birthday_year);

  return {
    id: toSafeString(client.id),
    fullName:
      toSafeString(client.full_name) ||
      [toSafeString(client.first_name), toSafeString(client.last_name)].filter(Boolean).join(" "),
    email: toSafeString(client.email),
    phoneNumber: toSafeString(client.phone_number),
    phoneCountryCode: toNullableString(client.phone_country_code),
    avatarUrl: toNullableString(client.avatar_url),
    isActive: client.is_active !== false,
    createdAt: toNullableString(client.created_at),
    gender: toSafeString(client.gender),
    clientSource: toNullableString(client.client_source),
    birthdayDayMonth: toNullableString(client.birthday_day_month),
    birthdayYear: birthdayYear || null,
    referredBy: normalizeReferrer(client.referred_by),
    // Balances are already extracted by normalizeHistorySummary (which also
    // handles the flat-vs-nested shapes) — reuse it rather than re-reading.
    walletBalance: summary.walletBalance,
    rewardPointsBalance: summary.rewardPointsBalance,
    referralBalance: summary.referralBalance,
    referralCode: summary.referralCode,
    totalReferralEarnings: summary.totalReferralEarnings,
    totalSuccessfulReferrals: summary.totalSuccessfulReferrals,
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

// Enriches the flattened timeline with the per-row detail the generic
// normalizers drop, by joining each entry back to the structured record it
// came from. Only entries that actually have a matching record gain the extra
// fields — a plain `history` array response leaves them undefined.
const enrichHistoryItems = (
  items: ClientHistoryItem[],
  appointments: ClientAppointmentRecord[],
  sales: ClientSaleRecord[],
): ClientHistoryItem[] => {
  if (appointments.length === 0 && sales.length === 0) {
    return items;
  }

  const appointmentsById = new Map(appointments.map((appointment) => [appointment.id, appointment]));
  const salesById = new Map(sales.map((sale) => [sale.id, sale]));
  const saleByAppointmentId = new Map(
    sales.filter((sale) => sale.appointmentId).map((sale) => [sale.appointmentId as string, sale]),
  );

  return items.map((item) => {
    const appointment = appointmentsById.get(item.id);

    if (appointment) {
      const linkedSale = saleByAppointmentId.get(appointment.id);

      return {
        ...item,
        dueAmount: appointment.dueAmount,
        netAmount: appointment.netAmount,
        paymentStatus: appointment.paymentStatus,
        paymentMethod: appointment.paymentMethod,
        invoiceNumber: linkedSale?.invoiceNumber ?? "",
        staffName: item.staffName || appointment.staffName,
      };
    }

    const sale = salesById.get(item.id);

    if (sale) {
      return {
        ...item,
        dueAmount: 0,
        netAmount: sale.totalAmount,
        paymentStatus: sale.status,
        paymentMethod: sale.paymentMethod,
        invoiceNumber: sale.invoiceNumber,
      };
    }

    return item;
  });
};

const fetchClientHistory = async (clientId: string): Promise<ClientHistoryResult> => {
  const id = toSafeString(clientId);

  // The profile is always opened with a real client UUID (route param). Guard
  // here so a name/slug/index can never reach the endpoint — the backend
  // rejects those with a 400 anyway, this just fails faster and louder.
  if (!CLIENT_UUID_PATTERN.test(id)) {
    throw new Error(`Invalid client id for history request: "${clientId}"`);
  }

  const response = await api.get<ApiResponse<ClientHistoryApiData>>(CLIENT.HISTORY(id));
  const payload = response.data.data;
  const record = Array.isArray(payload) ? {} : asRecord(payload);

  const appointments = firstArray(record, ["appointments"]).map(normalizeAppointmentRecord);
  const sales = firstArray(record, ["sales"]).map(normalizeSaleRecord);
  const packages = firstArray(record, ["packages"]).map(normalizePackageRecord);
  const memberships = firstArray(record, ["memberships"]).map(normalizeMembershipRecord);
  const summary = normalizeHistorySummary(payload);

  return {
    history: enrichHistoryItems(
      getClientHistoryArray(payload).map(normalizeHistoryItem),
      appointments,
      sales,
    ),
    summary,
    client: normalizeHistoryClient(payload, summary),
    stats: normalizeHistoryStats(Array.isArray(payload) ? null : payload?.stats),
    appointments,
    sales,
    packages,
    memberships,
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
      client_ids: [clientId],
      reason,
    });
    const data = response.data.data || {};
    const client = data.client ?? (Array.isArray(data.clients) ? data.clients[0] : undefined) ?? data;
    return {
      client: normalizeClient(client),
      message: response.data.message,
    };
  },

  async updateBlockStatus(clientId: string, reason: string): Promise<BlockClientResponse> {
    const response = await api.patch<ApiResponse<any>>(CLIENT.BLOCK, {
      client_ids: [clientId],
      reason,
    });
    const data = response.data.data || {};
    const client = data.client ?? (Array.isArray(data.clients) ? data.clients[0] : undefined) ?? data;
    return {
      client: normalizeClient(client),
      message: response.data.message,
    };
  },

  async unblockClient(clientId: string): Promise<UnblockClientResponse> {
    const response = await api.post<ApiResponse<any>>(CLIENT.UNBLOCK, {
      client_ids: [clientId],
    });
    const data = response.data.data || {};
    const client = data.client ?? (Array.isArray(data.clients) ? data.clients[0] : undefined) ?? data;
    return {
      client: normalizeClient(client),
      message: response.data.message,
    };
  },

  // Returns the complete /clients/:id/history payload — client, stats and the
  // four record arrays alongside the flattened timeline. Previously this kept
  // only `history` and discarded everything else, which is why the profile's
  // spend/points/referral figures all rendered as zero.
  async getClientHistory(clientId: string): Promise<ClientHistoryResult> {
    return fetchClientHistory(clientId);
  },

  // Kept as a named alias for Quick Sale's redemption hook, which only needs
  // the wallet/reward-points/referral `summary` half of the same response.
  async getClientHistoryWithSummary(clientId: string): Promise<ClientHistoryResult> {
    return fetchClientHistory(clientId);
  },

  // Its own endpoint (not part of /history) — fetched lazily when the Notes
  // tab is first opened, same as Web.
  async getClientNotes(clientId: string): Promise<ClientNote[]> {
    const id = toSafeString(clientId);

    if (!CLIENT_UUID_PATTERN.test(id)) {
      throw new Error(`Invalid client id for notes request: "${clientId}"`);
    }

    const response = await api.get<ApiResponse<ClientNoteApi[] | null>>(CLIENT.NOTES(id));
    const rows = Array.isArray(response.data.data) ? response.data.data : [];

    return rows.map((row, index) => ({
      id: toSafeString(row?.id, `note-${index}`),
      note: toSafeString(row?.note),
      staffName: toSafeString(row?.staff_name),
      createdAt: toNullableString(row?.created_at),
    }));
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
