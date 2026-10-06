import type { StaffSelfAttendance } from "@/services/staffSelfAttendance.service";
import { attendanceDateKey } from "./attendanceRules";

export function canUnlockStaffApp(state: StaffSelfAttendance | null, now = new Date()): boolean {
  if (!state?.checked_in || !state.record?.check_in) return false;
  if (state.date === attendanceDateKey(now.toISOString())) return true;
  // A previous-day overnight shift remains current until its backend end time.
  return Boolean(state.shift_start && state.shift_end &&
    now >= new Date(state.shift_start) && now < new Date(state.shift_end));
}
