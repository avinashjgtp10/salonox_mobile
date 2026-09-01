import { createAsyncThunk } from "@reduxjs/toolkit";

import { fetchDashboardThunk } from "@/middleware/dashboard/dashboard.thunk";
import { ApiError, getApiErrorMessage } from "@/services/api";
import { serviceService } from "@/services/service.service";
import type { RootState } from "@/store";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import type {
  CreateServiceRequest,
  CreateServiceResponse,
  DeleteServiceResponse,
  CategoryType,
  ServiceCategoryItem,
  ServiceListItem,
  ServiceListQuery,
  ServiceListResponse,
  UpdateServiceRequest,
  UpdateServiceResponse,
} from "@/types/service";

export const fetchCategoriesThunk = createAsyncThunk<
  ServiceCategoryItem[],
  { type: CategoryType },
  { rejectValue: { message: string }; state: RootState }
>("service/fetchCategories", async ({ type }, { getState, rejectWithValue }) => {
  try {
    const salonId = selectActiveBranchId(getState());
    return await serviceService.getCategories(type, salonId);
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);
    return rejectWithValue({ message });
  }
});

export const createCategoryThunk = createAsyncThunk<
  ServiceCategoryItem,
  { name: string; type: CategoryType },
  { rejectValue: { message: string }; state: RootState }
>("service/createCategory", async ({ name, type }, { getState, rejectWithValue }) => {
  try {
    const salonId = selectActiveBranchId(getState());
    return await serviceService.createCategory(name, type, salonId);
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);
    return rejectWithValue({ message });
  }
});

export type FetchServicesArgs = {
  category?: string;
  categoryId?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
  refresh?: boolean;
  reset?: boolean;
  search?: string;
  sort_by?: string;
  sort_order?: ServiceListQuery["sort_order"];
};

type FetchServicesRejectValue = {
  message: string;
  responseBody?: unknown;
  status?: number;
};

export const fetchServicesThunk = createAsyncThunk<
  ServiceListResponse,
  FetchServicesArgs | undefined,
  { rejectValue: FetchServicesRejectValue; state: RootState }
>("service/fetchServices", async (args, { getState, rejectWithValue }) => {
  const serviceState = getState().service;

  const nextQuery: ServiceListQuery = {
    category: args?.category ?? serviceState.query.category,
    categoryId: args?.categoryId ?? serviceState.query.categoryId,
    isActive: args?.isActive ?? serviceState.query.isActive,
    limit: args?.limit ?? serviceState.query.limit,
    // `reset` means "start over" — a fresh search or category switch must
    // never inherit whatever offset a previous "load more" scroll left
    // behind, or it silently requests a later (often empty) page instead of
    // page 1. Callers that pass `reset: true` (ServiceCatalogTab's search
    // and category-change fetches) never think to also pass `offset: 0`
    // themselves, so it's enforced here instead.
    offset: args?.reset ? 0 : (args?.offset ?? serviceState.query.offset),
    search: args?.search ?? serviceState.query.search,
    sort_by: args?.sort_by ?? serviceState.query.sort_by,
    sort_order: args?.sort_order ?? serviceState.query.sort_order,
  };

  try {
    const salonId = selectActiveBranchId(getState());
    return await serviceService.getServices(nextQuery, salonId);
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);

    console.error("[Services] Fetch failed", {
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      status: error instanceof ApiError ? error.status : undefined,
    });

    return rejectWithValue({
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      status: error instanceof ApiError ? error.status : undefined,
    });
  }
});

export const fetchServiceByIdThunk = createAsyncThunk<
  ServiceListItem,
  string,
  { rejectValue: { message: string }; state: RootState }
>("service/fetchServiceById", async (serviceId, { rejectWithValue }) => {
  try {
    return await serviceService.getService(serviceId);
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);

    console.error("[Services] Fetch by ID failed", {
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      serviceId,
      status: error instanceof ApiError ? error.status : undefined,
    });

    return rejectWithValue({ message });
  }
});

type CreateServiceRejectValue = {
  message: string;
  responseBody?: unknown;
  status?: number;
};

export const createServiceThunk = createAsyncThunk<
  CreateServiceResponse,
  Omit<CreateServiceRequest, "salon_id">,
  { rejectValue: CreateServiceRejectValue; state: RootState }
>("service/createService", async (servicePayload, { dispatch, getState, rejectWithValue }) => {
  try {
    const salonId = selectActiveBranchId(getState());
    const payload: CreateServiceRequest = {
      ...servicePayload,
      ...(salonId ? { salon_id: salonId } : {}),
    };

    const response = await serviceService.createService(payload);

    void dispatch(fetchServicesThunk({ ...getState().service.query, offset: 0, refresh: true, reset: true }));
    void dispatch(fetchDashboardThunk());

    return response;
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);

    console.error("[Services] Create failed", {
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      status: error instanceof ApiError ? error.status : undefined,
    });

    return rejectWithValue({
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      status: error instanceof ApiError ? error.status : undefined,
    });
  }
});

type DeleteServiceRejectValue = {
  message: string;
  responseBody?: unknown;
  status?: number;
};

export const deleteServiceThunk = createAsyncThunk<
  DeleteServiceResponse,
  string,
  { rejectValue: DeleteServiceRejectValue; state: RootState }
>("service/deleteService", async (serviceId, { dispatch, getState, rejectWithValue }) => {
  try {
    const response = await serviceService.deleteService(serviceId);

    void dispatch(fetchServicesThunk({ ...getState().service.query, offset: 0, refresh: true, reset: true }));
    void dispatch(fetchDashboardThunk());

    return response;
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);

    console.error("[Services] Delete failed", {
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      serviceId,
      status: error instanceof ApiError ? error.status : undefined,
    });

    return rejectWithValue({
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      status: error instanceof ApiError ? error.status : undefined,
    });
  }
});

type UpdateServiceRejectValue = {
  message: string;
  responseBody?: unknown;
  status?: number;
};

export const updateServiceThunk = createAsyncThunk<
  UpdateServiceResponse,
  { serviceId: string; updates: Omit<UpdateServiceRequest, "salon_id"> },
  { rejectValue: UpdateServiceRejectValue; state: RootState }
>("service/updateService", async ({ serviceId, updates }, { dispatch, getState, rejectWithValue }) => {
  try {
    const salonId = selectActiveBranchId(getState());
    const payload: UpdateServiceRequest = {
      ...updates,
      ...(salonId ? { salon_id: salonId } : {}),
    };

    const response = await serviceService.updateService(serviceId, payload);

    void dispatch(fetchServiceByIdThunk(serviceId));
    void dispatch(fetchServicesThunk({ ...getState().service.query, offset: 0, refresh: true, reset: true }));
    void dispatch(fetchDashboardThunk());

    return response;
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);

    console.error("[Services] Update failed", {
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      serviceId,
      status: error instanceof ApiError ? error.status : undefined,
    });

    return rejectWithValue({
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      status: error instanceof ApiError ? error.status : undefined,
    });
  }
});
