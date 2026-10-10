import { createAsyncThunk } from "@reduxjs/toolkit";

import { ApiError, getApiErrorMessage } from "@/services/api";
import { staffCommissionsService } from "@/services/staffCommissions.service";
import type { RootState } from "@/store";
import type { CommissionHistoryEntry } from "@/types/staffCommissions";
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

export type CommissionHistoryArgs = { month: string; staffId: string };

export const commissionHistoryKey = ({ month, staffId }: CommissionHistoryArgs) => `${staffId}:${month}`;

export const fetchCommissionHistoryThunk = createAsyncThunk<
  { history: CommissionHistoryEntry[]; key: string },
  CommissionHistoryArgs,
  { rejectValue: RejectValue; state: RootState }
>("staffCommissions/fetchHistory", async (args, { rejectWithValue }) => {
  try {
    const history = await staffCommissionsService.getCommissionHistory(args.staffId, args.month);

    return { history, key: commissionHistoryKey(args) };
  } catch (error) {
    logApiError("[StaffCommissions] Fetch history failed", { ...args, ...toRejectValue(error) });

    return rejectWithValue(toRejectValue(error));
  }
});
