import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { INVENTORY } from "../../services/api/endpoints/inventory.endpoints";
import type { RootState } from "../../store/store";
import type {
  InventoryResponse,
  Supplier,
  SupplierWithBalance,
  CreateSupplierPayload,
  UpdateSupplierPayload,
  CreateSupplierPaymentPayload,
  SupplierPayment,
  Order,
  CreateOrderPayload,
  OrderSignature,
  SupplierProduct,
  ResolveSupplierProductPayload,
  ProductSupplierMapping,
  AddProductSupplierPayload,
  UpdateProductSupplierPayload,
  ProductDetailAggregate,
  StockLedgerTimelineEntry,
  ProductPurchaseHistoryRow,
  ConsumableListFilters,
  ConsumableListRow,
  ConsumableKpis,
  ConsumableDetail,
  AdjustStockPayload,
  UsageHistoryFilters,
  UsageHistoryRow,
  ProductAuditWithDetail,
  ProductAuditListRow,
  ListProductAuditsFilters,
  CreateProductAuditPayload,
  UpdateAuditItemPayload,
  SubmitAuditItemUpdate,
} from "../../types/inventory.types";

// ─── Fetch suppliers (paginated) ───────────────────────────────────────────────
export interface FetchSuppliersParams {
  page?: number;
  page_limit?: number;
  search?: string;
  city?: string;
  state?: string;
}

export interface FetchSuppliersResult {
  data: SupplierWithBalance[];
  total: number;
  page: number;
  page_limit: number;
}

// POST, not GET — real server-side pagination (COUNT + LIMIT/OFFSET) so the
// list page stops loading every supplier at once and paginating client-side.
// salon_id is sent in the body to match the documented request shape, but
// the backend derives the real scoping salon from the auth token regardless
// (see inventory.controller.ts's listPost) — this is never what actually
// secures the query.
export const fetchSuppliersThunk = createAsyncThunk<
  FetchSuppliersResult,
  FetchSuppliersParams | void,
  { state: RootState; rejectValue: string }
>("inventory/fetchSuppliers", async (params, { getState, rejectWithValue }) => {
  try {
    const salonId = getState().salon?.currentSalon?.id;
    const page = params?.page ?? 1;
    const page_limit = params?.page_limit ?? 10;
    const res = await api.post<InventoryResponse<{ data: SupplierWithBalance[]; total: number }>>(
      INVENTORY.SUPPLIERS_LIST,
      {
        salon_id: salonId,
        page,
        page_limit,
        search: params?.search || undefined,
        city: params?.city || undefined,
        state: params?.state || undefined,
      },
    );
    return { data: res.data.data.data, total: res.data.data.total, page, page_limit };
  } catch (err: any) {
    console.error("fetchSuppliersThunk error:", err);
    return rejectWithValue(err?.response?.data?.error?.message || "Failed to fetch suppliers");
  }
});

// ─── Fetch one supplier by id ───────────────────────────────────────────────────
// Used by AddSupplierPage's edit-mode prefill and SupplierDetailPage — with
// the list now paginated (fetchSuppliersThunk only ever loads one page), a
// specific supplier is no longer guaranteed to already be sitting in the
// store the way it was when the list loaded everything at once.
// GET /suppliers/:id already returns the same balance fields (status,
// due_amount, etc.) as the list endpoint — see suppliersService.getById.
export const fetchSupplierByIdThunk = createAsyncThunk<
  SupplierWithBalance,
  string,
  { rejectValue: string }
>("inventory/fetchSupplierById", async (id, { rejectWithValue }) => {
  try {
    const res = await api.get<InventoryResponse<SupplierWithBalance>>(INVENTORY.SUPPLIER_BY_ID(id));
    return res.data.data;
  } catch (err: any) {
    return rejectWithValue(err?.response?.data?.error?.message || "Failed to fetch supplier");
  }
});

// ─── Supplier filter options (City/State dropdown) ─────────────────────────────
// Distinct across every supplier, independent of whichever page is loaded —
// see inventory.repository.ts's listDistinctLocations for why this can't
// just be derived from the currently-loaded page anymore.
export const fetchSupplierFilterOptionsThunk = createAsyncThunk<
  { cities: string[]; states: string[] },
  void,
  { rejectValue: string }
