// Staff-only mobile API: the backend resolves the staff member from the JWT,
// so these never take a staff or user id.
export const MOBILE_STAFF = {
  ME: "/mobile/staff/me",
  ADDRESSES: "/mobile/staff/me/addresses",
  EMERGENCY_CONTACTS: "/mobile/staff/me/emergency-contacts",
  APPOINTMENTS: "/mobile/staff/appointments",
  APPOINTMENT_DETAIL: (appointmentId: string) => `/mobile/staff/appointments/${appointmentId}`,
  ATTENDANCE: "/mobile/staff/attendance",
  CHECK_IN: "/mobile/staff/attendance/check-in",
  CHECK_OUT: "/mobile/staff/attendance/check-out",
  NOTIFICATIONS: "/mobile/staff/notifications",
} as const;
