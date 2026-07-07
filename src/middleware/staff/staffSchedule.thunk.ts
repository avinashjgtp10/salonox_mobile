import { createAsyncThunk } from "@reduxjs/toolkit";

import { ApiError, getApiErrorMessage } from "@/services/api";
import { staffScheduleService } from "@/services/staffSchedule.service";
import type { RootState } from "@/store";
import type {
  DeleteScheduleResponse,
  StaffSchedule,
  UpdateScheduleRequest,
  UpdateScheduleResponse,
} from "@/types/staffSchedule";

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

export const fetchStaffScheduleThunk = createAsyncThunk<
  { schedule: StaffSchedule; staffId: string },
  string,
  { rejectValue: RejectValue; state: RootState }
>("staffSchedule/fetch", async (staffId, { rejectWithValue }) => {
  try {
    const schedule = await staffScheduleService.getSchedule(staffId);

    return { schedule, staffId };
  } catch (error) {
    console.error("[StaffSchedule] Fetch failed", { staffId, ...toRejectValue(error) });

    return rejectWithValue(toRejectValue(error));
  }
});

export const updateStaffScheduleThunk = createAsyncThunk<
  UpdateScheduleResponse & { staffId: string },
  { staffId: string; updates: UpdateScheduleRequest },
  { rejectValue: RejectValue; state: RootState }
>("staffSchedule/update", async ({ staffId, updates }, { rejectWithValue }) => {
  try {
    const response = await staffScheduleService.updateSchedule(staffId, updates);

    return { ...response, staffId };
  } catch (error) {
    console.error("[StaffSchedule] Update failed", { staffId, ...toRejectValue(error) });

    return rejectWithValue(toRejectValue(error));
  }
});

export const deleteStaffScheduleThunk = createAsyncThunk<
  DeleteScheduleResponse,
  string,
  { rejectValue: RejectValue; state: RootState }
>("staffSchedule/delete", async (staffId, { rejectWithValue }) => {
  try {
    return await staffScheduleService.deleteSchedule(staffId);
  } catch (error) {
    console.error("[StaffSchedule] Delete failed", { staffId, ...toRejectValue(error) });

    return rejectWithValue(toRejectValue(error));
  }
});
