import type { AttendanceSettings, ManualAttendanceStatus } from "@/types/attendance";

export type AttendanceShift = { date?: string | null; dayOfWeek: number; isAvailable: boolean; startTime: string | null };

export function attendanceDateKey(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : new Date(date.getTime() + 330 * 60000).toISOString().slice(0, 10);
}

export function attendanceTimeToIso(date: string, hour: number, minute: number): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(hour) || hour < 0 || hour > 23 ||
      !Number.isInteger(minute) || minute < 0 || minute > 59) return null;
  const calendarDate = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(calendarDate.getTime()) || calendarDate.toISOString().slice(0, 10) !== date) return null;
  return new Date(`${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+05:30`).toISOString();
}

export function evaluateAttendanceCheckIn(settings: AttendanceSettings, shifts: AttendanceShift[], staffId: string, timestamp: string): ManualAttendanceStatus {
  const instant = new Date(timestamp);
  if (Number.isNaN(instant.getTime())) throw new Error("Enter a valid check-in time.");
  const date = new Date(instant.getTime() + 330 * 60000).toISOString().slice(0, 10);
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  const shift = shifts.find(item => attendanceDateKey(item.date) === date) ??
    shifts.find(item => !item.date && item.dayOfWeek === day);
  const start = (shift?.isAvailable ? shift.startTime : null) ?? settings.workStartTime;
  const scoped = settings.staffScope === "all" || settings.selectedStaffIds.includes(staffId);
  if (!start || !scoped || !settings.active) return "present";
  const [hour, minute] = start.split(":").map(Number);
  const startIso = attendanceTimeToIso(date, hour, minute);
  if (!startIso) throw new Error("The attendance shift start time is invalid. Please check attendance settings.");
  const lateMinutes = Math.max(0, Math.floor((instant.getTime() - new Date(startIso).getTime()) / 60000));
  return lateMinutes >= Math.round(settings.thresholdHours * 60) ? "halfDay" : "present";
}
