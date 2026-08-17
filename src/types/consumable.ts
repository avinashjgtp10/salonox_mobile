// Shared Consumable recipe types. A Service's recipe (`consumables_used`) is
// embedded directly in Service API responses/requests — there is no
// dedicated Consumables endpoint yet, so these types are consumed by
// service.ts, appointment.ts, and quickSale/types.ts rather than owning a
// service layer of their own.

export type ConsumableRecipeApiItem = {
  product_id?: string | number | null;
  qty?: number | string | null;
  unit?: string | null;
};

export type ConsumableRecipeItem = {
  productId: string;
  qty: number;
  unit: string;
};

export type ConsumableRecipeRequestItem = {
  product_id: string;
  qty: number;
  unit: string;
};

// Extends the standard recipe quantity with an optional staff-editable
// override, used once appointments/cart lines start carrying consumables.
export type ConsumableUsageItem = ConsumableRecipeItem & {
  actualQty?: number;
};

// ============================================================================
// Consumable Inventory (dashboard/list/detail/adjust/usage-history).
//
// This is a distinct concern from the recipe types above: those describe how
// much of a product a *service* consumes; everything below describes the
// product's own stock record — its current quantity, low-stock threshold,
// unit conversions, and adjustment/usage audit trail. Backed by
// GET/POST /inventory/consumables/* rather than the plain /products CRUD
// endpoints, because it returns richer inventory-specific data (KPIs,
// assigned services, usage history) that the retail Product screens don't
// need — see consumable.service.ts.
// ============================================================================

export type ConsumableSortBy = "name" | "amount" | "qty_alert" | "created_at" | "updated_at";

export type ConsumableStatusFilter = "active" | "inactive" | "low_stock" | "out_of_stock";

export type ConsumableListQuery = {
  brandId?: string[];
  categoryId?: string[];
  limit: number;
  page: number;
  productType?: string[];
  search: string;
  serviceId?: string[];
  sortBy: ConsumableSortBy;
  sortOrder: "asc" | "desc";
  status?: ConsumableStatusFilter[];
  supplierId?: string[];
  unit?: string[];
};

export type ConsumableRefApiItem = {
  _id?: string | number | null;
  id?: string | number | null;
  name?: string | null;
  [key: string]: unknown;
};

// Verified against the live dev backend (2026-08-17): the dashboard/detail
// endpoints are consistently snake_case and use several field names that
// differ from what earlier phases assumed (id is `product_id`, current stock
// is `remaining_stock` not `amount`, unit/bottle size appear under both a
// short (`unit`, `unit_size` — list) and long (`measure_unit`, `bottle_size`
// — detail) key depending on which endpoint responded). camelCase fallbacks
// are kept only as defensive padding in case a future backend revision adds
// them; they were not observed live.
export type ConsumableApiItem = {
  amount?: number | string | null;
  bottle_size?: number | string | null;
  bottleSize?: number | string | null;
  brand?: ConsumableRefApiItem | string | null;
  brand_id?: string | number | null;
  brandId?: string | number | null;
  brand_name?: string | null;
  category?: ConsumableRefApiItem | string | null;
  category_id?: string | number | null;
  categoryId?: string | number | null;
  category_name?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
  id?: string | number | null;
  is_active?: boolean | null;
  isActive?: boolean | null;
  markup_percentage?: number | string | null;
  markupPercentage?: number | string | null;
  measure_unit?: string | null;
  measureUnit?: string | null;
  name?: string | null;
  product_id?: string | number | null;
  product_type?: string | null;
  productType?: string | null;
  qty_alert?: number | string | null;
  qtyAlert?: number | string | null;
  remaining_stock?: number | string | null;
  retail_price?: number | string | null;
  retailPrice?: number | string | null;
  status?: string | null;
  supplier?: ConsumableRefApiItem | string | null;
  supplier_id?: string | number | null;
  supplierId?: string | number | null;
  supplier_name?: string | null;
  supply_price?: number | string | null;
  supplyPrice?: number | string | null;
  unit?: string | null;
  unit_size?: number | string | null;
  updated_at?: string | null;
  updatedAt?: string | null;
  [key: string]: unknown;
};

