import { createAsyncThunk } from "@reduxjs/toolkit";

import { ApiError, getApiErrorMessage } from "@/services/api";
import { mapSalonFormFieldsToUpdateRequest, salonService } from "@/services/salon.service";
import { tokenStorage } from "@/services/tokenStorage";
import type { RootState } from "@/store";
import { selectCurrentUser, setCurrentUser } from "@/store/user/user.slice";
import type {
  CreateSalonRequest,
  CreateSalonResponse,
  GetSalonResponse,
  SalonListQuery,
  SalonListResponse,
  UpdateSalonFormFields,
  UpdateSalonResponse,
} from "@/types/salon";

type CreateSalonRejectValue = {
  message: string;
  responseBody?: unknown;
  status?: number;
};

export const createSalonThunk = createAsyncThunk<
  CreateSalonResponse,
  CreateSalonRequest,
  { rejectValue: CreateSalonRejectValue; state: RootState }
>("salon/createSalon", async (salonPayload, { rejectWithValue }) => {
  try {
    return await salonService.createSalon(salonPayload);
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);

    console.error("[Salons] Create failed", {
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

type FetchSalonMeRejectValue = {
  message: string;
  responseBody?: unknown;
  status?: number;
};

export type FetchSalonsArgs = Partial<SalonListQuery> & {
  refresh?: boolean;
  reset?: boolean;
};

type FetchSalonsRejectValue = {
  message: string;
  responseBody?: unknown;
  status?: number;
};

type UpdateSalonRejectValue = {
  message: string;
  responseBody?: unknown;
  status?: number;
};

export const fetchSalonMeThunk = createAsyncThunk<
  GetSalonResponse | null,
  void,
  { rejectValue: FetchSalonMeRejectValue; state: RootState }
>("salon/fetchSalonMe", async (_, { rejectWithValue }) => {
  try {
    return await salonService.getSalonMe();
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 404 || (error.responseData as Record<string, unknown> | undefined)?.code === "NOT_FOUND")
    ) {
      return null;
    }

    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);

    console.error("[Salons] Fetch me failed", {
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

export const fetchSalonsThunk = createAsyncThunk<
  SalonListResponse,
  FetchSalonsArgs | undefined,
  { rejectValue: FetchSalonsRejectValue; state: RootState }
>("salon/fetchSalons", async (args, { getState, rejectWithValue }) => {
  const salonState = getState().salon;
  const nextQuery: SalonListQuery = {
    limit: args?.limit ?? salonState.query.limit,
    page: args?.page ?? salonState.query.page,
    search: args?.search ?? salonState.query.search,
    sort_by: args?.sort_by ?? salonState.query.sort_by,
    sort_order: args?.sort_order ?? salonState.query.sort_order,
    ...(args?.status ?? salonState.query.status
      ? { status: args?.status ?? salonState.query.status }
      : {}),
  };

  try {
    return await salonService.getSalons(nextQuery);
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);

    console.error("[Salons] Fetch list failed", {
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

export const updateSalonThunk = createAsyncThunk<
  UpdateSalonResponse,
  { formFields: UpdateSalonFormFields; salonId?: string },
  { rejectValue: UpdateSalonRejectValue; state: RootState }
>("salon/updateSalon", async ({ formFields, salonId }, { dispatch, getState, rejectWithValue }) => {
  const currentUser = selectCurrentUser(getState());

  if (!currentUser) {
    return rejectWithValue({
      message: "Unable to update salon because no user is logged in.",
    });
  }

  const activeSalonId = salonId ?? currentUser.salonId;

  if (!activeSalonId) {
    return rejectWithValue({
      message: "Unable to update salon because no salon is selected.",
    });
  }

  const payload = mapSalonFormFieldsToUpdateRequest(formFields);

  try {
    const response = await salonService.updateSalon(activeSalonId, payload);

    if (currentUser.salonId === response.salon.id) {
      const updatedUser = {
        ...currentUser,
        address: response.salon.address,
        businessName: response.salon.businessName,
        salonId: response.salon.id,
      };

      await tokenStorage.setStoredUser(updatedUser);
      dispatch(setCurrentUser(updatedUser));
    }

    return response;
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);

    console.error("[Salons] Update failed", {
      salonId: activeSalonId,
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
