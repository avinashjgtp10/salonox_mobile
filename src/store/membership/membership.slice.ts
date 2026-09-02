import { createSelector, createSlice } from "@reduxjs/toolkit";

import {
  createMembershipThunk,
  deleteMembershipThunk,
  exportMembershipsCsvThunk,
  exportMembershipsExcelThunk,
  exportMembershipsPdfThunk,
  fetchMembershipByIdThunk,
  fetchMembershipsThunk,
  getMembershipExportQueryKey,
  getMembershipQueryKey,
  updateMembershipThunk,
} from "@/middleware/membership/membership.thunk";
import type { RootState } from "@/store";
import type { Membership, MembershipExportFormat, MembershipExportResponse, MembershipListQuery } from "@/types/membership";

type MembershipState = {
  currentDetailsMembershipId: string | null;
  currentDetailsRequestId: string | null;
  currentMembership: Membership | null;
  currentListRequestId: string | null;
  currentListRequestKey: string | null;
  deletingMembershipIds: string[];
  detailsError: string | null;
  detailsLoading: boolean;
  error: string | null;
  currentExportFormat: MembershipExportFormat | null;
  currentExportRequestId: string | null;
  currentExportRequestKey: string | null;
  exportError: string | null;
  exporting: boolean;
  hasLoaded: boolean;
  items: Membership[];
  lastExport: MembershipExportResponse | null;
  loading: boolean;
  loadingMore: boolean;
  mutationError: string | null;
  mutationLoading: boolean;
  pagination: {
    hasMore: boolean;
    limit: number;
    page: number;
    totalPages: number;
  };
  query: MembershipListQuery;
  refreshing: boolean;
  total: number;
};

const initialQuery: MembershipListQuery = {
  limit: 10,
  page: 1,
};

const initialState: MembershipState = {
  currentDetailsMembershipId: null,
  currentDetailsRequestId: null,
  currentMembership: null,
  currentListRequestId: null,
  currentListRequestKey: null,
  deletingMembershipIds: [],
  detailsError: null,
  detailsLoading: false,
  error: null,
  currentExportFormat: null,
  currentExportRequestId: null,
  currentExportRequestKey: null,
  exportError: null,
  exporting: false,
  hasLoaded: false,
  items: [],
  lastExport: null,
  loading: false,
  loadingMore: false,
  mutationError: null,
  mutationLoading: false,
  pagination: { hasMore: false, limit: 10, page: 1, totalPages: 0 },
  query: initialQuery,
  refreshing: false,
  total: 0,
};

const getPendingQuery = (
  currentQuery: MembershipListQuery,
  args?: Parameters<typeof fetchMembershipsThunk>[0],
): MembershipListQuery => ({
  colour: Object.prototype.hasOwnProperty.call(args ?? {}, "colour") ? args?.colour : currentQuery.colour,
  limit: args?.limit ?? currentQuery.limit,
  page: args?.reset || args?.refresh ? 1 : args?.page ?? currentQuery.page,
  search: Object.prototype.hasOwnProperty.call(args ?? {}, "search") ? args?.search : currentQuery.search,
  sessionType: Object.prototype.hasOwnProperty.call(args ?? {}, "sessionType")
    ? args?.sessionType
    : currentQuery.sessionType,
  validFor: Object.prototype.hasOwnProperty.call(args ?? {}, "validFor") ? args?.validFor : currentQuery.validFor,
});

const upsertMembership = (items: Membership[], membership: Membership): Membership[] => {
  const index = items.findIndex((item) => item.id === membership.id);

  if (index === -1) {
    return [membership, ...items];
  }

  return items.map((item) => (item.id === membership.id ? membership : item));
};

const mergeMemberships = (existingItems: Membership[], incomingItems: Membership[]) => {
  const incomingIds = new Set(incomingItems.map((item) => item.id));

  return [
    ...existingItems.filter((item) => !incomingIds.has(item.id)),
    ...incomingItems,
  ];
};

const getPagination = (query: MembershipListQuery, total: number) => {
  const limit = Math.max(1, query.limit ?? 10);
  const page = Math.max(1, query.page ?? 1);
  const totalPages = Math.ceil(total / limit);

  return {
    hasMore: totalPages > 0 ? page < totalPages : false,
    limit,
    page,
    totalPages,
  };
};

