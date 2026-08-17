import { api } from "@/services/api";
import { SERVICE } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";
import type { ConsumableRecipeApiItem, ConsumableRecipeItem } from "@/types/consumable";
import type {
  CreateServiceRequest,
  CreateServiceResponse,
  DeleteServiceResponse,
  ServiceApiItem,
  ServiceApiCategory,
  ServiceCategoryItem,
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

const getCategoryRecord = (value: unknown): ServiceApiCategory | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as ServiceApiCategory)
    : null;

const getCategoryName = (value: unknown) => {
  if (typeof value === "string") {
    return toSafeString(value) || null;
  }

  const record = getCategoryRecord(value);

  return record
    ? toSafeString(record.parent_category_name) ||
        toSafeString(record.category_name) ||
        toSafeString(record.name) ||
        toSafeString(record.title) ||
        null
    : null;
};

const getCategoryId = (value: unknown) => {
  const record = getCategoryRecord(value);

  return record
    ? toSafeString(record.parent_category_id) ||
        toSafeString(record.category_id) ||
        toSafeString(record.id) ||
        toSafeString(record._id) ||
        null
    : null;
};

const getOwnCategoryName = (value: unknown) => {
  if (typeof value === "string") {
    return toSafeString(value) || null;
  }

  const record = getCategoryRecord(value);

  return record
    ? toSafeString(record.name) ||
        toSafeString(record.category_name) ||
        toSafeString(record.service_category_name) ||
        toSafeString(record.display_name) ||
        toSafeString(record.title) ||
        toSafeString(record.label) ||
        null
    : null;
};

const getOwnCategoryId = (value: unknown) => {
  const record = getCategoryRecord(value);

  return record
    ? toSafeString(record.id) ||
        toSafeString(record.uuid) ||
        toSafeString(record.category_id) ||
        toSafeString(record.service_category_id) ||
        toSafeString(record._id) ||
        null
    : null;
};

const getNestedCategoryArray = (value: unknown): ServiceApiCategory[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is ServiceApiCategory => Boolean(getCategoryRecord(item)));
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  const record = value as Record<string, unknown>;
  const candidateKeys = [
    "categories",
    "service_categories",
    "serviceCategories",
    "items",
    "rows",
    "results",
    "data",
  ];

  for (const key of candidateKeys) {
    const nested = getNestedCategoryArray(record[key]);

    if (nested.length > 0) {
      return nested;
    }
  }

  return [];
};

const normalizeCategoryList = (payload: unknown): ServiceCategoryItem[] => {
  const categoryMap = new Map<string, ServiceCategoryItem>();
  const list = getNestedCategoryArray(payload);

  for (const item of list) {
    const id = getOwnCategoryId(item);
    const name = getOwnCategoryName(item);

    if (id && name) {
      categoryMap.set(id, { id, name });
    }
  }

  return Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name));
};

