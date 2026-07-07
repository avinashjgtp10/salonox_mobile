import { createAsyncThunk } from "@reduxjs/toolkit";

import { ApiError, getApiErrorMessage } from "@/services/api";
import { staffLeavesService } from "@/services/staffLeaves.service";
import type { RootState } from "@/store";
import type {
  CreateLeaveRequest,
  CreateLeaveResponse,
  DeleteLeaveResponse,
  LeaveEntry,
  UpdateLeaveRequest,
  UpdateLeaveResponse,
} from "@/types/staffLeaves";

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

export const fetchLeavesThunk = createAsyncThunk<
  { leaves: LeaveEntry[]; staffId: string },
  string,
  { rejectValue: RejectValue; state: RootState }
>("staffLeaves/fetch", async (staffId, { rejectWithValue }) => {
  try {
    const leaves = await staffLeavesService.getLeaves(staffId);

    return { leaves, staffId };
  } catch (error) {
    console.error("[StaffLeaves] Fetch failed", { staffId, ...toRejectValue(error) });

    return rejectWithValue(toRejectValue(error));
  }
});

export const createLeaveThunk = createAsyncThunk<
  CreateLeaveResponse,
  { payload: CreateLeaveRequest; staffId: string },
  { rejectValue: RejectValue; state: RootState }
>("staffLeaves/create", async ({ payload, staffId }, { rejectWithValue }) => {
  try {
    return await staffLeavesService.createLeave(staffId, payload);
  } catch (error) {
    console.error("[StaffLeaves] Create failed", { staffId, ...toRejectValue(error) });

    return rejectWithValue(toRejectValue(error));
  }
});

export const updateLeaveThunk = createAsyncThunk<
  UpdateLeaveResponse,
  { recordId: string; staffId: string; updates: UpdateLeaveRequest },
  { rejectValue: RejectValue; state: RootState }
>("staffLeaves/update", async ({ recordId, staffId, updates }, { rejectWithValue }) => {
  try {
    return await staffLeavesService.updateLeave(staffId, recordId, updates);
  } catch (error) {
    console.error("[StaffLeaves] Update failed", { recordId, staffId, ...toRejectValue(error) });

    return rejectWithValue(toRejectValue(error));
  }
});

export const deleteLeaveThunk = createAsyncThunk<
  DeleteLeaveResponse,
  { recordId: string; staffId: string },
  { rejectValue: RejectValue; state: RootState }
>("staffLeaves/delete", async ({ recordId, staffId }, { rejectWithValue }) => {
  try {
    return await staffLeavesService.deleteLeave(staffId, recordId);
  } catch (error) {
    console.error("[StaffLeaves] Delete failed", { recordId, staffId, ...toRejectValue(error) });

    return rejectWithValue(toRejectValue(error));
  }
});
