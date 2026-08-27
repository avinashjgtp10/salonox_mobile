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

export type SupplierPaymentStatus = "paid" | "due" | "overdue";

export type PayoutMethod = "cash" | "upi" | "bank_transfer" | "cheque" | "card" | "other";

// Superset returned by GET /suppliers once the backend adds balance
// tracking — same endpoint, extra fields, so this stays assignable
// wherever a plain Supplier is expected.
export interface SupplierWithBalance extends Supplier {
  total_purchase_amount: number;
  pending_order_count: number;
  due_amount: number;
  due_date: string | null;
  status: SupplierPaymentStatus;
}

export interface SupplierOrderRow {
  id: string;
  purchase_number: string;
  supplier_id: string;
  purchase_date: string;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  payment_status: SupplierPaymentStatus;
  item_count: number;
}

export interface SupplierPayment {
  id: string;
  supplier_id: string;
  amount: number;
  payment_date: string;
  payment_method: PayoutMethod;
  note: string | null;
  running_balance_after: number;
  created_at: string;
}

export interface CreateSupplierPaymentPayload {
  amount: number;
  payment_date: string;
  payment_method: PayoutMethod;
  note?: string;
}

// ─── Back-bar consumption totals (Consumable Usage report) ───────────────────
// Read-only now: the editable Stock Reconciliation page these were shaped for
// has been removed, and only the report reads this endpoint.

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

// ─── Consumable Inventory (dedicated module) ─────────────────────────────────

export type ConsumableStatus = "healthy" | "low" | "out_of_stock" | "deactivated";

// Every filter below is multi-select (Jira-style filter panel on the
// Consumable Inventory page) — array of 1+ values, absent/empty means no
// restriction. Serialized as a comma-joined string per field when sent to
// the API (see fetchConsumablesThunk) — the backend splits it back apart.
export interface ConsumableListFilters {
  search?: string;
  category_id?: string[];
  brand_id?: string[];
  supplier_id?: string[];
  status?: ConsumableStatus[];
  unit?: string[];
  service_id?: string[];
  product_type?: ("consumable" | "both")[];
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
  low_stock_items: number;
  out_of_stock_items: number;
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
  supply_price: number | null;
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

// ─── Orders (Purchase Orders — a document only, no stock movement) ──────────
// Deliberately separate from Purchase (PRODUCT_INVENTORY_PURCHASES), which
// records a delivery and adds stock immediately. An Order precedes that.

export type OrderTaxType = "inclusive" | "exclusive";

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name?: string;
  product_code: string | null;
  qty: number;
  selling_price: number;
  discount_percent: number;
  cost_price: number;
  cost_wo_tax: number;
  total_cost_wo_tax: number;
  total_tax: number;
  created_at: string;
}

export interface Order {
  id: string;
  salon_id: string;
  order_number: string;
  supplier_id: string;
  supplier_name?: string;
  bill_to_branch_id: string | null;
  ship_to_branch_id: string | null;
  order_date: string;
  remark: string | null;
  ref_number: string | null;
  payment_terms_days: number | null;
  shipment_date: string | null;
  delivery_date: string | null;
  tax_type: OrderTaxType;
  tax_group: string | null;
  terms_conditions: string | null;
  signature_url: string | null;
  total_quantity: number;
  total_price: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface CreateOrderItemPayload {
  product_id: string;
  product_code?: string;
  qty: number;
  selling_price: number;
  discount_percent?: number;
  cost_price: number;
}

export interface CreateOrderPayload {
  supplier_id: string;
  bill_to_branch_id?: string;
  ship_to_branch_id?: string;
  order_date?: string;
  remark?: string;
  ref_number?: string;
  payment_terms_days?: number;
  shipment_date?: string;
  delivery_date?: string;
  tax_type: OrderTaxType;
  tax_group?: string;
  tax_rate?: number;
  terms_conditions?: string;
  signature_url?: string;
  items: CreateOrderItemPayload[];
}

export interface OrderSignature {
  id: string;
  salon_id: string;
  url: string;
  created_by: string | null;
  created_at: string;
}
