import { createAsyncThunk } from "@reduxjs/toolkit";

import { ApiError, api, getApiErrorMessage } from "@/services/api";
import { USER } from "@/services/api/endpoints";
import type { RootState } from "@/store";
import type { ApiResponse, AuthUser } from "@/types/auth";
import { normalizeAuthUser, preserveSalonId } from "@/utils/authUser";

type FetchCurrentUserRejectValue = {
  message: string;
  status?: number;
};

export const fetchCurrentUserThunk = createAsyncThunk<
  AuthUser,
  void,
  { rejectValue: FetchCurrentUserRejectValue; state: RootState }
>("user/fetchCurrentUser", async (_, { getState, rejectWithValue }) => {
  try {
    const response = await api.get<ApiResponse<AuthUser>>(USER.ME);
    const currentUser = getState().user.user;
    const normalizedUser = normalizeAuthUser(response.data.data);
    const mergedUser = preserveSalonId(normalizedUser, currentUser);

    return mergedUser;
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);

    return rejectWithValue({
      message,
      status: error instanceof ApiError ? error.status : undefined,
    });
  }
});
