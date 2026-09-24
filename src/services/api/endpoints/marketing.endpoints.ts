export const MARKETING_ENDPOINTS = {
  TEMPLATES:         '/api/v1/templates',
  TEMPLATE_BY_ID:    (id: string | number) => `/api/v1/templates/${id}`,
  TEMPLATE_SYNC:     (id: string | number) => `/api/v1/templates/${id}/sync`,
  TEMPLATE_FAVORITE: (id: string | number) => `/api/v1/templates/${id}/favorite`,

  CAMPAIGNS:         '/api/v1/campaigns',
  CAMPAIGN_BY_ID:    (id: string | number) => `/api/v1/campaigns/${id}`,
  CAMPAIGN_RESEND:   (id: string | number) => `/api/v1/campaigns/${id}/resend`,
  CAMPAIGN_PAUSE:    (id: string | number) => `/api/v1/campaigns/${id}/pause`,
  CAMPAIGN_RESUME:   (id: string | number) => `/api/v1/campaigns/${id}/resume`,
  CAMPAIGN_CONTACTS: (id: string | number) => `/api/v1/campaigns/${id}/contacts`,
  CAMPAIGN_CONTACT_RESEND: (id: string | number, contactId: string) => `/api/v1/campaigns/${id}/contacts/${contactId}/resend`,
  CAMPAIGN_CONTACTS_RESEND_BULK: (id: string | number) => `/api/v1/campaigns/${id}/contacts/resend`,
  CAMPAIGN_REPORT:   (id: string | number, type: string) => `/api/v1/campaigns/${id}/report/${type}`,

  WA_CONFIG:              '/api/v1/wa-config',
  WA_CONFIG_TEST:         '/api/v1/wa-config/test',
  WA_CONFIG_SYNC:         '/api/v1/wa-config/sync-limits',
  WA_CONFIG_VERIFY_PHONE: '/api/v1/wa-config/verify-phone',
  WA_CONFIG_VERIFY_APP:   '/api/v1/wa-config/verify-app',
  WA_CONFIG_VERIFY_TOKEN: '/api/v1/wa-config/verify-token',
  WA_CONFIG_VERIFY_ALL:   '/api/v1/wa-config/verify-all',
  WA_CONFIG_AI_RECEPTIONIST: '/api/v1/wa-config/ai-receptionist',

  DASHBOARD_STATS: '/api/v1/marketing/dashboard/stats',
  ANALYTICS:       '/api/v1/marketing/analytics',

  INBOX_CONVERSATIONS: '/api/v1/inbox/conversations',
  INBOX_MESSAGES:      (phone: string) => `/api/v1/inbox/conversations/${phone}/messages`,
  INBOX_REPLY:         (phone: string) => `/api/v1/inbox/conversations/${phone}/reply`,

  
} as const;