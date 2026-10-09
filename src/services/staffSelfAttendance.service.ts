import { api } from "@/services/api";
import { MOBILE_STAFF } from "@/services/api/endpoints";
import { getAttendanceLocation, toAttendanceLocationBody } from "@/services/attendanceLocation";
import type { ApiResponse } from "@/types/auth";
import type { AttendanceActivity, StartBreakRequest } from "@/types/attendance";

export type StaffSelfAttendance = Partial<AttendanceActivity> & {
  received_at?: number;
  staff_id: string; date: string; server_time: string;
  shift_start: string | null; shift_end: string | null; reminder_at: string | null;
  can_check_in: boolean; blocked_reason: string | null; checked_in: boolean;
  record: Partial<AttendanceActivity> & {
    check_in: string | null; check_out: string | null; status: string;
    check_in_location?: string | null; check_out_location?: string | null;
  } | null;
};
type SelfAttendanceResponse = ApiResponse<{ self_attendance?: StaffSelfAttendance }>;

function readState(payload: SelfAttendanceResponse | undefined): StaffSelfAttendance {
  const state = payload?.data?.self_attendance;
  if (!state || typeof state.checked_in !== "boolean" || typeof state.can_check_in !== "boolean" || !state.staff_id) {
    throw new Error("The server did not return your check-in status. Please refresh attendance or contact your manager.");
  }
  return { ...state, received_at: Date.now() };
}
async function getState(): Promise<StaffSelfAttendance> {
  const response = await api.get<SelfAttendanceResponse>(MOBILE_STAFF.ATTENDANCE);
  return readState(response.data);
}
// Check-in/out return the updated attendance state, so no follow-up fetch is needed.
export const staffSelfAttendanceService = {
  get: getState,
  async startBreak(body: StartBreakRequest) {
    const response = await api.post<SelfAttendanceResponse>(MOBILE_STAFF.START_BREAK, body);
    return readState(response.data);
  },
  async checkIn() {
    const response = await api.post<SelfAttendanceResponse>(MOBILE_STAFF.CHECK_IN, toAttendanceLocationBody(await getAttendanceLocation()));
    return readState(response.data);
  },
  async checkOut() {
    const response = await api.post<SelfAttendanceResponse>(MOBILE_STAFF.CHECK_OUT, toAttendanceLocationBody(await getAttendanceLocation()));
    return readState(response.data);
  },
};
