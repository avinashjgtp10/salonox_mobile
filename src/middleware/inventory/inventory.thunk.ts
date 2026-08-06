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
  CreateSupplierPayload,
  UpdateSupplierPayload,
  StockReconciliationRow,
  StockReconciliationPayload,
  StockReconciliationItemPayload,
  ConsumableUsagePayload,
  ConsumableListFilters,
  ConsumableListRow,
  ConsumableKpis,
  ConsumableDetail,
  AdjustStockPayload,
  UsageHistoryFilters,
  UsageHistoryRow,
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
  Supplier[],
  void,
  { rejectValue: string }
>("inventory/fetchSuppliers", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get<InventoryResponse<Supplier[]>>(INVENTORY.SUPPLIERS);
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

// ─── Fetch stock reconciliation data ─────────────────────────────────────────
export const fetchStockReconciliationThunk = createAsyncThunk<
  StockReconciliationRow[],
  { branchId: string; search?: string; categoryId?: string },
  { rejectValue: string }
>("inventory/fetchStockReconciliation", async ({ branchId, search, categoryId }, { rejectWithValue }) => {
  try {
    const params: Record<string, string> = { branch_id: branchId };
    if (search) params.search = search;
    if (categoryId) params.category_id = categoryId;

    const res = await api.get<InventoryResponse<StockReconciliationRow[]>>(
      INVENTORY.STOCK_RECONCILIATION,
      { params }
    );
    return res.data.data ?? [];
  } catch (err: any) {
    console.error("fetchStockReconciliationThunk error:", err?.response?.data || err?.message);
    return rejectWithValue(err?.response?.data?.error?.message || "Failed to fetch stock reconciliation data");
  }
});

// ─── Save all reconciliation rows at once ────────────────────────────────────
export const saveStockReconciliationThunk = createAsyncThunk<
  { processed: number },
  StockReconciliationPayload,
  { rejectValue: string }
>("inventory/saveStockReconciliation", async (payload, { rejectWithValue }) => {
  try {
    const res = await api.post<InventoryResponse<{ processed: number }>>(
      INVENTORY.STOCK_RECONCILIATION,
      payload
    );
    return res.data.data;
  } catch (err: any) {
    console.error("saveStockReconciliationThunk error:", err?.response?.data || err?.message);
    return rejectWithValue(err?.response?.data?.error?.message || "Failed to save stock reconciliation");
  }
});

// ─── Save a single reconciliation row ────────────────────────────────────────
export const saveReconciliationRowThunk = createAsyncThunk<
  StockReconciliationRow,
  { branchId: string; item: StockReconciliationItemPayload },
  { rejectValue: string }
>("inventory/saveReconciliationRow", async ({ branchId, item }, { rejectWithValue }) => {
  try {
    const res = await api.patch<InventoryResponse<StockReconciliationRow>>(
      INVENTORY.STOCK_RECONCILIATION_ROW(item.product_id),
      { branch_id: branchId, ...item }
    );
    return res.data.data;
  } catch (err: any) {
    console.error("saveReconciliationRowThunk error:", err?.response?.data || err?.message);
    return rejectWithValue(err?.response?.data?.error?.message || "Failed to save row");
  }
});

// ─── Save consumable usage from calendar appointments ────────────────────────
export const saveConsumableUsageThunk = createAsyncThunk<
  void,
  ConsumableUsagePayload,
  { rejectValue: string }
>("inventory/saveConsumableUsage", async (payload, { rejectWithValue }) => {
  try {
    await api.post(INVENTORY.CONSUMABLE_USAGE, payload);
  } catch (err: any) {
    console.error("saveConsumableUsageThunk error:", err?.response?.data || err?.message);
    return rejectWithValue(err?.response?.data?.error?.message || "Failed to save consumable usage");
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

export const fetchConsumablesThunk = createAsyncThunk<
  ConsumableListResult,
  ConsumableListFilters,
  { rejectValue: string }
>("inventory/fetchConsumables", async (filters, { rejectWithValue }) => {
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
    const res = await api.get<InventoryResponse<ConsumableListResult>>(INVENTORY.CONSUMABLES, { params });
    return res.data.data;
  } catch (err: any) {
    console.error("fetchConsumablesThunk error:", err?.response?.data || err?.message);
    return rejectWithValue(err?.response?.data?.error?.message || "Failed to fetch consumables");
  }
});

export const fetchConsumableKpisThunk = createAsyncThunk<
  ConsumableKpis,
  void,
  { rejectValue: string }
>("inventory/fetchConsumableKpis", async (_arg, { rejectWithValue }) => {
  try {
    const res = await api.get<InventoryResponse<ConsumableKpis>>(INVENTORY.CONSUMABLES_KPIS);
    return res.data.data;
  } catch (err: any) {
    console.error("fetchConsumableKpisThunk error:", err?.response?.data || err?.message);
    return rejectWithValue(err?.response?.data?.error?.message || "Failed to fetch consumable KPIs");
  }
});

export interface ConsumableDashboardResult {
  kpis: ConsumableKpis;
  list: ConsumableListResult;
}

// Combined list + KPIs in one request — the Consumable Inventory page's
// initial load and every filter/search/page change previously fired
// fetchConsumablesThunk and fetchConsumableKpisThunk as two separate HTTP
// calls; the backend now runs both queries concurrently and returns them
// together (consumable-inventory.service.ts::getDashboard).
export const fetchConsumablesDashboardThunk = createAsyncThunk<
  ConsumableDashboardResult,
  ConsumableListFilters,
  { rejectValue: string }
>("inventory/fetchConsumablesDashboard", async (filters, { rejectWithValue }) => {
  try {
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