>("inventory/fetchSupplierFilterOptions", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get<InventoryResponse<{ cities: string[]; states: string[] }>>(INVENTORY.SUPPLIER_FILTER_OPTIONS);
    return res.data.data;
  } catch (err: any) {
    return rejectWithValue(err?.response?.data?.error?.message || "Failed to fetch supplier filter options");
  }
});

// ─── Create a supplier ────────────────────────────────────────────────────────
export const createSupplierThunk = createAsyncThunk<
  Supplier,
  CreateSupplierPayload,
  { rejectValue: string }
>("inventory/createSupplier", async (payload, { rejectWithValue }) => {
  try {
    const res = await api.post<InventoryResponse<Supplier>>(INVENTORY.SUPPLIERS, payload);
    return res.data.data;
  } catch (err: any) {
    console.error("createSupplierThunk error:", err);
    return rejectWithValue(err?.response?.data?.error?.message || "Failed to create supplier");
  }
});

// ─── Update a supplier ────────────────────────────────────────────────────────
export const updateSupplierThunk = createAsyncThunk<
  Supplier,
  { id: string; data: UpdateSupplierPayload },
  { rejectValue: string }
>("inventory/updateSupplier", async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.patch<InventoryResponse<Supplier>>(INVENTORY.SUPPLIER_BY_ID(id), data);
    return res.data.data;
  } catch (err: any) {
    console.error("updateSupplierThunk error:", err);
    return rejectWithValue(err?.response?.data?.error?.message || "Failed to update supplier");
  }
});

// ─── Delete a supplier ────────────────────────────────────────────────────────
export const deleteSupplierThunk = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>("inventory/deleteSupplier", async (id, { rejectWithValue }) => {
  try {
    await api.delete(INVENTORY.SUPPLIER_BY_ID(id));
    return id;
  } catch (err: any) {
    console.error("deleteSupplierThunk error:", err);
    return rejectWithValue(err?.response?.data?.error?.message || "Failed to delete supplier");
  }
});

// ─── Create a supplier payout/payment ─────────────────────────────────────────
export const createSupplierPaymentThunk = createAsyncThunk<
  SupplierPayment,
  { supplierId: string; data: CreateSupplierPaymentPayload },
  { rejectValue: string }
>("inventory/createSupplierPayment", async ({ supplierId, data }, { rejectWithValue }) => {
  try {
    const res = await api.post<InventoryResponse<SupplierPayment>>(
      INVENTORY.SUPPLIER_PAYMENTS(supplierId),
      data,
    );
    return res.data.data;
  } catch (err: any) {
    console.error("createSupplierPaymentThunk error:", err);
    return rejectWithValue(err?.response?.data?.error?.message || "Failed to record payment");
  }
});

// ─── Orders (purchase-order documents — no stock movement) ────────────────────

export const createOrderThunk = createAsyncThunk<
  Order,
  CreateOrderPayload,
  { rejectValue: string }
>("inventory/createOrder", async (payload, { rejectWithValue }) => {
  try {
    const res = await api.post<InventoryResponse<Order>>(INVENTORY.ORDERS, payload);
    return res.data.data;
  } catch (err: any) {
    console.error("createOrderThunk error:", err);
    return rejectWithValue(err?.response?.data?.error?.message || "Failed to create order");
  }
});

// POST, not PUT/PATCH — matches the backend route (see orders.controller.ts).
export const updateOrderThunk = createAsyncThunk<
  Order,
  { id: string; payload: CreateOrderPayload },
  { rejectValue: string }
>("inventory/updateOrder", async ({ id, payload }, { rejectWithValue }) => {
  try {
    const res = await api.post<InventoryResponse<Order>>(INVENTORY.ORDER_UPDATE(id), payload);
    return res.data.data;
  } catch (err: any) {
    console.error("updateOrderThunk error:", err);
    return rejectWithValue(err?.response?.data?.error?.message || "Failed to update order");
  }
});

export const fetchOrdersThunk = createAsyncThunk<
  { data: Order[]; total: number },
  { search?: string; status?: Order["status"] | Order["status"][]; page?: number; limit?: number } | void,
  { rejectValue: string }
