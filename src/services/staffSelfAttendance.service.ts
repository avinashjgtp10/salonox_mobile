import { api } from "@/services/api";
import { getAttendanceLocation, toAttendanceLocationBody } from "@/services/attendanceLocation";
import type { ApiResponse } from "@/types/auth";

export type StaffSelfAttendance = {
  staff_id: string; date: string; server_time: string;
  shift_start: string | null; shift_end: string | null; reminder_at: string | null;
  can_check_in: boolean; blocked_reason: string | null; checked_in: boolean;
  record: {
    check_in: string | null; check_out: string | null; status: string;
    check_in_location?: string | null; check_out_location?: string | null;
  } | null;
};
async function getState(): Promise<StaffSelfAttendance> {
  const response = await api.get<ApiResponse<{ self_attendance: StaffSelfAttendance }>>("/attendance/today");
  const state = response.data?.data?.self_attendance;
  if (!state || typeof state.checked_in !== "boolean" || typeof state.can_check_in !== "boolean" || !state.staff_id) {
    throw new Error("The server did not return your check-in status. Please refresh attendance or contact your manager.");
  }
  return state;
}
export const staffSelfAttendanceService = {
  get: getState,
  async checkIn() {
    await api.post("/attendance/check-in", toAttendanceLocationBody(await getAttendanceLocation()));
    return getState();
  },
  async checkOut() {
    await api.post("/attendance/check-out", toAttendanceLocationBody(await getAttendanceLocation()));
    return getState();
  },
};
