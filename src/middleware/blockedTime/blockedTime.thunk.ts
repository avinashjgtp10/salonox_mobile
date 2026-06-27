import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { BLOCKED_TIME } from "../../services/api/endpoints";
import { ApiError } from "../../services/api/interceptors";
import type { BlockedTime } from "../../features/bookings/types/booking.types";

export interface CreateBlockedTimePayload {
  salon_id: string;
  staff_id: string;
  date: string;
  start_time: string;
  end_time: string;
  reason?: string;
}

export interface UpdateBlockedTimePayload {
  id: string;
  data: Partial<Omit<CreateBlockedTimePayload, "salon_id">>;
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

export const fetchBlockedTimesThunk = createAsyncThunk<
  BlockedTime[],
  { date?: string; staffId?: string } | void,
  { rejectValue: string }
>("blockedTime/fetchAll", async (filters, { rejectWithValue, getState }) => {
  try {
    const state = getState() as any;
    const salonId = state.salon?.currentSalon?.id;
    const res = await api.get(
      BLOCKED_TIME.QUERY({ date: filters?.date, staffId: filters?.staffId, salonId })
    );
    const items: any[] = res.data.data ?? res.data ?? [];
    return Array.isArray(items) ? items.map(mapApiBlockedTime) : [];
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch blocked times");
  }
});

export const createBlockedTimeThunk = createAsyncThunk<
  BlockedTime,
  CreateBlockedTimePayload,
  { rejectValue: string }
>("blockedTime/create", async (payload, { rejectWithValue }) => {
  try {
    const res = await api.post(BLOCKED_TIME.BASE, payload);
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
>("blockedTime/update", async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.patch(BLOCKED_TIME.BY_ID(id), data);
    return mapApiBlockedTime(res.data.data ?? res.data);
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to update blocked time");
  }
});

export const deleteBlockedTimeThunk = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>("blockedTime/delete", async (id, { rejectWithValue }) => {
  try {
    await api.delete(BLOCKED_TIME.BY_ID(id));
    return id;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to delete blocked time");
  }
});
