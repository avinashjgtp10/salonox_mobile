import { createAsyncThunk } from "@reduxjs/toolkit";

import { ApiError, getApiErrorMessage } from "@/services/api";
import { isUserLogoutInProgress } from "@/services/authLifecycle";
import { dashboardCache } from "@/services/dashboardCache";
import { dashboardService } from "@/services/dashboard.service";
import { isNetworkOnline } from "@/services/networkStatus";
import type { RootState } from "@/store";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import { selectCurrentUser } from "@/store/user/user.slice";
import { hasBusinessDashboard } from "@/utils/staffExperience";

type FetchDashboardRejectValue = {
  code?: string;
  message: string;
  responseBody?: unknown;
  silent?: boolean;
  status?: number;
};

export type DashboardFetchResult = {
  inventoryAlerts: Awaited<ReturnType<typeof dashboardService.getOwnerDashboard>>["inventoryAlerts"];
  metrics: Awaited<ReturnType<typeof dashboardService.getOwnerDashboard>>["metrics"];
  quickSaleRevenueToday: Awaited<ReturnType<typeof dashboardService.getOwnerDashboard>>["quickSaleRevenueToday"];
  quickSaleServices: Awaited<ReturnType<typeof dashboardService.getOwnerDashboard>>["quickSaleServices"];
  requestedDate: Awaited<ReturnType<typeof dashboardService.getOwnerDashboard>>["requestedDate"];
  todayAppointments: Awaited<ReturnType<typeof dashboardService.getOwnerDashboard>>["todayAppointments"];
  topClient: Awaited<ReturnType<typeof dashboardService.getOwnerDashboard>>["topClient"];
};

export const fetchDashboardThunk = createAsyncThunk<
  DashboardFetchResult,
  void,
  { rejectValue: FetchDashboardRejectValue; state: RootState }
>("dashboard/fetchDashboard", async (_, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const salonId = selectActiveBranchId(state);

    const dashboard = await dashboardService.getOwnerDashboard(new Date(), salonId);
    // Kept for the next launch, which shows it while this request runs again.
    void dashboardCache.set(salonId, dashboard);

    return dashboard;
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);
    const response = error instanceof ApiError
      ? error.responseData as { error?: { code?: string }; code?: string } | undefined
      : undefined;
    const state = getState();

    if (!isNetworkOnline() || isUserLogoutInProgress() || !selectCurrentUser(state)) {
      return rejectWithValue({
        message,
        responseBody: error instanceof ApiError ? error.responseData : undefined,
        silent: true,
        status: error instanceof ApiError ? error.status : undefined,
      });
    }


    return rejectWithValue({
      code: response?.error?.code ?? response?.code ?? (error instanceof ApiError ? error.code : undefined),
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      status: error instanceof ApiError ? error.status : undefined,
    });
  }
}, {
  condition: (_, { getState }) => {
    const state = getState() as RootState;

    const user = selectCurrentUser(state);

    // Dashboard access follows the assigned web role. Staff without access
    // can still reach these refreshes after a Calendar Quick Sale or appointment change;
    // skipping them avoids a 403 for a screen the staff app doesn't show.
    return (
      isNetworkOnline() &&
      !isUserLogoutInProgress() &&
      Boolean(user) &&
      hasBusinessDashboard(user) &&
      state.dashboard.status !== "loading" &&
      !state.dashboard.isRefreshing
    );
  },
});

/**
 * Puts the previous session's dashboard on screen straight away, so a cold
 * launch shows figures instead of skeletons while the live request runs.
 * The slice ignores the result once real data has arrived.
 */
export const hydrateDashboardFromCacheThunk = createAsyncThunk<
  DashboardFetchResult | null,
  void,
  { state: RootState }
>("dashboard/hydrateFromCache", async (_, { getState }) => {
  const state = getState();
  if (!hasBusinessDashboard(selectCurrentUser(state))) return null;

  return (await dashboardCache.get(selectActiveBranchId(state)))?.data ?? null;
}, {
  // Never overwrite figures that are already live.
  condition: (_, { getState }) => (getState() as RootState).dashboard.lastFetchedAt === null,
});
