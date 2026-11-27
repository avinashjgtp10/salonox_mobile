/**
 * Turns a staff schedule (as configured on the web app) into the shift lines
 * shown on Staff profile → Details.
 *
 * Consecutive days that work the same hours are collapsed into a range, so a
 * normal week reads "Mon–Sat · 9:00 AM–7:00 PM" rather than six rows, while
 * a staff member with different hours per day still gets a line each.
 */
import {
  minutesToDisplayTime,
  parseClockToMinutes,
} from "@/features/appointments/utils/appointmentDateTime";
import type { ScheduleDayEntry, StaffSchedule } from "@/types/staffSchedule";

export type StaffShiftLine = {
  /** "Mon–Sat", or a single "Sun". */
  days: string;
  /** "9:00 AM–7:00 PM", or null on a day off. */
  hours: string | null;
};

/** The service returns sunday-first; salons read their week from Monday. */
const WEEK_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const SHORT_DAY: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

const formatTime = (value: string | null) => {
  const minutes = parseClockToMinutes(value);
  return minutes === null ? null : minutesToDisplayTime(minutes);
};

/** "9:00 AM - 7:00 PM" when both ends are known, else null. */
export const formatShiftHours = (day: ScheduleDayEntry | null | undefined): string | null => {
  if (!day || day.isOff) {
    return null;
  }

  const start = formatTime(day.startTime);
  const end = formatTime(day.endTime);

  return start && end ? `${start}–${end}` : null;
};

export const summarizeStaffShifts = (schedule: StaffSchedule | null): StaffShiftLine[] => {
  if (!schedule?.days?.length) {
    return [];
  }

  const byDay = new Map(schedule.days.map((day) => [day.day.toLowerCase(), day]));
  const lines: StaffShiftLine[] = [];

  for (const name of WEEK_ORDER) {
    const hours = formatShiftHours(byDay.get(name));
    const previous = lines[lines.length - 1];

    // Same hours as the day before → extend that range instead of adding a row.
    if (previous && previous.hours === hours) {
      const [from] = previous.days.split("–");
      previous.days = `${from}–${SHORT_DAY[name]}`;
      continue;
    }

    lines.push({ days: SHORT_DAY[name], hours });
  }

  return lines;
};
