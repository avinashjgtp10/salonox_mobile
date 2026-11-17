import type { AttendanceRecord } from "@/types/attendance";
import type { StaffSchedule } from "@/types/staffSchedule";

const WEEK_DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export function getDailyStaffSchedule(schedule: StaffSchedule | undefined, date: string, record: AttendanceRecord | null) {
  const day = WEEK_DAYS[new Date(`${date}T12:00:00Z`).getUTCDay()];
  const shift = schedule?.days.find(entry => entry.day.toLowerCase() === day);
  if (record?.onApprovedLeave || record?.statusKey === "onLeave") {
    return { label: "On Leave", hours: "On Leave", tone: "leave" } as const;
  }
  if (shift?.isOff) return { label: "Day Off", hours: "Day Off", tone: "off" } as const;
  if (shift?.startTime && shift.endTime) {
    return { label: "Working", hours: `${shift.startTime} - ${shift.endTime}`, tone: "working" } as const;
  }
  return { label: "Not Marked", hours: "Shift not set", tone: "unknown" } as const;
}
