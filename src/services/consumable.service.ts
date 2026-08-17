import { api } from "@/services/api";
import { CONSUMABLE } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";
import type {
  ConsumableAdjustRequest,
  ConsumableAdjustResponse,
  ConsumableApiItem,
  ConsumableAssignedService,
  ConsumableAssignedServiceApiItem,
  ConsumableDashboardApiData,
  ConsumableDashboardListApiData,
  ConsumableDashboardResponse,
  ConsumableDetail,
  ConsumableDetailApiData,
  ConsumableKpis,
  ConsumableKpisApiData,
  ConsumableListItem,
  ConsumableListPagination,
  ConsumableListQuery,
  ConsumableRefApiItem,
  ConsumableUnitConversion,
  ConsumableUnitConversionApiItem,
  ConsumableUnitConversionsRequest,
  ConsumableUnitConversionsResponse,
  ConsumableUsageHistoryApiData,
  ConsumableUsageHistoryApiItem,
  ConsumableUsageHistoryItem,
  ConsumableUsageHistoryQuery,
  ConsumableUsageHistoryResponse,
} from "@/types/consumable";

type ConsumableDashboardApiResponse = ApiResponse<ConsumableDashboardApiData>;
type ConsumableDetailApiResponse = ApiResponse<ConsumableDetailApiData>;
type ConsumableAssignedServicesApiData =
  | ConsumableAssignedServiceApiItem[]
  | { data?: ConsumableAssignedServiceApiItem[] | null; services?: ConsumableAssignedServiceApiItem[] | null };
type ConsumableUnitConversionsApiData =
  | ConsumableUnitConversionApiItem[]
  | { data?: ConsumableUnitConversionApiItem[] | null; unit_conversions?: ConsumableUnitConversionApiItem[] | null; unitConversions?: ConsumableUnitConversionApiItem[] | null };
type ConsumableUsageHistoryApiResponse = ApiResponse<ConsumableUsageHistoryApiData>;

// Shared shape of the flat pagination fields both the dashboard's `list`
// block and the usage-history payload carry directly (no `pagination`
// wrapper object exists on either — verified live 2026-08-17).
type PaginationFields = {
  hasMore?: boolean | null;
  has_more?: boolean | null;
  limit?: number | string | null;
  page?: number | string | null;
  pageSize?: number | string | null;
  totalPages?: number | string | null;
  total_pages?: number | string | null;
  totalRecords?: number | string | null;
  total_records?: number | string | null;
} | null | undefined;

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

// Distinct from toSafeNumber's 0-fallback: these fields are legitimately
// nullable (a consumable may have no bottle size, no markup set, etc.), and
// 0 is a valid value for several of them, so `value ?? other ? toSafeNumber(...) : null`
// would wrongly collapse an explicit 0 to null. Null/undefined only.
const toOptionalNumber = (value: unknown): number | null =>
  value === null || value === undefined ? null : toSafeNumber(value);

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

const getRefRecord = (value: unknown): ConsumableRefApiItem | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as ConsumableRefApiItem) : null;

const getRefName = (value: unknown) => {
  if (typeof value === "string") {
    return toSafeString(value) || null;
  }

  const record = getRefRecord(value);

  return record ? toSafeString(record.name) || null : null;
};

const getRefId = (value: unknown) => {
  const record = getRefRecord(value);

  return record ? toSafeString(record.id) || toSafeString(record._id) || null : null;
};