const membershipSlice = createSlice({
  name: "membership",
  initialState,
  reducers: {
    clearCurrentMembership(state) {
      state.currentMembership = null;
      state.detailsError = null;
    },
    clearMembershipError(state) {
      state.error = null;
    },
    clearMembershipMutationError(state) {
      state.mutationError = null;
    },
    clearMembershipExport(state) {
      state.exportError = null;
      state.lastExport = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMembershipsThunk.pending, (state, action) => {
        const query = getPendingQuery(state.query, action.meta.arg);
        const nextPage = query.page ?? 1;
        const isRefresh = Boolean(action.meta.arg?.refresh);
        const isMore = !isRefresh && nextPage > 1;

        state.currentListRequestId = action.meta.requestId;
        state.currentListRequestKey = getMembershipQueryKey(query);
        state.error = null;
        state.loading = !isRefresh && !isMore;
        state.loadingMore = isMore;
        state.refreshing = isRefresh;
      })
      .addCase(fetchMembershipsThunk.fulfilled, (state, action) => {
        if (state.currentListRequestId !== action.meta.requestId) {
          return;
        }

        const page = action.payload.query.page ?? 1;

        state.currentListRequestId = null;
        state.currentListRequestKey = null;
        state.error = null;
        state.hasLoaded = true;
        state.loading = false;
        state.loadingMore = false;
        state.pagination = getPagination(action.payload.query, action.payload.total);
        state.query = action.payload.query;
        state.refreshing = false;
        state.total = action.payload.total;
        state.items =
          page > 1 ? mergeMemberships(state.items, action.payload.items) : action.payload.items;
      })
      .addCase(fetchMembershipsThunk.rejected, (state, action) => {
        if (state.currentListRequestId !== action.meta.requestId) {
          return;
        }

        state.currentListRequestId = null;
        state.currentListRequestKey = null;
        state.error = action.payload?.message ?? "Unable to load memberships.";
        state.hasLoaded = true;
        state.loading = false;
        state.loadingMore = false;
        state.refreshing = false;
      })
      .addCase(fetchMembershipByIdThunk.pending, (state, action) => {
        state.currentDetailsMembershipId = action.meta.arg;
        state.currentDetailsRequestId = action.meta.requestId;
        state.detailsError = null;
        state.detailsLoading = true;
      })
      .addCase(fetchMembershipByIdThunk.fulfilled, (state, action) => {
        if (state.currentDetailsRequestId !== action.meta.requestId) {
          return;
        }

        state.currentDetailsMembershipId = null;
        state.currentDetailsRequestId = null;
        state.currentMembership = action.payload;
        state.detailsError = null;
        state.detailsLoading = false;
        state.items = upsertMembership(state.items, action.payload);
      })
      .addCase(fetchMembershipByIdThunk.rejected, (state, action) => {
        if (state.currentDetailsRequestId !== action.meta.requestId) {
          return;
        }

        state.currentDetailsMembershipId = null;
        state.currentDetailsRequestId = null;
        state.detailsError = action.payload?.message ?? "Unable to load membership.";
        state.detailsLoading = false;
      })
      .addCase(createMembershipThunk.pending, (state) => {
        state.mutationError = null;
        state.mutationLoading = true;
      })
      .addCase(createMembershipThunk.fulfilled, (state, action) => {
        state.items = upsertMembership(state.items, action.payload);
        state.mutationError = null;
        state.mutationLoading = false;
        state.total += 1;
        state.pagination = getPagination(state.query, state.total);
      })
      .addCase(createMembershipThunk.rejected, (state, action) => {
        state.mutationError = action.payload?.message ?? "Unable to create membership.";
        state.mutationLoading = false;
      })
      .addCase(updateMembershipThunk.pending, (state) => {
        state.mutationError = null;
        state.mutationLoading = true;
      })
      .addCase(updateMembershipThunk.fulfilled, (state, action) => {
        state.currentMembership = action.payload;
        state.items = upsertMembership(state.items, action.payload);
        state.mutationError = null;
        state.mutationLoading = false;
      })
      .addCase(updateMembershipThunk.rejected, (state, action) => {
        state.mutationError = action.payload?.message ?? "Unable to update membership.";
        state.mutationLoading = false;
      })
      .addCase(deleteMembershipThunk.pending, (state, action) => {
        state.deletingMembershipIds = [...state.deletingMembershipIds, action.meta.arg];
        state.mutationError = null;
      })
      .addCase(deleteMembershipThunk.fulfilled, (state, action) => {
        state.deletingMembershipIds = state.deletingMembershipIds.filter(
          (id) => id !== action.payload.membershipId,
        );
        state.items = state.items.filter((item) => item.id !== action.payload.membershipId);
        state.total = Math.max(0, state.total - 1);
        state.pagination = getPagination(state.query, state.total);

        if (state.currentMembership?.id === action.payload.membershipId) {
          state.currentMembership = null;
        }
      })
      .addCase(deleteMembershipThunk.rejected, (state, action) => {
        state.deletingMembershipIds = state.deletingMembershipIds.filter(
          (id) => id !== action.meta.arg,
        );
        state.mutationError = action.payload?.message ?? "Unable to delete membership.";
      })
      .addCase(exportMembershipsCsvThunk.pending, (state, action) => {
        state.currentExportFormat = "csv";
        state.currentExportRequestId = action.meta.requestId;
        state.currentExportRequestKey = getMembershipExportQueryKey(action.meta.arg);
        state.exportError = null;
        state.exporting = true;
      })
      .addCase(exportMembershipsCsvThunk.fulfilled, (state, action) => {
        if (state.currentExportRequestId !== action.meta.requestId) {
          return;
        }

        state.currentExportFormat = null;
        state.currentExportRequestId = null;
        state.currentExportRequestKey = null;
        state.exportError = null;
        state.exporting = false;
        state.lastExport = action.payload;
      })
      .addCase(exportMembershipsCsvThunk.rejected, (state, action) => {
        if (state.currentExportRequestId !== action.meta.requestId) {
          return;
        }

        state.currentExportFormat = null;
        state.currentExportRequestId = null;
        state.currentExportRequestKey = null;
        state.exportError = action.payload?.message ?? "Unable to export memberships.";
        state.exporting = false;
      })
      .addCase(exportMembershipsExcelThunk.pending, (state, action) => {
        state.currentExportFormat = "excel";
        state.currentExportRequestId = action.meta.requestId;
        state.currentExportRequestKey = getMembershipExportQueryKey(action.meta.arg);
        state.exportError = null;
        state.exporting = true;
      })
      .addCase(exportMembershipsExcelThunk.fulfilled, (state, action) => {
        if (state.currentExportRequestId !== action.meta.requestId) {
          return;
        }

        state.currentExportFormat = null;
        state.currentExportRequestId = null;
        state.currentExportRequestKey = null;
        state.exportError = null;
        state.exporting = false;
        state.lastExport = action.payload;
      })
      .addCase(exportMembershipsExcelThunk.rejected, (state, action) => {
        if (state.currentExportRequestId !== action.meta.requestId) {
          return;
        }

        state.currentExportFormat = null;
        state.currentExportRequestId = null;
        state.currentExportRequestKey = null;
        state.exportError = action.payload?.message ?? "Unable to export memberships.";
        state.exporting = false;
      })
      .addCase(exportMembershipsPdfThunk.pending, (state, action) => {
        state.currentExportFormat = "pdf";
        state.currentExportRequestId = action.meta.requestId;
        state.currentExportRequestKey = getMembershipExportQueryKey(action.meta.arg);
        state.exportError = null;
        state.exporting = true;
      })
      .addCase(exportMembershipsPdfThunk.fulfilled, (state, action) => {
        if (state.currentExportRequestId !== action.meta.requestId) {
          return;
        }

        state.currentExportFormat = null;
        state.currentExportRequestId = null;
        state.currentExportRequestKey = null;
        state.exportError = null;
        state.exporting = false;
        state.lastExport = action.payload;
      })
      .addCase(exportMembershipsPdfThunk.rejected, (state, action) => {
        if (state.currentExportRequestId !== action.meta.requestId) {
          return;
        }

        state.currentExportFormat = null;
        state.currentExportRequestId = null;
        state.currentExportRequestKey = null;
        state.exportError = action.payload?.message ?? "Unable to export memberships.";
        state.exporting = false;
      });
  },
});

