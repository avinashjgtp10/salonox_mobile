import { createSlice } from "@reduxjs/toolkit";

import {
  fetchSalonCommissionEarnedThunk,
  fetchSalonCommissionSummaryThunk,
  settleCommissionThunk,
} from "@/middleware/staff/salonCommissions.thunk";
import type { RootState } from "@/store";
import type {
  SalonCommissionRecord,
  SalonEarnedEntry,
  SalonCommissionSummary,
} from "@/types/salonCommissions";

type SalonCommissionsState = {
  earned: SalonEarnedEntry[];
  earnedError: string | null;
  earnedLoaded: boolean;
  earnedLoading: boolean;
  earnedRequestId: string | null;
  settlingStaffIds: string[];
  settleErrorByStaffId: Record<string, string | null>;
  summary: SalonCommissionSummary | null;
  summaryError: string | null;
  summaryLoading: boolean;
  summaryRequestId: string | null;
};

const initialState: SalonCommissionsState = {
  earned: [],
  earnedError: null,
  earnedLoaded: false,
  earnedLoading: false,
  earnedRequestId: null,
  settlingStaffIds: [],
  settleErrorByStaffId: {},
  summary: null,
  summaryError: null,
  summaryLoading: false,
  summaryRequestId: null,
};

// Backend statuses observed from the settlement endpoint ("pending",
// "partial", "paid"). The earned-by-staff endpoint doesn't return a status
// field directly, so it's derived from the same pending/paid amounts using
// that same backend-defined vocabulary rather than inventing a new one.
const deriveStatus = (pendingAmount: number, paidAmount: number): string => {
  if (pendingAmount <= 0) {
    return "paid";
  }

  if (paidAmount > 0) {
    return "partial";
  }

  return "pending";
};

const salonCommissionsSlice = createSlice({
  name: "salonCommissions",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSalonCommissionSummaryThunk.pending, (state, action) => {
        state.summaryError = null;
        state.summaryLoading = true;
        state.summaryRequestId = action.meta.requestId;
      })
      .addCase(fetchSalonCommissionSummaryThunk.fulfilled, (state, action) => {
        if (state.summaryRequestId !== action.meta.requestId) return;
        state.summary = action.payload;
        state.summaryError = null;
        state.summaryLoading = false;
        state.summaryRequestId = null;
      })
      .addCase(fetchSalonCommissionSummaryThunk.rejected, (state, action) => {
        if (state.summaryRequestId !== action.meta.requestId) return;
        state.summaryError =
          action.payload?.message ?? action.error.message ?? "Unable to load commission summary.";
        state.summaryLoading = false;
        state.summaryRequestId = null;
      })
      .addCase(fetchSalonCommissionEarnedThunk.pending, (state, action) => {
        state.earnedError = null;
        state.earnedLoading = true;
        state.earnedRequestId = action.meta.requestId;
      })
      .addCase(fetchSalonCommissionEarnedThunk.fulfilled, (state, action) => {
        if (state.earnedRequestId !== action.meta.requestId) return;
        state.earned = action.payload;
        state.earnedError = null;
        state.earnedLoaded = true;
        state.earnedLoading = false;
        state.earnedRequestId = null;
      })
      .addCase(fetchSalonCommissionEarnedThunk.rejected, (state, action) => {
        if (state.earnedRequestId !== action.meta.requestId) return;
        state.earnedError =
          action.payload?.message ?? action.error.message ?? "Unable to load earned commissions.";
        state.earnedLoading = false;
        state.earnedRequestId = null;
      })
      .addCase(settleCommissionThunk.pending, (state, action) => {
        const staffId = action.meta.arg.staffId;

        state.settleErrorByStaffId[staffId] = null;
        state.settlingStaffIds = [...state.settlingStaffIds, staffId];
      })
      .addCase(settleCommissionThunk.fulfilled, (state, action) => {
        const { staffId } = action.payload;

        state.settlingStaffIds = state.settlingStaffIds.filter((id) => id !== staffId);
      })
      .addCase(settleCommissionThunk.rejected, (state, action) => {
        const staffId = action.meta.arg.staffId;

        state.settleErrorByStaffId[staffId] =
          action.payload?.message ?? action.error.message ?? "Unable to settle commission.";
        state.settlingStaffIds = state.settlingStaffIds.filter((id) => id !== staffId);
      });
  },
});

export const selectSalonCommissionSummary = (state: RootState) => state.salonCommissions.summary;
export const selectSalonCommissionSummaryLoading = (state: RootState) =>
  state.salonCommissions.summaryLoading;
export const selectSalonCommissionSummaryError = (state: RootState) =>
  state.salonCommissions.summaryError;

export const selectSalonCommissionEarned = (state: RootState) => state.salonCommissions.earned;
export const selectSalonCommissionEarnedLoaded = (state: RootState) =>
  state.salonCommissions.earnedLoaded;
export const selectSalonCommissionEarnedLoading = (state: RootState) =>
  state.salonCommissions.earnedLoading;
export const selectSalonCommissionEarnedError = (state: RootState) =>
  state.salonCommissions.earnedError;

// The commission list is derived directly from the earned-by-staff data
// rather than tracked as separate state, so there is exactly one place that
// turns backend numbers into list rows (Mobile never computes commission
// amounts itself — it only reshapes what the backend already returned).
export const selectSalonCommissionRecords = (state: RootState): SalonCommissionRecord[] =>
  state.salonCommissions.earned.map((entry) => ({
    amount: entry.earnedAmount,
    id: entry.staffId || entry.id,
    period: entry.period,
    staffId: entry.staffId,
    staffName: entry.staffName,
    status: deriveStatus(entry.pendingAmount, entry.paidAmount),
    unpaidAmount: entry.pendingAmount,
  }));

export const selectCommissionSettling = (state: RootState, staffId?: string | null) =>
  staffId ? state.salonCommissions.settlingStaffIds.includes(staffId) : false;
export const selectCommissionSettleError = (state: RootState, staffId?: string | null) =>
  staffId ? state.salonCommissions.settleErrorByStaffId[staffId] ?? null : null;

export default salonCommissionsSlice.reducer;