export type ConsumableListItem = {
  amount: number;
  bottleSize: number | null;
  brandId: string | null;
  brandName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  createdAt: string | null;
  id: string;
  isActive: boolean;
  markupPercentage: number | null;
  measureUnit: string | null;
  name: string;
  productType: string | null;
  qtyAlert: number;
  retailPrice: number | null;
  // Backend-computed ("healthy" / "low_stock" / "out_of_stock" observed
  // live) — preferred over re-deriving low/out-of-stock state from
  // amount vs qtyAlert on the client, per the project's "don't duplicate
  // backend stock logic" convention. Falls back to client derivation only
  // when absent.
  status: string | null;
  supplierId: string | null;
  supplierName: string | null;
  supplyPrice: number | null;
  updatedAt: string | null;
};

// Verified live: dashboard KPIs are `{ total_consumables,
// total_available_stock, low_stock_items, out_of_stock_items,
// assigned_services }`. Earlier phases guessed `total_stock_value` (a
// currency figure) — that field does not exist; `total_available_stock` is
// a plain summed quantity across mixed units, not money.
export type ConsumableKpisApiData = {
  assigned_services?: number | string | null;
  assignedServices?: number | string | null;
  low_stock_items?: number | string | null;
  lowStockItems?: number | string | null;
  out_of_stock_items?: number | string | null;
  outOfStockItems?: number | string | null;
  total_available_stock?: number | string | null;
  totalAvailableStock?: number | string | null;
  total_consumables?: number | string | null;
  totalConsumables?: number | string | null;
  [key: string]: unknown;
} | null;

export type ConsumableKpis = {
  assignedServices: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalAvailableStock: number;
  totalConsumables: number;
};

export type ConsumablePaginationApiData = {
  hasMore?: boolean | null;
  has_more?: boolean | null;
  limit?: number | string | null;
  page?: number | string | null;
  pageSize?: number | string | null;
  totalPages?: number | string | null;
  total_pages?: number | string | null;
  totalRecords?: number | string | null;
  total_records?: number | string | null;
} | null;

export type ConsumableListPagination = {
  hasMore: boolean;
  limit: number;
  page: number;
  totalPages: number;
  totalRecords: number;
};

// Verified live shape: `{ kpis: {...}, list: { data: [...], page,
// pageSize, totalRecords, totalPages } }` — the list array and its
// pagination fields are nested one level under `list`, not flat under
// `data` as earlier phases assumed, and there is no `pagination` wrapper
// object (page/pageSize/totalRecords/totalPages sit directly on `list`).
export type ConsumableDashboardListApiData = {
  data?: ConsumableApiItem[] | null;
  hasMore?: boolean | null;
  has_more?: boolean | null;
  limit?: number | string | null;
  page?: number | string | null;
  pageSize?: number | string | null;
  totalPages?: number | string | null;
  total_pages?: number | string | null;
  totalRecords?: number | string | null;
  total_records?: number | string | null;
} | null;

export type ConsumableDashboardApiData = {
  kpis?: ConsumableKpisApiData;
  list?: ConsumableDashboardListApiData;
  summary?: ConsumableKpisApiData;
};

export type ConsumableDashboardResponse = {
  consumables: ConsumableListItem[];
  kpis: ConsumableKpis;
  pagination: ConsumableListPagination;
  query: ConsumableListQuery;
};

export type ConsumableUnitConversionApiItem = {
  conversion_to_base?: number | string | null;
  conversionToBase?: number | string | null;
  // The PUT response echoes back a generated row id — not currently used
  // by Mobile (rows are keyed by unitName), kept here for completeness.
  id?: string | number | null;
  unit_name?: string | null;
  unitName?: string | null;
};

export type ConsumableUnitConversion = {
  conversionToBase: number;
  unitName: string;
};

// Verified live: the service's display name comes back under `name`, not
// `service_name` — earlier phases guessed wrong here.
export type ConsumableAssignedServiceApiItem = {
  name?: string | null;
  qty?: number | string | null;
  service_id?: string | number | null;
  serviceId?: string | number | null;
  service_name?: string | null;
  serviceName?: string | null;
  unit?: string | null;
};

export type ConsumableAssignedService = {
  qty: number;
  serviceId: string;
  serviceName: string;
  unit: string;
};

export type ConsumableDetailApiData =
  | ConsumableApiItem
  | {
      consumable?: ConsumableApiItem | null;
      data?: ConsumableApiItem | null;
      product?: ConsumableApiItem | null;
    };

