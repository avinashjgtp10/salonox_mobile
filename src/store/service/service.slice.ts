import { createSlice } from "@reduxjs/toolkit";

import {
  createCategoryThunk,
  createServiceThunk,
  deleteServiceThunk,
  fetchCategoriesThunk,
  fetchServiceByIdThunk,
  fetchServicesThunk,
  updateServiceThunk,
  type FetchServicesArgs,
} from "@/middleware/service/service.thunk";
import type { RootState } from "@/store";
import type { ServiceCategoryItem, ServiceListItem, ServiceListPagination, ServiceListQuery } from "@/types/service";

type ServiceState = {
  categories: ServiceCategoryItem[];
  categoriesError: string | null;
  categoriesLoading: boolean;
  createCategoryError: string | null;
  creatingCategory: boolean;
  createError: string | null;
  creating: boolean;
  currentRequestId: string | null;
  deleteError: string | null;
  deletingServiceIds: string[];
  detailsError: string | null;
  detailsLoading: boolean;
  error: string | null;
  loading: boolean;
  loadingMore: boolean;
  pagination: ServiceListPagination;
  query: ServiceListQuery;
  refreshing: boolean;
  services: ServiceListItem[];
  totalCount: number;
  updateError: string | null;
  updating: boolean;
};

const initialQuery: ServiceListQuery = {
  isActive: undefined,
  limit: 20,
  offset: 0,
  search: "",
  sort_by: "created_at",
  sort_order: "desc",
};

const initialPagination: ServiceListPagination = {
  hasMore: true,
  limit: 20,
  nextOffset: 0,
  offset: 0,
};

const initialState: ServiceState = {
  categories: [],
  categoriesError: null,
  categoriesLoading: false,
  createCategoryError: null,
  creatingCategory: false,
  createError: null,
  creating: false,
  currentRequestId: null,
  deleteError: null,
  deletingServiceIds: [],
  detailsError: null,
  detailsLoading: false,
  error: null,
  loading: false,
  loadingMore: false,
  pagination: initialPagination,
  query: initialQuery,
  refreshing: false,
  services: [],
  totalCount: 0,
  updateError: null,
  updating: false,
};

const isAppendRequest = (args?: FetchServicesArgs) =>
  !args?.refresh && !args?.reset && typeof args?.offset === "number" && args.offset > 0;

const mergeServices = (existingServices: ServiceListItem[], incomingServices: ServiceListItem[]) => {
  const seenIds = new Set(existingServices.map((service) => service.id));
  const uniqueIncoming = incomingServices.filter((service) => !seenIds.has(service.id));

  return [...existingServices, ...uniqueIncoming];
};

