import { CALENDAR } from "../../services/api/endpoints";
import { createCRUDThunks } from "../utils/createCRUDThunks";
import type { CalendarEvent, CreateCalendarEventPayload } from "../../types/calendar.types";

// ── Standard CRUD thunks (generated) ─────────────────────────────────────────
const calendarThunks = createCRUDThunks<CalendarEvent, CreateCalendarEventPayload, Partial<CreateCalendarEventPayload>>(
  "calendar",
  CALENDAR,
  "calendar event",
);

export const {
  fetchAllThunk:  fetchCalendarEventsThunk,
  fetchByIdThunk: fetchCalendarEventByIdThunk,
  createThunk:    createCalendarEventThunk,
  updateThunk:    updateCalendarEventThunk,
  deleteThunk:    deleteCalendarEventThunk,
  exportThunk:    exportCalendarEventsThunk,
} = calendarThunks;
