import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { CATALOG } from "../../services/api/endpoints";
import { ApiError } from "../../services/api/interceptors";
import { downloadBlob } from "../../utils/downloadBlob";
import type {
  CatalogItem,
  CatalogResponse,
  CatalogListResponse,
  CreateCatalogPayload,
  UpdateCatalogPayload,
} from "../../types/catalog.types";

// ── Fetch all catalog items ───────────────────────────────────────────────────
export const fetchCatalogThunk = createAsyncThunk<
  CatalogItem[],
  void,
  { rejectValue: string }
>("catalog/fetchAll", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get<CatalogListResponse>(CATALOG.BASE);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch catalog items");
  }
});

// ── Fetch single catalog item ─────────────────────────────────────────────────
export const fetchCatalogByIdThunk = createAsyncThunk<
  CatalogItem,
  string | number,
  { rejectValue: string }
>("catalog/fetchById", async (id, { rejectWithValue }) => {
  try {
    const res = await api.get<CatalogResponse>(CATALOG.BY_ID(id));
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch catalog item");
  }
});

// ── Create catalog item ───────────────────────────────────────────────────────
export const createCatalogThunk = createAsyncThunk<
  CatalogItem,
  CreateCatalogPayload,
  { rejectValue: string }
>("catalog/create", async (payload, { rejectWithValue }) => {
  try {
    const res = await api.post<CatalogResponse>(CATALOG.BASE, payload);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to create catalog item");
  }
});

// ── Update catalog item ───────────────────────────────────────────────────────
export const updateCatalogThunk = createAsyncThunk<
  CatalogItem,
  UpdateCatalogPayload,
  { rejectValue: string }
>("catalog/update", async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put<CatalogResponse>(CATALOG.BY_ID(id), data);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to update catalog item");
  }
});

// ── Delete catalog item ───────────────────────────────────────────────────────
export const deleteCatalogThunk = createAsyncThunk<
  string | number, // returns the deleted id so reducer can remove it
  string | number,
  { rejectValue: string }
>("catalog/delete", async (id, { rejectWithValue }) => {
  try {
    await api.delete(CATALOG.BY_ID(id));
    return id;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to delete catalog item");
  }
});

// ── Export catalog ────────────────────────────────────────────────────────────
export const exportCatalogThunk = createAsyncThunk<
  void,
  "excel" | "csv",
  { rejectValue: string }
>("catalog/export", async (format, { rejectWithValue }) => {
  try {
    const res = await api.get(CATALOG.EXPORT(format), { responseType: "blob" });
    downloadBlob(res.data, `catalog.${format === "excel" ? "xlsx" : "csv"}`);
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to export catalog");
  }
});
