import { createAsyncThunk } from "@reduxjs/toolkit";

import api from "../../services/api/axios";
import { SALE } from "../../services/api/endpoints";
import { ApiError } from "../../services/api/interceptors";
import { downloadBlob } from "../../utils/downloadBlob";
import type {
  Sale,
  SaleSummary,
  SaleResponse,
  SaleWithItemsResponse,
  SaleListResponse,
  SaleSummaryResponse,
  CreateSalePayload,
  UpdateSalePayload,
  CheckoutSalePayload,
} from "../../types/sale.types";

// ── Quick-sale catalog types ──────────────────────────────────────────────────
export interface SaleInitData {
  staff: any[];
  services: any[];
}

// ── Fetch init data (staff + services) ───────────────────────────────────────
// condition: skip when already loaded OR a fetch is already in-flight
export const fetchSaleInitThunk = createAsyncThunk<
  SaleInitData,
  void,
  { state: any; rejectValue: string }
>(
  "sale/init",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get<{ data: SaleInitData }>(SALE.INIT);
      return res.data.data;
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue("Failed to fetch sale init data");
    }
  },
  {
    condition: (_, { getState }) => {
      const sale = getState()?.sale;
      // Skip if already loaded or a request is already in-flight
      return !sale?.initLoaded && !sale?.loading?.init;
    },
  },
);

// ── Fetch products catalog (lazy, for Quick Sale product rows) ────────────────
// condition: skip when already cached or a fetch is already in-flight
export const fetchSaleProductsThunk = createAsyncThunk<
  any[],
  void,
  { state: any; rejectValue: string }
>(
  "sale/fetchCatalogProducts",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/api/v1/products");
      const raw = res.data?.data?.data ?? res.data?.data ?? res.data ?? [];
      return Array.isArray(raw) ? raw : [];
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue("Failed to fetch products");
    }
  },
  {
    condition: (_, { getState }) => {
      const sale = getState()?.sale;
      return !sale?.productsLoaded && !sale?.loading?.products;
    },
  },
);

// ── Fetch memberships catalog (lazy, for Quick Sale membership rows) ──────────
// condition: skip when already cached or a fetch is already in-flight
export const fetchSaleMembershipsThunk = createAsyncThunk<
  any[],
  void,
  { state: any; rejectValue: string }
>(
  "sale/fetchCatalogMemberships",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/api/v1/memberships");
      const raw = res.data?.data?.items ?? res.data?.data ?? res.data ?? [];
      return Array.isArray(raw) ? raw : [];
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue("Failed to fetch memberships");
    }
  },
  {
    condition: (_, { getState }) => {
      const sale = getState()?.sale;
      return !sale?.membershipsLoaded && !sale?.loading?.memberships;
    },
  },
);

// ── Fetch all sales (optionally filtered) ─────────────────────────────────────
export interface FetchSalesParams {
  startDate?: string; // ISO date string e.g. "2026-03-01"
  endDate?: string;   // ISO date string e.g. "2026-03-31"
  status?: string;    // "completed" | "draft" | "cancelled" | "refunded"
}

export const fetchSalesThunk = createAsyncThunk<
  Sale[],
  FetchSalesParams | void,
  { rejectValue: string }
>("sale/fetchAll", async (params, { rejectWithValue, getState }) => {
  try {
    const q = new URLSearchParams();
    if (params?.startDate) q.set("start_date", params.startDate);
    if (params?.endDate)   q.set("end_date",   params.endDate);
    if (params?.status)    q.set("status",      params.status);

    const url = `${SALE.BASE}${q.toString() ? `?${q}` : ""}`;
    const res = await api.get<SaleListResponse>(url);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch sales");
  }
});

// ── Fetch sales summary (stat cards) ──────────────────────────────────────────
export const fetchSaleSummaryThunk = createAsyncThunk<
  SaleSummary,
  void,
  { rejectValue: string }
>("sale/fetchSummary", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get<SaleSummaryResponse>(SALE.SUMMARY);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch sales summary");
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
export const checkoutSaleThunk = createAsyncThunk<
  Sale,
  CheckoutSalePayload,
  { rejectValue: string }
>(
  "sale/checkout",
  async ({ id, payment_method, amount_paid, payment_reference }, { rejectWithValue }) => {
    try {
      const res = await api.post<SaleResponse>(SALE.CHECKOUT(id), {
        payment_method,
        amount_paid,
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

// ── Export sales (CSV / Excel / PDF) ──────────────────────────────────────────
export const exportSalesThunk = createAsyncThunk<
  void,
  { format: "excel" | "csv" | "pdf"; date?: string },
  { rejectValue: string }
>("sale/export", async ({ format, date }, { rejectWithValue }) => {
  try {
    const url = SALE.EXPORT({ format, date });
    const res = await api.get(url, { responseType: "blob" });

    const ext = format === "excel" ? "xlsx" : format;
    const dateLabel = date ?? "all";
    downloadBlob(res.data, `sales_${dateLabel}.${ext}`);
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to export sales");
  }
});
