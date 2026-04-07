import { createCRUDSlice } from "./utils/createCRUDSlice";
import type { CalendarEvent } from "../types/calendar.types";
import {
  fetchCalendarEventsThunk,
  fetchCalendarEventByIdThunk,
  createCalendarEventThunk,
  updateCalendarEventThunk,
  deleteCalendarEventThunk,
  exportCalendarEventsThunk,
} from "../middleware/calendar/calendar.thunk";

const calendarSlice = createCRUDSlice<CalendarEvent>({
  name: "calendar",
  thunks: {
    fetchAllThunk:  fetchCalendarEventsThunk,
    fetchByIdThunk: fetchCalendarEventByIdThunk,
    createThunk:    createCalendarEventThunk,
    updateThunk:    updateCalendarEventThunk,
    deleteThunk:    deleteCalendarEventThunk,
    exportThunk:    exportCalendarEventsThunk,
  },
});

export const { clearError: clearCalendarError, clearSelectedItem: clearSelectedCalendarEvent } = calendarSlice.actions;
export default calendarSlice.reducer;