>("inventory/fetchOrders", async (filters, { rejectWithValue }) => {
  try {
    // Array form (the Orders page's "Receiving" tab: sent + partially_received)
    // joined into one comma-separated query param — same convention as
    // fetchConsumablesDashboardThunk's multi-select filters — rather than
    // relying on axios's array param serialization.
    const params = filters
      ? { ...filters, status: Array.isArray(filters.status) ? filters.status.join(",") : filters.status }
      : undefined;
    const res = await api.get<InventoryResponse<{ data: Order[]; total: number }>>(INVENTORY.ORDERS, {
      params,
    });
    return res.data.data;
  } catch (err: any) {
    console.error("fetchOrdersThunk error:", err);
    return rejectWithValue(err?.response?.data?.error?.message || "Failed to fetch orders");
  }
});

export const fetchOrderByIdThunk = createAsyncThunk<
  Order,
  string,
  { rejectValue: string }
>("inventory/fetchOrderById", async (id, { rejectWithValue }) => {
  try {
    const res = await api.get<InventoryResponse<Order>>(INVENTORY.ORDER_BY_ID(id));
    return res.data.data;
  } catch (err: any) {
    console.error("fetchOrderByIdThunk error:", err);
    return rejectWithValue(err?.response?.data?.error?.message || "Failed to fetch order");
  }
});

// Fetches a supplier's imported product catalog — used both for the
// Suggested Products panel (matched_only=true) and the "Needs attention"
// unmatched-rows list right after an import.
export const fetchSupplierProductsThunk = createAsyncThunk<
  SupplierProduct[],
  { supplierId: string; matchedOnly?: boolean },
  { rejectValue: string }
>("inventory/fetchSupplierProducts", async ({ supplierId, matchedOnly }, { rejectWithValue }) => {
  try {
    const res = await api.get<InventoryResponse<SupplierProduct[]>>(INVENTORY.SUPPLIER_PRODUCTS(supplierId), {
      params: matchedOnly ? { matched_only: "true" } : undefined,
    });
    return res.data.data;
  } catch (err: any) {
    console.error("fetchSupplierProductsThunk error:", err);
    return rejectWithValue(err?.response?.data?.error?.message || err?.message || "Failed to fetch supplier catalog");
  }
});

// Resolves a still-unmatched catalog row: link to an existing product,
// create a new product from exactly the row's own data, or ignore it.
export const resolveSupplierProductThunk = createAsyncThunk<
  SupplierProduct,
  { supplierId: string; catalogId: string; payload: ResolveSupplierProductPayload },
  { rejectValue: string }
>("inventory/resolveSupplierProduct", async ({ supplierId, catalogId, payload }, { rejectWithValue }) => {
  try {
    const res = await api.patch<InventoryResponse<SupplierProduct>>(
      INVENTORY.SUPPLIER_PRODUCT_RESOLVE(supplierId, catalogId), payload,
    );
    return res.data.data;
  } catch (err: any) {
    console.error("resolveSupplierProductThunk error:", err);
    return rejectWithValue(err?.response?.data?.error?.message || err?.message || "Failed to resolve catalog row");
  }
});

// ─── Product Inventory detail drawer + multi-supplier pricing ────────────────

export const fetchProductDetailThunk = createAsyncThunk<
  ProductDetailAggregate,
  string,
  { rejectValue: string }
>("inventory/fetchProductDetail", async (productId, { rejectWithValue }) => {
  try {
    const res = await api.get<InventoryResponse<ProductDetailAggregate>>(INVENTORY.PRODUCT_INVENTORY_DETAIL(productId));
    return res.data.data;
  } catch (err: any) {
    console.error("fetchProductDetailThunk error:", err);
    return rejectWithValue(err?.response?.data?.error?.message || err?.message || "Failed to fetch product detail");
  }
});

export const fetchProductSupplierMappingsThunk = createAsyncThunk<
  ProductSupplierMapping[],
  string,
  { rejectValue: string }
>("inventory/fetchProductSupplierMappings", async (productId, { rejectWithValue }) => {
  try {
    const res = await api.get<InventoryResponse<ProductSupplierMapping[]>>(INVENTORY.PRODUCT_SUPPLIERS(productId));
    return res.data.data;
  } catch (err: any) {
    console.error("fetchProductSupplierMappingsThunk error:", err);
    return rejectWithValue(err?.response?.data?.error?.message || err?.message || "Failed to fetch product suppliers");
  }
});

