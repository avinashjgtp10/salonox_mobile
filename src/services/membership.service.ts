import { api } from "@/services/api";
import { MEMBERSHIP } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";
import type {
  CreateMembershipRequest,
  CreateMembershipResponse,
  DeleteMembershipResponse,
  IncludedService,
  Membership,
  MembershipExportQuery,
  MembershipExportResponse,
  MembershipListQuery,
  MembershipListResponse,
  MembershipRow,
  UpdateMembershipRequest,
  UpdateMembershipResponse,
} from "@/types/membership";
import type { LoyaltyEligibility } from "@/types/wallet";

type MembershipApiData =
  | Membership
  | MembershipRow
  | {
      data?: Membership | MembershipRow | null;
      membership?: Membership | MembershipRow | null;
    };

type MembershipApiResponse = ApiResponse<MembershipApiData>;
type MembershipListApiResponse = ApiResponse<MembershipListResponse>;
type DeleteMembershipApiResponse = ApiResponse<DeleteMembershipResponse>;

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

const toOptionalString = (value: unknown) => {
  const text = toSafeString(value);
  return text || undefined;
};

const toSafeNumber = (value: unknown, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value);

    if (Number.isFinite(parsedValue)) {
      return parsedValue;
    }
  }

  return fallback;
};

const toOptionalNumber = (value: unknown) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsedValue = toSafeNumber(value, Number.NaN);
  return Number.isFinite(parsedValue) ? parsedValue : undefined;
};

const toSafeBoolean = (value: unknown, fallback = false) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true" || value === 1) {
    return true;
  }

  if (value === "false" || value === 0) {
    return false;
  }

  return fallback;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isDetailEnvelope = (
  payload: MembershipApiData,
): payload is { data?: Membership | MembershipRow | null; membership?: Membership | MembershipRow | null } =>
  isRecord(payload) && ("data" in payload || "membership" in payload);

const getMembershipFromPayload = (payload: MembershipApiData): Membership | MembershipRow => {
  if (isDetailEnvelope(payload)) {
    return payload.membership ?? payload.data ?? ({} as Membership);
  }

  return payload;
};

const normalizeIncludedService = (service: IncludedService): IncludedService => ({
  serviceId: toSafeString(service.serviceId),
  serviceName: toSafeString(service.serviceName),
  ...(service.durationMinutes !== undefined
    ? { durationMinutes: toSafeNumber(service.durationMinutes) }
    : {}),
});

const normalizeMembership = (raw: Membership | MembershipRow): Membership => {
  const record = raw as Membership & MembershipRow;

  return {
    id: toSafeString(record.id),
    name: toSafeString(record.name),
    ...(toOptionalString(record.description) ? { description: toOptionalString(record.description) } : {}),
    includedServices: (record.includedServices ?? record.services ?? []).map(normalizeIncludedService),
    ...((record.privileges ?? record.metadata) !== undefined ? { privileges: record.privileges ?? record.metadata } : {}),
    ...(record.metadata !== undefined ? { metadata: record.metadata } : {}),
    ...(toOptionalNumber(record.bonusCredit ?? record.bonus_credit) !== undefined
      ? { bonusCredit: toOptionalNumber(record.bonusCredit ?? record.bonus_credit) }
      : {}),
    sessionType: toSafeString(record.sessionType ?? record.session_type),
    ...(toOptionalNumber(record.numberOfSessions ?? record.number_of_sessions) !== undefined
      ? { numberOfSessions: toOptionalNumber(record.numberOfSessions ?? record.number_of_sessions) }
      : {}),
    validFor: toSafeString(record.validFor ?? record.valid_for),
    price: toSafeNumber(record.price),
    ...(toOptionalNumber(record.taxRate ?? record.tax_rate) !== undefined
      ? { taxRate: toOptionalNumber(record.taxRate ?? record.tax_rate) }
      : {}),
    colour: toSafeString(record.colour),
    enableOnlineSales: toSafeBoolean(record.enableOnlineSales ?? record.enable_online_sales),
    enableOnlineRedemption: toSafeBoolean(record.enableOnlineRedemption ?? record.enable_online_redemption),
    ...(toOptionalString(record.termsAndConditions ?? record.terms_and_conditions)
      ? { termsAndConditions: toOptionalString(record.termsAndConditions ?? record.terms_and_conditions) }
      : {}),
    createdAt: toSafeString(record.createdAt ?? record.created_at),
    updatedAt: toSafeString(record.updatedAt ?? record.updated_at),
  };
};

