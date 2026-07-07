import { createAsyncThunk } from "@reduxjs/toolkit";

import { ApiError, getApiErrorMessage } from "@/services/api";
import { staffBlockedTimesService } from "@/services/staffBlockedTimes.service";
import type { RootState } from "@/store";
import type {
  BlockedTimeEntry,
  CreateBlockedTimeRequest,
  CreateBlockedTimeResponse,
  DeleteBlockedTimeResponse,
  UpdateBlockedTimeRequest,
  UpdateBlockedTimeResponse,
} from "@/types/staffBlockedTimes";

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

export const fetchBlockedTimesThunk = createAsyncThunk<
  { blockedTimes: BlockedTimeEntry[]; staffId: string },
  string,
  { rejectValue: RejectValue; state: RootState }
>("staffBlockedTimes/fetch", async (staffId, { rejectWithValue }) => {
  try {
    const blockedTimes = await staffBlockedTimesService.getBlockedTimes(staffId);

    return { blockedTimes, staffId };
  } catch (error) {
    console.error("[StaffBlockedTimes] Fetch failed", { staffId, ...toRejectValue(error) });

    return rejectWithValue(toRejectValue(error));
  }
});

export const createBlockedTimeThunk = createAsyncThunk<
  CreateBlockedTimeResponse,
  { payload: CreateBlockedTimeRequest; staffId: string },
  { rejectValue: RejectValue; state: RootState }
>("staffBlockedTimes/create", async ({ payload, staffId }, { rejectWithValue }) => {
  try {
    return await staffBlockedTimesService.createBlockedTime(staffId, payload);
  } catch (error) {
    console.error("[StaffBlockedTimes] Create failed", { staffId, ...toRejectValue(error) });

    return rejectWithValue(toRejectValue(error));
  }
});

export const updateBlockedTimeThunk = createAsyncThunk<
  UpdateBlockedTimeResponse,
  { recordId: string; staffId: string; updates: UpdateBlockedTimeRequest },
  { rejectValue: RejectValue; state: RootState }
>("staffBlockedTimes/update", async ({ recordId, staffId, updates }, { rejectWithValue }) => {
  try {
    return await staffBlockedTimesService.updateBlockedTime(staffId, recordId, updates);
  } catch (error) {
    console.error("[StaffBlockedTimes] Update failed", {
      recordId,
      staffId,
      ...toRejectValue(error),
    });

    return rejectWithValue(toRejectValue(error));
  }
});

export const deleteBlockedTimeThunk = createAsyncThunk<
  DeleteBlockedTimeResponse,
  { recordId: string; staffId: string },
  { rejectValue: RejectValue; state: RootState }
>("staffBlockedTimes/delete", async ({ recordId, staffId }, { rejectWithValue }) => {
  try {
    return await staffBlockedTimesService.deleteBlockedTime(staffId, recordId);
  } catch (error) {
    console.error("[StaffBlockedTimes] Delete failed", {
      recordId,
      staffId,
      ...toRejectValue(error),
    });

    return rejectWithValue(toRejectValue(error));
  }
});
