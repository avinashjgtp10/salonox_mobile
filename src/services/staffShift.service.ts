import { api } from "@/services/api";
import { STAFF } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";
import { attendanceDateKey } from "@/features/attendance/utils/attendanceRules";

type ScheduledShift = { date?: string | null; day_of_week: number; is_available: boolean; start_time: string | null; end_time: string | null };
export function selectScheduledShift(shifts: ScheduledShift[], date: string) {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const shift = shifts.find(item => attendanceDateKey(item.date) === date) ??
    shifts.find(item => !item.date && item.day_of_week === weekday);
  return shift?.is_available && shift.start_time && shift.end_time ? shift : null;
}
export const staffShiftService = {
  async get(staffId: string, date: string) {
    const response = await api.get<ApiResponse<ScheduledShift[]>>(STAFF.SCHEDULED(staffId));
    if (!Array.isArray(response.data.data)) throw new Error("Unable to read the saved staff shift.");
    return selectScheduledShift(response.data.data, date);
  },
};
