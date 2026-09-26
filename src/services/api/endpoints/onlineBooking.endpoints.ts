export const ONLINE_BOOKING = {
  SALON_DETAILS: (salon_id: string) => `/api/v1/bookings/salon/${salon_id}`,
  AVAILABILITY: (salon_id: string) => `/api/v1/bookings/salon/${salon_id}/availability`,
  SALON_BY_SLUG: (slug: string) => `/api/v1/bookings/salon/slug/${slug}`,
  CREATE_BOOKING: `/api/v1/bookings`,
  SEND_EMAIL_OTP: `/api/v1/bookings/email-otp/send`,
  VERIFY_EMAIL_OTP: `/api/v1/bookings/email-otp/verify`,
  MANAGE_BOOKING: (appointmentId: string) => `/api/v1/bookings/manage/${appointmentId}`,
  CANCEL_MANAGED_BOOKING: (appointmentId: string) => `/api/v1/bookings/manage/${appointmentId}/cancel`,
  RESCHEDULE_MANAGED_BOOKING: (appointmentId: string) => `/api/v1/bookings/manage/${appointmentId}/reschedule`,
} as const;
