import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { BRANCH_OWNER } from "../../services/api/endpoints/branchOwner.endpoints";
import type { BranchOwnerSalon } from "../../store/branchOwnerSlice";

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
