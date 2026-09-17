import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { SETTING } from "../../services/api/endpoints";
import { ApiError } from "../../services/api/interceptors";
import { downloadBlob } from "../../utils/downloadBlob";
import type {
  Setting,
  SettingResponse,
  CreateSettingPayload,
  UpdateSettingPayload,
} from "../../types/setting.types";

// ── Fetch all settings ─────────────────────────────────────────────────────────
export const fetchSettingsThunk = createAsyncThunk<
  Setting[],
  void,
  { rejectValue: string }
>("setting/fetchAll", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get(SETTING.BASE);
    const body = res.data;
    const raw = body?.data;
    // Paginated: { data: { items: [], total, ... } }
    if (raw && Array.isArray((raw as any).items)) return (raw as any).items as Setting[];
    // Plain array: { data: [] }
    if (Array.isArray(raw)) return raw as Setting[];
    // Nested: { data: { data: [], pagination } }
    if (raw && Array.isArray((raw as any).data)) return (raw as any).data as Setting[];
    // Body itself is an array
    if (Array.isArray(body)) return body as Setting[];
    console.warn("[fetchSettingsThunk] unrecognised shape — returning []", body);
    return [];
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch settings");
  }
});

// ── Fetch single setting ───────────────────────────────────────────────────────
export const fetchSettingByIdThunk = createAsyncThunk<
  Setting,
  string | number,
  { rejectValue: string }
>("setting/fetchById", async (id, { rejectWithValue }) => {
  try {
    const res = await api.get<SettingResponse>(SETTING.BY_ID(id));
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch setting");
  }
});

// ── Create setting ─────────────────────────────────────────────────────────────
export const createSettingThunk = createAsyncThunk<
  Setting,
  CreateSettingPayload,
  { rejectValue: string }
>("setting/create", async (payload, { rejectWithValue }) => {
  try {
    const res = await api.post<SettingResponse>(SETTING.BASE, payload);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to create setting");
  }
});

// ── Update setting ─────────────────────────────────────────────────────────────
export const updateSettingThunk = createAsyncThunk<
  Setting,
  UpdateSettingPayload,
  { rejectValue: string }
>("setting/update", async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put<SettingResponse>(SETTING.BY_ID(id), data);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to update setting");
  }
});

// ── Delete setting ─────────────────────────────────────────────────────────────
export const deleteSettingThunk = createAsyncThunk<
  string | number,
  string | number,
  { rejectValue: string }
>("setting/delete", async (id, { rejectWithValue }) => {
  try {
    await api.delete(SETTING.BY_ID(id));
    return id;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to delete setting");
  }
});

// ── Export settings ────────────────────────────────────────────────────────────
export const exportSettingsThunk = createAsyncThunk<
  void,
  "excel" | "csv",
  { rejectValue: string }
>("setting/export", async (format, { rejectWithValue }) => {
  try {
    const res = await api.get(SETTING.EXPORT(format), { responseType: "blob" });
    downloadBlob(res.data, `settings.${format === "excel" ? "xlsx" : "csv"}`);
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to export settings");
  }
});
