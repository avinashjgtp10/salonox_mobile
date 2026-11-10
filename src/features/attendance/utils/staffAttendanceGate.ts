import type { StaffSelfAttendance } from "@/services/staffSelfAttendance.service";
import { attendanceDateKey } from "./attendanceRules";

export const hasUnfinishedStaffShift = (state: StaffSelfAttendance | null) => Boolean(
  state?.record?.check_in && !state.record.check_out && state.current_status !== "CHECKED_OUT" && state.record.current_status !== "CHECKED_OUT",
);

export function canUnlockStaffApp(state: StaffSelfAttendance | null, now = new Date()): boolean {
  if (!state?.checked_in || !state.record?.check_in) return false;
  // An unfinished shift must retain its return/final-checkout controls even
  // several days later, including legacy responses without current_status.
  if (hasUnfinishedStaffShift(state)) return true;
  if (state.date === attendanceDateKey(now.toISOString())) return true;
  // A previous-day overnight shift remains current until its backend end time.
  return Boolean(state.shift_start && state.shift_end &&
    now >= new Date(state.shift_start) && now < new Date(state.shift_end));
}
