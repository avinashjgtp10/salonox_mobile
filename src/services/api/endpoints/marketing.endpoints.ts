export const MARKETING = {
  // ── Templates ───────────────────────────────────────────────────────────────
  TEMPLATES:       "/api/v1/templates",
  TEMPLATE_BY_ID:  (id: string | number) => `/api/v1/templates/${id}`,
  TEMPLATE_SYNC:   (id: string | number) => `/api/v1/templates/${id}/sync`,

  // ── Campaigns ───────────────────────────────────────────────────────────────
  CAMPAIGNS:          "/api/v1/campaigns",
  CAMPAIGN_BY_ID:     (id: string | number) => `/api/v1/campaigns/${id}`,
  CAMPAIGN_PAUSE:     (id: string | number) => `/api/v1/campaigns/${id}/pause`,
  CAMPAIGN_RESUME:    (id: string | number) => `/api/v1/campaigns/${id}/resume`,
  CAMPAIGN_CONTACTS:  (id: string | number) => `/api/v1/campaigns/${id}/contacts`,

  // ── Webhooks ─────────────────────────────────────────────────────────────────
  WEBHOOK_EVENTS: "/api/v1/webhooks/events",

  // ── WhatsApp Config ──────────────────────────────────────────────────────────
  WA_CONFIG:      "/api/v1/settings/whatsapp",
  WA_CONFIG_TEST: "/api/v1/settings/whatsapp/test",

  // ── Dashboard ────────────────────────────────────────────────────────────────
  DASHBOARD_STATS: "/api/v1/dashboard",
} as const;
