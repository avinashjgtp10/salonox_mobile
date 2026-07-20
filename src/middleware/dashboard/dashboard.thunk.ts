import { createAsyncThunk } from "@reduxjs/toolkit";

import { ApiError, getApiErrorMessage } from "@/services/api";
import { isUserLogoutInProgress } from "@/services/authLifecycle";
import { dashboardService } from "@/services/dashboard.service";
import { timeStartup } from "@/services/startupPerformance";
import type { RootState } from "@/store";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import { selectCurrentUser } from "@/store/user/user.slice";

type FetchDashboardRejectValue = {
  message: string;
  responseBody?: unknown;
  silent?: boolean;
  status?: number;
};

export const fetchDashboardThunk = createAsyncThunk<
  Awaited<ReturnType<typeof dashboardService.getOwnerDashboard>>,
  void,
  { rejectValue: FetchDashboardRejectValue; state: RootState }
>("dashboard/fetchDashboard", async (_, { getState, rejectWithValue }) => {
  try {
    const salonId = selectActiveBranchId(getState());

    return await timeStartup("Dashboard loading", () =>
      dashboardService.getOwnerDashboard(new Date(), salonId),
    );
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);
    const state = getState();

    if (isUserLogoutInProgress() || !selectCurrentUser(state)) {
      return rejectWithValue({
        message,
        responseBody: error instanceof ApiError ? error.responseData : undefined,
        silent: true,
        status: error instanceof ApiError ? error.status : undefined,
      });
    }

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
}, {
  condition: (_, { getState }) => {
    const state = getState() as RootState;

    return (
      !isUserLogoutInProgress() &&
      Boolean(selectCurrentUser(state)) &&
      state.dashboard.status !== "loading" &&
      !state.dashboard.isRefreshing
    );
  },
});
