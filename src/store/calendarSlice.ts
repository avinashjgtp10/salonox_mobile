import { createSlice } from "@reduxjs/toolkit";
import type { CalendarEvent } from "../types/calendar.types";
import {
  fetchCalendarEventsThunk,
  fetchCalendarEventByIdThunk,
  createCalendarEventThunk,
  updateCalendarEventThunk,
  deleteCalendarEventThunk,
  exportCalendarEventsThunk,
} from "../middleware/calendar/calendar.thunk";

export interface CalendarState {
  events:        CalendarEvent[];
  selectedEvent: CalendarEvent | null;
  loading:       boolean;
  error:         string | null;
}

const initialState: CalendarState = {
  events:        [],
  selectedEvent: null,
  loading:       false,
  error:         null,
}

const calendarSlice = createSlice({
  name: "calendar",
  initialState,
  reducers: {
    clearCalendarError(state) {
      state.error = null;
    },
    clearSelectedCalendarEvent(state) {
      state.selectedEvent = null;
    },
  },

  extraReducers: (builder) => {
    // ── fetchCalendarEventsThunk ──────────────────────────────────────────────
    builder
      .addCase(fetchCalendarEventsThunk.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(fetchCalendarEventsThunk.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.events  = payload;
      })
      .addCase(fetchCalendarEventsThunk.rejected, (state, { payload }) => {
        state.loading = false;
        state.error   = payload ?? "Failed to fetch calendar events";
      })

    // ── fetchCalendarEventByIdThunk ───────────────────────────────────────────
    builder
      .addCase(fetchCalendarEventByIdThunk.pending, (state) => {
        state.loading        = true;
        state.error          = null;
        state.selectedEvent  = null;
      })
      .addCase(fetchCalendarEventByIdThunk.fulfilled, (state, { payload }) => {
        state.loading        = false;
        state.selectedEvent  = payload;
      })
      .addCase(fetchCalendarEventByIdThunk.rejected, (state, { payload }) => {
        state.loading = false;
        state.error   = payload ?? "Failed to fetch calendar event";
      })

    // ── createCalendarEventThunk ──────────────────────────────────────────────
    builder
      .addCase(createCalendarEventThunk.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(createCalendarEventThunk.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.events.push(payload);
      })
      .addCase(createCalendarEventThunk.rejected, (state, { payload }) => {
        state.loading = false;
        state.error   = payload ?? "Failed to create calendar event";
      })

    // ── updateCalendarEventThunk ──────────────────────────────────────────────
    builder
      .addCase(updateCalendarEventThunk.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(updateCalendarEventThunk.fulfilled, (state, { payload }) => {
        state.loading = false;
        const idx     = state.events.findIndex((e) => e.id === payload.id);
        if (idx !== -1) state.events[idx] = payload;
      })
      .addCase(updateCalendarEventThunk.rejected, (state, { payload }) => {
        state.loading = false;
        state.error   = payload ?? "Failed to update calendar event";
      })

    // ── deleteCalendarEventThunk ──────────────────────────────────────────────
    builder
      .addCase(deleteCalendarEventThunk.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(deleteCalendarEventThunk.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.events  = state.events.filter((e) => e.id !== payload);
      })
      .addCase(deleteCalendarEventThunk.rejected, (state, { payload }) => {
        state.loading = false;
        state.error   = payload ?? "Failed to delete calendar event";
      })

    // ── exportCalendarEventsThunk ─────────────────────────────────────────────
    builder
      .addCase(exportCalendarEventsThunk.pending,   (state) => { state.loading = true;  state.error = null; })
      .addCase(exportCalendarEventsThunk.fulfilled, (state) => { state.loading = false; })
      .addCase(exportCalendarEventsThunk.rejected,  (state, { payload }) => {
        state.loading = false;
        state.error   = payload ?? "Failed to export calendar events";
      })
  },
})

export const { clearCalendarError, clearSelectedCalendarEvent } = calendarSlice.actions;
export default calendarSlice.reducer;