export const {
  clearMembershipExport,
  clearCurrentMembership,
  clearMembershipError,
  clearMembershipMutationError,
} = membershipSlice.actions;

export const selectMembershipState = (state: RootState) => state.membership;
export const selectMemberships = (state: RootState) => state.membership.items;
export const selectMembershipsTotal = (state: RootState) => state.membership.total;
export const selectMembershipsQuery = (state: RootState) => state.membership.query;
export const selectMembershipsPagination = (state: RootState) => state.membership.pagination;
export const selectMembershipsLoading = (state: RootState) => state.membership.loading;
export const selectMembershipsLoadingMore = (state: RootState) => state.membership.loadingMore;
export const selectMembershipsRefreshing = (state: RootState) => state.membership.refreshing;
export const selectMembershipsError = (state: RootState) => state.membership.error;
export const selectMembershipsHasLoaded = (state: RootState) => state.membership.hasLoaded;
export const selectMembershipsEmpty = (state: RootState) =>
  state.membership.hasLoaded &&
  !state.membership.loading &&
  !state.membership.refreshing &&
  !state.membership.error &&
  state.membership.items.length === 0;
export const selectMembershipsHasMore = (state: RootState) => state.membership.pagination.hasMore;
export const selectCurrentMembership = (state: RootState) => state.membership.currentMembership;
export const selectMembershipDetailsLoading = (state: RootState) => state.membership.detailsLoading;
export const selectMembershipDetailsError = (state: RootState) => state.membership.detailsError;
export const selectMembershipMutationLoading = (state: RootState) => state.membership.mutationLoading;
export const selectMembershipMutationError = (state: RootState) => state.membership.mutationError;
export const selectDeletingMembershipIds = (state: RootState) => state.membership.deletingMembershipIds;
export const selectMembershipExporting = (state: RootState) => state.membership.exporting;
export const selectMembershipExportError = (state: RootState) => state.membership.exportError;
export const selectLastMembershipExport = (state: RootState) => state.membership.lastExport;
export const selectCurrentMembershipExportFormat = (state: RootState) => state.membership.currentExportFormat;
export const selectMembershipById = (id: string) =>
  createSelector(selectMemberships, (memberships) => memberships.find((membership) => membership.id === id) ?? null);

export default membershipSlice.reducer;
