import { createSlice } from "@reduxjs/toolkit";

import {
  bulkConfigureCommissionsThunk,
  exportSalonCommissionsThunk,
  fetchSalonCommissionEarnedThunk,
  fetchSalonCommissionSummaryThunk,
  fetchSalonCommissionsThunk,
  markCommissionPaidThunk,
  settleCommissionThunk,
  type FetchSalonCommissionsArgs,
} from "@/middleware/staff/salonCommissions.thunk";
import type { RootState } from "@/store";
import type {
  SalonCommissionListPagination,
  SalonCommissionListQuery,
  SalonCommissionRecord,
  SalonCommissionSummary,
  SalonEarnedEntry,
} from "@/types/salonCommissions";

type SalonCommissionsState = {
  bulkConfigureError: string | null;
  bulkConfiguring: boolean;
  currentRequestId: string | null;
  earned: SalonEarnedEntry[];
  earnedError: string | null;
  earnedLoaded: boolean;
  earnedLoading: boolean;
  exportError: string | null;
  exporting: boolean;
  listError: string | null;
  listLoading: boolean;
  listLoadingMore: boolean;
  listRefreshing: boolean;
  markingPaidStaffIds: string[];
  markPaidErrorByStaffId: Record<string, string | null>;
  pagination: SalonCommissionListPagination;
  query: SalonCommissionListQuery;
  records: SalonCommissionRecord[];
  settlingStaffIds: string[];
  settleErrorByStaffId: Record<string, string | null>;
  summary: SalonCommissionSummary | null;
  summaryError: string | null;
  summaryLoading: boolean;
  totalCount: number;
};

const initialQuery: SalonCommissionListQuery = {
  limit: 20,
  offset: 0,
  search: "",
  status: undefined,
};

const initialPagination: SalonCommissionListPagination = {
  hasMore: true,
  limit: 20,
  nextOffset: 0,
  offset: 0,
};

const initialState: SalonCommissionsState = {
  bulkConfigureError: null,
  bulkConfiguring: false,
  currentRequestId: null,
  earned: [],
  earnedError: null,
  earnedLoaded: false,
  earnedLoading: false,
  exportError: null,
  exporting: false,
  listError: null,
  listLoading: false,
  listLoadingMore: false,
  listRefreshing: false,
  markingPaidStaffIds: [],
  markPaidErrorByStaffId: {},
  pagination: initialPagination,
  query: initialQuery,
  records: [],
  settlingStaffIds: [],
  settleErrorByStaffId: {},
  summary: null,
  summaryError: null,
  summaryLoading: false,
  totalCount: 0,
};

const isAppendRequest = (args?: FetchSalonCommissionsArgs) =>
  !args?.refresh && !args?.reset && typeof args?.offset === "number" && args.offset > 0;

const mergeRecords = (existing: SalonCommissionRecord[], incoming: SalonCommissionRecord[]) => {
  const seenIds = new Set(existing.map((record) => record.id));
  const uniqueIncoming = incoming.filter((record) => !seenIds.has(record.id));

  return [...existing, ...uniqueIncoming];
};

