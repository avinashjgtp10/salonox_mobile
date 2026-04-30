import { createAsyncThunk } from "@reduxjs/toolkit";
import { CALENDAR } from "../../services/api/endpoints";
import api from "../../services/api/axios";
import { ApiError } from "../../services/api/interceptors";
import { downloadBlob } from "../../utils/downloadBlob";
import type {
  CalendarEvent,
  CalendarEventResponse,
  CalendarEventListResponse,
  CreateCalendarEventPayload,
  UpdateCalendarEventPayload,
} from "../../types/calendar.types";

// ── Fetch all calendar events ──────────────────────────────────────────────────
export const fetchCalendarEventsThunk = createAsyncThunk<
  CalendarEvent[],
  void,
  { rejectValue: string }
>("calendar/fetchAll", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get<CalendarEventListResponse>(CALENDAR.BASE);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch calendar events");
  }
});

// ── Fetch single calendar event ────────────────────────────────────────────────
export const fetchCalendarEventByIdThunk = createAsyncThunk<
  CalendarEvent,
  string | number,
  { rejectValue: string }
>("calendar/fetchById", async (id, { rejectWithValue }) => {
  try {
    const res = await api.get<CalendarEventResponse>(CALENDAR.BY_ID(id));
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch calendar event");
  }
});

// ── Create calendar event ──────────────────────────────────────────────────────
export const createCalendarEventThunk = createAsyncThunk<
  CalendarEvent,
  CreateCalendarEventPayload,
  { rejectValue: string }
>("calendar/create", async (payload, { rejectWithValue }) => {
  try {
    const res = await api.post<CalendarEventResponse>(CALENDAR.BASE, payload);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to create calendar event");
  }
});

// ── Update calendar event ──────────────────────────────────────────────────────
export const updateCalendarEventThunk = createAsyncThunk<
  CalendarEvent,
  UpdateCalendarEventPayload,
  { rejectValue: string }
>("calendar/update", async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.patch<CalendarEventResponse>(CALENDAR.BY_ID(id), data);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to update calendar event");
  }
});

// ── Delete calendar event ──────────────────────────────────────────────────────
export const deleteCalendarEventThunk = createAsyncThunk<
  string | number, // returns the deleted id so reducer can remove it
  string | number,
  { rejectValue: string }
>("calendar/delete", async (id, { rejectWithValue }) => {
  try {
    await api.delete(CALENDAR.BY_ID(id));
    return id;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to delete calendar event");
  }
});

// ── Export calendar events ─────────────────────────────────────────────────────
export const exportCalendarEventsThunk = createAsyncThunk<
  void,
  "excel" | "csv",
  { rejectValue: string }
>("calendar/export", async (format, { rejectWithValue }) => {
  try {
    const res = await api.get(CALENDAR.EXPORT(format), {
      responseType: "blob",
    });
    downloadBlob(res.data, `calendar.${format === "excel" ? "xlsx" : "csv"}`);
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to export calendar events");
  }
});

// ── Status transitions ─────────────────────────────────────────────────────────
export const confirmCalendarEventThunk = createAsyncThunk<
  CalendarEvent,
  string | number,
  { rejectValue: string }
>("calendar/confirm", async (id, { rejectWithValue }) => {
  try {
    const res = await api.post<CalendarEventResponse>(CALENDAR.CONFIRM(id));
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to confirm event");
  }
});

export const startCalendarEventThunk = createAsyncThunk<
  CalendarEvent,
  string | number,
  { rejectValue: string }
>("calendar/start", async (id, { rejectWithValue }) => {
  try {
    const res = await api.post<CalendarEventResponse>(CALENDAR.START(id));
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to start event");
  }
});

export const cancelCalendarEventThunk = createAsyncThunk<
  CalendarEvent,
  string | number,
  { rejectValue: string }
>("calendar/cancel", async (id, { rejectWithValue }) => {
  try {
    const res = await api.post<CalendarEventResponse>(CALENDAR.CANCEL(id));
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to cancel event");
  }
});

export const noShowCalendarEventThunk = createAsyncThunk<
  CalendarEvent,
  string | number,
  { rejectValue: string }
>("calendar/noShow", async (id, { rejectWithValue }) => {
  try {
    const res = await api.post<CalendarEventResponse>(CALENDAR.NO_SHOW(id));
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to mark no-show");
  }
});

export const checkoutCalendarEventThunk = createAsyncThunk<
  CalendarEvent,
  { id: string | number; data?: Record<string, any> },
  { rejectValue: string }
>("calendar/checkout", async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.post<CalendarEventResponse>(CALENDAR.CHECKOUT(id), data);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to checkout event");
  }
});
