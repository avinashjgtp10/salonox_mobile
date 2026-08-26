import { createAsyncThunk } from "@reduxjs/toolkit";

import { ApiError, getApiErrorMessage } from "@/services/api";
import { salonCommissionsService } from "@/services/salonCommissions.service";
import type { RootState } from "@/store";
import type {
  SalonCommissionSummary,
  SalonEarnedEntry,
  SettleCommissionRequest,
  SettleCommissionResponse,
} from "@/types/salonCommissions";

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
  void,
  { rejectValue: RejectValue; state: RootState }
>("salonCommissions/fetchSummary", async (_args, { rejectWithValue }) => {
  try {
    return await salonCommissionsService.getSummary();
  } catch (error) {
    if (__DEV__) {
      console.error("[SalonCommissions] Fetch summary failed", toRejectValue(error));
    }

    return rejectWithValue(toRejectValue(error));
  }
});

export const fetchSalonCommissionEarnedThunk = createAsyncThunk<
  SalonEarnedEntry[],
  void,
  { rejectValue: RejectValue; state: RootState }
>("salonCommissions/fetchEarned", async (_args, { rejectWithValue }) => {
  try {
    return await salonCommissionsService.getEarned();
  } catch (error) {
    if (__DEV__) {
      console.error("[SalonCommissions] Fetch earned failed", toRejectValue(error));
    }

    return rejectWithValue(toRejectValue(error));
  }
});

export const settleCommissionThunk = createAsyncThunk<
  SettleCommissionResponse,
  SettleCommissionRequest,
  { rejectValue: RejectValue; state: RootState }
>("salonCommissions/settle", async ({ staffId, amount }, { dispatch, rejectWithValue }) => {
  try {
    const response = await salonCommissionsService.settleCommission(staffId, amount);

    // Keep the settlement loading state active until both authoritative
    // backend views have finished refreshing. Their reducers preserve the
    // previous data if either refresh fails.
    await Promise.all([
      dispatch(fetchSalonCommissionSummaryThunk()),
      dispatch(fetchSalonCommissionEarnedThunk()),
    ]);

    return response;
  } catch (error) {
    if (__DEV__) {
      console.error("[SalonCommissions] Settle commission failed", { staffId, amount, ...toRejectValue(error) });
    }

    return rejectWithValue(toRejectValue(error));
  }
});
