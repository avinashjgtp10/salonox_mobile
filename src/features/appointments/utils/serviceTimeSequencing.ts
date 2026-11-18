import { minutesToClockTime, parseClockToMinutes } from "@/features/appointments/utils/appointmentDateTime";

// Shared "back-to-back service timing" used by both the Add Appointment form and
// Quick Sale. Services on one staff member's timeline are scheduled sequentially:
// the first starts at the booking's start time, each following one starts when the
// previous ends. Services on different staff run in parallel (each starts from the
// booking start). Non-service lines (products / memberships / packages) don't
// occupy a staff member's time, so they never push the clock forward.

const DEFAULT_STAFF_KEY = "__unassigned__";
const MINUTES_IN_DAY = 24 * 60;

const clampToDay = (minutes: number) => ((minutes % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;

export type TimelineItem = {
  id: string;
  /** Minutes this line occupies on its staff's timeline. */
  durationMinutes?: number | null;
  /** Staff assigned to this line; lines sharing a staff are scheduled back-to-back. */
  staffId?: string | null;
  /** True only for services (they consume staff time); false for product/membership/package. */
  occupiesTime: boolean;
  /** A time the user set by hand (HH:mm). Kept as-is and used as the anchor for later lines. */
  manualStartTime?: string | null;
};

// Pulls the leading whole-minute count from "30", "30 min", "45m", etc.
export const parseDurationToMinutes = (value?: string | number | null): number => {
  if (typeof value === "number") return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
  if (typeof value !== "string") return 0;
  const match = value.match(/\d+/);
  return match ? Math.max(0, Number.parseInt(match[0], 10)) : 0;
};

/**
 * Returns a map of item id -> computed HH:mm start time. A line with a manual
 * start time keeps it and resets its staff's clock to that time.
 */
export const sequenceStartTimes = (items: TimelineItem[], baseStartTime?: string | null): Record<string, string> => {
  const baseMinutes = parseClockToMinutes(baseStartTime ?? undefined) ?? 0;
  const cursorByStaff = new Map<string, number>();
  const result: Record<string, string> = {};

  for (const item of items) {
    const manualMinutes =
      item.manualStartTime != null ? parseClockToMinutes(item.manualStartTime) : null;

    // Products / memberships / packages: sit at their own time or the booking
    // start, and never advance any staff member's clock.
    if (!item.occupiesTime) {
      result[item.id] = minutesToClockTime(clampToDay(manualMinutes ?? baseMinutes));
      continue;
    }

    const staffKey = item.staffId || DEFAULT_STAFF_KEY;
    const startMinutes = manualMinutes ?? cursorByStaff.get(staffKey) ?? baseMinutes;
    result[item.id] = minutesToClockTime(clampToDay(startMinutes));
    cursorByStaff.set(staffKey, startMinutes + Math.max(Math.trunc(item.durationMinutes ?? 0), 0));
  }

  return result;
};
