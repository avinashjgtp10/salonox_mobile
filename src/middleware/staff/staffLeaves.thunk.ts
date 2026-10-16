import { createAsyncThunk } from "@reduxjs/toolkit";

import { ApiError, getApiErrorMessage } from "@/services/api";
import { staffLeavesService } from "@/services/staffLeaves.service";
import { emitRealtimeEntityChanged } from "@/services/realtimeEvents";
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

    return rejectWithValue(toRejectValue(error));
  }
});

export const createLeaveThunk = createAsyncThunk<
  CreateLeaveResponse,
  { payload: CreateLeaveRequest; staffId: string },
  { rejectValue: RejectValue; state: RootState }
>("staffLeaves/create", async ({ payload, staffId }, { rejectWithValue }) => {
  try {
    const result = await staffLeavesService.createLeave(staffId, payload);
    emitRealtimeEntityChanged({ entity: "staff", payload: { staff_id: staffId } });
    return result;
  } catch (error) {

    return rejectWithValue(toRejectValue(error));
  }
});

export const updateLeaveThunk = createAsyncThunk<
  UpdateLeaveResponse,
  { recordId: string; staffId: string; updates: UpdateLeaveRequest },
  { rejectValue: RejectValue; state: RootState }
>("staffLeaves/update", async ({ recordId, staffId, updates }, { rejectWithValue }) => {
  try {
    const result = await staffLeavesService.updateLeave(staffId, recordId, updates);
    emitRealtimeEntityChanged({ entity: "staff", payload: { staff_id: staffId } });
    return result;
  } catch (error) {

    return rejectWithValue(toRejectValue(error));
  }
});

export const deleteLeaveThunk = createAsyncThunk<
  DeleteLeaveResponse,
  { recordId: string; staffId: string },
  { rejectValue: RejectValue; state: RootState }
>("staffLeaves/delete", async ({ recordId, staffId }, { rejectWithValue }) => {
  try {
    const result = await staffLeavesService.deleteLeave(staffId, recordId);
    emitRealtimeEntityChanged({ entity: "staff", payload: { staff_id: staffId } });
    return result;
  } catch (error) {

    return rejectWithValue(toRejectValue(error));
  }
});
