import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { SUPER_ADMIN } from "../../services/api/endpoints/superAdmin.endpoints";
import type { SuperAdminStats, SuperAdminSalon, SuperAdminPayment, SuperAdminUser, SuperAdminDemoRequest, SuperAdminSalonStaff } from "../../store/superAdminSlice";

// ── FREQUENT LOGINS ────────────────────────────────────────────────────────────

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

export const impersonateSalonThunk = createAsyncThunk<{ token: string; refreshToken?: string; isOnboardingComplete?: boolean }, string, { rejectValue: string }>(
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

export const deleteSalonThunk = createAsyncThunk<void, string, { rejectValue: string }>(
  "superAdmin/deleteSalon",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(SUPER_ADMIN.SALON_DELETE(id));
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.error?.message ?? err?.message ?? "Failed to delete salon");
    }
  }
);

// Returns just the cleared salon's id so the reducer can patch only that
// row in state.salons (staff/client/booking/revenue counts reset to 0)
// instead of forcing a full re-fetch of every other unrelated row.
export const clearSalonDataThunk = createAsyncThunk<string, string, { rejectValue: string }>(
  "superAdmin/clearSalonData",
  async (id, { rejectWithValue }) => {
    try {
      await api.post(SUPER_ADMIN.SALON_CLEAR_DATA(id));
      return id;
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.error?.message ?? err?.message ?? "Failed to clear salon data");
    }
  }
);

