import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { USER } from "../../services/api/endpoints";
import { ApiError } from "../../services/api/interceptors";
import type {
  User,
  UpdateUserPayload,
} from "../../types/user.types";

// ── Backend raw response shape ─────────────────────────────────────────────────
interface BackendUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string | null;
  fullName?: string;
  phone?: string | null;
  businessName?: string | null;
  address?: string | null;
  country?: string | null;
  countryCode?: string | null;
  avatarUrl?: string | null;
  isOnboardingComplete?: boolean;
  custom_permissions?: Record<string, boolean> | null;
  role?: string;
  isVerified?: boolean;
  isActive?: boolean;
  createdAt?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

/** Normalizes the backend user shape → our frontend User type */
function toUser(raw: BackendUser): User {
  const fullName =
    raw.fullName?.trim() ||
    [raw.firstName, raw.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    "";
  return {
    id: raw.id,
    email: raw.email,
    fullName,
    phone: raw.phone ?? undefined,
    businessName: raw.businessName ?? undefined,
    address: raw.address ?? undefined,
    country: raw.country ?? undefined,
    countryCode: raw.countryCode ?? undefined,
    avatarUrl: raw.avatarUrl ?? undefined,
    isOnboardingComplete: raw.isOnboardingComplete,
    custom_permissions: raw.custom_permissions ?? null,
    role: raw.role ?? undefined,
    isVerified: raw.isVerified ?? undefined,
    isActive: raw.isActive ?? undefined,
    createdAt: raw.createdAt ?? undefined,
  };
}

// ── Fetch current user (me) ───────────────────────────────────────────────────
export const fetchMeThunk = createAsyncThunk<
  User,
  void,
  { rejectValue: string }
>("user/fetchMe", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get<ApiResponse<BackendUser>>(USER.ME);
    if (import.meta.env.DEV) {
      console.log("[Auth] Raw /users/me response:", res.data.data);
      console.log("[Auth] custom_permissions from /users/me:", res.data.data.custom_permissions ?? "NOT IN RESPONSE");
    }
    return toUser(res.data.data);
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch user profile");
  }
});

// ── Update current user (me) ──────────────────────────────────────────────────
export const updateUserThunk = createAsyncThunk<
  User,
  UpdateUserPayload,
  { rejectValue: string }
>("user/update", async (payload, { rejectWithValue }) => {
  try {
    // Split fullName back to firstName/lastName for the backend
    const fullName = (payload.fullName || "").trim();
    const parts = fullName.split(/\s+/);
    const firstName = parts[0] || "";
    const lastName = parts.length > 1 ? parts.slice(1).join(" ") : undefined;

    const body: Record<string, any> = {
      firstName,
      ...(lastName !== undefined && { lastName }),
      ...(payload.phone !== undefined && { phone: payload.phone }),
      ...(payload.businessName !== undefined && { businessName: payload.businessName }),
      ...(payload.address !== undefined && { address: payload.address }),
      ...(payload.country !== undefined && { country: payload.country }),
      ...(payload.countryCode !== undefined && { countryCode: payload.countryCode }),
      ...(payload.avatarUrl !== undefined && { avatarUrl: payload.avatarUrl }),
    };

    const res = await api.patch<ApiResponse<BackendUser>>(USER.UPDATE_ME, body);
    return toUser(res.data.data);
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to update user profile");
  }
});

// ── Change password ───────────────────────────────────────────────────────────
export const changePasswordThunk = createAsyncThunk<
  void,
  { currentPassword: string; newPassword: string },
  { rejectValue: string }
>("user/changePassword", async ({ currentPassword, newPassword }, { rejectWithValue }) => {
  try {
    await api.post(USER.CHANGE_PASSWORD, { currentPassword, newPassword });
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to change password");
  }
});

// ── Upload avatar ─────────────────────────────────────────────────────────────
export const uploadAvatarThunk = createAsyncThunk<
  string,       // returns the new avatarUrl
  File,
  { rejectValue: string }
>("user/uploadAvatar", async (file, { rejectWithValue }) => {
  try {
    const formData = new FormData();
    formData.append("avatar", file);
    const res = await api.post<ApiResponse<{ avatarUrl: string }>>(
      USER.UPLOAD_AVATAR,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return res.data.data.avatarUrl;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to upload avatar");
  }
});
