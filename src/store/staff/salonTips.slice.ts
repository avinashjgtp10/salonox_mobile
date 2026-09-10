import { createSlice } from "@reduxjs/toolkit";

import {
  fetchSalonTipEarnedThunk,
  fetchSalonTipSummaryThunk,
  fetchTipSettlementsThunk,
  settleTipThunk,
} from "@/middleware/staff/salonTips.thunk";
import type { RootState } from "@/store";
import type {
  SalonTipEarnedEntry,
  SalonTipRecord,
  SalonTipSettlement,
  SalonTipSummary,
} from "@/types/salonTips";

type SalonTipsState = {
  earned: SalonTipEarnedEntry[];
  earnedError: string | null;
  earnedLoaded: boolean;
  earnedLoading: boolean;
  earnedRequestId: string | null;
  settlementsByStaffId: Record<string, SalonTipSettlement[]>;
  settlementsErrorByStaffId: Record<string, string | null>;
  settlementsLoadedStaffIds: string[];
  settlementsLoadingStaffIds: string[];
  settlingStaffIds: string[];
  settleErrorByStaffId: Record<string, string | null>;
  summary: SalonTipSummary | null;
  summaryError: string | null;
  summaryLoading: boolean;
  summaryRequestId: string | null;
};

const initialState: SalonTipsState = {
  earned: [],
  earnedError: null,
  earnedLoaded: false,
  earnedLoading: false,
  earnedRequestId: null,
  settlementsByStaffId: {},
  settlementsErrorByStaffId: {},
  settlementsLoadedStaffIds: [],
  settlementsLoadingStaffIds: [],
  settlingStaffIds: [],
  settleErrorByStaffId: {},
  summary: null,
  summaryError: null,
  summaryLoading: false,
  summaryRequestId: null,
};

const deriveStatus = (pendingAmount: number, paidAmount: number): string => {
  if (pendingAmount <= 0) {
    return "paid";
  }

  if (paidAmount > 0) {
    return "partial";
  }

  return "pending";
};

const salonTipsSlice = createSlice({
  name: "salonTips",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSalonTipSummaryThunk.pending, (state, action) => {
        state.summaryError = null;
        state.summaryLoading = true;
        state.summaryRequestId = action.meta.requestId;
      })
      .addCase(fetchSalonTipSummaryThunk.fulfilled, (state, action) => {
        if (state.summaryRequestId !== action.meta.requestId) return;
        state.summary = action.payload;
        state.summaryError = null;
        state.summaryLoading = false;
        state.summaryRequestId = null;
      })
      .addCase(fetchSalonTipSummaryThunk.rejected, (state, action) => {
        if (state.summaryRequestId !== action.meta.requestId) return;
        state.summaryError =
          action.payload?.message ?? action.error.message ?? "Unable to load tip summary.";
        state.summaryLoading = false;
        state.summaryRequestId = null;
      })
      .addCase(fetchSalonTipEarnedThunk.pending, (state, action) => {
        state.earnedError = null;
        state.earnedLoading = true;
        state.earnedRequestId = action.meta.requestId;
      })
      .addCase(fetchSalonTipEarnedThunk.fulfilled, (state, action) => {
        if (state.earnedRequestId !== action.meta.requestId) return;
        state.earned = action.payload;
        state.earnedError = null;
        state.earnedLoaded = true;
        state.earnedLoading = false;
        state.earnedRequestId = null;
      })
      .addCase(fetchSalonTipEarnedThunk.rejected, (state, action) => {
        if (state.earnedRequestId !== action.meta.requestId) return;
        state.earnedError =
          action.payload?.message ?? action.error.message ?? "Unable to load earned tips.";
        state.earnedLoading = false;
        state.earnedRequestId = null;
      })
      .addCase(fetchTipSettlementsThunk.pending, (state, action) => {
        const staffId = action.meta.arg;

        state.settlementsErrorByStaffId[staffId] = null;
        state.settlementsLoadingStaffIds = state.settlementsLoadingStaffIds.includes(staffId)
          ? state.settlementsLoadingStaffIds
          : [...state.settlementsLoadingStaffIds, staffId];
      })
      .addCase(fetchTipSettlementsThunk.fulfilled, (state, action) => {
        const { settlements, staffId } = action.payload;

        state.settlementsByStaffId[staffId] = settlements;
        state.settlementsLoadedStaffIds = state.settlementsLoadedStaffIds.includes(staffId)
          ? state.settlementsLoadedStaffIds
          : [...state.settlementsLoadedStaffIds, staffId];
        state.settlementsLoadingStaffIds = state.settlementsLoadingStaffIds.filter(
          (id) => id !== staffId,
        );
      })
      .addCase(fetchTipSettlementsThunk.rejected, (state, action) => {
        const staffId = action.meta.arg;

        state.settlementsErrorByStaffId[staffId] =
          action.payload?.message ?? action.error.message ?? "Unable to load tip settlements.";
        state.settlementsLoadingStaffIds = state.settlementsLoadingStaffIds.filter(
          (id) => id !== staffId,
        );
      })
      .addCase(settleTipThunk.pending, (state, action) => {
        const staffId = action.meta.arg.staffId;

        state.settleErrorByStaffId[staffId] = null;
        state.settlingStaffIds = [...state.settlingStaffIds, staffId];
      })
      .addCase(settleTipThunk.fulfilled, (state, action) => {
        const { staffId } = action.payload;

        state.settlingStaffIds = state.settlingStaffIds.filter((id) => id !== staffId);
      })
      .addCase(settleTipThunk.rejected, (state, action) => {
        const staffId = action.meta.arg.staffId;

        state.settleErrorByStaffId[staffId] =
          action.payload?.message ?? action.error.message ?? "Unable to settle tip.";
        state.settlingStaffIds = state.settlingStaffIds.filter((id) => id !== staffId);
      });
  },
});