// Verified live (2026-08-17): id is `product_id`, current stock is
// `remaining_stock` (not `amount`), unit/bottle size come back under a
// short key on the list endpoint (`unit`, `unit_size`) and a long key on
// the detail endpoint (`measure_unit`, `bottle_size` — both present there
// alongside the short ones), and category/brand/supplier are flat name
// strings (`category_name`/`brand_name`/`supplier_name`), never nested
// objects or accompanied by an id. `status` ("healthy" / "low_stock" /
// "out_of_stock") is backend-computed and preferred over re-deriving
// low/out-of-stock state client-side.
const normalizeConsumable = (raw: ConsumableApiItem): ConsumableListItem => ({
  amount: toSafeNumber(raw.remaining_stock ?? raw.amount),
  bottleSize: toOptionalNumber(raw.bottle_size ?? raw.unit_size ?? raw.bottleSize),
  brandId: toSafeString(raw.brand_id ?? raw.brandId) || getRefId(raw.brand),
  brandName: toSafeString(raw.brand_name) || getRefName(raw.brand),
  categoryId: toSafeString(raw.category_id ?? raw.categoryId) || getRefId(raw.category),
  categoryName: toSafeString(raw.category_name) || getRefName(raw.category),
  createdAt: toSafeString(raw.created_at ?? raw.createdAt) || null,
  id: toSafeString(raw.product_id ?? raw.id),
  isActive: typeof raw.is_active === "boolean" ? raw.is_active : raw.isActive !== false,
  markupPercentage: toOptionalNumber(raw.markup_percentage ?? raw.markupPercentage),
  measureUnit: toSafeString(raw.measure_unit ?? raw.unit ?? raw.measureUnit) || null,
  name: toSafeString(raw.name, "Unnamed consumable"),
  productType: toSafeString(raw.product_type ?? raw.productType) || null,
  qtyAlert: toSafeNumber(raw.qty_alert ?? raw.qtyAlert),
  retailPrice: toOptionalNumber(raw.retail_price ?? raw.retailPrice),
  status: toSafeString(raw.status) || null,
  supplierId: toSafeString(raw.supplier_id ?? raw.supplierId) || getRefId(raw.supplier),
  supplierName: toSafeString(raw.supplier_name) || getRefName(raw.supplier),
  supplyPrice: toOptionalNumber(raw.supply_price ?? raw.supplyPrice),
  updatedAt: toSafeString(raw.updated_at ?? raw.updatedAt) || null,
});

// Verified live: the array + its pagination sit under `data.list`, not
// flat under `data` — `{ kpis, list: { data: [...], page, pageSize,
// totalRecords, totalPages } }`.
const getConsumableArray = (list: ConsumableDashboardListApiData): ConsumableApiItem[] => list?.data ?? [];

const getKpis = (kpis: ConsumableKpisApiData): ConsumableKpis => ({
  assignedServices: toSafeNumber(kpis?.assigned_services ?? kpis?.assignedServices),
  lowStockCount: toSafeNumber(kpis?.low_stock_items ?? kpis?.lowStockItems),
  outOfStockCount: toSafeNumber(kpis?.out_of_stock_items ?? kpis?.outOfStockItems),
  totalAvailableStock: toSafeNumber(kpis?.total_available_stock ?? kpis?.totalAvailableStock),
  totalConsumables: toSafeNumber(kpis?.total_consumables ?? kpis?.totalConsumables),
});

const getPagination = (
  pagination: PaginationFields,
  query: { limit: number; page: number },
  pageCount: number,
): ConsumableListPagination => {
  const limit = toSafeNumber(pagination?.limit ?? pagination?.pageSize) || query.limit;
  const page = toSafeNumber(pagination?.page) || query.page;
  const totalRecords = toSafeNumber(pagination?.totalRecords ?? pagination?.total_records);
  const totalPages =
    toSafeNumber(pagination?.totalPages ?? pagination?.total_pages) ||
    (totalRecords > 0 ? Math.ceil(totalRecords / Math.max(1, limit)) : 0);
  const hasMore =
    typeof (pagination?.hasMore ?? pagination?.has_more) === "boolean"
      ? Boolean(pagination?.hasMore ?? pagination?.has_more)
      : totalPages > 0
        ? page < totalPages
        : pageCount >= limit;

  return { hasMore, limit, page, totalPages, totalRecords };
};

