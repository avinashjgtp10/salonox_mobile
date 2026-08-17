import { api } from "@/services/api";
import { CLIENT_MEMBERSHIP } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";
import type {
  CancelClientMembershipRequest,
  ChangeClientMembershipRequest,
  ClientMembershipAppliesTo,
  ClientMembershipAssignment,
  ClientMembershipAssignmentRequest,
  ClientMembershipBenefit,
  ClientMembershipHistoryItem,
  ClientMembershipPricingType,
  ClientMembershipStatus,
  RenewClientMembershipRequest,
} from "@/types/clientMembership";

type AnyRecord = Record<string, unknown>;

type AssignmentEnvelope =
  | AnyRecord
  | AnyRecord[]
  | {
      assignment?: AnyRecord | null;
      assignments?: AnyRecord[] | null;
      clientMembership?: AnyRecord | null;
      clientMemberships?: AnyRecord[] | null;
      data?: AnyRecord | AnyRecord[] | null;
      history?: AnyRecord[] | null;
      items?: AnyRecord[] | null;
      rows?: AnyRecord[] | null;
    };

const isRecord = (value: unknown): value is AnyRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const firstValue = (record: AnyRecord | null | undefined, keys: string[]) => {
  if (!record) return undefined;

  for (const key of keys) {
    const value = record[key];

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return undefined;
};

const toSafeString = (value: unknown, fallback = "") => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || fallback;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return fallback;
};

const toNullableString = (value: unknown) => toSafeString(value) || null;

const toNullableNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeStatus = (value: unknown, expiresAt?: string | null): ClientMembershipStatus => {
  const raw = toSafeString(value).toLowerCase().replace(/[_\s-]+/g, "_");

  if (raw.includes("cancel")) return "cancelled";
  if (raw.includes("expire")) return "expired";
  if (raw.includes("inactive")) return "inactive";
  if (expiresAt) {
    const expiryTime = new Date(expiresAt).getTime();
    if (Number.isFinite(expiryTime) && expiryTime < Date.now()) return "expired";
  }

  return "active";
};

const normalizeBenefit = (raw: unknown): ClientMembershipBenefit => {
  const record = isRecord(raw) ? raw : {};
  const total = toNullableNumber(firstValue(record, ["total", "totalSessions", "total_sessions", "quantity"]));
  const used = toNullableNumber(firstValue(record, ["used", "usedSessions", "used_sessions", "redeemed"]));
  const remaining =
    toNullableNumber(firstValue(record, ["remaining", "remainingBenefits", "remaining_benefits", "remainingSessions", "remaining_sessions"])) ??
    (total !== null && used !== null ? Math.max(0, total - used) : null);

  return {
    remaining,
    serviceId: toSafeString(firstValue(record, ["serviceId", "service_id", "id", "_id"])),
    serviceName: toSafeString(firstValue(record, ["serviceName", "service_name", "name", "title"]), "Benefit"),
    total,
    used,
  };
};

const normalizeHistoryItem = (raw: unknown, fallbackIndex: number): ClientMembershipHistoryItem => {
  const record = isRecord(raw) ? raw : {};
  const date = toNullableString(firstValue(record, ["date", "createdAt", "created_at", "updatedAt", "updated_at"]));
  const membership = firstValue(record, ["membership"]) as AnyRecord | undefined;
  const membershipName = toSafeString(
    firstValue(record, ["membershipName", "membership_name", "name"]) ?? firstValue(membership, ["name", "title"]),
    "Membership",
  );

  return {
    action: toSafeString(firstValue(record, ["action", "event", "type"]), "Updated"),
    date,
    id: toSafeString(firstValue(record, ["id", "_id"]), `${date ?? "history"}-${fallbackIndex}`),
    membershipId: toNullableString(
      firstValue(record, ["membershipId", "membership_id"]) ?? firstValue(membership, ["id", "_id"]),
    ),
    membershipName,
    note: toNullableString(firstValue(record, ["note", "notes", "reason"])),
    status: normalizeStatus(firstValue(record, ["status"]), null),
  };
};

