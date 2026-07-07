import { createSlice } from "@reduxjs/toolkit";

import {
  createSalonThunk,
  fetchSalonsThunk,
  fetchSalonMeThunk,
  updateSalonThunk,
  type FetchSalonsArgs,
} from "@/middleware/salon/salon.thunk";
import type { RootState } from "@/store";
import type {
  SalonListItem,
  SalonListPagination,
  SalonListQuery,
} from "@/types/salon";

type SalonState = {
  createError: string | null;
  creating: boolean;
  currentRequestId: string | null;
  detailsError: string | null;
  detailsLoading: boolean;
  error: string | null;
  loading: boolean;
  loadingMore: boolean;
  pagination: SalonListPagination;
  query: SalonListQuery;
  refreshing: boolean;
  salons: SalonListItem[];
  totalCount: number;
  updateError: string | null;
  updating: boolean;
};

const initialQuery: SalonListQuery = {
  limit: 20,
  page: 1,
  search: "",
  sort_by: "created_at",
  sort_order: "DESC",
};

const initialPagination: SalonListPagination = {
  hasMore: true,
  limit: 20,
  nextPage: 1,
  page: 0,
  totalCount: 0,
  totalPages: null,
};

const initialState: SalonState = {
  createError: null,
  creating: false,
  currentRequestId: null,
  detailsError: null,
  detailsLoading: false,
  error: null,
  loading: false,
  loadingMore: false,
  pagination: initialPagination,
  query: initialQuery,
  refreshing: false,
  salons: [],
  totalCount: 0,
  updateError: null,
  updating: false,
};

const isAppendRequest = (args?: FetchSalonsArgs) =>
  !args?.refresh && !args?.reset && typeof args?.page === "number" && args.page > 1;

const upsertSalon = (salons: SalonListItem[], incomingSalon: SalonListItem) => {
  const index = salons.findIndex((salon) => salon.id === incomingSalon.id);

  if (index === -1) {
    return [incomingSalon, ...salons];
  }

  const nextSalons = [...salons];
  nextSalons[index] = incomingSalon;

  return nextSalons;
};

const mergeSalons = (
  existingSalons: SalonListItem[],
  incomingSalons: SalonListItem[],
) => {
  const seenIds = new Set(existingSalons.map((salon) => salon.id));
  const uniqueIncoming = incomingSalons.filter((salon) => !seenIds.has(salon.id));

  return [...existingSalons, ...uniqueIncoming];
};

const salonSlice = createSlice({
  name: "salon",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(createSalonThunk.pending, (state) => {
        state.createError = null;
        state.creating = true;
      })
      .addCase(createSalonThunk.fulfilled, (state, action) => {
        state.createError = null;
        state.creating = false;
        state.salons = upsertSalon(state.salons, action.payload.salon);
      })
      .addCase(createSalonThunk.rejected, (state, action) => {
        state.createError = action.payload?.message ?? action.error.message ?? "Unable to create salon.";
        state.creating = false;
      })
      .addCase(fetchSalonsThunk.pending, (state, action) => {
        const appendRequest = isAppendRequest(action.meta.arg);

        state.currentRequestId = action.meta.requestId;
        state.error = null;
        state.loading = !appendRequest && !action.meta.arg?.refresh;
        state.loadingMore = appendRequest;
        state.refreshing = Boolean(action.meta.arg?.refresh);
      })
      .addCase(fetchSalonsThunk.fulfilled, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) {
          return;
        }

        const appendRequest = isAppendRequest(action.meta.arg);

        state.salons = appendRequest
          ? mergeSalons(state.salons, action.payload.salons)
          : action.payload.salons;
        state.currentRequestId = null;
        state.error = null;
        state.loading = false;
        state.loadingMore = false;
        state.pagination = action.payload.pagination;
        state.query = action.payload.query;
        state.refreshing = false;
        state.totalCount = action.payload.totalCount;
      })
      .addCase(fetchSalonsThunk.rejected, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) {
          return;
        }

        state.currentRequestId = null;
        state.error = action.payload?.message ?? action.error.message ?? "Unable to load salons.";
        state.loading = false;
        state.loadingMore = false;
        state.refreshing = false;
      })
      .addCase(fetchSalonMeThunk.pending, (state) => {
        state.detailsError = null;
        state.detailsLoading = true;
      })
      .addCase(fetchSalonMeThunk.fulfilled, (state, action) => {
        state.detailsError = null;
        state.detailsLoading = false;
        state.salons = upsertSalon(state.salons, action.payload);
      })
      .addCase(fetchSalonMeThunk.rejected, (state, action) => {
        state.detailsError = action.payload?.message ?? action.error.message ?? "Unable to load salon details.";
        state.detailsLoading = false;
      })
      .addCase(updateSalonThunk.pending, (state) => {
        state.updateError = null;
        state.updating = true;
      })
      .addCase(updateSalonThunk.fulfilled, (state, action) => {
        state.salons = upsertSalon(state.salons, action.payload.salon);
        state.updateError = null;
        state.updating = false;
      })
      .addCase(updateSalonThunk.rejected, (state, action) => {
        state.updateError = action.payload?.message ?? action.error.message ?? "Unable to update salon.";
        state.updating = false;
      });
  },
});

export const selectSalonCreateError = (state: RootState) => state.salon.createError;
export const selectSalonCreating = (state: RootState) => state.salon.creating;
export const selectSalonDetailsError = (state: RootState) => state.salon.detailsError;
export const selectSalonDetailsLoading = (state: RootState) => state.salon.detailsLoading;
export const selectSalonsError = (state: RootState) => state.salon.error;
export const selectSalonsLoading = (state: RootState) => state.salon.loading;
export const selectSalonsLoadingMore = (state: RootState) => state.salon.loadingMore;
export const selectSalonsPagination = (state: RootState) => state.salon.pagination;
export const selectSalonsQuery = (state: RootState) => state.salon.query;
export const selectSalonsRefreshing = (state: RootState) => state.salon.refreshing;
export const selectSalonsTotalCount = (state: RootState) => state.salon.totalCount;
export const selectSalonUpdateError = (state: RootState) => state.salon.updateError;
export const selectSalonUpdating = (state: RootState) => state.salon.updating;
export const selectSalons = (state: RootState) => state.salon.salons;
export const selectSalonById = (state: RootState, salonId?: string | null) =>
  state.salon.salons.find((salon) => salon.id === salonId);

export default salonSlice.reducer;
