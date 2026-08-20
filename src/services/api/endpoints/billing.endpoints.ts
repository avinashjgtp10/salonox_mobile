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
  // Array of every subscription record for the salon (renewals, retries,
  // etc. can each leave their own row) — used for the expiry gate instead
  // of SUBSCRIPTION, since a salon can be active via a row other than
  // whichever single one /billing/subscription happens to return.
  STATUS:       (salonId: string) => `/api/v1/subscriptions/salon/${salonId}`,
} as const;
