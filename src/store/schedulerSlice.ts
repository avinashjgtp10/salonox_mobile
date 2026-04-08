import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  Booking,
  BlockedTime,
  ViewMode,
  IntervalOption,
} from "../features/bookings/types/scheduler-types";
import {
  INITIAL_BOOKINGS,
  INITIAL_BLOCKED,
} from "../features/bookings/utils/schedulerMockData";

interface SchedulerState {
  bookings: Booking[];
  blockedTimes: BlockedTime[];
  viewMode: ViewMode;
  currentDate: string;
  interval: IntervalOption;
}

const initialState: SchedulerState = {
  bookings: INITIAL_BOOKINGS,
  blockedTimes: INITIAL_BLOCKED,
  viewMode: "Day",
  currentDate: new Date().toISOString().slice(0, 10),
  interval: "30 Mins",
};

const schedulerSlice = createSlice({
  name: "scheduler",
  initialState,
  reducers: {
    addBooking(state, { payload }: PayloadAction<Booking>) {
      state.bookings.push(payload);
    },
    updateBooking(state, { payload }: PayloadAction<Booking>) {
      const idx = state.bookings.findIndex((b) => b.id === payload.id);
      if (idx !== -1) state.bookings[idx] = payload;
    },
    deleteBooking(state, { payload }: PayloadAction<string>) {
      state.bookings = state.bookings.filter((b) => b.id !== payload);
    },
    addBlockedTime(state, { payload }: PayloadAction<BlockedTime>) {
      state.blockedTimes.push(payload);
    },
    deleteBlockedTime(state, { payload }: PayloadAction<string>) {
      state.blockedTimes = state.blockedTimes.filter((b) => b.id !== payload);
    },
    setViewMode(state, { payload }: PayloadAction<ViewMode>) {
      state.viewMode = payload;
    },
    setCurrentDate(state, { payload }: PayloadAction<string>) {
      state.currentDate = payload;
    },
    setInterval(state, { payload }: PayloadAction<IntervalOption>) {
      state.interval = payload;
    },
    navigate(state, { payload: dir }: PayloadAction<1 | -1>) {
      const d = new Date(state.currentDate + "T12:00:00");
      if (state.viewMode === "Day") d.setDate(d.getDate() + dir);
      else if (state.viewMode === "Week" || state.viewMode === "List Week")
        d.setDate(d.getDate() + dir * 7);
      else if (state.viewMode === "Month") d.setMonth(d.getMonth() + dir);
      state.currentDate = d.toISOString().slice(0, 10);
    },
  },
});

export const {
  addBooking,
  updateBooking,
  deleteBooking,
  addBlockedTime,
  deleteBlockedTime,
  setViewMode,
  setCurrentDate,
  setInterval,
  navigate,
} = schedulerSlice.actions;

export default schedulerSlice.reducer;
