import { createAsyncThunk } from "@reduxjs/toolkit";
import { APP } from "../../services/api/endpoints";
import api from "../../services/api/axios";
import { ApiError } from "../../services/api/interceptors";
import { downloadBlob } from "../../utils/downloadBlob";
import type {
  ExternalApp,
  AppResponse,
  AppListResponse,
  ConnectAppPayload,
  UpdateAppPayload,
} from "../../types/app.types";

// ── Fetch all apps ─────────────────────────────────────────────────────────────
export const fetchAppsThunk = createAsyncThunk<
  ExternalApp[],
  void,
  { rejectValue: string }
>("app/fetchAll", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get<AppListResponse>(APP.BASE);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch apps");
  }
});

// ── Fetch single app ───────────────────────────────────────────────────────────
export const fetchAppByIdThunk = createAsyncThunk<ExternalApp, string | number, { rejectValue: string }>(
  "app/fetchById", async (id, { rejectWithValue }) => {
  try {
    const res = await api.get<AppResponse>(APP.BY_ID(id));
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch app");
  }
});

// ── Connect app ────────────────────────────────────────────────────────────────
export const connectAppThunk = createAsyncThunk<ExternalApp, ConnectAppPayload, { rejectValue: string }>(
  "app/connect", async (payload, { rejectWithValue }) => {
  try {
    const res = await api.post<AppResponse>(APP.BASE, payload);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to connect app");
  }
});

// ── Update app ─────────────────────────────────────────────────────────────────
export const updateAppThunk = createAsyncThunk<ExternalApp, UpdateAppPayload, { rejectValue: string }>(
  "app/update", async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put<AppResponse>(APP.BY_ID(id), data);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to update app");
  }
});

// ── Disconnect app ─────────────────────────────────────────────────────────────
export const disconnectAppThunk = createAsyncThunk<string | number, string | number, { rejectValue: string }>(
  "app/disconnect", async (id, { rejectWithValue }) => {
  try {
    await api.delete(APP.BY_ID(id));
    return id;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to disconnect app");
  }
});

// ── Export apps ────────────────────────────────────────────────────────────────
export const exportAppsThunk = createAsyncThunk<void, "excel" | "csv", { rejectValue: string }>(
  "app/export", async (format, { rejectWithValue }) => {
  try {
    const res = await api.get(APP.EXPORT(format), { responseType: "blob" });
    downloadBlob(res.data, `apps.${format === "excel" ? "xlsx" : "csv"}`);
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to export apps");
  }
});