export const selectSalonTipSummary = (state: RootState) => state.salonTips.summary;
export const selectSalonTipSummaryLoading = (state: RootState) => state.salonTips.summaryLoading;
export const selectSalonTipSummaryError = (state: RootState) => state.salonTips.summaryError;

export const selectSalonTipEarnedLoaded = (state: RootState) => state.salonTips.earnedLoaded;
export const selectSalonTipEarnedLoading = (state: RootState) => state.salonTips.earnedLoading;
export const selectSalonTipEarnedError = (state: RootState) => state.salonTips.earnedError;

export const selectSalonTipRecords = (state: RootState): SalonTipRecord[] =>
  state.salonTips.earned.map((entry) => ({
    amount: entry.earnedAmount,
    id: entry.staffId || entry.id,
    period: entry.period,
    staffId: entry.staffId,
    staffName: entry.staffName,
    status: deriveStatus(entry.pendingAmount, entry.paidAmount),
    unpaidAmount: entry.pendingAmount,
  }));

export const selectTipSettlements = (state: RootState, staffId?: string | null) =>
  staffId ? state.salonTips.settlementsByStaffId[staffId] ?? [] : [];
export const selectTipSettlementsLoaded = (state: RootState, staffId?: string | null) =>
  staffId ? state.salonTips.settlementsLoadedStaffIds.includes(staffId) : false;
export const selectTipSettlementsLoading = (state: RootState, staffId?: string | null) =>
  staffId ? state.salonTips.settlementsLoadingStaffIds.includes(staffId) : false;
export const selectTipSettlementsError = (state: RootState, staffId?: string | null) =>
  staffId ? state.salonTips.settlementsErrorByStaffId[staffId] ?? null : null;

export const selectTipSettling = (state: RootState, staffId?: string | null) =>
  staffId ? state.salonTips.settlingStaffIds.includes(staffId) : false;
export const selectTipSettleError = (state: RootState, staffId?: string | null) =>
  staffId ? state.salonTips.settleErrorByStaffId[staffId] ?? null : null;

export default salonTipsSlice.reducer;
