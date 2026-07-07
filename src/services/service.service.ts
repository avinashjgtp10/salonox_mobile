import { api } from "@/services/api";
import { SERVICE } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";
import type {
  CreateServiceRequest,
  CreateServiceResponse,
  DeleteServiceResponse,
  ServiceApiItem,
  ServiceListApiData,
  ServiceListItem,
  ServiceListPagination,
  ServiceListQuery,
  ServiceListResponse,
  UpdateServiceRequest,
  UpdateServiceResponse,
} from "@/types/service";

type ServiceListApiResponse = ApiResponse<ServiceListApiData>;
type ServiceDetailApiData =
  | ServiceApiItem
  | {
      data?: ServiceApiItem | null;
      service?: ServiceApiItem | null;
    };
type ServiceDetailApiResponse = ApiResponse<ServiceDetailApiData>;
type CreateServiceApiResponse = ApiResponse<ServiceDetailApiData>;
type DeleteServiceApiResponse = ApiResponse<unknown>;

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

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
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

const getServiceArray = (payload: ServiceListApiData) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  return payload.services ?? payload.items ?? payload.rows ?? payload.data ?? [];
};

const getTotalCount = (payload: ServiceListApiData, fallbackCount: number) => {
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

const getIsActive = (service: ServiceApiItem) => {
  if (typeof service.is_active === "boolean") {
    return service.is_active;
  }

  if (typeof service.active === "boolean") {
    return service.active;
  }

  const status = toSafeString(service.status).toLowerCase();

  if (status) {
    return status === "active";
  }

  return true;
};

const normalizeService = (service: ServiceApiItem, index: number): ServiceListItem => {
  const name =
    toSafeString(service.name) ||
    toSafeString(service.service_name) ||
    toSafeString(service.title) ||
    `Service ${index + 1}`;

  return {
    category: toSafeString(service.category) || null,
    createdAt: toSafeString(service.created_at) || null,
    durationMinutes: toDurationMinutes(service.duration_minutes) ?? toDurationMinutes(service.duration),
    id: toSafeString(service.id, name.toLowerCase().replace(/\s+/g, "-")),
    isActive: getIsActive(service),
    name,
    price: toSafeNumber(service.price) || toSafeNumber(service.amount),
  };
};

const getPagination = (
  payload: ServiceListApiData,
  query: ServiceListQuery,
  pageCount: number,
  totalCount: number,
): ServiceListPagination => {
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

const isServiceDetailEnvelope = (
  payload: ServiceDetailApiData,
): payload is { data?: ServiceApiItem | null; service?: ServiceApiItem | null } =>
  Boolean(payload) && typeof payload === "object" && ("data" in payload || "service" in payload);

const getServiceFromDetailPayload = (payload: ServiceDetailApiData): ServiceApiItem => {
  if (isServiceDetailEnvelope(payload)) {
    return payload.service ?? payload.data ?? {};
  }

  return payload;
};

export const serviceService = {
  async getServices(query: ServiceListQuery, salonId?: string | null): Promise<ServiceListResponse> {
    const { isActive, ...restQuery } = query;
    const requestParams = {
      ...restQuery,
      ...(typeof isActive === "boolean" ? { is_active: isActive } : {}),
      ...(salonId ? { salon_id: salonId } : {}),
    };

    const response = await api.get<ServiceListApiResponse>(SERVICE.LIST, {
      params: requestParams,
    });

    const apiServices = getServiceArray(response.data.data);
    const services = apiServices.map(normalizeService);
    const totalCount = getTotalCount(response.data.data, services.length);
    const pagination = getPagination(response.data.data, query, services.length, totalCount);

    return {
      pagination,
      query,
      services,
      totalCount,
    };
  },

  async getService(serviceId: string): Promise<ServiceListItem> {
    const response = await api.get<ServiceDetailApiResponse>(`/services/${serviceId}`);
    const apiService = getServiceFromDetailPayload(response.data.data);

    return normalizeService(apiService, 0);
  },

  async createService(payload: CreateServiceRequest): Promise<CreateServiceResponse> {
    const response = await api.post<CreateServiceApiResponse>(SERVICE.CREATE, payload);
    const apiService = getServiceFromDetailPayload(response.data.data);

    return {
      message: response.data.message,
      service: normalizeService(apiService, 0),
    };
  },

  async updateService(serviceId: string, payload: UpdateServiceRequest): Promise<UpdateServiceResponse> {
    const response = await api.patch<CreateServiceApiResponse>(`${SERVICE.UPDATE}/${serviceId}`, payload);
    const apiService = getServiceFromDetailPayload(response.data.data);

    return {
      message: response.data.message,
      service: normalizeService(apiService, 0),
    };
  },

  async deleteService(serviceId: string): Promise<DeleteServiceResponse> {
    const response = await api.delete<DeleteServiceApiResponse>(`${SERVICE.DELETE}/${serviceId}`);

    return {
      message: response.data.message,
      serviceId,
    };
  },
};
