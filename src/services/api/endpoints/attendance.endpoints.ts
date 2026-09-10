export const ATTENDANCE = {
  CHECK_IN: "/attendance/check-in",
  CHECK_OUT: "/attendance/check-out",
  MARK: "/attendance/mark",
  MONTHLY: "/attendance/monthly",
  RANGE: "/attendance/range",
  RECORD: (attendanceId: string) => `/attendance/${attendanceId}`,
  SETTINGS: "/attendance/settings",
  STAFF: (staffId: string) => `/attendance/staff/${staffId}`,
  SUMMARY: "/attendance/summary",
  TODAY: "/attendance/today",
} as const;
