import { createAsyncThunk } from "@reduxjs/toolkit";

import { ApiError, getApiErrorMessage } from "@/services/api";
import { serviceService } from "@/services/service.service";
import type { RootState } from "@/store";
import { selectCurrentUser } from "@/store/user/user.slice";
import type {
  CreateServiceRequest,
  CreateServiceResponse,
  DeleteServiceResponse,
  ServiceListItem,
  ServiceListQuery,
  ServiceListResponse,
  UpdateServiceRequest,
  UpdateServiceResponse,
} from "@/types/service";

export type FetchServicesArgs = {
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
    isActive: args?.isActive ?? serviceState.query.isActive,
    limit: args?.limit ?? serviceState.query.limit,
    offset: args?.offset ?? serviceState.query.offset,
    search: args?.search ?? serviceState.query.search,
    sort_by: args?.sort_by ?? serviceState.query.sort_by,
    sort_order: args?.sort_order ?? serviceState.query.sort_order,
  };

  try {
    const salonId = selectCurrentUser(getState())?.salonId;
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
>("service/createService", async (servicePayload, { getState, rejectWithValue }) => {
  try {
    const salonId = selectCurrentUser(getState())?.salonId;
    const payload: CreateServiceRequest = {
      ...servicePayload,
      ...(salonId ? { salon_id: salonId } : {}),
    };

    return await serviceService.createService(payload);
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
>("service/deleteService", async (serviceId, { rejectWithValue }) => {
  try {
    return await serviceService.deleteService(serviceId);
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
>("service/updateService", async ({ serviceId, updates }, { getState, rejectWithValue }) => {
  try {
    const salonId = selectCurrentUser(getState())?.salonId;
    const payload: UpdateServiceRequest = {
      ...updates,
      ...(salonId ? { salon_id: salonId } : {}),
    };

    return await serviceService.updateService(serviceId, payload);
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
