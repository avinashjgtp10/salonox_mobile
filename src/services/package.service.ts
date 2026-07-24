import { api } from "@/services/api";
import { PACKAGE } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";
import type {
  ClientPackage,
  ClientPackageService,
  PackageListItem,
  PackageListQuery,
  PackageListResponse,
} from "@/types/package";

type AnyRecord = Record<string, unknown>;

type PackageEnvelope =
  | AnyRecord
  | AnyRecord[]
  | {
      data?: AnyRecord | AnyRecord[] | null;
      items?: AnyRecord[] | null;
      packages?: AnyRecord[] | null;
      rows?: AnyRecord[] | null;
      total?: number | string | null;
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

const toSafeNumber = (value: unknown, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

const extractItems = (payload: PackageEnvelope | null | undefined): AnyRecord[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload.filter(isRecord);
  if (!isRecord(payload)) return [];

  const data = payload.data;
  if (Array.isArray(data)) return data.filter(isRecord);
  if (isRecord(data)) return extractItems(data);

  const list = payload.items ?? payload.packages ?? payload.rows;
  return Array.isArray(list) ? list.filter(isRecord) : [];
};

const extractTotal = (payload: PackageEnvelope | null | undefined, fallback: number) => {
  if (!isRecord(payload)) return fallback;
  const data = payload.data;

  if (isRecord(data)) {
    return toSafeNumber(data.total, fallback);
  }

  return toSafeNumber(payload.total, fallback);
};

const normalizePackage = (raw: AnyRecord): PackageListItem => {
  const servicesRaw = firstValue(raw, ["services", "serviceIds", "service_ids"]);
  const serviceIds = Array.isArray(servicesRaw)
    ? servicesRaw
        .map((service) =>
          isRecord(service)
            ? toSafeString(firstValue(service, ["serviceId", "service_id", "id", "_id"]))
            : toSafeString(service),
        )
        .filter(Boolean)
    : [];

  return {
    basePrice: toSafeNumber(firstValue(raw, ["basePrice", "base_price", "price", "totalAmount", "total_amount"])),
    category: toNullableString(firstValue(raw, ["category"])),
    colour: toNullableString(firstValue(raw, ["colour", "color"])),
    description: toNullableString(firstValue(raw, ["description"])),
    discountType: (toNullableString(firstValue(raw, ["discountType", "discount_type"])) as PackageListItem["discountType"]) ?? null,
    discountValue: toSafeNumber(firstValue(raw, ["discountValue", "discount_value", "discount"])),
    durationMinutes: toSafeNumber(firstValue(raw, ["durationMinutes", "duration_minutes"])),
    id: toSafeString(firstValue(raw, ["id", "_id"])),
    name: toSafeString(firstValue(raw, ["name", "packageName", "package_name"]), "Package"),
    serviceIds,
    status: toSafeString(firstValue(raw, ["status"]), "Active"),
  };
};

const normalizeClientPackageService = (raw: unknown): ClientPackageService => {
  const record = isRecord(raw) ? raw : {};

  return {
    catalogServiceId: toNullableString(firstValue(record, ["catalogServiceId", "catalog_service_id", "serviceId", "service_id"])),
    completedSessions: toSafeNumber(firstValue(record, ["completedSessions", "completed_sessions"])),
    price: toSafeNumber(firstValue(record, ["price"])),
    remainingSessions: toSafeNumber(firstValue(record, ["remainingSessions", "remaining_sessions"])),
    serviceId: toSafeString(firstValue(record, ["serviceId", "service_id", "id", "_id"])),
    serviceName: toSafeString(firstValue(record, ["serviceName", "service_name", "name"]), "Service"),
    totalSessions: toSafeNumber(firstValue(record, ["totalSessions", "total_sessions"])),
  };
};

const normalizeClientPackage = (raw: AnyRecord): ClientPackage => {
  const client = firstValue(raw, ["client"]) as AnyRecord | undefined;
  const servicesRaw = firstValue(raw, ["services"]);

  return {
    basePrice: toSafeNumber(firstValue(raw, ["basePrice", "base_price"])),
    category: toNullableString(firstValue(raw, ["category"])),
    clientId: toSafeString(firstValue(raw, ["clientId", "client_id"]) ?? firstValue(client, ["id", "_id"])),
    clientName: toSafeString(firstValue(raw, ["clientName", "client_name"]) ?? firstValue(client, ["fullName", "full_name", "name"]), "Client"),
    expiryDate: toNullableString(firstValue(raw, ["expiryDate", "expiry_date"])),
    id: toSafeString(firstValue(raw, ["id", "_id"])),
    packageName: toSafeString(firstValue(raw, ["packageName", "package_name", "name"]), "Package"),
    services: Array.isArray(servicesRaw) ? servicesRaw.map(normalizeClientPackageService) : [],
    status: toSafeString(firstValue(raw, ["status"]), "Active"),
    totalAmount: toSafeNumber(firstValue(raw, ["totalAmount", "total_amount"])),
  };
};

export const packageService = {
  async completeClientPackageSession(
    clientPackageId: string,
    payload: { appointmentId?: string; serviceId: string; staffName: string },
  ): Promise<ClientPackage> {
    const response = await api.post<ApiResponse<PackageEnvelope>>(
      `${PACKAGE.CLIENT_ASSIGNMENTS}/${clientPackageId}/sessions/complete`,
      {
        appointmentId: payload.appointmentId,
        appointment_id: payload.appointmentId,
        serviceId: payload.serviceId,
        service_id: payload.serviceId,
        staffName: payload.staffName,
        staff_name: payload.staffName,
      },
    );

    return normalizeClientPackage(extractItems(response.data.data)[0] ?? {});
  },

  async getClientPackages(clientId: string, salonId?: string | null): Promise<ClientPackage[]> {
    const response = await api.get<ApiResponse<PackageEnvelope>>(PACKAGE.CLIENT_ASSIGNMENTS, {
      params: {
        clientId,
        client_id: clientId,
        limit: 500,
        status: "active",
        ...(salonId ? { salon_id: salonId } : {}),
      },
      validateStatus: (status) => (status >= 200 && status < 300) || status === 404,
    });

    if (response.status === 404) {
      return [];
    }

    return extractItems(response.data.data).map(normalizeClientPackage);
  },

  async getPackages(query: PackageListQuery = {}, salonId?: string | null): Promise<PackageListResponse> {
    const response = await api.get<ApiResponse<PackageEnvelope>>(PACKAGE.LIST, {
      params: {
        ...query,
        ...(salonId ? { salon_id: salonId } : {}),
      },
    });
    const items = extractItems(response.data.data).map(normalizePackage);

    return {
      items,
      total: extractTotal(response.data.data, items.length),
    };
  },
};
