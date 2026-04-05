import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { SETTING } from "../../services/api/endpoints";
import { ApiError } from "../../services/api/interceptors";
import type {
  Setting,
  SettingResponse,
  SettingListResponse,
  CreateSettingPayload,
  UpdateSettingPayload,
} from "../../types/setting.types";

export const fetchSettingsThunk = createAsyncThunk<Setting[], void, { rejectValue: string }>(
  "setting/fetchAll", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get<SettingListResponse>(SETTING.BASE);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch settings");
  }
});

export const fetchSettingByIdThunk = createAsyncThunk<Setting, string | number, { rejectValue: string }>(
  "setting/fetchById", async (id, { rejectWithValue }) => {
  try {
    const res = await api.get<SettingResponse>(SETTING.BY_ID(id));
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch setting");
  }
});

export const createSettingThunk = createAsyncThunk<Setting, CreateSettingPayload, { rejectValue: string }>(
  "setting/create", async (payload, { rejectWithValue }) => {
  try {
    const res = await api.post<SettingResponse>(SETTING.BASE, payload);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to create setting");
  }
});

export const updateSettingThunk = createAsyncThunk<Setting, UpdateSettingPayload, { rejectValue: string }>(
  "setting/update", async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put<SettingResponse>(SETTING.BY_ID(id), data);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to update setting");
  }
});

export const deleteSettingThunk = createAsyncThunk<string | number, string | number, { rejectValue: string }>(
  "setting/delete", async (id, { rejectWithValue }) => {
  try {
    await api.delete(SETTING.BY_ID(id));
    return id;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to delete setting");
  }
});

export const exportSettingsThunk = createAsyncThunk<void, "excel" | "csv", { rejectValue: string }>(
  "setting/export", async (format, { rejectWithValue }) => {
  try {
    const res = await api.get(SETTING.EXPORT(format), { responseType: "blob" });
    const url  = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href  = url;
    link.setAttribute("download", `settings.${format === "excel" ? "xlsx" : "csv"}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to export settings");
  }
});
