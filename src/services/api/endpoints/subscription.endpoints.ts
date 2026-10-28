export const SUBSCRIPTION = {
  // Public: Basic / Advance / Growth with their monthly, quarterly and yearly prices.
  CATALOG: "/subscriptions/catalog",
  // Owner/admin: starts a Razorpay subscription and returns its hosted payment page.
  CHECKOUT: "/subscriptions/checkout",
  // Has the signed-in user paid? Activated only by the backend's Razorpay webhook.
  MY_STATUS: "/subscriptions/my-status",
  SALON: (salonId: string) => `/subscriptions/salon/${salonId}`,
} as const;
