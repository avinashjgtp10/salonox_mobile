import { createSelector, createSlice } from "@reduxjs/toolkit";

import {
  adjustConsumableStockThunk,
  fetchAssignedServicesThunk,
  fetchConsumableByIdThunk,
  fetchConsumablesThunk,
  fetchUnitConversionsThunk,
  fetchUsageHistoryThunk,
  saveUnitConversionsThunk,
} from "@/middleware/consumable/consumable.thunk";
import type { RootState } from "@/store";
import type {
  ConsumableAssignedService,
  ConsumableDetail,
  ConsumableKpis,
  ConsumableListItem,
  ConsumableListPagination,
  ConsumableListQuery,
  ConsumableUnitConversion,
  ConsumableUsageHistoryItem,
  ConsumableUsageHistoryQuery,
} from "@/types/consumable";

type ConsumableState = {
  adjustError: string | null;
  adjusting: boolean;
  assignedServices: ConsumableAssignedService[];
  assignedServicesError: string | null;
  assignedServicesLoading: boolean;
  consumables: ConsumableListItem[];
  currentConsumable: ConsumableDetail | null;
  detailsError: string | null;
  detailsLoading: boolean;
  error: string | null;
  kpis: ConsumableKpis;
  loading: boolean;
  loadingMore: boolean;
  pagination: ConsumableListPagination;
  query: ConsumableListQuery;
  refreshing: boolean;
  unitConversions: ConsumableUnitConversion[];
  unitConversionsError: string | null;
  unitConversionsLoading: boolean;
  unitConversionsSaveError: string | null;
  unitConversionsSaving: boolean;
  usageHistory: ConsumableUsageHistoryItem[];
  usageHistoryError: string | null;
  usageHistoryLoading: boolean;
  usageHistoryLoadingMore: boolean;
  usageHistoryPagination: ConsumableListPagination;
  usageHistoryQuery: ConsumableUsageHistoryQuery;
  usageHistoryRefreshing: boolean;
};

const initialQuery: ConsumableListQuery = {
  limit: 20,
  page: 1,
  search: "",
  sortBy: "name",
  sortOrder: "asc",
};

const initialPagination: ConsumableListPagination = {
  hasMore: false,
  limit: 20,
  page: 1,
  totalPages: 0,
  totalRecords: 0,
};

const initialKpis: ConsumableKpis = {
  assignedServices: 0,
  lowStockCount: 0,
  outOfStockCount: 0,
  totalAvailableStock: 0,
  totalConsumables: 0,
};

const initialUsageHistoryQuery: ConsumableUsageHistoryQuery = {
  limit: 20,
  page: 1,
};

const initialState: ConsumableState = {
  adjustError: null,
  adjusting: false,
  assignedServices: [],
  assignedServicesError: null,
  assignedServicesLoading: false,
  consumables: [],
  currentConsumable: null,
  detailsError: null,
  detailsLoading: false,
  error: null,
  kpis: initialKpis,
  loading: false,
  loadingMore: false,
  pagination: initialPagination,
  query: initialQuery,
  refreshing: false,
  unitConversions: [],
  unitConversionsError: null,
  unitConversionsLoading: false,
  unitConversionsSaveError: null,
  unitConversionsSaving: false,
  usageHistory: [],
  usageHistoryError: null,
  usageHistoryLoading: false,
  usageHistoryLoadingMore: false,
  usageHistoryPagination: initialPagination,
  usageHistoryQuery: initialUsageHistoryQuery,
  usageHistoryRefreshing: false,
};

const upsert = <T extends { id: string }>(items: T[], item: T): T[] => {
  const index = items.findIndex((candidate) => candidate.id === item.id);
  if (index === -1) return [item, ...items];
  return items.map((candidate) => (candidate.id === item.id ? item : candidate));
};

