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
