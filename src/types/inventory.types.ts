export type StocktakeStatus = "In progress" | "Paused" | "Review" | "Completed" | "Canceled";

export interface Stocktake {
  id: string;
  branch_id: string;
  name: string;
  description: string | null;
  status: StocktakeStatus;
  started_by: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateStocktakePayload {
  branch_id: string;
  name?: string;
  description?: string;
  selection_type?: "all" | "category" | "manual";
}

export interface StockTakeItem {
  product_id: string;
  actual_qty: number;
  notes?: string;
}

export interface ProcessStockTakePayload {
  stocktake_id?: string;
  branch_id: string;
  notes?: string;
  items: StockTakeItem[];
}

export interface StockTakeResult {
  processed: number;
  movements: any[];
}

export interface InventoryResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ─── Supplier ────────────────────────────────────────────────────────────────

export interface Supplier {
  id: string;
  name: string;
  description: string | null;
  first_name: string | null;
  last_name: string | null;
  mobile_country_code: string | null;
  mobile_number: string | null;
  telephone_country_code: string | null;
  telephone_number: string | null;
  email: string | null;
  website: string | null;
  street: string | null;
  suburb: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string | null;
  same_as_physical: boolean;
  postal_street: string | null;
  postal_suburb: string | null;
  postal_city: string | null;
  postal_state: string | null;
  postal_zip_code: string | null;
  postal_country: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierPayload {
  name: string;
  description?: string;
  first_name?: string;
  last_name?: string;
  mobile_country_code?: string;
  mobile_number?: string;
  telephone_country_code?: string;
  telephone_number?: string;
  email?: string;
  website?: string;
  street?: string;
  suburb?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  same_as_physical?: boolean;
  postal_street?: string | null;
  postal_suburb?: string | null;
  postal_city?: string | null;
  postal_state?: string | null;
  postal_zip_code?: string | null;
  postal_country?: string | null;
}

export type UpdateSupplierPayload = Partial<CreateSupplierPayload>;

// ─── Stock Reconciliation ─────────────────────────────────────────────────────

export interface StockReconciliationRow {
  product_id: string;
  category_name: string;
  item_name: string;
  actual_stock: number;
  adjust_stock: number;
  stock_difference: number;
  stock_value: number;
  actual_consumable: number;
  adjust_consumable: number;
  unit: string;
  consumable_difference: number;
  remark: string;
}

export interface StockReconciliationItemPayload {
  product_id: string;
  adjust_stock: number;
  adjust_consumable: number;
  remark?: string;
}

export interface StockReconciliationPayload {
  branch_id: string;
  items: StockReconciliationItemPayload[];
}

export interface StockReconciliationResponse {
  success: boolean;
  message: string;
  data: StockReconciliationRow[];
}

// ─── Consumable Usage (from Calendar/Appointments) ───────────────────────────

export interface ConsumableUsageItem {
  product_id: string;
  product_name: string;
  qty: number;
  unit: string;
}

export interface ConsumableUsagePayload {
  branch_id: string;
  booking_id?: string;
  service_id?: string;
  items: ConsumableUsageItem[];
}

// ─── Consumable Inventory (dedicated module) ─────────────────────────────────

export type ConsumableStatus = "healthy" | "low" | "out_of_stock";

export interface ConsumableListFilters {
  search?: string;
  category_id?: string;
  brand_id?: string;
  supplier_id?: string;
  status?: ConsumableStatus | "all";
  unit?: string;
  service_id?: string;
  sort_by?: "newest" | "lowest_stock" | "most_used" | "a_z";
  page?: number;
  limit?: number;
}

export interface ConsumableListRow {
  product_id: string;
  name: string;
  category_name: string | null;
  brand_name: string | null;
  supplier_name: string | null;
  unit: string;
  unit_size: number | null;
  product_qty: number;
  total_stock: number;
  remaining_stock: number;
  qty_alert: number | null;
  used_today: number;
  used_this_month: number;
  assigned_services_count: number;
  last_used_at: string | null;
  status: ConsumableStatus;
}

export interface ConsumableKpis {
  total_consumables: number;
  total_available_stock: number;
  low_stock_items: number;
  assigned_services: number;
}

export interface UnitConversion {
  id: string;
  unit_name: string;
  conversion_to_base: number;
}

export interface AssignedServiceRow {
  service_id: string;
  name: string;
  qty: number;
  unit: string | null;
}

export interface RecentConsumptionRow {
  date: string;
  service_name: string | null;
  staff_name: string | null;
  qty: number;
  direction: "deduct" | "return";
}

export interface ConsumableUsageStats {
  used_today: number;
  used_this_week: number;
  used_this_month: number;
  average_per_service: number;
  estimated_services_remaining: number | null;
}

export interface ConsumableDetail extends ConsumableListRow {
  bottle_size: number | null;
  supply_price: number | null;
  measure_unit: string;
  is_active: boolean;
  usage_stats: ConsumableUsageStats;
  assigned_services: AssignedServiceRow[];
  recent_consumption: RecentConsumptionRow[];
  stock_timeline: { label: string; remaining: number }[];
  unit_conversions: UnitConversion[];
}

export type AdjustStockReason = "purchase" | "damage" | "expired" | "manual_correction";

export interface AdjustStockPayload {
  direction: "increase" | "decrease";
  qty: number;
  reason: AdjustStockReason;
  note?: string;
  branch_id?: string;
}

export interface UsageHistoryFilters {
  product_id?: string;
  service_id?: string;
  direction?: "deduct" | "return";
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface UsageHistoryRow {
  id: string;
  date: string;
  product_id: string;
  product_name: string;
  unit: string | null;
  service_name: string | null;
  staff_name: string | null;
  qty: number;
  direction: "deduct" | "return";
  source: string | null;
}