const consumableSlice = createSlice({
  name: "consumable",
  initialState,
  reducers: {
    clearAdjustError(state) {
      state.adjustError = null;
    },
    clearCurrentConsumable(state) {
      state.currentConsumable = null;
      state.detailsError = null;
      state.assignedServices = [];
      state.unitConversions = [];
    },
    clearUnitConversionsSaveError(state) {
      state.unitConversionsSaveError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConsumablesThunk.pending, (state, action) => {
        state.error = null;
        const isRefresh = Boolean(action.meta.arg?.refresh);
        const isMore = !isRefresh && (action.meta.arg?.page ?? 1) > 1;
        state.refreshing = isRefresh;
        state.loadingMore = isMore;
        state.loading = !isRefresh && !isMore;
      })
      .addCase(fetchConsumablesThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.loadingMore = false;
        state.refreshing = false;
        state.query = action.payload.query;
        state.pagination = action.payload.pagination;
        state.kpis = action.payload.kpis;

        if (action.payload.query.page === 1) {
          state.consumables = action.payload.consumables;
        } else {
          const incomingIds = new Set(action.payload.consumables.map((item) => item.id));
          state.consumables = [
            ...state.consumables.filter((item) => !incomingIds.has(item.id)),
            ...action.payload.consumables,
          ];
        }
      })
      .addCase(fetchConsumablesThunk.rejected, (state, action) => {
        state.loading = false;
        state.loadingMore = false;
        state.refreshing = false;
        state.error = action.payload?.message ?? "Unable to load consumables.";
      })
      .addCase(fetchConsumableByIdThunk.pending, (state) => {
        state.detailsLoading = true;
        state.detailsError = null;
      })
      .addCase(fetchConsumableByIdThunk.fulfilled, (state, action) => {
        state.detailsLoading = false;
        state.currentConsumable = action.payload;
        state.consumables = upsert(state.consumables, action.payload);

        if (action.payload.assignedServices) {
          state.assignedServices = action.payload.assignedServices;
        }

        if (action.payload.unitConversions) {
          state.unitConversions = action.payload.unitConversions;
        }
      })
      .addCase(fetchConsumableByIdThunk.rejected, (state, action) => {
        state.detailsLoading = false;
        state.detailsError = action.payload?.message ?? "Unable to load consumable.";
      })
      .addCase(adjustConsumableStockThunk.pending, (state) => {
        state.adjusting = true;
        state.adjustError = null;
      })
      .addCase(adjustConsumableStockThunk.fulfilled, (state) => {
        state.adjusting = false;
      })
      .addCase(adjustConsumableStockThunk.rejected, (state, action) => {
        state.adjusting = false;
        state.adjustError = action.payload?.message ?? "Unable to adjust stock.";
      })
      .addCase(fetchAssignedServicesThunk.pending, (state) => {
        state.assignedServicesLoading = true;
        state.assignedServicesError = null;
      })
      .addCase(fetchAssignedServicesThunk.fulfilled, (state, action) => {
        state.assignedServicesLoading = false;
        state.assignedServices = action.payload.assignedServices;
      })
      .addCase(fetchAssignedServicesThunk.rejected, (state, action) => {
        state.assignedServicesLoading = false;
        state.assignedServicesError = action.payload?.message ?? "Unable to load assigned services.";
      })
      .addCase(fetchUnitConversionsThunk.pending, (state) => {
        state.unitConversionsLoading = true;
        state.unitConversionsError = null;
      })
      .addCase(fetchUnitConversionsThunk.fulfilled, (state, action) => {
        state.unitConversionsLoading = false;
        state.unitConversions = action.payload.unitConversions;
      })
      .addCase(fetchUnitConversionsThunk.rejected, (state, action) => {
        state.unitConversionsLoading = false;
        state.unitConversionsError = action.payload?.message ?? "Unable to load unit conversions.";
      })
      .addCase(saveUnitConversionsThunk.pending, (state) => {
        state.unitConversionsSaving = true;
        state.unitConversionsSaveError = null;
      })
      .addCase(saveUnitConversionsThunk.fulfilled, (state, action) => {
        state.unitConversionsSaving = false;
        state.unitConversions = action.payload.unitConversions;
      })
      .addCase(saveUnitConversionsThunk.rejected, (state, action) => {
        state.unitConversionsSaving = false;
        state.unitConversionsSaveError = action.payload?.message ?? "Unable to save unit conversions.";
      })
      .addCase(fetchUsageHistoryThunk.pending, (state, action) => {
        state.usageHistoryError = null;
        const isRefresh = Boolean(action.meta.arg?.refresh);
        const isMore = !isRefresh && (action.meta.arg?.page ?? 1) > 1;
        state.usageHistoryRefreshing = isRefresh;
        state.usageHistoryLoadingMore = isMore;
        state.usageHistoryLoading = !isRefresh && !isMore;
      })
      .addCase(fetchUsageHistoryThunk.fulfilled, (state, action) => {
        state.usageHistoryLoading = false;
        state.usageHistoryLoadingMore = false;
        state.usageHistoryRefreshing = false;
        state.usageHistoryQuery = action.payload.query;
        state.usageHistoryPagination = action.payload.pagination;

        if (action.payload.query.page === 1) {
          state.usageHistory = action.payload.items;
        } else {
          const incomingIds = new Set(action.payload.items.map((item) => item.id));
          state.usageHistory = [
            ...state.usageHistory.filter((item) => !incomingIds.has(item.id)),
            ...action.payload.items,
          ];
        }
      })
      .addCase(fetchUsageHistoryThunk.rejected, (state, action) => {
        state.usageHistoryLoading = false;
        state.usageHistoryLoadingMore = false;
        state.usageHistoryRefreshing = false;
        state.usageHistoryError = action.payload?.message ?? "Unable to load usage history.";
      });
  },
});

export const { clearAdjustError, clearCurrentConsumable, clearUnitConversionsSaveError } = consumableSlice.actions;

export const selectConsumableState = (state: RootState) => state.consumable;
export const selectConsumables = (state: RootState) => state.consumable.consumables;
export const selectConsumableKpis = (state: RootState) => state.consumable.kpis;
export const selectConsumableById = (id: string) =>
  createSelector(selectConsumables, (consumables) => consumables.find((item) => item.id === id) ?? null);

export default consumableSlice.reducer;