const salonCommissionsSlice = createSlice({
  name: "salonCommissions",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSalonCommissionSummaryThunk.pending, (state) => {
        state.summaryError = null;
        state.summaryLoading = true;
      })
      .addCase(fetchSalonCommissionSummaryThunk.fulfilled, (state, action) => {
        state.summary = action.payload;
        state.summaryError = null;
        state.summaryLoading = false;
      })
      .addCase(fetchSalonCommissionSummaryThunk.rejected, (state, action) => {
        state.summaryError =
          action.payload?.message ?? action.error.message ?? "Unable to load commission summary.";
        state.summaryLoading = false;
      })
      .addCase(fetchSalonCommissionEarnedThunk.pending, (state) => {
        state.earnedError = null;
        state.earnedLoading = true;
      })
      .addCase(fetchSalonCommissionEarnedThunk.fulfilled, (state, action) => {
        state.earned = action.payload;
        state.earnedError = null;
        state.earnedLoaded = true;
        state.earnedLoading = false;
      })
      .addCase(fetchSalonCommissionEarnedThunk.rejected, (state, action) => {
        state.earnedError =
          action.payload?.message ?? action.error.message ?? "Unable to load earned commissions.";
        state.earnedLoading = false;
      })
      .addCase(fetchSalonCommissionsThunk.pending, (state, action) => {
        const appendRequest = isAppendRequest(action.meta.arg);

        state.currentRequestId = action.meta.requestId;
        state.listError = null;
        state.listLoading = !appendRequest && !action.meta.arg?.refresh;
        state.listLoadingMore = appendRequest;
        state.listRefreshing = Boolean(action.meta.arg?.refresh);
      })
      .addCase(fetchSalonCommissionsThunk.fulfilled, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) {
          return;
        }

        const appendRequest = isAppendRequest(action.meta.arg);

        state.records = appendRequest
          ? mergeRecords(state.records, action.payload.records)
          : action.payload.records;
        state.currentRequestId = null;
        state.listError = null;
        state.listLoading = false;
        state.listLoadingMore = false;
        state.listRefreshing = false;
        state.pagination = action.payload.pagination;
        state.query = action.payload.query;
        state.totalCount = action.payload.totalCount;
      })
      .addCase(fetchSalonCommissionsThunk.rejected, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) {
          return;
        }

        state.currentRequestId = null;
        state.listError =
          action.payload?.message ?? action.error.message ?? "Unable to load commissions.";
        state.listLoading = false;
        state.listLoadingMore = false;
        state.listRefreshing = false;
      })
      .addCase(markCommissionPaidThunk.pending, (state, action) => {
        const staffId = action.meta.arg;

        state.markPaidErrorByStaffId[staffId] = null;
        state.markingPaidStaffIds = [...state.markingPaidStaffIds, staffId];
      })
      .addCase(markCommissionPaidThunk.fulfilled, (state, action) => {
        const { staffId } = action.payload;

        state.markingPaidStaffIds = state.markingPaidStaffIds.filter((id) => id !== staffId);
        state.records = state.records.map((record) =>
          record.staffId === staffId ? { ...record, status: "paid" } : record,
        );
      })
      .addCase(markCommissionPaidThunk.rejected, (state, action) => {
        const staffId = action.meta.arg;

        state.markPaidErrorByStaffId[staffId] =
          action.payload?.message ?? action.error.message ?? "Unable to mark commission as paid.";
        state.markingPaidStaffIds = state.markingPaidStaffIds.filter((id) => id !== staffId);
      })
      .addCase(settleCommissionThunk.pending, (state, action) => {
        const staffId = action.meta.arg.staffId;

        state.settleErrorByStaffId[staffId] = null;
        state.settlingStaffIds = [...state.settlingStaffIds, staffId];
      })
      .addCase(settleCommissionThunk.fulfilled, (state, action) => {
        const { staffId, remainingBalance, status } = action.payload;

        state.settlingStaffIds = state.settlingStaffIds.filter((id) => id !== staffId);
        state.records = state.records.map((record) =>
          record.staffId === staffId
            ? { ...record, unpaidAmount: remainingBalance, status: status ?? record.status }
            : record,
        );
      })
      .addCase(settleCommissionThunk.rejected, (state, action) => {
        const staffId = action.meta.arg.staffId;

        state.settleErrorByStaffId[staffId] =
          action.payload?.message ?? action.error.message ?? "Unable to settle commission.";
        state.settlingStaffIds = state.settlingStaffIds.filter((id) => id !== staffId);
      })
      .addCase(bulkConfigureCommissionsThunk.pending, (state) => {
        state.bulkConfigureError = null;
        state.bulkConfiguring = true;
      })
      .addCase(bulkConfigureCommissionsThunk.fulfilled, (state) => {
        state.bulkConfiguring = false;
      })
      .addCase(bulkConfigureCommissionsThunk.rejected, (state, action) => {
        state.bulkConfigureError =
          action.payload?.message ?? action.error.message ?? "Unable to bulk configure commissions.";
        state.bulkConfiguring = false;
      })
      .addCase(exportSalonCommissionsThunk.pending, (state) => {
        state.exportError = null;
        state.exporting = true;
      })
      .addCase(exportSalonCommissionsThunk.fulfilled, (state) => {
        state.exporting = false;
      })
      .addCase(exportSalonCommissionsThunk.rejected, (state, action) => {
        state.exportError =
          action.payload?.message ?? action.error.message ?? "Unable to export commissions.";
        state.exporting = false;
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

export const selectSalonCommissionRecords = (state: RootState) => state.salonCommissions.records;
export const selectSalonCommissionListError = (state: RootState) => state.salonCommissions.listError;
export const selectSalonCommissionListLoading = (state: RootState) =>
  state.salonCommissions.listLoading;
export const selectSalonCommissionListLoadingMore = (state: RootState) =>
  state.salonCommissions.listLoadingMore;
export const selectSalonCommissionListRefreshing = (state: RootState) =>
  state.salonCommissions.listRefreshing;
export const selectSalonCommissionPagination = (state: RootState) =>
  state.salonCommissions.pagination;
export const selectSalonCommissionQuery = (state: RootState) => state.salonCommissions.query;
export const selectSalonCommissionTotalCount = (state: RootState) =>
  state.salonCommissions.totalCount;

export const selectCommissionMarkingPaid = (state: RootState, staffId?: string | null) =>
  staffId ? state.salonCommissions.markingPaidStaffIds.includes(staffId) : false;
export const selectCommissionMarkPaidError = (state: RootState, staffId?: string | null) =>
  staffId ? state.salonCommissions.markPaidErrorByStaffId[staffId] ?? null : null;

export const selectCommissionSettling = (state: RootState, staffId?: string | null) =>
  staffId ? state.salonCommissions.settlingStaffIds.includes(staffId) : false;
export const selectCommissionSettleError = (state: RootState, staffId?: string | null) =>
  staffId ? state.salonCommissions.settleErrorByStaffId[staffId] ?? null : null;

export const selectBulkConfiguring = (state: RootState) => state.salonCommissions.bulkConfiguring;
export const selectBulkConfigureError = (state: RootState) =>
  state.salonCommissions.bulkConfigureError;

export const selectSalonCommissionExporting = (state: RootState) => state.salonCommissions.exporting;
export const selectSalonCommissionExportError = (state: RootState) =>
  state.salonCommissions.exportError;

export default salonCommissionsSlice.reducer;
