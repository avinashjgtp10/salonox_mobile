// Staff-only mobile API: the backend resolves the staff member from the JWT,
// so these never take a staff or user id.
export const MOBILE_STAFF = {
  ME: "/mobile/staff/me",
  CALENDAR_ACCESS: "/mobile/staff/me/calendar-access",
  ADDRESSES: "/mobile/staff/me/addresses",
  EMERGENCY_CONTACTS: "/mobile/staff/me/emergency-contacts",
  APPOINTMENTS: "/mobile/staff/appointments",
  APPOINTMENT_DETAIL: (appointmentId: string) => `/mobile/staff/appointments/${appointmentId}`,
  ATTENDANCE: "/mobile/staff/attendance",
  CHECK_IN: "/mobile/staff/attendance/check-in",
  CHECK_OUT: "/mobile/staff/attendance/check-out",
  START_BREAK: "/mobile/staff/attendance/break",
  NOTIFICATIONS: "/mobile/staff/notifications",
} as const;

// Owner/admin settings that exist only in the mobile app.
export const MOBILE_OWNER = {
  STAFF_CALENDAR_ACCESS_LIST: "/mobile/owner/staff/calendar-access",
  STAFF_CALENDAR_ACCESS: (staffId: string) => `/mobile/owner/staff/${staffId}/calendar-access`,
} as const;
