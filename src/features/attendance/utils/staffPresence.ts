import { getDateKey, todayIsoDate } from "@/features/appointments/utils/appointmentDateTime";
import type { AppointmentListItem } from "@/types/appointment";

// Attendance "show only checked-in staff", same rules as the web's
// features/bookings/utils/staffPresence.ts. Check-in only exists for TODAY, so
// every rule applies to today only: any other date shows everyone.

export type StaffPresenceState = "checked_in" | "checked_out" | "not_checked_in" | "on_break";

export type StaffPresence = {
  // false = the salon hasn't turned the setting on (or the fetch failed):
  // nobody is hidden.
  enabled: boolean;
  byStaffId: Record<string, StaffPresenceState>;
};

export const NO_STAFF_PRESENCE: StaffPresence = { byStaffId: {}, enabled: false };

/** No attendance row today = hasn't checked in. */
export const staffPresenceState = (presence: StaffPresence, staffId: string): StaffPresenceState =>
  presence.byStaffId[staffId] ?? "not_checked_in";

/** True when this staff member should be left out of today's calendar. */
export const isHiddenByCheckIn = (presence: StaffPresence, staffId: string) =>
  presence.enabled && staffPresenceState(presence, staffId) === "not_checked_in";

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
  if (!presence.enabled || dateKey !== todayIsoDate()) return staffList;

  return staffList.filter((staff) => staffIdsWithBookings.has(staff.id) || !isHiddenByCheckIn(presence, staff.id));
};
