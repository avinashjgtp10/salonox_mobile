export const ONLINE_BOOKING = {
  SALON_DETAILS: (salon_id: string) => `/api/v1/bookings/salon/${salon_id}`,
  CREATE_BOOKING: `/api/v1/bookings`,
} as const;
