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

    return rejectWithValue(toRejectValue(error));
  }
});

export const settleCommissionThunk = createAsyncThunk<
  SettleCommissionResponse,
  SettleCommissionRequest,
  { rejectValue: RejectValue; state: RootState }
>("salonCommissions/settle", async ({ staffId, amount }, { dispatch, getState, rejectWithValue }) => {
  let response: SettleCommissionResponse;
  try {
    response = await salonCommissionsService.settleCommission(staffId, amount);
  } catch (error) {

    return rejectWithValue(toRejectValue(error));
  }
  // A refresh failure happens after the settlement is committed. Keep that
  // distinction so the UI does not invite the user to pay the same amount twice.
  const range = getState().salonCommissions.range ?? undefined;
  const refreshes = await Promise.all([
    dispatch(fetchSalonCommissionSummaryThunk(range)),
    dispatch(fetchSalonCommissionEarnedThunk(range)),
  ]);
  return { ...response, refreshFailed: fetchSalonCommissionSummaryThunk.rejected.match(refreshes[0]) || fetchSalonCommissionEarnedThunk.rejected.match(refreshes[1]) };
});
