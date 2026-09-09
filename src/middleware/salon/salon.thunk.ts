import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { SALON } from "../../services/api/endpoints";
import { ApiError } from "../../services/api/interceptors";
import type {
  CreateSalonPayload,
  UpdateSalonPayload,
  CreateSalonResponse,
  ApiResponse,
  Salon,
  Branch,
  CreateBranchPayload,
  UpdateBranchPayload,
} from "../../types/salon.types";

// ── Save Salon (Create or Update) ─────────────────────────────────────────────
export const saveSalonThunk = createAsyncThunk<
  {
    salon: Salon;
    accessToken: string | null;
    refreshToken: string | null;
    isOnboardingComplete: boolean;
  },
  CreateSalonPayload,
  { rejectValue: string }
>("salon/save", async (payload, { rejectWithValue }) => {
  try {
    // Step 1 — check if salon already exists
    let existingSalonId: string | null = null;
    try {
      const existing = await api.get<ApiResponse<Salon>>(SALON.ME);
      existingSalonId = existing.data.data?.id ?? null;
    } catch {
      // 404 = no salon yet → will create below
      existingSalonId = null;
    }

    // Step 2 — update or create
    if (existingSalonId) {
      const res = await api.patch<ApiResponse<Salon>>(
        SALON.UPDATE(existingSalonId),
        payload,
      );
      return {
        salon: res.data.data,
        accessToken: null, // no new token on update
        refreshToken: null,
        isOnboardingComplete: true,
      };
    } else {
      const res = await api.post<CreateSalonResponse>(SALON.CREATE, payload);
      return {
        salon: res.data.data.salon,
        accessToken: res.data.data.accessToken,
        refreshToken: res.data.data.refreshToken,
        isOnboardingComplete: true,
      };
    }
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to save salon. Please try again.");
  }
});

// ── Get My Salon ──────────────────────────────────────────────────────────────
export const getMySalonThunk = createAsyncThunk<
  Salon,
  void,
  { rejectValue: string }
>("salon/getMe", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get<ApiResponse<Salon>>(SALON.ME);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch salon.");
  }
});

// ── Get Salon By ID ───────────────────────────────────────────────────────────
export const getSalonByIdThunk = createAsyncThunk<
  Salon,
  string,
  { rejectValue: string }
>("salon/getById", async (id, { rejectWithValue }) => {
  try {
    const res = await api.get<ApiResponse<Salon>>(SALON.BY_ID(id));
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch salon.");
  }
});

// ── Update Salon ──────────────────────────────────────────────────────────────
export const updateSalonThunk = createAsyncThunk<
  Salon,
  { id: string; payload: UpdateSalonPayload },
  { rejectValue: string }
>("salon/update", async ({ id, payload }, { rejectWithValue }) => {
  try {
    const res = await api.patch<ApiResponse<Salon>>(SALON.UPDATE(id), payload);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to update salon.");
  }
});

// ── Fetch Branches By Salon ───────────────────────────────────────────────────
export const fetchBranchesThunk = createAsyncThunk<
  Branch[],
  string,
  { rejectValue: string }
>("salon/fetchBranches", async (salonId, { rejectWithValue }) => {
  try {
    const res = await api.get<ApiResponse<Branch[]>>(SALON.BRANCHES_BY_SALON(salonId));
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch branches.");
  }
});

// ── Create Branch ─────────────────────────────────────────────────────────────
export const createBranchThunk = createAsyncThunk<
  Branch,
  CreateBranchPayload,
  { rejectValue: string }
>("salon/createBranch", async (payload, { rejectWithValue }) => {
  try {
    const res = await api.post<ApiResponse<Branch>>(SALON.CREATE_BRANCH, payload);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to create branch.");
  }
});

// ── Update Branch ─────────────────────────────────────────────────────────────
export const updateBranchThunk = createAsyncThunk<
  Branch,
  { id: string; data: UpdateBranchPayload },
  { rejectValue: string }
>("salon/updateBranch", async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.patch<ApiResponse<Branch>>(SALON.BRANCH_BY_ID(id), data);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to update branch.");
  }
});
