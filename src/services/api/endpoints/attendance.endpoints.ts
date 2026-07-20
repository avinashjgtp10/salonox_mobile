export const ATTENDANCE = {
  CHECK_IN: "/attendance/check-in",
  CHECK_OUT: "/attendance/check-out",
  MARK: "/attendance/mark",
  RECORD: (attendanceId: string) => `/attendance/${attendanceId}`,
  SETTINGS: "/attendance/settings",
  SUMMARY: "/attendance/summary",
  TODAY: "/attendance/today",
} as const;
