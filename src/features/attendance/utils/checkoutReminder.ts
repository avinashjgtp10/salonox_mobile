import type { StaffSelfAttendance } from "@/services/staffSelfAttendance.service";
import { parseAttendanceDateTime } from "./attendanceStatus";

export const CHECKOUT_REMINDER_DELAY_MS = 15 * 60 * 1000;

/** Use the authenticated self-attendance shift, including overnight/date overrides. */
export function getCheckoutReminder(state: StaffSelfAttendance | null) {
  if (!state?.staff_id || !state.date || !state.checked_in || !state.record?.check_in ||
      state.record.check_out || state.current_status === "CHECKED_OUT" || state.record.current_status === "CHECKED_OUT") return null;
  const start = parseAttendanceDateTime(state.shift_start)?.getTime();
  const end = parseAttendanceDateTime(state.shift_end)?.getTime();
  const serverNow = parseAttendanceDateTime(state.server_time)?.getTime();
  if (start === undefined || end === undefined || serverNow === undefined || end <= start) return null;
  const dueAt = end + CHECKOUT_REMINDER_DELAY_MS;
  return {
    key: JSON.stringify([state.staff_id, state.date, start, end, state.record.check_in]),
    dueAt,
    serverNow,
    // Only a response fetched at/after the deadline can confirm eligibility.
    due: serverNow >= dueAt,
  };
}