const getFilename = (contentDisposition: unknown) => {
  const header = toSafeString(contentDisposition);
  const match = header.match(/filename="?([^";]+)"?/i);

  return match?.[1];
};

const buildExportResponse = <TFormat extends MembershipExportResponse["format"]>(
  format: TFormat,
  data: TFormat extends "csv" ? string : ArrayBuffer,
  contentType: Extract<MembershipExportResponse, { format: TFormat }>["contentType"],
  filename?: string,
): Extract<MembershipExportResponse, { format: TFormat }> =>
  ({
    contentType,
    data,
    filename,
    format,
  }) as Extract<MembershipExportResponse, { format: TFormat }>;

export const membershipService = {
  async getLoyaltyEligibility(clientId: string, salonId?: string | null): Promise<LoyaltyEligibility> {
    const response = await api.get<ApiResponse<Record<string, unknown>>>(MEMBERSHIP.LOYALTY_ELIGIBILITY, {
      params: {
        clientId,
        client_id: clientId,
        ...(salonId ? { salon_id: salonId } : {}),
      },
      validateStatus: (status) => (status >= 200 && status < 300) || status === 404,
    });

    if (response.status === 404) {
      return { eligible: false };
    }

    const data = response.data.data;

    return { eligible: toSafeBoolean(data?.eligible) };
  },

  async getMemberships(query: MembershipListQuery = {}, salonId?: string | null): Promise<MembershipListResponse> {
    const response = await api.get<MembershipListApiResponse>(MEMBERSHIP.LIST, {
      params: {
        ...query,
        ...(salonId ? { salon_id: salonId } : {}),
      },
    });
    const payload = response.data.data;

    return {
      items: payload.items.map(normalizeMembership),
      total: payload.total,
    };
  },

  async getMembershipById(membershipId: string): Promise<Membership> {
    const response = await api.get<MembershipApiResponse>(MEMBERSHIP.DETAIL(membershipId));

    return normalizeMembership(getMembershipFromPayload(response.data.data));
  },

  async createMembership(payload: CreateMembershipRequest): Promise<CreateMembershipResponse> {
    const response = await api.post<MembershipApiResponse>(MEMBERSHIP.CREATE, payload);

    return normalizeMembership(getMembershipFromPayload(response.data.data));
  },

  async updateMembership(
    membershipId: string,
    payload: UpdateMembershipRequest,
  ): Promise<UpdateMembershipResponse> {
    const response = await api.patch<MembershipApiResponse>(MEMBERSHIP.UPDATE(membershipId), payload);

    return normalizeMembership(getMembershipFromPayload(response.data.data));
  },

  async deleteMembership(membershipId: string): Promise<DeleteMembershipResponse> {
    const response = await api.delete<DeleteMembershipApiResponse>(MEMBERSHIP.DELETE(membershipId));

    return response.data.data;
  },

  async exportCsv(query: MembershipExportQuery = {}, salonId?: string | null): Promise<MembershipExportResponse> {
    const response = await api.get<string>(MEMBERSHIP.EXPORT_CSV, {
      params: {
        ...query,
        ...(salonId ? { salon_id: salonId } : {}),
      },
      responseType: "text",
    });

    return buildExportResponse(
      "csv",
      response.data,
      "text/csv",
      getFilename(response.headers["content-disposition"]),
    );
  },

  async exportExcel(query: MembershipExportQuery = {}, salonId?: string | null): Promise<MembershipExportResponse> {
    const response = await api.get<ArrayBuffer>(MEMBERSHIP.EXPORT_EXCEL, {
      params: {
        ...query,
        ...(salonId ? { salon_id: salonId } : {}),
      },
      responseType: "arraybuffer",
    });

    return buildExportResponse(
      "excel",
      response.data,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      getFilename(response.headers["content-disposition"]),
    );
  },

  async exportPdf(query: MembershipExportQuery = {}, salonId?: string | null): Promise<MembershipExportResponse> {
    const response = await api.get<ArrayBuffer>(MEMBERSHIP.EXPORT_PDF, {
      params: {
        ...query,
        ...(salonId ? { salon_id: salonId } : {}),
      },
      responseType: "arraybuffer",
    });

    return buildExportResponse(
      "pdf",
      response.data,
      "application/pdf",
      getFilename(response.headers["content-disposition"]),
    );
  },
};
