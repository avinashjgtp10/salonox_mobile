export const ATTENDANCE = {
  TODAY:        "/api/v1/attendance/today",
  MONTHLY:      "/api/v1/attendance/monthly",
  RANGE:        "/api/v1/attendance/range",
  SUMMARY:      "/api/v1/attendance/summary",
  CHECK_IN:     "/api/v1/attendance/check-in",
  CHECK_OUT:    "/api/v1/attendance/check-out",
  PUSH:         "/api/v1/attendance/push",
  MARK:         "/api/v1/attendance/mark",
  BY_ID:        (id: string) => `/api/v1/attendance/${id}`,
  FOR_STAFF:    (staffId: string) => `/api/v1/attendance/staff/${staffId}`,
  SETTINGS:     "/api/v1/attendance/settings",
  EXPORT:       "/api/v1/attendance/export",
} as const;