// Verified live: multi-select filters (`status`, `product_type`) are
// accepted as a single flat, comma-joined param — `status=out_of_stock`
// and `product_type=consumable` both correctly filtered the list.
// `status[]=...` (bracket notation) was tried first and silently ignored
// (no filtering applied), so this is NOT the earlier phase's assumption.
// category_id/brand_id/supplier_id/unit/service_id follow the same
// flat-param convention by analogy — the list/detail responses don't
// surface real category/brand/supplier ids to test against directly, so
// those three remain best-effort.
const buildDashboardParams = (query: ConsumableListQuery, salonId?: string | null) => ({
  limit: query.limit,
  page: query.page,
  sort_by: query.sortBy,
  sort_order: query.sortOrder,
  ...(query.search ? { search: query.search } : {}),
  ...(query.categoryId?.length ? { category_id: query.categoryId.join(",") } : {}),
  ...(query.brandId?.length ? { brand_id: query.brandId.join(",") } : {}),
  ...(query.supplierId?.length ? { supplier_id: query.supplierId.join(",") } : {}),
  ...(query.status?.length ? { status: query.status.join(",") } : {}),
  ...(query.unit?.length ? { unit: query.unit.join(",") } : {}),
  ...(query.serviceId?.length ? { service_id: query.serviceId.join(",") } : {}),
  ...(query.productType?.length ? { product_type: query.productType.join(",") } : {}),
  ...(salonId ? { salon_id: salonId } : {}),
});

const isConsumableDetailEnvelope = (
  payload: ConsumableDetailApiData,
): payload is { consumable?: ConsumableApiItem | null; data?: ConsumableApiItem | null; product?: ConsumableApiItem | null } =>
  Boolean(payload) && typeof payload === "object" && ("consumable" in payload || "data" in payload || "product" in payload);

const getConsumableFromDetailPayload = (payload: ConsumableDetailApiData): ConsumableApiItem => {
  if (isConsumableDetailEnvelope(payload)) {
    return payload.consumable ?? payload.product ?? payload.data ?? {};
  }

  return payload;
};

const normalizeUnitConversion = (raw: ConsumableUnitConversionApiItem): ConsumableUnitConversion => ({
  conversionToBase: toSafeNumber(raw.conversion_to_base ?? raw.conversionToBase),
  unitName: toSafeString(raw.unit_name ?? raw.unitName),
});

// Verified live: the service's display name comes back under `name`
// (assigned-services endpoint and the detail payload's embedded
// assigned_services both use it), not `service_name`.
const normalizeAssignedService = (raw: ConsumableAssignedServiceApiItem): ConsumableAssignedService => ({
  qty: toSafeNumber(raw.qty),
  serviceId: toSafeString(raw.service_id ?? raw.serviceId),
  serviceName: toSafeString(raw.service_name ?? raw.serviceName ?? raw.name, "Service"),
  unit: toSafeString(raw.unit),
});

const getAssignedServiceArray = (payload: ConsumableAssignedServicesApiData): ConsumableAssignedServiceApiItem[] =>
  Array.isArray(payload) ? payload : (payload.data ?? payload.services ?? []);

const getUnitConversionArray = (payload: ConsumableUnitConversionsApiData): ConsumableUnitConversionApiItem[] =>
  Array.isArray(payload) ? payload : (payload.unit_conversions ?? payload.unitConversions ?? payload.data ?? []);

const normalizeUsageHistoryItem = (raw: ConsumableUsageHistoryApiItem): ConsumableUsageHistoryItem => ({
  date: toSafeString(raw.date ?? raw.created_at ?? raw.createdAt) || null,
  direction: toSafeString(raw.direction, "deduct"),
  id: toSafeString(raw.id),
  productId: toSafeString(raw.product_id ?? raw.productId),
  productName: toSafeString(raw.product_name ?? raw.productName, "Consumable"),
  quantity: toSafeNumber(raw.quantity ?? raw.qty),
  serviceId: toSafeString(raw.service_id ?? raw.serviceId) || null,
  serviceName: toSafeString(raw.service_name ?? raw.serviceName) || null,
  source: toSafeString(raw.source) || null,
  staffId: toSafeString(raw.staff_id ?? raw.staffId) || null,
  staffName: toSafeString(raw.staff_name ?? raw.staffName) || null,
  unit: toSafeString(raw.unit),
});

const getUsageHistoryArray = (payload: ConsumableUsageHistoryApiData): ConsumableUsageHistoryApiItem[] =>
  payload.data ?? payload.items ?? payload.rows ?? [];

