import { createAsyncThunk } from "@reduxjs/toolkit";

import { ApiError, getApiErrorMessage } from "@/services/api";
import { staffCommissionsService } from "@/services/staffCommissions.service";
import type { RootState } from "@/store";
import type { CommissionHistoryEntry } from "@/types/staffCommissions";

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

export const fetchCommissionHistoryThunk = createAsyncThunk<
  { history: CommissionHistoryEntry[]; staffId: string },
  string,
  { rejectValue: RejectValue; state: RootState }
>("staffCommissions/fetchHistory", async (staffId, { rejectWithValue }) => {
  try {
    const history = await staffCommissionsService.getCommissionHistory(staffId);

    return { history, staffId };
  } catch (error) {
    console.error("[StaffCommissions] Fetch history failed", { staffId, ...toRejectValue(error) });

    return rejectWithValue(toRejectValue(error));
  }
});