const extractAssignments = (payload: AssignmentEnvelope | null | undefined): AnyRecord[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload.filter(isRecord);
  if (!isRecord(payload)) return [];

  const data = payload.data;
  if (Array.isArray(data)) return data.filter(isRecord);
  if (isRecord(data)) return extractAssignments(data);

  const list =
    payload.assignments ??
    payload.clientMemberships ??
    payload.items ??
    payload.rows ??
    (isRecord(payload.assignment) ? [payload.assignment] : null) ??
    (isRecord(payload.clientMembership) ? [payload.clientMembership] : null);

  if (Array.isArray(list)) return list.filter(isRecord);

  return isRecord(payload) ? [payload] : [];
};

const normalizeAssignment = (raw: AnyRecord): ClientMembershipAssignment => {
  const client = firstValue(raw, ["client"]) as AnyRecord | undefined;
  const membership = firstValue(raw, ["membership"]) as AnyRecord | undefined;
  const expiresAt = toNullableString(firstValue(raw, ["expiresAt", "expires_at", "expiryDate", "expiry_date", "endDate", "end_date"]));
  const benefitsRaw = firstValue(raw, ["benefits", "remainingBenefitsDetails", "remaining_benefits_details", "includedServices", "included_services"]);
  const benefits = Array.isArray(benefitsRaw) ? benefitsRaw.map(normalizeBenefit) : [];
  const remainingBenefits =
    toNullableNumber(firstValue(raw, ["remainingBenefits", "remaining_benefits", "remainingSessions", "remaining_sessions"])) ??
    (benefits.length > 0
      ? benefits.reduce((total, benefit) => total + Math.max(benefit.remaining ?? 0, 0), 0)
      : null);

  const membershipPricingType =
    firstValue(raw, ["pricingType", "pricing_type"]) ?? firstValue(membership, ["pricingType", "pricing_type"]);
  const membershipAppliesTo =
    firstValue(raw, ["appliesTo", "applies_to"]) ?? firstValue(membership, ["appliesTo", "applies_to"]);
  const membershipCategoryIds =
    firstValue(raw, ["categoryIds", "category_ids"]) ?? firstValue(membership, ["categoryIds", "category_ids"]);

  return {
    appliesTo: normalizeAppliesTo(membershipAppliesTo),
    assignedAt: toNullableString(firstValue(raw, ["assignedAt", "assigned_at", "createdAt", "created_at"])),
    benefits,
    cancelledAt: toNullableString(firstValue(raw, ["cancelledAt", "cancelled_at", "canceledAt", "canceled_at"])),
    categoryIds: toStringArray(membershipCategoryIds),
    clientId: toSafeString(firstValue(raw, ["clientId", "client_id"]) ?? firstValue(client, ["id", "_id"])),
    clientName: toSafeString(firstValue(raw, ["clientName", "client_name"]) ?? firstValue(client, ["fullName", "full_name", "name"]), "Client"),
    discountBalanceRemaining: toNullableNumber(
      firstValue(raw, ["discountBalanceRemaining", "discount_balance_remaining"]),
    ),
    expiresAt,
    history: (Array.isArray(firstValue(raw, ["history", "membershipHistory", "membership_history"]))
      ? (firstValue(raw, ["history", "membershipHistory", "membership_history"]) as unknown[])
      : []
    ).map(normalizeHistoryItem),
    id: toSafeString(firstValue(raw, ["id", "_id", "assignmentId", "assignment_id"])),
    membershipId: toSafeString(firstValue(raw, ["membershipId", "membership_id"]) ?? firstValue(membership, ["id", "_id"])),
    membershipName: toSafeString(firstValue(raw, ["membershipName", "membership_name"]) ?? firstValue(membership, ["name", "title"]), "Membership"),
    pricingType: normalizePricingType(membershipPricingType),
    remainingBenefits,
    renewedAt: toNullableString(firstValue(raw, ["renewedAt", "renewed_at"])),
    startsAt: toNullableString(firstValue(raw, ["startsAt", "starts_at", "startDate", "start_date"])),
    status: normalizeStatus(firstValue(raw, ["status", "state"]), expiresAt),
    walletBalance: toNullableNumber(
      firstValue(raw, ["walletBalance", "wallet_balance", "membershipWalletBalance", "membership_wallet_balance"]),
    ),
  };
};