export const addProductSupplierMappingThunk = createAsyncThunk<
  ProductSupplierMapping,
  { productId: string; payload: AddProductSupplierPayload },
  { rejectValue: string }
>("inventory/addProductSupplierMapping", async ({ productId, payload }, { rejectWithValue }) => {
  try {
    const res = await api.post<InventoryResponse<ProductSupplierMapping>>(INVENTORY.PRODUCT_SUPPLIERS(productId), payload);
    return res.data.data;
  } catch (err: any) {
    console.error("addProductSupplierMappingThunk error:", err);
    return rejectWithValue(err?.response?.data?.error?.message || err?.message || "Failed to add supplier");
  }
});

export const updateProductSupplierMappingThunk = createAsyncThunk<
  ProductSupplierMapping,
  { productId: string; mappingId: string; payload: UpdateProductSupplierPayload },
  { rejectValue: string }
>("inventory/updateProductSupplierMapping", async ({ productId, mappingId, payload }, { rejectWithValue }) => {
  try {
    const res = await api.patch<InventoryResponse<ProductSupplierMapping>>(
      INVENTORY.PRODUCT_SUPPLIER_BY_ID(productId, mappingId), payload,
    );
    return res.data.data;
  } catch (err: any) {
    console.error("updateProductSupplierMappingThunk error:", err);
    return rejectWithValue(err?.response?.data?.error?.message || err?.message || "Failed to update supplier");
  }
});

export const removeProductSupplierMappingThunk = createAsyncThunk<
  { productId: string; mappingId: string },
  { productId: string; mappingId: string },
  { rejectValue: string }
>("inventory/removeProductSupplierMapping", async ({ productId, mappingId }, { rejectWithValue }) => {
  try {
    await api.delete(INVENTORY.PRODUCT_SUPPLIER_BY_ID(productId, mappingId));
    return { productId, mappingId };
  } catch (err: any) {
    console.error("removeProductSupplierMappingThunk error:", err);
    return rejectWithValue(err?.response?.data?.error?.message || err?.message || "Failed to remove supplier");
  }
});

export const fetchProductStockLedgerTimelineThunk = createAsyncThunk<
  StockLedgerTimelineEntry[],
  string,
  { rejectValue: string }
>("inventory/fetchProductStockLedgerTimeline", async (productId, { rejectWithValue }) => {
  try {
    const res = await api.get<InventoryResponse<StockLedgerTimelineEntry[]>>(INVENTORY.STOCK_LEDGER_PRODUCT_TIMELINE(productId));
    return res.data.data;
  } catch (err: any) {
    console.error("fetchProductStockLedgerTimelineThunk error:", err);
    return rejectWithValue(err?.response?.data?.error?.message || err?.message || "Failed to fetch stock history");
  }
});

export const fetchProductPurchaseHistoryThunk = createAsyncThunk<
  { data: ProductPurchaseHistoryRow[]; total: number },
  string,
  { rejectValue: string }
>("inventory/fetchProductPurchaseHistory", async (productId, { rejectWithValue }) => {
  try {
    const res = await api.get<InventoryResponse<{ data: ProductPurchaseHistoryRow[]; total: number }>>(
      INVENTORY.PRODUCT_INVENTORY_PURCHASES, { params: { product_id: productId, limit: 100 } },
    );
    return res.data.data;
  } catch (err: any) {
    console.error("fetchProductPurchaseHistoryThunk error:", err);
    return rejectWithValue(err?.response?.data?.error?.message || err?.message || "Failed to fetch purchase history");
  }
});

export const cancelOrderThunk = createAsyncThunk<
  Order,
  string,
  { rejectValue: string }
>("inventory/cancelOrder", async (orderId, { rejectWithValue }) => {
  try {
    const res = await api.post<InventoryResponse<Order>>(INVENTORY.ORDER_CANCEL(orderId));
    return res.data.data;
  } catch (err: any) {
    console.error("cancelOrderThunk error:", err);
    return rejectWithValue(err?.response?.data?.error?.message || err?.message || "Failed to cancel order");
  }
});

// Draft → Ordered. A plain status flip — placing a draft never touches
// stock/the ledger (receive() is the only thing that does), so unlike
// create/update it needs no items/totals payload at all.
export const placeOrderThunk = createAsyncThunk<
  Order,
  string,
  { rejectValue: string }
