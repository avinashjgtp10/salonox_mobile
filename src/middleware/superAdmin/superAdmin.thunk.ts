import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { SUPER_ADMIN } from "../../services/api/endpoints/superAdmin.endpoints";
import type { SuperAdminStats, SuperAdminSalon, SuperAdminPayment, SuperAdminUser } from "../../store/superAdminSlice";

// ── RECENT / FREQUENT LOGINS ──────────────────────────────────────────────────

export const fetchRecentLoginsThunk = createAsyncThunk<any[], number | undefined, { rejectValue: string }>(
  "superAdmin/fetchRecentLogins",
  async (limit = 10, { rejectWithValue }) => {
    try {
      const res = await api.get(SUPER_ADMIN.RECENT_LOGINS, { params: { limit } });
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      return rejectWithValue(err?.message ?? "Failed to fetch recent logins");
    }
  }
);

export const fetchFrequentLoginsThunk = createAsyncThunk<any[], number | undefined, { rejectValue: string }>(
  "superAdmin/fetchFrequentLogins",
  async (limit = 10, { rejectWithValue }) => {
    try {
      const res = await api.get(SUPER_ADMIN.FREQUENT_LOGINS, { params: { limit } });
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      return rejectWithValue(err?.message ?? "Failed to fetch frequent logins");
    }
  }
);

export const fetchUsersNoPlanThunk = createAsyncThunk<any[], number | undefined, { rejectValue: string }>(
  "superAdmin/fetchUsersNoPlan",
  async (limit = 20, { rejectWithValue }) => {
    try {
      const res = await api.get(SUPER_ADMIN.USERS_NO_PLAN, { params: { limit } });
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      return rejectWithValue(err?.message ?? "Failed to fetch users without plan");
    }
  }
);

// ── STATS ─────────────────────────────────────────────────────────────────────

export const fetchSuperAdminStatsThunk = createAsyncThunk<SuperAdminStats, void, { rejectValue: string }>(
  "superAdmin/fetchStats",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(SUPER_ADMIN.STATS);
      return res.data?.data ?? res.data;
    } catch (err: any) {
      return rejectWithValue(err?.message ?? "Failed to fetch stats");
    }
  }
);

// ── SALONS ────────────────────────────────────────────────────────────────────

export const fetchSuperAdminSalonsThunk = createAsyncThunk<SuperAdminSalon[], string | undefined, { rejectValue: string }>(
  "superAdmin/fetchSalons",
  async (search, { rejectWithValue }) => {
    try {
      const params = search ? { search } : {};
      const res = await api.get(SUPER_ADMIN.SALONS, { params });
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      return rejectWithValue(err?.message ?? "Failed to fetch salons");
    }
  }
);

export const setSalonStatusThunk = createAsyncThunk<void, { id: string; is_active: boolean }, { rejectValue: string }>(
  "superAdmin/setSalonStatus",
  async ({ id, is_active }, { rejectWithValue }) => {
    try {
      await api.patch(SUPER_ADMIN.SALON_STATUS(id), { is_active });
    } catch (err: any) {
      return rejectWithValue(err?.message ?? "Failed to update salon");
    }
  }
);

export const forceOnboardingThunk = createAsyncThunk<void, string, { rejectValue: string }>(
  "superAdmin/forceOnboarding",
  async (id, { rejectWithValue }) => {
    try {
      await api.patch(SUPER_ADMIN.SALON_ONBOARD(id));
    } catch (err: any) {
      return rejectWithValue(err?.message ?? "Failed");
    }
  }
);

export const impersonateSalonThunk = createAsyncThunk<{ token: string }, string, { rejectValue: string }>(
  "superAdmin/impersonate",
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.post(SUPER_ADMIN.SALON_IMPERSONATE(id));
      return res.data?.data ?? res.data;
    } catch (err: any) {
      return rejectWithValue(err?.message ?? "Failed");
    }
  }
);

// ── PAYMENTS ──────────────────────────────────────────────────────────────────

export const fetchSuperAdminPaymentsThunk = createAsyncThunk<SuperAdminPayment[], string | undefined, { rejectValue: string }>(
  "superAdmin/fetchPayments",
  async (status, { rejectWithValue }) => {
    try {
      const params = status ? { status } : {};
      const res = await api.get(SUPER_ADMIN.PAYMENTS, { params });
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      return rejectWithValue(err?.message ?? "Failed to fetch payments");
    }
  }
);

// ── USERS ─────────────────────────────────────────────────────────────────────

export const fetchSuperAdminUsersThunk = createAsyncThunk<SuperAdminUser[], { search?: string; role?: string } | undefined, { rejectValue: string }>(
  "superAdmin/fetchUsers",
  async (filters, { rejectWithValue }) => {
    try {
      const params: Record<string, string> = {};
      if (filters?.search) params.search = filters.search;
      if (filters?.role)   params.role   = filters.role;
      const res = await api.get(SUPER_ADMIN.USERS, { params });
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      return rejectWithValue(err?.message ?? "Failed to fetch users");
    }
  }
);

