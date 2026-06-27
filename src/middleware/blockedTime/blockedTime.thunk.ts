import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { BLOCKED_TIME } from "../../services/api/endpoints";
import { ApiError } from "../../services/api/interceptors";
import type { BlockedTime } from "../../features/bookings/types/booking.types";

export interface CreateBlockedTimePayload {
  staff_id: string;
  date: string;
  start_time: string;
  end_time: string;
  reason?: string;
}

export interface UpdateBlockedTimePayload {
  id: string;
  staffId: string;
  data: Partial<Omit<CreateBlockedTimePayload, "staff_id">>;
}

function mapApiBlockedTime(item: any): BlockedTime {
  return {
    id: String(item.id),
    staffId: String(item.staff_id ?? ""),
    date: item.date ?? "",
    startTime: item.start_time ?? "",
    endTime: item.end_time ?? "",
    reason: item.reason ?? "",
  };
}

export const createBlockedTimeThunk = createAsyncThunk<
  BlockedTime,
  CreateBlockedTimePayload,
  { rejectValue: string }
>("blockedTime/create", async (payload, { rejectWithValue }) => {
  try {
    const res = await api.post(BLOCKED_TIME.FOR_STAFF(payload.staff_id), payload);
    return mapApiBlockedTime(res.data.data ?? res.data);
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to create blocked time");
  }
});

export const updateBlockedTimeThunk = createAsyncThunk<
  BlockedTime,
  UpdateBlockedTimePayload,
  { rejectValue: string }
>("blockedTime/update", async ({ id, staffId, data }, { rejectWithValue }) => {
  try {
    const res = await api.patch(BLOCKED_TIME.FOR_STAFF_BY_ID(staffId, id), data);
    return mapApiBlockedTime(res.data.data ?? res.data);
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to update blocked time");
  }
});

export const deleteBlockedTimeThunk = createAsyncThunk<
  string,
  { id: string; staffId: string },
  { rejectValue: string }
>("blockedTime/delete", async ({ id, staffId }, { rejectWithValue }) => {
  try {
    await api.delete(BLOCKED_TIME.FOR_STAFF_BY_ID(staffId, id));
    return id;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to delete blocked time");
  }
});