const normalizePricingType = (value: unknown): ClientMembershipPricingType | null => {
  const raw = toSafeString(value).toLowerCase();

  if (raw === "value" || raw === "percentage") {
    return raw;
  }

  return null;
};

const normalizeAppliesTo = (value: unknown): ClientMembershipAppliesTo | null => {
  const raw = toSafeString(value).toLowerCase();

  if (raw === "services" || raw === "products" || raw === "both") {
    return raw;
  }

  return null;
};

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => (isRecord(entry) ? toSafeString(firstValue(entry, ["id", "_id"])) : toSafeString(entry)))
    .filter(Boolean);
};

const normalizeAssignmentResponse = (payload: AssignmentEnvelope): ClientMembershipAssignment =>
  normalizeAssignment(extractAssignments(payload)[0] ?? {});

const normalizeAssignmentListResponse = (payload: AssignmentEnvelope): ClientMembershipAssignment[] =>
  extractAssignments(payload).map(normalizeAssignment);

const assignmentPayload = (payload: ClientMembershipAssignmentRequest) => ({
  clientId: payload.clientId,
  client_id: payload.clientId,
  membershipId: payload.membershipId,
  membership_id: payload.membershipId,
  ...(payload.startDate ? { startDate: payload.startDate, start_date: payload.startDate } : {}),
});

export const clientMembershipService = {
  async assign(payload: ClientMembershipAssignmentRequest, salonId?: string | null) {
    const response = await api.post<ApiResponse<AssignmentEnvelope>>(CLIENT_MEMBERSHIP.ASSIGN, {
      ...assignmentPayload(payload),
      ...(salonId ? { salon_id: salonId, salonId } : {}),
    });

    return normalizeAssignmentResponse(response.data.data);
  },

  async cancel(assignmentId: string, payload: CancelClientMembershipRequest = {}) {
    const response = await api.post<ApiResponse<AssignmentEnvelope>>(CLIENT_MEMBERSHIP.CANCEL(assignmentId), payload);

    return normalizeAssignmentResponse(response.data.data);
  },

  async change(assignmentId: string, payload: ChangeClientMembershipRequest, salonId?: string | null) {
    const response = await api.patch<ApiResponse<AssignmentEnvelope>>(CLIENT_MEMBERSHIP.CHANGE(assignmentId), {
      membershipId: payload.membershipId,
      membership_id: payload.membershipId,
      ...(payload.startDate ? { startDate: payload.startDate, start_date: payload.startDate } : {}),
      ...(salonId ? { salon_id: salonId, salonId } : {}),
    });

    return normalizeAssignmentResponse(response.data.data);
  },

  async getClientAssignments(clientId: string, salonId?: string | null) {
    const response = await api.get<ApiResponse<AssignmentEnvelope>>(CLIENT_MEMBERSHIP.CLIENT_ASSIGNMENTS, {
      params: {
        client_id: clientId,
        clientId,
        ...(salonId ? { salon_id: salonId } : {}),
      },
      validateStatus: (status) => (status >= 200 && status < 300) || status === 404,
    });

    if (response.status === 404) {
      return [];
    }

    return normalizeAssignmentListResponse(response.data.data);
  },

  async getMembershipClients(membershipId: string, salonId?: string | null) {
    const response = await api.get<ApiResponse<AssignmentEnvelope>>(CLIENT_MEMBERSHIP.MEMBERSHIP_CLIENTS(membershipId), {
      params: salonId ? { salon_id: salonId } : undefined,
    });

    return normalizeAssignmentListResponse(response.data.data);
  },

  async renew(assignmentId: string, payload: RenewClientMembershipRequest = {}) {
    const response = await api.post<ApiResponse<AssignmentEnvelope>>(CLIENT_MEMBERSHIP.RENEW(assignmentId), payload.startDate
      ? { startDate: payload.startDate, start_date: payload.startDate }
      : {});

    return normalizeAssignmentResponse(response.data.data);
  },
};
