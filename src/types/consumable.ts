
export type ConsumableRecipeApiItem = {
  product_id?: string | number | null;
  product_name?: string | null;
  qty?: number | string | null;
  unit?: string | null;
};

export type ConsumableRecipeItem = {
  productId: string;
  productName?: string;
  qty: number;
  unit: string;
};

export type ConsumableRecipeRequestItem = {
  product_id: string;
  qty: number;
  unit: string;
};

export type ConsumableUsageItem = ConsumableRecipeItem & {
  actualQty?: number;
};

export type ConsumableUsageRequestItem = ConsumableRecipeRequestItem & {
  actual_qty?: number;
};

export type ConsumableUsageApiItem = ConsumableRecipeApiItem & {
  actual_qty?: number | string | null;
};


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
  status: string | null;
  supplierId: string | null;
  supplierName: string | null;
  supplyPrice: number | null;
  updatedAt: string | null;
};

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
  id?: string | number | null;
  unit_name?: string | null;
  unitName?: string | null;
};

export type ConsumableUnitConversion = {
  conversionToBase: number;
  unitName: string;
};

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

export type ConsumableAdjustDirection = "increase" | "decrease";

export type ConsumableAdjustReason = "purchase" | "damage" | "expired" | "manual_correction";

export type ConsumableAdjustRequest = {
  branch_id?: string;
  direction: ConsumableAdjustDirection;
  note?: string;
  qty: number;
  reason: ConsumableAdjustReason;
};

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