export const fetchSalonStaffThunk = createAsyncThunk<SuperAdminSalonStaff[], string, { rejectValue: string }>(
  "superAdmin/fetchSalonStaff",
  async (salonId, { rejectWithValue }) => {
    try {
      const res = await api.get(SUPER_ADMIN.SALON_STAFF(salonId));
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      return rejectWithValue(err?.message ?? "Failed to fetch salon staff");
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

export const fetchSuperAdminUsersThunk = createAsyncThunk<SuperAdminUser[], { search?: string; role?: string; min_logins?: number } | undefined, { rejectValue: string }>(
  "superAdmin/fetchUsers",
  async (filters, { rejectWithValue }) => {
    try {
      const params: Record<string, string> = {};
      if (filters?.search)     params.search     = filters.search;
      if (filters?.role)       params.role       = filters.role;
      if (filters?.min_logins) params.min_logins = String(filters.min_logins);
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

export const deleteUserThunk = createAsyncThunk<void, { id: string; force?: boolean }, { rejectValue: { message: string; code?: string } }>(
  "superAdmin/deleteUser",
  async ({ id, force }, { rejectWithValue }) => {
    try {
      await api.delete(SUPER_ADMIN.USER_DELETE(id), { params: force ? { force: true } : undefined });
    } catch (err: any) {
      const code = err?.response?.data?.error?.code;
      const message = err?.response?.data?.error?.message ?? err?.message ?? "Failed to delete user";
      return rejectWithValue({ message, code });
    }
  }
);

export const createUserThunk = createAsyncThunk<any, { first_name: string; last_name?: string; email: string; password: string; phone?: string; role: string; business_name?: string; address?: string }, { rejectValue: string }>(
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

export const impersonateUserThunk = createAsyncThunk<{ token: string; refreshToken?: string; isOnboardingComplete: boolean }, string, { rejectValue: string }>(
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

export const updateSalonPermissionsThunk = createAsyncThunk<any, { salonId: string; permissions: Record<string, { owner: boolean; staff: boolean; manager: boolean }> }, { rejectValue: string }>(
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

// ── SUBSCRIPTION PERMISSIONS ─────────────────────────────────────────────────

export const searchSalonsForSubscriptionPermissionsThunk = createAsyncThunk<any[], string, { rejectValue: string }>(
  "superAdmin/searchSalonsForSubscriptionPermissions",
  async (q, { rejectWithValue }) => {
    try {
      const res = await api.get(SUPER_ADMIN.SUBSCRIPTION_PERMISSIONS_SEARCH, { params: { q } });
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      return rejectWithValue(err?.message ?? "Search failed");
    }
  }
);

export const fetchSubscriptionPermissionsByIdThunk = createAsyncThunk<any, string, { rejectValue: string }>(
  "superAdmin/fetchSubscriptionPermissionsById",
  async (salonId, { rejectWithValue }) => {
    try {
      const res = await api.get(SUPER_ADMIN.SUBSCRIPTION_PERMISSIONS_GET(salonId));
      return res.data?.data ?? res.data;
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.error?.message ?? err?.message ?? "Salon not found");
    }
  }
);

export const updateSubscriptionPermissionsThunk = createAsyncThunk<any, { salonId: string; permissions: Record<string, boolean> }, { rejectValue: string }>(
  "superAdmin/updateSubscriptionPermissions",
  async ({ salonId, permissions }, { rejectWithValue }) => {
    try {
      const res = await api.put(SUPER_ADMIN.SUBSCRIPTION_PERMISSIONS_PUT(salonId), { permissions });
      return res.data?.data ?? res.data;
    } catch (err: any) {
      return rejectWithValue(err?.message ?? "Failed to save permissions");
    }
  }
);

export const applySubscriptionThunk = createAsyncThunk<any, { salonId: string; startDate: string; endDate: string }, { rejectValue: string }>(
  "superAdmin/applySubscription",
  async ({ salonId, startDate, endDate }, { rejectWithValue }) => {
    try {
      const res = await api.post(SUPER_ADMIN.SUBSCRIPTION_APPLY(salonId), { start_date: startDate, end_date: endDate });
      return res.data?.data ?? res.data;
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.error?.message ?? err?.message ?? "Failed to apply subscription");
    }
  }
);

export const removeSubscriptionThunk = createAsyncThunk<any, string, { rejectValue: string }>(
  "superAdmin/removeSubscription",
  async (salonId, { rejectWithValue }) => {
    try {
      const res = await api.post(SUPER_ADMIN.SUBSCRIPTION_REMOVE(salonId), {});
      return res.data?.data ?? res.data;
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.error?.message ?? err?.message ?? "Failed to remove subscription");
    }
  }
);

export const fetchSubscriptionPermissionAuditLogThunk = createAsyncThunk<any[], string, { rejectValue: string }>(
  "superAdmin/fetchSubscriptionPermissionAuditLog",
  async (salonId, { rejectWithValue }) => {
    try {
      const res = await api.get(SUPER_ADMIN.SUBSCRIPTION_PERMISSIONS_AUDIT_LOG(salonId));
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      return rejectWithValue(err?.message ?? "Failed to load audit log");
    }
  }
);

export const grantSubscriptionDaysThunk = createAsyncThunk<any, { salonId: string; days: number }, { rejectValue: string }>(
  "superAdmin/grantSubscriptionDays",
  async ({ salonId, days }, { rejectWithValue }) => {
    try {
      const res = await api.post(SUPER_ADMIN.SUBSCRIPTION_GRANT_DAYS(salonId), { days });
      return res.data?.data ?? res.data;
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.error?.message ?? err?.message ?? "Failed to grant days");
    }
  }
);

// ── DEMO INQUIRIES ────────────────────────────────────────────────────────────

export const fetchSuperAdminDemoRequestsThunk = createAsyncThunk<SuperAdminDemoRequest[], { search?: string } | undefined, { rejectValue: string }>(
  "superAdmin/fetchDemoRequests",
  async (filters, { rejectWithValue }) => {
    try {
      const params: Record<string, string> = {};
      if (filters?.search) params.search = filters.search;
      const res = await api.get(SUPER_ADMIN.DEMO_REQUESTS, { params });
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      return rejectWithValue(err?.message ?? "Failed to fetch demo requests");
    }
  }
);

export const setDemoRequestStatusThunk = createAsyncThunk<SuperAdminDemoRequest, { id: string; status: string }, { rejectValue: string }>(
  "superAdmin/setDemoRequestStatus",
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const res = await api.patch(SUPER_ADMIN.DEMO_REQUEST_STATUS(id), { status });
      return res.data?.data ?? res.data;
    } catch (err: any) {
      return rejectWithValue(err?.message ?? "Failed to update status");
    }
  }
);

