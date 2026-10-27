import { getDateKey } from "@/features/appointments/utils/appointmentDateTime";
import type { AppointmentListItem } from "@/types/appointment";

// Attendance "show only checked-in staff", same rules as the web's
// features/bookings/utils/staffPresence.ts. Check-in only exists for TODAY, so
// every rule applies to today only: any other date shows everyone.

export type StaffPresenceState = "checked_in" | "checked_out" | "not_checked_in" | "on_break";

/** A break in progress: when it started and when the staff member said they'd be back. */
export type StaffBreak = { since: string; until: string };

export type StaffPresence = {
  // false = the salon hasn't turned the setting on (or the fetch failed):
  // nobody is hidden.
  enabled: boolean;
  byStaffId: Record<string, StaffPresenceState>;
  // Staff on a break right now (today). Independent of `enabled`: the break
  // warning applies even when the salon doesn't use check-in visibility.
  breaks: Record<string, StaffBreak>;
};

export const NO_STAFF_PRESENCE: StaffPresence = { breaks: {}, byStaffId: {}, enabled: false };

/** Device-local YYYY-MM-DD, as the web's localTodayYMD (todayIsoDate is the UTC date). */
export const localTodayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

/** No attendance row today = hasn't checked in. */
export const staffPresenceState = (presence: StaffPresence, staffId: string): StaffPresenceState =>
  presence.byStaffId[staffId] ?? "not_checked_in";

/** True when this staff member should be left out of today's lists. */
export const isHiddenByCheckIn = (presence: StaffPresence, staffId: string) =>
  presence.enabled && staffPresenceState(presence, staffId) === "not_checked_in";

/** True when they checked out today and the salon uses check-in visibility. */
export const isCheckedOut = (presence: StaffPresence, staffId: string) =>
  presence.enabled && staffPresenceState(presence, staffId) === "checked_out";

/** The break this staff member is on right now. Breaks only exist for today, so any other date is never flagged. */
export const breakAt = (presence: StaffPresence, staffId: string, dateKey?: string | null): StaffBreak | null => {
  if (dateKey && dateKey !== localTodayKey()) return null;
  return presence.breaks[staffId] ?? null;
};

/** Local "1:30 PM" label for an ISO timestamp. */
export const formatBreakTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", hour12: true, minute: "2-digit" });

/**
 * Staff to offer in a picker. Hidden staff are dropped, but anyone in
 * `keepIds` (the staff already on the bill) stays so an existing assignment
 * never turns blank. Check-in only exists for today, so any other `dateKey`
 * is left unfiltered; null/undefined = unknown, treated as today.
 */
export const pickableStaff = <T extends { id: string }>(
  staffList: T[],
  presence: StaffPresence,
  keepIds: (string | null | undefined)[] = [],
  dateKey?: string | null,
): T[] => {
  if (!presence.enabled || (dateKey && dateKey !== localTodayKey())) return staffList;
  const keep = new Set(keepIds.filter((id): id is string => Boolean(id)));
  return staffList.filter((staff) => keep.has(staff.id) || !isHiddenByCheckIn(presence, staff.id));
};

/** Every staff id on a booking that day: the primary staff plus each billed row's staff. */
export const staffIdsWithBookingsOn = (
  appointments: AppointmentListItem[],
  dateKey: string,
  resolveStaffId: (appointment: AppointmentListItem) => string,
  canonicalIdByAlias: Map<string, string>,
) => {
  const ids = new Set<string>();

  appointments.forEach((appointment) => {
    if (getDateKey(appointment.scheduledAt) !== dateKey) return;
    const primary = resolveStaffId(appointment);
    if (primary) ids.add(primary);
    appointment.billedItems.forEach((item) => {
      if (item.staffId) ids.add(canonicalIdByAlias.get(item.staffId) ?? item.staffId);
    });
  });

  return ids;
};

/**
 * Staff shown on the calendar for `dateKey`. Only today is filtered, and a
 * hidden staff member who still has a booking that day keeps their column — a
 * missed check-in must never make a client's appointment vanish.
 */
export const calendarColumnStaff = <T extends { id: string }>(
  staffList: T[],
  presence: StaffPresence,
  dateKey: string,
  staffIdsWithBookings: Set<string>,
): T[] => {
  if (!presence.enabled || dateKey !== localTodayKey()) return staffList;

  return staffList.filter((staff) => staffIdsWithBookings.has(staff.id) || !isHiddenByCheckIn(presence, staff.id));
};
