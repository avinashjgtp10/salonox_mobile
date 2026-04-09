import { createAsyncThunk } from "@reduxjs/toolkit";

import api from "../../services/api/axios";
import { SALE } from "../../services/api/endpoints";
import { ApiError } from "../../services/api/interceptors";
import { downloadBlob } from "../../utils/downloadBlob";
import type {
  Sale,
  SaleResponse,
  SaleWithItemsResponse,
  SaleListResponse,
  CreateSalePayload,
  UpdateSalePayload,
  CheckoutSalePayload,
} from "../../types/sale.types";

// ── Fetch all sales (scoped to current salon) ──────────────────────────────────
export const fetchSalesThunk = createAsyncThunk<
  Sale[],
  void,
  { rejectValue: string }
>("sale/fetchAll", async (_, { rejectWithValue, getState }) => {
  try {
    const state = getState() as any;
    const salonId = state.salon.currentSalon?.id;
    const params = salonId ? `?salon_id=${salonId}` : "";
    const res = await api.get<SaleListResponse>(`${SALE.BASE}${params}`);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch sales");
  }
});

// ── Fetch single sale (returns sale + items) ───────────────────────────────────
export const fetchSaleByIdThunk = createAsyncThunk<
  Sale,
  string | number,
  { rejectValue: string }
>("sale/fetchById", async (id, { rejectWithValue }) => {
  try {
    const res = await api.get<SaleWithItemsResponse>(SALE.BY_ID(id));
    // Backend returns { sale, items } — merge items onto sale for convenience
    const { sale, items } = res.data.data;
    return { ...sale, items };
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch sale");
  }
});

// ── Create sale ────────────────────────────────────────────────────────────────
export const createSaleThunk = createAsyncThunk<
  Sale,
  CreateSalePayload,
  { rejectValue: string }
>("sale/create", async (payload, { rejectWithValue }) => {
  try {
    const res = await api.post<SaleWithItemsResponse>(SALE.BASE, payload);
    return res.data.data.sale;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to create sale");
  }
});

// ── Update sale (PATCH — only drafts can be updated) ──────────────────────────
export const updateSaleThunk = createAsyncThunk<
  Sale,
  UpdateSalePayload,
  { rejectValue: string }
>("sale/update", async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.patch<SaleResponse>(SALE.BY_ID(id), data);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to update sale");
  }
});

// ── Checkout sale (draft → completed) ─────────────────────────────────────────
// Backend checkout returns Sale directly (not { sale, items })
export const checkoutSaleThunk = createAsyncThunk<
  Sale,
  CheckoutSalePayload,
  { rejectValue: string }
>(
  "sale/checkout",
  async ({ id, payment_method, payment_reference }, { rejectWithValue }) => {
    try {
      const res = await api.post<SaleResponse>(SALE.CHECKOUT(id), {
        payment_method,
        ...(payment_reference ? { payment_reference } : {}),
      });
      return res.data.data;
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue("Failed to checkout sale");
    }
  },
);

// ── Delete sale ────────────────────────────────────────────────────────────────
export const deleteSaleThunk = createAsyncThunk<
  string | number,
  string | number,
  { rejectValue: string }
>("sale/delete", async (id, { rejectWithValue }) => {
  try {
    await api.delete(SALE.BY_ID(id));
    return id;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to delete sale");
  }
});

// ── Export sales ───────────────────────────────────────────────────────────────
export const exportSalesThunk = createAsyncThunk<
  void,
  "excel" | "csv",
  { rejectValue: string }
>("sale/export", async (format, { rejectWithValue }) => {
  try {
    const res = await api.get(SALE.EXPORT(format), { responseType: "blob" });
    downloadBlob(res.data, `sales.${format === "excel" ? "xlsx" : "csv"}`);
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to export sales");
  }
});
