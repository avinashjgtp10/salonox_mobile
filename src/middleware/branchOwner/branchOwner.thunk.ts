import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { BRANCH_OWNER } from "../../services/api/endpoints/branchOwner.endpoints";
import type { BranchOwnerSalon, BranchOwnerStats, BranchOwnerPayment, BranchOwnerDashboard } from "../../store/branchOwnerSlice";
import type { Staff } from "../../types/staff.types";
import type { Subscription, SubscriptionPlan, Invoice } from "../../features/billing/types/billing.types";

// One POST call for the whole My Salons page — replaces the old GET.
export const fetchMySalonsThunk = createAsyncThunk<BranchOwnerSalon[], void, { rejectValue: string }>(
  "branchOwner/fetchMySalons",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.post(BRANCH_OWNER.SALONS_LIST);
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.error?.message ?? err?.message ?? "Failed to fetch salons");
    }
  }
);

export const enterSalonThunk = createAsyncThunk<{ token: string; isOnboardingComplete: boolean }, string, { rejectValue: string }>(
  "branchOwner/enterSalon",
  async (salonId, { rejectWithValue }) => {
    try {
      const res = await api.post(BRANCH_OWNER.SALON_ENTER(salonId));
      return res.data?.data ?? res.data;
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.error?.message ?? err?.message ?? "Failed to enter salon");
    }
  }
);

export const resetSalonOwnerPasswordThunk = createAsyncThunk<void, { salonId: string; password: string }, { rejectValue: string }>(
  "branchOwner/resetSalonOwnerPassword",
  async ({ salonId, password }, { rejectWithValue }) => {
    try {
      await api.post(BRANCH_OWNER.SALON_RESET_PASSWORD(salonId), { password });
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.error?.message ?? err?.message ?? "Failed to reset password");
    }
  }
);

export const deleteSalonThunk = createAsyncThunk<string, string, { rejectValue: string }>(
  "branchOwner/deleteSalon",
  async (salonId, { rejectWithValue }) => {
    try {
      await api.delete(BRANCH_OWNER.SALON_DELETE(salonId));
      return salonId;
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.error?.message ?? err?.message ?? "Failed to delete salon");
    }
  }
);

// Single combined call for the dashboard — replaces the old separate
// stats/payments thunks used there, which hit /stats and /payments routes
// that never existed on the backend and silently 404'd (see
// BranchOwnerDashboardPage). The standalone Payments page below still uses
// its own dedicated (now-implemented) /payments endpoint, since it needs
// the full list with server-side status filtering, not just a "recent 10".
export const fetchBranchOwnerDashboardThunk = createAsyncThunk<BranchOwnerDashboard, void, { rejectValue: string }>(
  "branchOwner/fetchDashboard",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(BRANCH_OWNER.DASHBOARD);
      return res.data?.data ?? res.data;
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.error?.message ?? err?.message ?? "Failed to fetch dashboard");
    }
  }
);

// One POST call for the whole Payments page — status filter travels in the
// body instead of the query string.
export const fetchBranchOwnerPaymentsThunk = createAsyncThunk<BranchOwnerPayment[], string | undefined, { rejectValue: string }>(
  "branchOwner/fetchPayments",
  async (status, { rejectWithValue }) => {
    try {
      const body = status ? { status } : {};
      const res = await api.post(BRANCH_OWNER.PAYMENTS_LIST, body);
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.error?.message ?? err?.message ?? "Failed to fetch payments");
    }
  }
);

export const fetchSalonStaffThunk = createAsyncThunk<Staff[], string, { rejectValue: string }>(
  "branchOwner/fetchSalonStaff",
  async (salonId, { rejectWithValue }) => {
    try {
      const res = await api.get(BRANCH_OWNER.SALON_STAFF(salonId));
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.error?.message ?? err?.message ?? "Failed to fetch staff");
    }
  }
);

// One POST call for the whole Staff & Permissions page — replaces the old
// per-salon fan-out (one fetchSalonStaffThunk per assigned salon fired from
// the browser). The backend now does that fan-out itself and returns one
// combined list, each row already tagged with salonId/salonName.
export const fetchAllStaffThunk = createAsyncThunk<Staff[], void, { rejectValue: string }>(
  "branchOwner/fetchAllStaff",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.post(BRANCH_OWNER.STAFF_LIST);
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.error?.message ?? err?.message ?? "Failed to fetch staff");
    }
  }
);

export const updateSalonStaffPermissionsThunk = createAsyncThunk<
  Staff,
  { salonId: string; staffId: string; customPermissions: Record<string, boolean> | null },
  { rejectValue: string }
>(
  "branchOwner/updateSalonStaffPermissions",
  async ({ salonId, staffId, customPermissions }, { rejectWithValue }) => {
    try {
      const res = await api.patch(BRANCH_OWNER.SALON_STAFF_PERMISSIONS(salonId, staffId), { custom_permissions: customPermissions });
      return res.data?.data ?? res.data;
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.error?.message ?? err?.message ?? "Failed to update permissions");
    }
  }
);

export const fetchSalonSubscriptionThunk = createAsyncThunk<
  { subscription: Subscription | null; plan: SubscriptionPlan | null },
  string,
  { rejectValue: string }
>(
  "branchOwner/fetchSalonSubscription",
  async (salonId, { rejectWithValue }) => {
    try {
      const res = await api.get(BRANCH_OWNER.SALON_SUBSCRIPTION(salonId));
      return res.data?.data ?? { subscription: null, plan: null };
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.error?.message ?? err?.message ?? "Failed to fetch subscription");
    }
  }
);

export const fetchSalonInvoicesThunk = createAsyncThunk<Invoice[], string, { rejectValue: string }>(
  "branchOwner/fetchSalonInvoices",
  async (salonId, { rejectWithValue }) => {
    try {
      const res = await api.get(BRANCH_OWNER.SALON_INVOICES(salonId));
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.error?.message ?? err?.message ?? "Failed to fetch invoices");
    }
  }
);

export const submitBranchOwnerSupportTicketThunk = createAsyncThunk<
  { id: string },
  { salonId: string; subject: string; category: string; message: string; priority?: string },
  { rejectValue: string }
>(
  "branchOwner/submitSupportTicket",
  async (body, { rejectWithValue }) => {
    try {
      const res = await api.post(BRANCH_OWNER.SUPPORT, body);
      return res.data?.data ?? res.data;
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.error?.message ?? err?.message ?? "Failed to submit issue");
    }
  }
);
