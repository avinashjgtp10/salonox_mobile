import { createAsyncThunk } from "@reduxjs/toolkit";

import { ApiError, getApiErrorMessage } from "@/services/api";
import { staffWagesService } from "@/services/staffWages.service";
import type { RootState } from "@/store";
import type { StaffWage, UpdateWageRequest, UpdateWageResponse } from "@/types/staffWages";

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

export const fetchStaffWageThunk = createAsyncThunk<
  { staffId: string; wage: StaffWage | null },
  string,
  { rejectValue: RejectValue; state: RootState }
>("staffWages/fetchWage", async (staffId, { rejectWithValue }) => {
  try {
    const wage = await staffWagesService.getWage(staffId);

    return { staffId, wage };
  } catch (error) {
    console.error("[StaffWages] Fetch failed", { staffId, ...toRejectValue(error) });

    return rejectWithValue(toRejectValue(error));
  }
});

export const updateStaffWageThunk = createAsyncThunk<
  UpdateWageResponse & { staffId: string },
  { staffId: string; updates: UpdateWageRequest },
  { rejectValue: RejectValue; state: RootState }
>("staffWages/updateWage", async ({ staffId, updates }, { rejectWithValue }) => {
  try {
    const response = await staffWagesService.updateWage(staffId, updates);

    return { ...response, staffId };
  } catch (error) {
    console.error("[StaffWages] Update failed", { staffId, ...toRejectValue(error) });

    return rejectWithValue(toRejectValue(error));
  }
});
