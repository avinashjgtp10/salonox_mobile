import type { ScheduledShift } from "@/services/staffShift.service";
import type { UpdateScheduleRequest } from "@/types/staffSchedule";

export function getWorkingHoursUpdate(
  rows: ScheduledShift[], startTime: string, endTime: string,
): UpdateScheduleRequest | null {
  if (!startTime || !endTime) return null;
  const working = rows.filter((row) => !row.date && row.is_available);
  const first = working.find((row) => row.start_time && row.end_time);
  if (first?.start_time?.slice(0, 5) === startTime && first.end_time?.slice(0, 5) === endTime) {
    return null;
  }

  const days = working.length ? working : Array.from({ length: 7 }, (_, day_of_week) => ({ day_of_week, breaks: [] }));
  return {
    items: days.map((day) => ({
      day_of_week: day.day_of_week,
      breaks: day.breaks ?? [],
      is_available: true,
      start_time: startTime,
      end_time: endTime,
    })),
  };
}
