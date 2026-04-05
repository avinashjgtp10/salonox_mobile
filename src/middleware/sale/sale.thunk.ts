import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { SALE } from "../../services/api/endpoints";
import { ApiError } from "../../services/api/interceptors";
import type {
  Sale,
  SaleResponse,
  SaleListResponse,
  CreateSalePayload,
  UpdateSalePayload,
} from "../../types/sale.types";

// ── Fetch all sales ────────────────────────────────────────────────────────────
export const fetchSalesThunk = createAsyncThunk<
  Sale[],
  void,
  { rejectValue: string }
>("sale/fetchAll", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get<SaleListResponse>(SALE.BASE);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch sales");
  }
});

// ── Fetch single sale ──────────────────────────────────────────────────────────
export const fetchSaleByIdThunk = createAsyncThunk<
  Sale,
  string | number,
  { rejectValue: string }
>("sale/fetchById", async (id, { rejectWithValue }) => {
  try {
    const res = await api.get<SaleResponse>(SALE.BY_ID(id));
    return res.data.data;
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
    const res = await api.post<SaleResponse>(SALE.BASE, payload);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to create sale");
  }
});

// ── Update sale ────────────────────────────────────────────────────────────────
export const updateSaleThunk = createAsyncThunk<
  Sale,
  UpdateSalePayload,
  { rejectValue: string }
>("sale/update", async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put<SaleResponse>(SALE.BY_ID(id), data);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to update sale");
  }
});

// ── Delete sale ────────────────────────────────────────────────────────────────
export const deleteSaleThunk = createAsyncThunk<
  string | number,        // returns the deleted id so reducer can remove it
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
    const url  = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href  = url;
    link.setAttribute("download", `sales.${format === "excel" ? "xlsx" : "csv"}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to export sales");
  }
});
