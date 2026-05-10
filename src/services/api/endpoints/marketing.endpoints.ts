export const MARKETING = {
  // ── Templates ───────────────────────────────────────────────────────────────
  TEMPLATES:      "/api/v1/templates",
  TEMPLATE_BY_ID: (id: string | number) => `/api/v1/templates/${id}`,
  TEMPLATE_SYNC:  (id: string | number) => `/api/v1/templates/${id}/sync`,

  // ── Campaigns ───────────────────────────────────────────────────────────────
  CAMPAIGNS:         "/api/v1/campaigns",
  CAMPAIGN_BY_ID:    (id: string | number) => `/api/v1/campaigns/${id}`,
  CAMPAIGN_PAUSE:    (id: string | number) => `/api/v1/campaigns/${id}/pause`,
  CAMPAIGN_RESUME:   (id: string | number) => `/api/v1/campaigns/${id}/resume`,
  CAMPAIGN_CONTACTS: (id: string | number) => `/api/v1/campaigns/${id}/contacts`,

  // ── Webhooks ──────────────────────────────────────────────────────────────
  WEBHOOK_EVENTS: "/api/v1/webhooks/events",   // ✓ confirmed in webhooks.routes.ts

  // ── WhatsApp Config ───────────────────────────────────────────────────────
  // FIX: was /api/v1/settings/whatsapp — backend registers at /api/v1/wa-config
  WA_CONFIG:      "/api/v1/wa-config",
  WA_CONFIG_TEST: "/api/v1/wa-config/test",    // ✓ confirmed in config.routes.ts (POST /test)

  // ── Dashboard ─────────────────────────────────────────────────────────────
  DASHBOARD_STATS: "/api/v1/dashboard/stats",
} as const;