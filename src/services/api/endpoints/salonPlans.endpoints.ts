// Mostly the super-admin-only "Plans & Subscriptions" screen: the 3-tier
// catalog (Basic/Advance/Pro) and per-salon customization. Backed by
// modules/salon-plans on the backend — deliberately separate from
// billing.endpoints.ts (the self-serve Razorpay checkout a salon owner uses
// themselves), see that backend module's own top-of-file comment for why.
// MY_FEATURES and MY_PLAN are the salon-facing exceptions — see
// usePlanFeatures.ts and BillingPage.tsx respectively.
export const SALON_PLANS = {
  DEFINITIONS:          "/api/v1/salon-plans/definitions",
  DEFINITION_UPDATE:    (tier: string) => `/api/v1/salon-plans/definitions/${tier}`,
  CUSTOMIZATIONS_SEARCH: "/api/v1/salon-plans/customizations",
  CUSTOMIZATION_GET:    (salonId: string) => `/api/v1/salon-plans/customizations/${salonId}`,
  CUSTOMIZATION_UPSERT: (salonId: string) => `/api/v1/salon-plans/customizations/${salonId}`,
  CUSTOMIZATION_REMOVE: (salonId: string) => `/api/v1/salon-plans/customizations/${salonId}`,
  MY_FEATURES:          "/api/v1/salon-plans/my-features",
  MY_PLAN:              "/api/v1/salon-plans/my-plan",
  INVOICES:             "/api/v1/salon-plans/invoices",
  INVOICE_STATUS:       (id: string) => `/api/v1/salon-plans/invoices/${id}/status`,
} as const;
