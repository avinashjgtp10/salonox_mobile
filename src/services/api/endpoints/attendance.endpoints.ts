export const ATTENDANCE = {
  EXPORT: "/attendance/export",
  CHECK_IN: "/attendance/check-in",
  CHECK_OUT: "/attendance/check-out",
  /** Closes an earlier day that was checked in but never checked out. */
  COMPLETE_CHECKOUT: (attendanceId: string) => `/attendance/${attendanceId}/complete-checkout`,
  MARK: "/attendance/mark",
  MONTHLY: "/attendance/monthly",
  RANGE: "/attendance/range",
  RECORD: (attendanceId: string) => `/attendance/${attendanceId}`,
  SETTINGS: "/attendance/settings",
  STAFF: (staffId: string) => `/attendance/staff/${staffId}`,
  STAFF_PRESENCE: "/attendance/staff-presence",
  SUMMARY: "/attendance/summary",
  TODAY: "/attendance/today",
} as const;