export type ConsumableDetail = ConsumableListItem & {
  assignedServices?: ConsumableAssignedService[];
  unitConversions?: ConsumableUnitConversion[];
};

// Manual stock correction (Adjust Stock action) — distinct from the
// deduct/return vocabulary used by usage history below, which records
// automatic point-of-sale consumption rather than a staff-entered
// correction.
//
// Verified live against the real validator (2026-08-17):
//   - direction: confirmed "increase" | "decrease" (backend error message:
//     "direction must be 'increase' or 'decrease'").
//   - reason: NOT free text — a fixed enum, confirmed by the backend's own
//     validation error: "reason must be one of: purchase, damage, expired,
//     manual_correction". Earlier phases wrongly assumed free text.
//   - qty: confirmed "qty must be a positive number" (matches existing
//     Mobile validation).
//   - note/branch_id: confirmed optional — a request without either field
//     succeeded.
export type ConsumableAdjustDirection = "increase" | "decrease";

export type ConsumableAdjustReason = "purchase" | "damage" | "expired" | "manual_correction";

export type ConsumableAdjustRequest = {
  branch_id?: string;
  direction: ConsumableAdjustDirection;
  note?: string;
  qty: number;
  reason: ConsumableAdjustReason;
};

// Verified live: the success response is `{ success: true, data: null,
// message: "Stock adjusted" }` — the endpoint does NOT return the updated
// consumable. Callers must re-fetch detail/list separately (already done by
// adjustConsumableStockThunk).
export type ConsumableAdjustResponse = {
  message?: string;
};

export type ConsumableUnitConversionsResponse = {
  unitConversions: ConsumableUnitConversion[];
};

export type ConsumableUnitConversionRequestItem = {
  conversion_to_base: number;
  unit_name: string;
};

export type ConsumableUnitConversionsRequest = {
  unit_conversions: ConsumableUnitConversionRequestItem[];
};

// Automatic usage recorded when an appointment's first payment deducts (or a
// refund/cancellation returns) recipe consumables — see Phase 2's
// services[].consumables[] payload. Mobile never writes to this; it's a
// read-only audit trail.
export type ConsumableUsageDirection = "deduct" | "return";

export type ConsumableUsageHistoryQuery = {
  direction?: ConsumableUsageDirection;
  from?: string;
  limit: number;
  page: number;
  productId?: string;
  to?: string;
};

export type ConsumableUsageHistoryApiItem = {
  created_at?: string | null;
  createdAt?: string | null;
  date?: string | null;
  direction?: string | null;
  id?: string | number | null;
  product_id?: string | number | null;
  productId?: string | number | null;
  product_name?: string | null;
  productName?: string | null;
  quantity?: number | string | null;
  qty?: number | string | null;
  service_id?: string | number | null;
  serviceId?: string | number | null;
  service_name?: string | null;
  serviceName?: string | null;
  source?: string | null;
  staff_id?: string | number | null;
  staffId?: string | number | null;
  staff_name?: string | null;
  staffName?: string | null;
  unit?: string | null;
};

export type ConsumableUsageHistoryItem = {
  date: string | null;
  direction: ConsumableUsageDirection | string;
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  serviceId: string | null;
  serviceName: string | null;
  source: string | null;
  staffId: string | null;
  staffName: string | null;
  unit: string;
};

// Verified live: `{ data: [...], page, pageSize, totalRecords, totalPages }`
// — pagination fields are flat siblings of `data`, no `pagination` wrapper
// (same shape as the dashboard's `list` block).
export type ConsumableUsageHistoryApiData = {
  data?: ConsumableUsageHistoryApiItem[] | null;
  hasMore?: boolean | null;
  has_more?: boolean | null;
  items?: ConsumableUsageHistoryApiItem[] | null;
  limit?: number | string | null;
  page?: number | string | null;
  pageSize?: number | string | null;
  rows?: ConsumableUsageHistoryApiItem[] | null;
  totalPages?: number | string | null;
  total_pages?: number | string | null;
  totalRecords?: number | string | null;
  total_records?: number | string | null;
};

export type ConsumableUsageHistoryResponse = {
  items: ConsumableUsageHistoryItem[];
  pagination: ConsumableListPagination;
  query: ConsumableUsageHistoryQuery;
};
