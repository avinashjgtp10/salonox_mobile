export const SUBSCRIPTION = {
  CREATE: "/subscriptions",
  PLANS: "/subscriptions/plans",
  SALON: (salonId: string) => `/subscriptions/salon/${salonId}`,
  VERIFY: (salonId: string) => `/subscriptions/verify/${salonId}`,
} as const;