>("inventory/placeOrder", async (orderId, { rejectWithValue }) => {
  try {
    const res = await api.post<InventoryResponse<Order>>(INVENTORY.ORDER_PLACE(orderId));
    return res.data.data;
  } catch (err: any) {
    console.error("placeOrderThunk error:", err);
    return rejectWithValue(err?.response?.data?.error?.message || err?.message || "Failed to place order");
  }
});

// "Confirm Order" on a Verify-eligible ("sent") order — doesn't move status
// or stock, just marks verification as started so the order shows on the
// Verify Order list (see OrdersListPage.tsx) before anything's received yet.
export const startVerificationThunk = createAsyncThunk<
  Order,
  string,
  { rejectValue: string }
>("inventory/startVerification", async (orderId, { rejectWithValue }) => {
  try {
    const res = await api.post<InventoryResponse<Order>>(INVENTORY.ORDER_START_VERIFICATION(orderId));
    return res.data.data;
  } catch (err: any) {
    console.error("startVerificationThunk error:", err);
    return rejectWithValue(err?.response?.data?.error?.message || err?.message || "Failed to start verification");
  }
});

// POST, not DELETE — matches the backend route (see orders.controller.ts).
export const deleteOrderThunk = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>("inventory/deleteOrder", async (id, { rejectWithValue }) => {
  try {
    await api.post(INVENTORY.ORDER_DELETE(id));
    return id;
  } catch (err: any) {
    console.error("deleteOrderThunk error:", err);
    return rejectWithValue(err?.response?.data?.error?.message || "Failed to delete order");
  }
});

export const uploadOrderSignatureThunk = createAsyncThunk<
  OrderSignature,
  File,
  { rejectValue: string }
>("inventory/uploadOrderSignature", async (file, { rejectWithValue }) => {
  try {
    const formData = new FormData();
    formData.append("signature", file);
    const res = await api.post<InventoryResponse<OrderSignature>>(
      INVENTORY.ORDER_UPLOAD_SIGNATURE,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return res.data.data;
  } catch (err: any) {
    console.error("uploadOrderSignatureThunk error:", err);
    return rejectWithValue(err?.response?.data?.error?.message || "Failed to upload signature");
  }
});

export const fetchOrderSignaturesThunk = createAsyncThunk<
  OrderSignature[],
  void,
  { rejectValue: string }
>("inventory/fetchOrderSignatures", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get<InventoryResponse<OrderSignature[]>>(INVENTORY.ORDER_SIGNATURES);
    return res.data.data;
  } catch (err: any) {
    console.error("fetchOrderSignaturesThunk error:", err);
    return rejectWithValue(err?.response?.data?.error?.message || "Failed to fetch signatures");
  }
});

// ─── Consumable Inventory (dedicated module) ──────────────────────────────────

