import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { INVENTORY } from "../../services/api/endpoints/inventory.endpoints";
import { ApiError } from "../../services/api/interceptors";
import type {
  Stocktake,
  CreateStocktakePayload,
  ProcessStockTakePayload,
  StockTakeResult,
  InventoryResponse,
  Supplier,
  SupplierWithBalance,
  CreateSupplierPayload,
  UpdateSupplierPayload,
  CreateSupplierPaymentPayload,
  SupplierPayment,
  Order,
  CreateOrderPayload,
  ReceiveOrderPayload,
  OrderSignature,
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
} from "../../types/inventory.types";

// ── Fetch all stocktakes ──────────────────────────────────────────────────────
export const fetchStocktakesThunk = createAsyncThunk<
  Stocktake[],
  { branchId: string },
  { rejectValue: string }
>("inventory/fetchStocktakes", async ({ branchId }, { rejectWithValue }) => {
  try {
    if (!branchId || branchId.trim() === "") {
      console.error("fetchStocktakesThunk error: branchId is required");
      return rejectWithValue("Branch ID is required");
    }

    const res = await api.get<InventoryResponse<Stocktake[]>>(
      INVENTORY.STOCK_TAKES,
      { params: { branch_id: branchId } }
    );
    
    if (!res.data.data) {
      console.warn("fetchStocktakesThunk: Received empty data response");
      return [];
    }

    return res.data.data;
  } catch (err: any) {
    console.error(
      "fetchStocktakesThunk error:",
      err?.response?.data || err?.message || err
    );
    if (err?.response?.data?.error?.message) {
      return rejectWithValue(err.response.data.error.message);
    }
    if (err instanceof ApiError) {
      return rejectWithValue(`${err.message} (Status: ${err.status})`);
    }
    if (err?.response?.status === 500) {
      return rejectWithValue("Server error: Please check backend logs");
    }
    return rejectWithValue("Failed to fetch stocktakes");
  }
});

// ── Create a stocktake event ──────────────────────────────────────────────────
export const createStocktakeThunk = createAsyncThunk<
  Stocktake,
  CreateStocktakePayload,
  { rejectValue: string }
>("inventory/createStocktake", async (payload, { rejectWithValue }) => {
  try {
    if (!payload.branch_id) {
      console.error("createStocktakeThunk error: branch_id is required");
      return rejectWithValue("Branch ID is required");
    }

    const res = await api.post<InventoryResponse<Stocktake>>(
      INVENTORY.STOCK_TAKES,
      payload
    );
    return res.data.data;
  } catch (err: any) {
    console.error(
      "createStocktakeThunk error:",
      err?.response?.data || err?.message || err
    );
    if (err?.response?.data?.error?.message) {
      return rejectWithValue(err.response.data.error.message);
    }
    if (err instanceof ApiError) {
      return rejectWithValue(`${err.message} (Status: ${err.status})`);
    }
    return rejectWithValue("Failed to create stocktake");
  }
});

// ── Process/Adjust stock levels ───────────────────────────────────────────────
export const processStockTakeThunk = createAsyncThunk<
  StockTakeResult,
  ProcessStockTakePayload,
  { rejectValue: string }
>("inventory/processStockTake", async (payload, { rejectWithValue }) => {
  try {
    if (!payload.branch_id) {
      console.error("processStockTakeThunk error: branch_id is required");
      return rejectWithValue("Branch ID is required");
    }

    const res = await api.post<InventoryResponse<StockTakeResult>>(
      INVENTORY.PROCESS_STOCK_TAKE,
      payload
    );
    return res.data.data;
  } catch (err: any) {
    console.error(
      "processStockTakeThunk error:",
      err?.response?.data || err?.message || err
    );
    if (err?.response?.data?.error?.message) {
      return rejectWithValue(err.response.data.error.message);
    }
    if (err instanceof ApiError) {
      return rejectWithValue(`${err.message} (Status: ${err.status})`);
    }
    return rejectWithValue("Failed to process stocktake");
  }
});

// ── Delete a stocktake ────────────────────────────────────────────────────────
export const deleteStocktakeThunk = createAsyncThunk<
  string, // Returns the ID on success
  string, // ID to delete
  { rejectValue: string }
>("inventory/deleteStocktake", async (id, { rejectWithValue }) => {
  try {
    await api.delete(INVENTORY.STOCK_TAKE_BY_ID(id));
    return id;
  } catch (err: any) {
    console.error(
      "deleteStocktakeThunk error:",
      err?.response?.data || err?.message || err
    );
    if (err?.response?.data?.error?.message) {
      return rejectWithValue(err.response.data.error.message);
    }
    return rejectWithValue("Failed to delete stocktake");
  }
});

// ─── Fetch all suppliers ──────────────────────────────────────────────────────
export const fetchSuppliersThunk = createAsyncThunk<
  SupplierWithBalance[],
  void,
  { rejectValue: string }
>("inventory/fetchSuppliers", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get<InventoryResponse<SupplierWithBalance[]>>(INVENTORY.SUPPLIERS);
    return res.data.data;
  } catch (err: any) {
    console.error("fetchSuppliersThunk error:", err);
    return rejectWithValue(err?.response?.data?.error?.message || "Failed to fetch suppliers");
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

export const fetchOrdersThunk = createAsyncThunk<
  { data: Order[]; total: number },
  { search?: string; page?: number; limit?: number } | void,
  { rejectValue: string }
>("inventory/fetchOrders", async (filters, { rejectWithValue }) => {
  try {
    const res = await api.get<InventoryResponse<{ data: Order[]; total: number }>>(INVENTORY.ORDERS, {
      params: filters ?? undefined,
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

// Records a delivery against this order — creates a linked Purchase (moves
// products.amount + supplier balance the same way the standalone Purchase
// flow does) and advances the order's status toward "received".
export const receiveOrderThunk = createAsyncThunk<
  Order,
  { orderId: string; payload: ReceiveOrderPayload },
  { rejectValue: string }
>("inventory/receiveOrder", async ({ orderId, payload }, { rejectWithValue }) => {
  try {
    const res = await api.post<InventoryResponse<Order>>(INVENTORY.ORDER_RECEIVE(orderId), payload);
    return res.data.data;
  } catch (err: any) {
    console.error("receiveOrderThunk error:", err);
    return rejectWithValue(err?.response?.data?.error?.message || err?.message || "Failed to receive order");
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

export const deleteProductAuditThunk = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>("inventory/deleteProductAudit", async (id, { rejectWithValue }) => {
  try {
    await api.delete(INVENTORY.PRODUCT_AUDIT_BY_ID(id));
    return id;
  } catch (err: any) {
    return rejectWithValue(auditErrorMessage(err, "Failed to delete product audit"));
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
  string,
  { rejectValue: string }
>("inventory/submitProductAudit", async (auditId, { rejectWithValue }) => {
  try {
    const res = await api.post<InventoryResponse<ProductAuditWithDetail>>(INVENTORY.PRODUCT_AUDIT_SUBMIT(auditId));
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
