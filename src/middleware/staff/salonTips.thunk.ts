import { createAsyncThunk } from "@reduxjs/toolkit";

import { ApiError, getApiErrorMessage } from "@/services/api";
import { salonTipsService } from "@/services/salonTips.service";
import type { RootState } from "@/store";
import type {
  SalonTipEarnedEntry,
  SalonTipSettlement,
  SalonTipSummary,
  SettleTipRequest,
  SettleTipResponse,
} from "@/types/salonTips";

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

export const fetchSalonTipSummaryThunk = createAsyncThunk<
  SalonTipSummary,
  void,
  { rejectValue: RejectValue; state: RootState }
>("salonTips/fetchSummary", async (_args, { rejectWithValue }) => {
  try {
    return await salonTipsService.getSummary();
  } catch (error) {
    if (__DEV__) {
      console.error("[SalonTips] Fetch summary failed", toRejectValue(error));
    }

    return rejectWithValue(toRejectValue(error));
  }
});

export const fetchSalonTipEarnedThunk = createAsyncThunk<
  SalonTipEarnedEntry[],
  void,
  { rejectValue: RejectValue; state: RootState }
>("salonTips/fetchEarned", async (_args, { rejectWithValue }) => {
  try {
    return await salonTipsService.getEarned();
  } catch (error) {
    if (__DEV__) {
      console.error("[SalonTips] Fetch earned failed", toRejectValue(error));
    }

    return rejectWithValue(toRejectValue(error));
  }
});

export const fetchTipSettlementsThunk = createAsyncThunk<
  { settlements: SalonTipSettlement[]; staffId: string },
  string,
  { rejectValue: RejectValue; state: RootState }
>("salonTips/fetchSettlements", async (staffId, { rejectWithValue }) => {
  try {
    const settlements = await salonTipsService.getSettlements(staffId);

    return { settlements, staffId };
  } catch (error) {
    if (__DEV__) {
      console.error("[SalonTips] Fetch settlements failed", { staffId, ...toRejectValue(error) });
    }

    return rejectWithValue(toRejectValue(error));
  }
});

export const settleTipThunk = createAsyncThunk<
  SettleTipResponse,
  SettleTipRequest,
  { rejectValue: RejectValue; state: RootState }
>("salonTips/settle", async ({ amount, paymentMethod, staffId }, { dispatch, rejectWithValue }) => {
  try {
    const response = await salonTipsService.settleTip(staffId, amount, paymentMethod);

    await Promise.all([
      dispatch(fetchSalonTipSummaryThunk()),
      dispatch(fetchSalonTipEarnedThunk()),
    ]);

    return response;
  } catch (error) {
    if (__DEV__) {
      console.error("[SalonTips] Settle tip failed", { staffId, amount, ...toRejectValue(error) });
    }

    return rejectWithValue(toRejectValue(error));
  }
});