export interface ConsumableListResult {
  data: ConsumableListRow[];
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface ConsumableDashboardResult {
  kpis: ConsumableKpis;
  list: ConsumableListResult;
}

// Combined list + KPIs in one request — the Consumable Inventory page's
// initial load and every filter/search/page change previously fired a list
// call and a KPI call as two separate HTTP requests; the backend now runs
// both queries concurrently and returns them together
// (consumable-inventory.service.ts::getDashboard).
export const fetchConsumablesDashboardThunk = createAsyncThunk<
  ConsumableDashboardResult,
  ConsumableListFilters,
  { rejectValue: string }
>("inventory/fetchConsumablesDashboard", async (filters, { rejectWithValue }) => {
  try {
    // Multi-select filter fields are arrays in app state (see
    // ConsumableListFilters) — joined into a single comma-separated query
    // param per field here rather than relying on axios's array param
    // serialization convention, which the backend would then have to guess
    // at matching exactly.
    const ARRAY_FILTER_KEYS = ["category_id", "brand_id", "supplier_id", "unit", "service_id", "status", "product_type"] as const;
    const params: Record<string, unknown> = { ...filters };
    ARRAY_FILTER_KEYS.forEach((key) => {
      const value = (filters as any)[key];
      params[key] = Array.isArray(value) && value.length ? value.join(",") : undefined;
    });
    const res = await api.get<InventoryResponse<ConsumableDashboardResult>>(INVENTORY.CONSUMABLES_DASHBOARD, { params });
    return res.data.data;
  } catch (err: any) {
    console.error("fetchConsumablesDashboardThunk error:", err?.response?.data || err?.message);
    return rejectWithValue(err?.response?.data?.error?.message || "Failed to fetch consumable dashboard");
  }
});

export const fetchConsumableByIdThunk = createAsyncThunk<
  ConsumableDetail,
  string,
  { rejectValue: string }
>("inventory/fetchConsumableById", async (id, { rejectWithValue }) => {
  try {
    const res = await api.get<InventoryResponse<ConsumableDetail>>(INVENTORY.CONSUMABLE_BY_ID(id));
    return res.data.data;
  } catch (err: any) {
    console.error("fetchConsumableByIdThunk error:", err?.response?.data || err?.message);
    return rejectWithValue(err?.response?.data?.error?.message || "Failed to fetch consumable detail");
  }
});

export const adjustConsumableStockThunk = createAsyncThunk<
  { id: string },
  { id: string; payload: AdjustStockPayload },
  { rejectValue: string }
>("inventory/adjustConsumableStock", async ({ id, payload }, { rejectWithValue }) => {
  try {
    await api.post(INVENTORY.CONSUMABLE_ADJUST(id), payload);
    return { id };
  } catch (err: any) {
    console.error("adjustConsumableStockThunk error:", err?.response?.data || err?.message);
    return rejectWithValue(err?.response?.data?.error?.message || "Failed to adjust stock");
  }
});

export interface UsageHistoryResult {
  data: UsageHistoryRow[];
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export const fetchUsageHistoryThunk = createAsyncThunk<
  UsageHistoryResult,
  UsageHistoryFilters,
  { rejectValue: string }
>("inventory/fetchUsageHistory", async (filters, { rejectWithValue }) => {
  try {
    const res = await api.get<InventoryResponse<UsageHistoryResult>>(INVENTORY.CONSUMABLES_USAGE_HISTORY, { params: filters });
    return res.data.data;
  } catch (err: any) {
    console.error("fetchUsageHistoryThunk error:", err?.response?.data || err?.message);
    return rejectWithValue(err?.response?.data?.error?.message || "Failed to fetch usage history");
  }
});

// ─── Product Audit ────────────────────────────────────────────────────────────

export interface ProductAuditListResult {
  data: ProductAuditListRow[];
  total: number;
}

const auditErrorMessage = (err: any, fallback: string) =>
  err?.response?.data?.error?.message || err?.response?.data?.message || fallback;

export const fetchProductAuditsThunk = createAsyncThunk<
  ProductAuditListResult,
  ListProductAuditsFilters,
  { rejectValue: string }
>("inventory/fetchProductAudits", async (filters, { rejectWithValue }) => {
  try {
    const res = await api.get<InventoryResponse<ProductAuditListResult>>(INVENTORY.PRODUCT_AUDITS, { params: filters });
    return res.data.data;
  } catch (err: any) {
    return rejectWithValue(auditErrorMessage(err, "Failed to fetch product audits"));
  }
});

export const fetchProductAuditByIdThunk = createAsyncThunk<
  ProductAuditWithDetail,
  string,
  { rejectValue: string }
>("inventory/fetchProductAuditById", async (id, { rejectWithValue }) => {
  try {
    const res = await api.get<InventoryResponse<ProductAuditWithDetail>>(INVENTORY.PRODUCT_AUDIT_BY_ID(id));
    return res.data.data;
  } catch (err: any) {
    return rejectWithValue(auditErrorMessage(err, "Failed to fetch product audit"));
  }
});

export const createProductAuditThunk = createAsyncThunk<
  ProductAuditWithDetail,
  CreateProductAuditPayload,
  { rejectValue: string }
>("inventory/createProductAudit", async (payload, { rejectWithValue }) => {
  try {
    const res = await api.post<InventoryResponse<ProductAuditWithDetail>>(INVENTORY.PRODUCT_AUDITS, payload);
    return res.data.data;
  } catch (err: any) {
    return rejectWithValue(auditErrorMessage(err, "Failed to create product audit"));
  }
});

export const addProductAuditItemsThunk = createAsyncThunk<
  ProductAuditWithDetail,
  { auditId: string; productIds: string[] },
  { rejectValue: string }
>("inventory/addProductAuditItems", async ({ auditId, productIds }, { rejectWithValue }) => {
  try {
    const res = await api.post<InventoryResponse<ProductAuditWithDetail>>(
      INVENTORY.PRODUCT_AUDIT_ITEMS(auditId), { product_ids: productIds },
    );
    return res.data.data;
  } catch (err: any) {
    return rejectWithValue(auditErrorMessage(err, "Failed to add products to audit"));
  }
});

export const removeProductAuditItemThunk = createAsyncThunk<
  ProductAuditWithDetail,
  { auditId: string; itemId: string },
  { rejectValue: string }
>("inventory/removeProductAuditItem", async ({ auditId, itemId }, { rejectWithValue }) => {
  try {
    const res = await api.delete<InventoryResponse<ProductAuditWithDetail>>(INVENTORY.PRODUCT_AUDIT_ITEM_BY_ID(auditId, itemId));
    return res.data.data;
  } catch (err: any) {
    return rejectWithValue(auditErrorMessage(err, "Failed to remove product from audit"));
  }
});

export const updateProductAuditItemThunk = createAsyncThunk<
  ProductAuditWithDetail,
  { auditId: string; itemId: string; payload: UpdateAuditItemPayload },
  { rejectValue: string }
>("inventory/updateProductAuditItem", async ({ auditId, itemId, payload }, { rejectWithValue }) => {
  try {
    const res = await api.patch<InventoryResponse<ProductAuditWithDetail>>(
      INVENTORY.PRODUCT_AUDIT_ITEM_BY_ID(auditId, itemId), payload,
    );
    return res.data.data;
  } catch (err: any) {
    return rejectWithValue(auditErrorMessage(err, "Failed to update audit item"));
  }
});

export const submitProductAuditThunk = createAsyncThunk<
  ProductAuditWithDetail,
  { auditId: string; items?: SubmitAuditItemUpdate[] },
  { rejectValue: string }
>("inventory/submitProductAudit", async ({ auditId, items }, { rejectWithValue }) => {
  try {
    const res = await api.post<InventoryResponse<ProductAuditWithDetail>>(
      INVENTORY.PRODUCT_AUDIT_SUBMIT(auditId), items && items.length > 0 ? { items } : {},
    );
    return res.data.data;
  } catch (err: any) {
    return rejectWithValue(auditErrorMessage(err, "Failed to submit audit for review"));
  }
});

export const approveProductAuditThunk = createAsyncThunk<
  ProductAuditWithDetail,
  { auditId: string; reviewerId?: string },
  { rejectValue: string }
>("inventory/approveProductAudit", async ({ auditId, reviewerId }, { rejectWithValue }) => {
  try {
    const res = await api.post<InventoryResponse<ProductAuditWithDetail>>(
      INVENTORY.PRODUCT_AUDIT_APPROVE(auditId), reviewerId ? { reviewer_id: reviewerId } : undefined,
    );
    return res.data.data;
  } catch (err: any) {
    return rejectWithValue(auditErrorMessage(err, "Failed to approve audit"));
  }
});

export const rejectProductAuditThunk = createAsyncThunk<
  ProductAuditWithDetail,
  { auditId: string; reason: string; reviewerId?: string },
  { rejectValue: string }
>("inventory/rejectProductAudit", async ({ auditId, reason, reviewerId }, { rejectWithValue }) => {
  try {
    const res = await api.post<InventoryResponse<ProductAuditWithDetail>>(
      INVENTORY.PRODUCT_AUDIT_REJECT(auditId), { reason, ...(reviewerId ? { reviewer_id: reviewerId } : {}) },
    );
    return res.data.data;
  } catch (err: any) {
    return rejectWithValue(auditErrorMessage(err, "Failed to reject audit"));
  }
});

export const reopenProductAuditThunk = createAsyncThunk<
  ProductAuditWithDetail,
  string,
  { rejectValue: string }
>("inventory/reopenProductAudit", async (auditId, { rejectWithValue }) => {
  try {
    const res = await api.post<InventoryResponse<ProductAuditWithDetail>>(INVENTORY.PRODUCT_AUDIT_REOPEN(auditId));
    return res.data.data;
  } catch (err: any) {
    return rejectWithValue(auditErrorMessage(err, "Failed to reopen audit"));
  }
});
