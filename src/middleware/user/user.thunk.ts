import { createAsyncThunk } from "@reduxjs/toolkit";

import { ApiError, api, getApiErrorMessage } from "@/services/api";
import { USER } from "@/services/api/endpoints";
import { salonService } from "@/services/salon.service";
import { timeStartup } from "@/services/startupPerformance";
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
    const currentUser = getState().user.user;
    const salonPromise = currentUser?.salonId ? null : salonService.getSalonMe();
    const response = await timeStartup("/users/me", () => api.get<ApiResponse<AuthUser>>(USER.ME));
    const normalizedUser = normalizeAuthUser(response.data.data);
    const mergedUser = preserveSalonId(normalizedUser, currentUser);

    if (mergedUser.salonId) {
      return mergedUser;
    }

    const currentSalon = await (salonPromise ?? salonService.getSalonMe());

    return {
      ...mergedUser,
      address: mergedUser.address ?? currentSalon.address,
      businessName: mergedUser.businessName ?? currentSalon.businessName,
      salonId: currentSalon.id,
    };
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);

    return rejectWithValue({
      message,
      status: error instanceof ApiError ? error.status : undefined,
    });
  }
});