const getServiceCategory = (service: ServiceApiItem) => {
  const categoryRecord = getCategoryRecord(service.category);
  const parentCategory =
    service.parent_category ?? categoryRecord?.parent_category ?? categoryRecord?.parent ?? null;
  const parentCategoryName =
    toSafeString(service.parent_category_name) || getCategoryName(parentCategory);
  const parentCategoryId =
    toSafeString(service.parent_category_id) || getCategoryId(parentCategory);
  const categoryName =
    parentCategoryName ||
    toSafeString(service.category_name) ||
    getCategoryName(service.category);
  const categoryId =
    parentCategoryId ||
    toSafeString(service.category_id) ||
    toSafeString(service.categoryId) ||
    getCategoryId(service.category);

  return {
    category: categoryName || null,
    categoryId: categoryId || null,
  };
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

const normalizeConsumablesUsed = (
  value: ConsumableRecipeApiItem[] | null | undefined,
): ConsumableRecipeItem[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const items = value
    .map((item): ConsumableRecipeItem | null => {
      const productId = toSafeString(item?.product_id);

      if (!productId) {
        return null;
      }

      return {
        productId,
        qty: toSafeNumber(item?.qty),
        unit: toSafeString(item?.unit),
      };
    })
    .filter((item): item is ConsumableRecipeItem => item !== null);

  return items.length > 0 ? items : undefined;
};

const normalizeService = (service: ServiceApiItem, index: number): ServiceListItem => {
  const name =
    toSafeString(service.name) ||
    toSafeString(service.service_name) ||
    toSafeString(service.title) ||
    `Service ${index + 1}`;

  const category = getServiceCategory(service);
  const consumablesUsed = normalizeConsumablesUsed(service.consumables_used);

  return {
    category: category.category,
    categoryId: category.categoryId,
    ...(consumablesUsed ? { consumablesUsed } : {}),
    createdAt: toSafeString(service.created_at) || null,
    ...(toSafeNumber(service.discount_amount) || toSafeNumber(service.discount)
      ? { discountAmount: toSafeNumber(service.discount_amount) || toSafeNumber(service.discount) }
      : {}),
    ...(toSafeNumber(service.discount_percent) ? { discountPercent: toSafeNumber(service.discount_percent) } : {}),
    durationMinutes: toDurationMinutes(service.duration_minutes) ?? toDurationMinutes(service.duration),
    id: toSafeString(service.id, name.toLowerCase().replace(/\s+/g, "-")),
    isActive: getIsActive(service),
    ...(toSafeString(service.item_type) ? { itemType: toSafeString(service.item_type) } : {}),
    name,
    price: toSafeNumber(service.price) || toSafeNumber(service.amount),
    ...(toSafeNumber(service.tax_amount) || toSafeNumber(service.tax)
      ? { taxAmount: toSafeNumber(service.tax_amount) || toSafeNumber(service.tax) }
      : {}),
    ...(toSafeNumber(service.tax_rate) ? { taxRate: toSafeNumber(service.tax_rate) } : {}),
  };
};

// Real response shape is `{ data: Service[], pagination: { total, page, limit,
// total_pages } }` (see services.repository.ts `list` on the backend) — 1-
// indexed page number, never `offset`/`has_more`/`next_offset`. Everything
// else in this app thinks in offset/limit terms, so this is the one place
// that translates page-based pagination back into that shape.
const getPagination = (
  payload: ServiceListApiData,
  query: ServiceListQuery,
  pageCount: number,
  totalCount: number,
): ServiceListPagination => {
  if (Array.isArray(payload)) {
    return {
      hasMore: false,
      limit: query.limit,
      nextOffset: query.offset + pageCount,
      offset: query.offset,
    };
  }

  const limit = toSafeNumber(payload.pagination?.limit) || query.limit;
  const totalPages = toSafeNumber(payload.pagination?.total_pages);
  const page = toSafeNumber(payload.pagination?.page) || Math.floor(query.offset / Math.max(1, limit)) + 1;
  const offset = (page - 1) * limit;
  const nextOffset = offset + pageCount;
  const hasMore = totalPages > 0 ? page < totalPages : totalCount > 0 ? nextOffset < totalCount : pageCount >= limit;

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
    const { category, categoryId, isActive, limit, offset, ...restQuery } = query;
    // The real validator/controller (services.controller.ts) only ever reads
    // `page`/`limit`/`status` — it has no idea what `offset`/`is_active` mean,
    // so sending those silently no-ops (every request quietly re-fetches
    // page 1, and inactive services never get filtered out). Translate to
    // what the backend actually understands.
    const page = Math.floor(offset / Math.max(1, limit)) + 1;
    const requestParams = {
      ...restQuery,
      limit,
      page,
      ...(category ? { category } : {}),
      ...(categoryId ? { category_id: categoryId } : {}),
      ...(typeof isActive === "boolean" ? { status: isActive ? "active" : "inactive" } : {}),
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

  async getCategories(salonId?: string | null): Promise<ServiceCategoryItem[]> {
    try {
      const response = await api.get<ApiResponse<unknown>>(SERVICE.CATEGORIES, {
        params: salonId ? { salon_id: salonId } : undefined,
      });

      return normalizeCategoryList(response.data?.data ?? response.data);
    } catch {
      const response = await api.get<ApiResponse<unknown>>("/categories", {
        params: salonId ? { salon_id: salonId } : undefined,
      });

      return normalizeCategoryList(response.data?.data ?? response.data);
    }
  },

  async createCategory(
    name: string,
    salonId?: string | null,
  ): Promise<ServiceCategoryItem> {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error("Category name is required.");
    }

    let rawCategory: unknown = null;

    try {
      const response = await api.post<ApiResponse<unknown>>(SERVICE.CATEGORIES, {
        name: trimmedName,
        ...(salonId ? { salon_id: salonId } : {}),
      });

      rawCategory = response.data?.data ?? response.data;
    } catch (primaryError) {
      try {
        const response = await api.post<ApiResponse<unknown>>("/categories", {
          name: trimmedName,
          ...(salonId ? { salon_id: salonId } : {}),
        });

        rawCategory = response.data?.data ?? response.data;
      } catch {
        throw primaryError;
      }
    }

    const record = getCategoryRecord(rawCategory) ?? (rawCategory as ServiceApiCategory | null);
    const categoryRecord =
      record && typeof record === "object" && "category" in record
        ? (record as { category: ServiceApiCategory }).category
        : record;

    const id =
      getCategoryId(categoryRecord) ||
      toSafeString((categoryRecord as { id?: unknown })?.id) ||
      toSafeString((categoryRecord as { _id?: unknown })?._id);
    const categoryName = getCategoryName(categoryRecord) || trimmedName;

    return {
      id: id || trimmedName.toLowerCase().replace(/\s+/g, "-"),
      name: categoryName,
    };
  },
};
