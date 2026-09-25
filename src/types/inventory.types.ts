export interface InventoryResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ─── Supplier ────────────────────────────────────────────────────────────────

export type SupplierType = "product" | "consumable" | "both";

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
  is_active: boolean;
  // Supplier Master fields — populated by the current Add Supplier form.
  supplier_code: string | null;
  supplier_type: SupplierType;
  contact_person: string | null;
  address: string | null;
  gstin: string | null;
  pan: string | null;
  business_registration_number: string | null;
  payment_terms_days: number;
  credit_limit: number;
  bank_account_holder_name: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_ifsc_code: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Only what the current Add Supplier form actually collects — supplier_code
// is server-generated, never sent from the client.
export interface CreateSupplierPayload {
  name: string;
  supplier_type?: SupplierType;
  contact_person?: string;
  mobile_number?: string;
  mobile_country_code?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  gstin?: string;
  pan?: string;
  business_registration_number?: string;
  payment_terms_days?: number;
  credit_limit?: number;
  bank_account_holder_name?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_ifsc_code?: string;
  notes?: string;
  is_active?: boolean;
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
  // Operationally open (Sent/Partially Received) orders — different from
  // pending_order_count above (unpaid-balance orders). Powers the Suppliers
  // list's "Open Orders" column.
  open_order_count: number;
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

// ─── Product Audit ────────────────────────────────────────────────────────────
// Count physical stock against system quantities and reconcile differences.
// Read-only against real stock right up until approval — Approve is the
// moment the physical count becomes the official stock: the backend applies
// every item's variance to products.amount and writes matching Stock Ledger
// entries atomically with the status flip. See
// product-audit.repository.ts#approveWithAdjustments on the backend.

export type ProductAuditStatus = "in_progress" | "pending_review" | "complete" | "rejected";

export interface ProductAuditItem {
  id: string;
  audit_id: string;
  product_id: string;
  product_name: string;
  sku: string | null;
  measure_unit: string | null;
  category: string | null;
  system_qty: number;
  physical_qty: number | null;
  reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductAuditHistoryEntry {
  id: string;
  audit_id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  note: string | null;
  created_at: string;
}

export interface ProductAudit {
  id: string;
  salon_id: string;
  branch_id: string;
  name: string;
  notes: string | null;
  status: ProductAuditStatus;
  auditor_id: string;
  auditor_name: string | null;
  reviewer_id: string | null;
  reviewer_name: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductAuditWithDetail extends ProductAudit {
  items: ProductAuditItem[];
  history: ProductAuditHistoryEntry[];
}

export interface ProductAuditListRow extends ProductAudit {
  item_count: number;
  diff_count: number;
}

export interface ListProductAuditsFilters {
  branch_id?: string;
  status?: ProductAuditStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateProductAuditPayload {
  branch_id: string;
  name: string;
  notes?: string;
  /** Defaults server-side to the creating user when omitted. */
  auditor_id?: string;
}

export interface UpdateAuditItemPayload {
  physical_qty: number | null;
  reason?: string | null;
}

export interface SubmitAuditItemUpdate {
  item_id: string;
  physical_qty: number | null;
  reason?: string | null;
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
  /** Set on a deduction once reverted — null means it is still revertable. */
  reverted_at: string | null;
  /** Set on a 'return' row that reverses a deduction; points at that deduction. */
  reverts_usage_id: string | null;
  /** Live products.amount, shown in the revert confirmation dialog. */
  current_stock: number;
  /** Server-computed: a deduction that has not already been undone. */
  can_revert: boolean;
}

// ─── Orders (Purchase Orders) ────────────────────────────────────────────────
// Creating an order never touches stock by itself — it's a document. Stock
// only moves once it's Received (receiveOrderThunk), which records a linked
// Purchase the same way the standalone Product Inventory "Purchase" flow does.

export type OrderTaxType = "inclusive" | "exclusive";
export type OrderStatus = "draft" | "sent" | "partially_received" | "received" | "cancelled";

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
  received_qty: number;
  // Cumulative confirmed-damaged total — set only via a confirmed
  // OrderReceipt (see below). received_qty + damaged_qty never exceeds qty.
  damaged_qty: number;
  batch_number?: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  salon_id: string;
  order_number: string;
  status: OrderStatus;
  supplier_id: string;
  supplier_name?: string;
  delivery_address: string | null;
  delivery_instructions: string | null;
  order_date: string;
  remark: string | null;
  ref_number: string | null;
  payment_terms_days: number | null;
  delivery_date: string | null;
  tax_type: OrderTaxType;
  tax_group: string | null;
  terms_conditions: string | null;
  signature_url: string | null;
  shipping_cost: number;
  total_quantity: number;
  total_price: number;
  created_by: string | null;
  // Set when "Confirm Order" is clicked on a "sent" order — gates whether it
  // shows on the Verify Order list before anything's actually been received.
  verification_started_at: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  // Derived server-side (ordersRepository.getById) from the Purchase(s)
  // created when this order was received — not stored on the order itself.
  // "unpaid" covers both a not-yet-received order and a received-but-
  // nothing-paid one.
  paid_amount?: number;
  pending_amount?: number;
  bill_payment_status?: "paid" | "partial" | "unpaid";
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
  status?: "draft" | "sent";
  supplier_id: string;
  delivery_address?: string;
  delivery_instructions?: string;
  order_date?: string;
  remark?: string;
  ref_number?: string;
  payment_terms_days?: number;
  delivery_date?: string;
  tax_type: OrderTaxType;
  tax_group?: string;
  tax_rate?: number;
  terms_conditions?: string;
  signature_url?: string;
  shipping_cost?: number;
  items: CreateOrderItemPayload[];
}

export interface ReceiveOrderItemPayload {
  order_item_id: string;
  received_qty: number;
  batch_number?: string;
}

export interface ReceiveOrderPayload {
  items: ReceiveOrderItemPayload[];
  purchase_date?: string;
}

// New running total for the line, not a delta (unlike ReceiveOrderItemPayload).
export interface CorrectReceivedQtyPayload {
  received_qty: number;
}

export interface OrderSignature {
  id: string;
  salon_id: string;
  url: string;
  created_by: string | null;
  created_at: string;
}

// ─── Order Receiving (draft -> confirm) ──────────────────────────────────────
// Replaces the old single-shot Receive modal: a receipt lets a clerk enter
// Confirmed/Damaged quantities per line, pick a Receiving Location (branch)
// and Received By (staff), and Save Draft with zero stock effect. Only
// Confirm Receiving moves stock. See OrderReceiptsTab.tsx.

export type OrderReceiptStatus = "draft" | "confirmed";

export interface OrderReceiptItem {
  id: string;
  order_receipt_id: string;
  order_item_id: string;
  product_id: string;
  product_name?: string;
  // Absolute cumulative targets (not deltas) — defaults to the order item's
  // current received_qty/damaged_qty when the draft is first created.
  confirmed_qty: number;
  damaged_qty: number;
  created_at: string;
  updated_at: string;
}

export interface OrderReceipt {
  id: string;
  salon_id: string;
  order_id: string;
  branch_id: string | null;
  branch_name?: string | null;
  received_by: string | null;
  received_by_name?: string | null;
  status: OrderReceiptStatus;
  created_by: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderReceiptWithItems extends OrderReceipt {
  items: OrderReceiptItem[];
}

export interface UpsertReceiptItemPayload {
  order_item_id: string;
  confirmed_qty: number;
  damaged_qty: number;
}

export interface SaveReceiptDraftPayload {
  branch_id?: string | null;
  received_by?: string | null;
  items?: UpsertReceiptItemPayload[];
}

export interface ConfirmReceiptPayload {
  purchase_date?: string;
}

// ─── Supplier Products Catalog ───────────────────────────────────────────────
// A supplier's imported product list (Excel/CSV), matched against the
// salon's own products where possible. "matched" rows are addable to a New
// Order as Suggested Products; "unmatched" rows need a manual resolve
// (link/create_product/ignore) before they can be added.

export type SupplierProductMatchStatus = "matched" | "unmatched";

export interface SupplierProduct {
  id: string;
  salon_id: string;
  supplier_id: string;
  product_id: string | null;
  linked_product_name?: string | null;
  name: string;
  barcode: string | null;
  brand_id: string | null;
  brand_name?: string | null;
  category_id: string | null;
  category_name?: string | null;
  supplier_sku: string | null;
  price: number | null;
  hsn_sac: string | null;
  match_status: SupplierProductMatchStatus;
  ignored: boolean;
  created_at: string;
  updated_at: string;
}

export type ResolveSupplierProductAction = "link" | "create_product" | "ignore";

export interface ResolveSupplierProductPayload {
  action: ResolveSupplierProductAction;
  product_id?: string;
}

export interface SupplierProductImportIssue {
  row: number;
  name?: string;
  status: "failed";
  reason: string;
}

export interface SupplierCatalogImportResult {
  total: number;
  matched: number;
  unmatched: number;
  updated: number;
  failed: number;
  issues: SupplierProductImportIssue[];
}

// ─── Product Suppliers (multi-supplier pricing per product) ─────────────────
// Additive alongside products.supplier_id/supply_price, which stay "the
// preferred/default supplier" for every existing reader of those columns.

export interface ProductSupplierMapping {
  id: string;
  salon_id: string;
  product_id: string;
  supplier_id: string;
  supplier_name?: string;
  supplier_sku: string | null;
  price: number | null;
  is_preferred: boolean;
  created_at: string;
  updated_at: string;
}

export interface AddProductSupplierPayload {
  supplier_id: string;
  supplier_sku?: string;
  price?: number;
  is_preferred?: boolean;
}

export type UpdateProductSupplierPayload = Partial<Omit<AddProductSupplierPayload, "supplier_id">>;

// ─── Product Inventory detail drawer ─────────────────────────────────────────

export interface ProductDetailAggregate {
  row: {
    id: string; name: string; sku: string | null; barcode: string | null;
    category: string | null; supplier: string | null; measure_unit: string | null;
    bottle_size: number | null; amount: number; stock: number;
    retail_price: number | null; supply_price: number | null;
    expiry_date: string | null; status: string; last_updated: string | null;
  };
  on_order: number;
  last_purchase_price: number | null;
  suppliers: ProductSupplierMapping[];
}

export interface StockLedgerTimelineEntry {
  id: string;
  created_at: string;
  transaction_type: string;
  reference: string | null;
  quantity: number;
  unit_cost: string | null;
  balance_after: number;
  reason: string | null;
  notes: string | null;
  supplier_name: string | null;
  created_by_name: string | null;
}

export interface ProductPurchaseHistoryRow {
  id: string;
  purchase_number: string;
  purchase_date: string;
  supplier_name: string | null;
  item_count: number;
  total_amount: number;
}