export const consumableService = {
  async getDashboard(query: ConsumableListQuery, salonId?: string | null): Promise<ConsumableDashboardResponse> {
    const response = await api.get<ConsumableDashboardApiResponse>(CONSUMABLE.DASHBOARD, {
      params: buildDashboardParams(query, salonId),
    });

    const payload = response.data.data ?? {};
    const consumables = getConsumableArray(payload.list ?? null).map(normalizeConsumable);

    return {
      consumables,
      kpis: getKpis(payload.kpis ?? payload.summary ?? null),
      pagination: getPagination(payload.list, query, consumables.length),
      query,
    };
  },

  async getById(id: string): Promise<ConsumableDetail> {
    const response = await api.get<ConsumableDetailApiResponse>(CONSUMABLE.DETAIL(id));
    const raw = getConsumableFromDetailPayload(response.data.data);
    const listItem = normalizeConsumable(raw);
    // ConsumableApiItem's index signature covers these — the detail payload
    // may embed the recipe/config arrays inline alongside the catalog
    // fields, on top of the dedicated assigned-services/unit-conversions
    // endpoints also being fetched separately by the caller.
    const assignedServicesRaw = raw.assignedServices ?? raw.assigned_services;
    const unitConversionsRaw = raw.unitConversions ?? raw.unit_conversions;

    return {
      ...listItem,
      ...(Array.isArray(assignedServicesRaw)
        ? { assignedServices: (assignedServicesRaw as ConsumableAssignedServiceApiItem[]).map(normalizeAssignedService) }
        : {}),
      ...(Array.isArray(unitConversionsRaw)
        ? { unitConversions: (unitConversionsRaw as ConsumableUnitConversionApiItem[]).map(normalizeUnitConversion) }
        : {}),
    };
  },

  // Verified live: a successful adjustment returns `{ data: null, message:
  // "Stock adjusted" }` — the endpoint does not echo the updated
  // consumable, so callers must re-fetch detail/list themselves (already
  // done by adjustConsumableStockThunk).
  async adjustStock(id: string, payload: ConsumableAdjustRequest): Promise<ConsumableAdjustResponse> {
    const response = await api.post<ApiResponse<unknown>>(CONSUMABLE.ADJUST(id), payload);

    return { message: response.data.message };
  },

  async getAssignedServices(id: string): Promise<ConsumableAssignedService[]> {
    const response = await api.get<ApiResponse<ConsumableAssignedServicesApiData>>(CONSUMABLE.ASSIGNED_SERVICES(id));

    return getAssignedServiceArray(response.data.data ?? []).map(normalizeAssignedService);
  },

  async getUnitConversions(id: string): Promise<ConsumableUnitConversionsResponse> {
    const response = await api.get<ApiResponse<ConsumableUnitConversionsApiData>>(CONSUMABLE.UNIT_CONVERSIONS(id));

    return {
      unitConversions: getUnitConversionArray(response.data.data ?? []).map(normalizeUnitConversion),
    };
  },

  async replaceUnitConversions(
    id: string,
    payload: ConsumableUnitConversionsRequest,
  ): Promise<ConsumableUnitConversionsResponse> {
    const response = await api.put<ApiResponse<ConsumableUnitConversionsApiData>>(
      CONSUMABLE.UNIT_CONVERSIONS(id),
      payload,
    );

    return {
      unitConversions: getUnitConversionArray(response.data.data ?? []).map(normalizeUnitConversion),
    };
  },

  async getUsageHistory(query: ConsumableUsageHistoryQuery): Promise<ConsumableUsageHistoryResponse> {
    const response = await api.get<ConsumableUsageHistoryApiResponse>(CONSUMABLE.USAGE_HISTORY, {
      params: {
        limit: query.limit,
        page: query.page,
        ...(query.productId ? { product_id: query.productId } : {}),
        ...(query.direction ? { direction: query.direction } : {}),
        ...(query.from ? { from: query.from } : {}),
        ...(query.to ? { to: query.to } : {}),
      },
    });

    const payload = response.data.data ?? {};
    const items = getUsageHistoryArray(payload).map(normalizeUsageHistoryItem);

    return {
      items,
      // Verified live: page/pageSize/totalRecords/totalPages sit flat on
      // this same object, not under a nested `pagination` key.
      pagination: getPagination(payload, query, items.length),
      query,
    };
  },
};
