import { createAsyncThunk } from "@reduxjs/toolkit";

import { ApiError, getApiErrorMessage } from "@/services/api";
import { staffPayRunsService } from "@/services/staffPayRuns.service";
import type { RootState } from "@/store";
import type { PayRunEntry, UpsertPayRunRequest, UpsertPayRunResponse } from "@/types/staffPayRuns";

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

export const fetchPayRunsThunk = createAsyncThunk<
  { payRuns: PayRunEntry[]; staffId: string },
  string,
  { rejectValue: RejectValue; state: RootState }
>("staffPayRuns/fetch", async (staffId, { rejectWithValue }) => {
  try {
    const payRuns = await staffPayRunsService.getPayRuns(staffId);

    return { payRuns, staffId };
  } catch (error) {
    console.error("[StaffPayRuns] Fetch failed", { staffId, ...toRejectValue(error) });

    return rejectWithValue(toRejectValue(error));
  }
});

export const upsertPayRunThunk = createAsyncThunk<
  UpsertPayRunResponse & { staffId: string },
  { staffId: string; updates: UpsertPayRunRequest },
  { rejectValue: RejectValue; state: RootState }
>("staffPayRuns/upsert", async ({ staffId, updates }, { rejectWithValue }) => {
  try {
    const response = await staffPayRunsService.upsertPayRun(staffId, updates);

    return { ...response, staffId };
  } catch (error) {
    console.error("[StaffPayRuns] Upsert failed", { staffId, ...toRejectValue(error) });

    return rejectWithValue(toRejectValue(error));
  }
});
