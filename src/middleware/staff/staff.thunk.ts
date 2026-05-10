import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { STAFF } from "../../services/api/endpoints";
import { ApiError } from "../../services/api/interceptors";
import { downloadBlob } from "../../utils/downloadBlob";
import type {
  Staff,
  StaffResponse,
  CreateStaffPayload,
  UpdateStaffPayload,
} from "../../types/staff.types";

// ── Fetch all staff members ────────────────────────────────────────────────────
export const fetchStaffThunk = createAsyncThunk<
  Staff[],
  void,
  { rejectValue: string }
>("staff/fetchAll", async (_, { rejectWithValue, getState }) => {
  try {
    const state = getState() as any;
    const salonId = state.salon?.currentSalon?.id;
    const params = new URLSearchParams();
    if (salonId) params.set("salon_id", String(salonId));
    const res = await api.get<any>(`${STAFF.BASE}?${params.toString()}`);
    const data = res.data?.data;
    return Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch staff");
  }
});

// ── Fetch single staff member ──────────────────────────────────────────────────
export const fetchStaffByIdThunk = createAsyncThunk<
  Staff,
  string | number,
  { rejectValue: string }
>("staff/fetchById", async (id, { rejectWithValue }) => {
  try {
    const res = await api.get<StaffResponse>(STAFF.BY_ID(id));
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch staff member");
  }
});

// ── Create staff member ────────────────────────────────────────────────────────
export const createStaffThunk = createAsyncThunk<
  Staff,
  CreateStaffPayload,
  { rejectValue: string }
>("staff/create", async (payload, { rejectWithValue }) => {
  try {
    const res = await api.post<StaffResponse>(STAFF.BASE, payload);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to create staff member");
  }
});

// ── Update staff member ────────────────────────────────────────────────────────
export const updateStaffThunk = createAsyncThunk<
  Staff,
  UpdateStaffPayload,
  { rejectValue: string }
>("staff/update", async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.patch<StaffResponse>(STAFF.BY_ID(id), data);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to update staff member");
  }
});

// ── Delete staff member ────────────────────────────────────────────────────────
export const deleteStaffThunk = createAsyncThunk<
  string | number, // returns the deleted id so reducer can remove it
  string | number,
  { rejectValue: string }
>("staff/delete", async (id, { rejectWithValue, getState }) => {
  try {
    const state = getState() as any;
    const salonId = state.salon?.currentSalon?.id;
    const headers: Record<string, string> = {};
    if (salonId) headers["x-salon-id"] = String(salonId);
    const params = new URLSearchParams();
    if (salonId) params.set("salon_id", String(salonId));
    await api.delete(`${STAFF.BY_ID(id)}?${params.toString()}`, { headers });
    return id;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to delete staff member");
  }
});

// ── Export staff ───────────────────────────────────────────────────────────────
export const exportStaffThunk = createAsyncThunk<
  void,
  "excel" | "csv",
  { rejectValue: string }
>("staff/export", async (format, { rejectWithValue }) => {
  try {
    const res = await api.get(STAFF.EXPORT(format), { responseType: "blob" });
    downloadBlob(res.data, `staff.${format === "excel" ? "xlsx" : "csv"}`);
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to export staff");
  }
});

// ── Accept Invitation ──────────────────────────────────────────────────────────
export const acceptInviteThunk = createAsyncThunk<
  { staffId: string; accessToken: string; refreshToken: string; user: any; isOnboardingComplete: boolean },
  { token: string; first_name: string; last_name?: string; password: string },
  { rejectValue: string }
>("staff/acceptInvite", async (payload, { rejectWithValue }) => {
  try {
    const res = await api.post(STAFF.ACCEPT_INVITATION, payload);
    return res.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue(err.response?.data?.message || "Failed to accept invitation");
  }
});
