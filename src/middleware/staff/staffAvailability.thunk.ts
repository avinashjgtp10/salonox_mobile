import { createAsyncThunk } from "@reduxjs/toolkit";

import { ApiError, getApiErrorMessage } from "@/services/api";
import { staffAvailabilityService } from "@/services/staffAvailability.service";
import type { RootState } from "@/store";
import type { StaffAvailability, StaffAvailabilityRequest } from "@/types/staffAvailability";

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

export const fetchStaffAvailabilityThunk = createAsyncThunk<
  StaffAvailability & StaffAvailabilityRequest,
  StaffAvailabilityRequest,
  { rejectValue: RejectValue; state: RootState }
>("staffAvailability/fetch", async ({ date, staffId }, { rejectWithValue }) => {
  try {
    const availability = await staffAvailabilityService.getAvailability(staffId, date);

    return { ...availability, date, staffId };
  } catch (error) {
    console.error("[StaffAvailability] Fetch failed", { date, staffId, ...toRejectValue(error) });

    return rejectWithValue(toRejectValue(error));
  }
});
