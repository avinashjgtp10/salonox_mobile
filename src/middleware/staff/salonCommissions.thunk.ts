import { createAsyncThunk } from "@reduxjs/toolkit";

import { ApiError, getApiErrorMessage } from "@/services/api";
import { salonCommissionsService } from "@/services/salonCommissions.service";
import type { RootState } from "@/store";
import type {
  CommissionDateRange,
  SalonCommissionSummary,
  SalonEarnedEntry,
  SettleCommissionRequest,
  SettleCommissionResponse,
} from "@/types/salonCommissions";
import { logApiError } from "@/utils/logApiError";

type RejectValue = {
  message: string;
  responseBody?: unknown;
  status?: number;
};

const toRejectValue = (error: unknown): RejectValue => ({
  message: error instanceof ApiError ? error.message : getApiErrorMessage(error),
  responseBody: error instanceof ApiError ? error.responseData : undefined,
  status: error instanceof ApiError ? error.status : undefined,
});

export const fetchSalonCommissionSummaryThunk = createAsyncThunk<
  SalonCommissionSummary,
  CommissionDateRange | undefined,
  { rejectValue: RejectValue; state: RootState }
>("salonCommissions/fetchSummary", async (range, { rejectWithValue }) => {
  try {
    return await salonCommissionsService.getSummary(range);
  } catch (error) {
    if (__DEV__) {
      logApiError("[SalonCommissions] Fetch summary failed", toRejectValue(error));
    }

    return rejectWithValue(toRejectValue(error));
  }
});

export const fetchSalonCommissionEarnedThunk = createAsyncThunk<
  SalonEarnedEntry[],
  CommissionDateRange | undefined,
  { rejectValue: RejectValue; state: RootState }
>("salonCommissions/fetchEarned", async (range, { rejectWithValue }) => {
  try {
    return await salonCommissionsService.getEarned(range);
  } catch (error) {
    if (__DEV__) {
      logApiError("[SalonCommissions] Fetch earned failed", toRejectValue(error));
    }

    return rejectWithValue(toRejectValue(error));
  }
});

export const settleCommissionThunk = createAsyncThunk<
  SettleCommissionResponse,
  SettleCommissionRequest,
  { rejectValue: RejectValue; state: RootState }
>("salonCommissions/settle", async ({ staffId, amount }, { dispatch, getState, rejectWithValue }) => {
  try {
    const response = await salonCommissionsService.settleCommission(staffId, amount);
    // Refresh the range currently on screen, not always this month.
    const range = getState().salonCommissions.range ?? undefined;

    await Promise.all([
      dispatch(fetchSalonCommissionSummaryThunk(range)),
      dispatch(fetchSalonCommissionEarnedThunk(range)),
    ]);

    return response;
  } catch (error) {
    if (__DEV__) {
      logApiError("[SalonCommissions] Settle commission failed", { staffId, amount, ...toRejectValue(error) });
    }

    return rejectWithValue(toRejectValue(error));
  }
});
