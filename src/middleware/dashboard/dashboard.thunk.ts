import { createAsyncThunk } from "@reduxjs/toolkit";

import { ApiError, getApiErrorMessage } from "@/services/api";
import { dashboardService } from "@/services/dashboard.service";
import type { RootState } from "@/store";
import { selectCurrentUser } from "@/store/user/user.slice";

type FetchDashboardRejectValue = {
  message: string;
  responseBody?: unknown;
  status?: number;
};

export const fetchDashboardThunk = createAsyncThunk<
  Awaited<ReturnType<typeof dashboardService.getOwnerDashboard>>,
  void,
  { rejectValue: FetchDashboardRejectValue; state: RootState }
>("dashboard/fetchDashboard", async (_, { getState, rejectWithValue }) => {
  try {
    const salonId = selectCurrentUser(getState())?.salonId;

    return await dashboardService.getOwnerDashboard(new Date(), salonId);
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);

    console.error("[Dashboard] Dashboard fetch failed", {
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
