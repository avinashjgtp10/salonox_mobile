import { api } from "@/services/api";
import type { ApiResponse } from "@/types/auth";

export type StaffSelfAttendance = {
  staff_id: string; date: string; server_time: string;
  shift_start: string | null; shift_end: string | null; reminder_at: string | null;
  can_check_in: boolean; blocked_reason: string | null; checked_in: boolean;
  record: { check_in: string | null; check_out: string | null; status: string } | null;
};
async function getState(): Promise<StaffSelfAttendance> {
  const response = await api.get<ApiResponse<{ self_attendance: StaffSelfAttendance }>>("/attendance/today");
  return response.data.data.self_attendance;
}
export const staffSelfAttendanceService = {
  get: getState,
  async checkIn() {
    await api.post("/attendance/check-in", {});
    return getState();
  },
  async checkOut() {
    await api.post("/attendance/check-out", {});
    return getState();
  },
};