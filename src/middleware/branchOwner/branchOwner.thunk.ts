import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { BRANCH_OWNER } from "../../services/api/endpoints/branchOwner.endpoints";
import type { BranchOwnerSalon, BranchOwnerStats, BranchOwnerPayment, BranchOwnerDashboard } from "../../store/branchOwnerSlice";

export const fetchMySalonsThunk = createAsyncThunk<BranchOwnerSalon[], void, { rejectValue: string }>(
  "branchOwner/fetchMySalons",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(BRANCH_OWNER.SALONS);
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

export const fetchBranchOwnerPaymentsThunk = createAsyncThunk<BranchOwnerPayment[], string | undefined, { rejectValue: string }>(
  "branchOwner/fetchPayments",
  async (status, { rejectWithValue }) => {
    try {
      const params = status ? { status } : {};
      const res = await api.get(BRANCH_OWNER.PAYMENTS, { params });
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.error?.message ?? err?.message ?? "Failed to fetch payments");
    }
  }
);