const serviceSlice = createSlice({
  name: "service",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(createServiceThunk.pending, (state) => {
        state.createError = null;
        state.creating = true;
      })
      .addCase(createServiceThunk.fulfilled, (state) => {
        state.createError = null;
        state.creating = false;
      })
      .addCase(createServiceThunk.rejected, (state, action) => {
        state.createError =
          action.payload?.message ?? action.error.message ?? "Unable to create service.";
        state.creating = false;
      })
      .addCase(fetchServicesThunk.pending, (state, action) => {
        const appendRequest = isAppendRequest(action.meta.arg);

        state.currentRequestId = action.meta.requestId;
        state.error = null;
        state.loading = !appendRequest && !action.meta.arg?.refresh;
        state.loadingMore = appendRequest;
        state.refreshing = Boolean(action.meta.arg?.refresh);
      })
      .addCase(fetchServicesThunk.fulfilled, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) {
          return;
        }

        const appendRequest = isAppendRequest(action.meta.arg);

        state.services = appendRequest
          ? mergeServices(state.services, action.payload.services)
          : action.payload.services;
        state.currentRequestId = null;
        state.error = null;
        state.loading = false;
        state.loadingMore = false;
        state.pagination = action.payload.pagination;
        state.query = action.payload.query;
        state.refreshing = false;
        state.totalCount = action.payload.totalCount;
      })
      .addCase(fetchServicesThunk.rejected, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) {
          return;
        }

        state.currentRequestId = null;
        state.error = action.payload?.message ?? action.error.message ?? "Unable to load services.";
        state.loading = false;
        state.loadingMore = false;
        state.refreshing = false;

        console.error("[Services Slice] Rejected", {
          error: state.error,
          requestId: action.meta.requestId,
          requestQuery: action.meta.arg,
        });
      })
      .addCase(fetchServiceByIdThunk.pending, (state) => {
        state.detailsLoading = true;
        state.detailsError = null;
      })
      .addCase(fetchServiceByIdThunk.fulfilled, (state, action) => {
        state.detailsLoading = false;
        state.detailsError = null;

        const index = state.services.findIndex((service) => service.id === action.payload.id);

        if (index !== -1) {
          state.services[index] = action.payload;
        } else {
          state.services.push(action.payload);
        }
      })
      .addCase(fetchServiceByIdThunk.rejected, (state, action) => {
        state.detailsLoading = false;
        state.detailsError =
          action.payload?.message ?? action.error.message ?? "Unable to load service details.";
      })
      .addCase(updateServiceThunk.pending, (state) => {
        state.updateError = null;
        state.updating = true;
      })
      .addCase(updateServiceThunk.fulfilled, (state, action) => {
        state.updateError = null;
        state.updating = false;

        const index = state.services.findIndex((service) => service.id === action.payload.service.id);

        if (index !== -1) {
          state.services[index] = action.payload.service;
        } else {
          state.services.push(action.payload.service);
        }
      })
      .addCase(updateServiceThunk.rejected, (state, action) => {
        state.updateError =
          action.payload?.message ?? action.error.message ?? "Unable to update service.";
        state.updating = false;
      })
      .addCase(deleteServiceThunk.pending, (state, action) => {
        state.deleteError = null;
        state.deletingServiceIds = [...state.deletingServiceIds, action.meta.arg];
      })
      .addCase(deleteServiceThunk.fulfilled, (state, action) => {
        state.deleteError = null;
        state.deletingServiceIds = state.deletingServiceIds.filter(
          (serviceId) => serviceId !== action.payload.serviceId,
        );
        state.services = state.services.filter(
          (service) => service.id !== action.payload.serviceId,
        );
        state.totalCount = Math.max(0, state.totalCount - 1);
      })
      .addCase(deleteServiceThunk.rejected, (state, action) => {
        state.deleteError =
          action.payload?.message ?? action.error.message ?? "Unable to delete service.";
        state.deletingServiceIds = state.deletingServiceIds.filter(
          (serviceId) => serviceId !== action.meta.arg,
        );
      })
      .addCase(fetchCategoriesThunk.pending, (state) => {
        state.categoriesLoading = true;
        state.categoriesError = null;
      })
      .addCase(fetchCategoriesThunk.fulfilled, (state, action) => {
        state.categoriesLoading = false;
        state.categoriesError = null;
        state.categories = action.payload;
      })
      .addCase(fetchCategoriesThunk.rejected, (state, action) => {
        state.categoriesLoading = false;
        state.categoriesError =
          action.payload?.message ?? action.error.message ?? "Unable to load categories.";
      })
      .addCase(createCategoryThunk.pending, (state) => {
        state.creatingCategory = true;
        state.createCategoryError = null;
      })
      .addCase(createCategoryThunk.fulfilled, (state, action) => {
        state.creatingCategory = false;
        state.createCategoryError = null;
        const exists = state.categories.some((cat) => cat.id === action.payload.id);
        if (!exists) {
          state.categories = [...state.categories, action.payload].sort((a, b) =>
            a.name.localeCompare(b.name),
          );
        }
      })
      .addCase(createCategoryThunk.rejected, (state, action) => {
        state.creatingCategory = false;
        state.createCategoryError =
          action.payload?.message ?? action.error.message ?? "Unable to create category.";
      });
  },
});

export const selectServices = (state: RootState) => state.service.services;
export const selectServicesError = (state: RootState) => state.service.error;
export const selectServicesLoading = (state: RootState) => state.service.loading;
export const selectServicesLoadingMore = (state: RootState) => state.service.loadingMore;
export const selectServicesPagination = (state: RootState) => state.service.pagination;
export const selectServicesQuery = (state: RootState) => state.service.query;
export const selectServicesRefreshing = (state: RootState) => state.service.refreshing;
export const selectServicesTotalCount = (state: RootState) => state.service.totalCount;
export const selectServiceDetailsLoading = (state: RootState) => state.service.detailsLoading;
export const selectServiceDetailsError = (state: RootState) => state.service.detailsError;
export const selectServiceById = (state: RootState, serviceId?: string) =>
  state.service.services.find((service) => service.id === serviceId);
export const selectServiceCreating = (state: RootState) => state.service.creating;
export const selectServiceCreateError = (state: RootState) => state.service.createError;
export const selectServiceUpdating = (state: RootState) => state.service.updating;
export const selectServiceUpdateError = (state: RootState) => state.service.updateError;
export const selectServiceDeletingIds = (state: RootState) => state.service.deletingServiceIds;
export const selectServiceDeleteError = (state: RootState) => state.service.deleteError;
export const selectServiceCategories = (state: RootState) => state.service.categories;
export const selectServiceCategoriesLoading = (state: RootState) => state.service.categoriesLoading;
export const selectServiceCategoriesError = (state: RootState) => state.service.categoriesError;
export const selectServiceCreatingCategory = (state: RootState) => state.service.creatingCategory;
export const selectServiceCreateCategoryError = (state: RootState) => state.service.createCategoryError;

export default serviceSlice.reducer;
