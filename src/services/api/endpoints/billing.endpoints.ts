export const BILLING = {
  PLANS:             "/api/v1/billing/plans",
  PLAN_BY_ID:        (id: string) => `/api/v1/billing/plans/${id}`,
  SUBSCRIPTION:      "/api/v1/billing/subscription",
  SUBSCRIBE:         "/api/v1/billing/subscribe",
  UPDATE_SUB:        (id: string) => `/api/v1/billing/subscription/${id}`,
  CANCEL_SUB:        (id: string) => `/api/v1/billing/subscription/${id}/cancel`,
  INVOICES:          "/api/v1/billing/invoices",
  INVOICE_BY_ID:     (id: string) => `/api/v1/billing/invoices/${id}`,
} as const;