export const setUserStatusThunk = createAsyncThunk<void, { id: string; is_active: boolean }, { rejectValue: string }>(
  "superAdmin/setUserStatus",
  async ({ id, is_active }, { rejectWithValue }) => {
    try {
      await api.patch(SUPER_ADMIN.USER_STATUS(id), { is_active });
    } catch (err: any) {
      return rejectWithValue(err?.message ?? "Failed");
    }
  }
);

export const setUserRoleThunk = createAsyncThunk<void, { id: string; role: string }, { rejectValue: string }>(
  "superAdmin/setUserRole",
  async ({ id, role }, { rejectWithValue }) => {
    try {
      await api.patch(SUPER_ADMIN.USER_ROLE(id), { role });
    } catch (err: any) {
      return rejectWithValue(err?.message ?? "Failed");
    }
  }
);

export const resetUserPasswordThunk = createAsyncThunk<void, { id: string; password: string }, { rejectValue: string }>(
  "superAdmin/resetPassword",
  async ({ id, password }, { rejectWithValue }) => {
    try {
      await api.post(SUPER_ADMIN.USER_RESET_PW(id), { password });
    } catch (err: any) {
      return rejectWithValue(err?.message ?? "Failed");
    }
  }
);

export const deleteUserThunk = createAsyncThunk<void, string, { rejectValue: string }>(
  "superAdmin/deleteUser",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(SUPER_ADMIN.USER_DELETE(id));
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.error?.message ?? err?.message ?? "Failed to delete user");
    }
  }
);

export const createUserThunk = createAsyncThunk<any, { first_name: string; last_name?: string; email: string; password: string; phone?: string; role: string }, { rejectValue: string }>(
  "superAdmin/createUser",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post(SUPER_ADMIN.USER_CREATE, payload);
      return res.data?.data ?? res.data;
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.error?.message ?? err?.message ?? "Failed to create user");
    }
  }
);

export const impersonateUserThunk = createAsyncThunk<{ token: string; isOnboardingComplete: boolean }, string, { rejectValue: string }>(
  "superAdmin/impersonateUser",
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.post(SUPER_ADMIN.USER_IMPERSONATE(id));
      return res.data?.data ?? res.data;
    } catch (err: any) {
      return rejectWithValue(err?.message ?? "Failed");
    }
  }
);

// ── SALON PERMISSIONS ─────────────────────────────────────────────────────────

export const searchSalonsForPermissionsThunk = createAsyncThunk<any[], string, { rejectValue: string }>(
  "superAdmin/searchSalonsForPermissions",
  async (q, { rejectWithValue }) => {
    try {
      const res = await api.get(SUPER_ADMIN.SALON_PERMISSIONS_SEARCH, { params: { q } });
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      return rejectWithValue(err?.message ?? "Search failed");
    }
  }
);

export const fetchSalonPermissionsByIdThunk = createAsyncThunk<any, string, { rejectValue: string }>(
  "superAdmin/fetchSalonPermissionsById",
  async (salonId, { rejectWithValue }) => {
    try {
      const res = await api.get(SUPER_ADMIN.SALON_PERMISSIONS_GET(salonId));
      return res.data?.data ?? res.data;
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.error?.message ?? err?.message ?? "Salon not found");
    }
  }
);

export const updateSalonPermissionsThunk = createAsyncThunk<any, { salonId: string; permissions: Record<string, { owner: boolean; staff: boolean }> }, { rejectValue: string }>(
  "superAdmin/updateSalonPermissions",
  async ({ salonId, permissions }, { rejectWithValue }) => {
    try {
      const res = await api.put(SUPER_ADMIN.SALON_PERMISSIONS_PUT(salonId), { permissions });
      return res.data?.data ?? res.data;
    } catch (err: any) {
      return rejectWithValue(err?.message ?? "Failed to save permissions");
    }
  }
);

// ── BILLING ───────────────────────────────────────────────────────────────────

export const fetchSuperAdminSubscriptionsThunk = createAsyncThunk<any[], string | undefined, { rejectValue: string }>(
  "superAdmin/fetchSubscriptions",
  async (status, { rejectWithValue }) => {
    try {
      const params = status ? { status } : {};
      const res = await api.get(SUPER_ADMIN.SUBSCRIPTIONS, { params });
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      return rejectWithValue(err?.message ?? "Failed");
    }
  }
);

export const fetchSuperAdminPlansThunk = createAsyncThunk<any[], void, { rejectValue: string }>(
  "superAdmin/fetchPlans",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(SUPER_ADMIN.PLANS);
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      return rejectWithValue(err?.message ?? "Failed");
    }
  }
);
