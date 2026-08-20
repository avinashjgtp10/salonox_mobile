// Backend still exposes subscription data across two route families
// (/billing/* and /subscriptions/*) — this frontend consolidates all
// call sites onto this one map so a future backend merge only touches
// these six paths instead of components scattered across the app.
export const BILLING = {
  SUBSCRIPTION: "/api/v1/billing/subscription",
  CANCEL_SUB:   (id: string) => `/api/v1/billing/subscription/${id}/cancel`,
  INVOICES:     "/api/v1/billing/invoices",
  PLANS:        "/api/v1/subscriptions/plans",
  CREATE_SUB:   "/api/v1/subscriptions",
  VERIFY_SUB:   (salonId: string) => `/api/v1/subscriptions/verify/${salonId}`,
} as const;
