export const WA_AUTOMATION_ENDPOINTS = {
  PURCHASE_TEMPLATES:       (salonId: string) => `/api/v1/wa-automation/purchase-templates/${salonId}`,
  PURCHASE_TEMPLATE_UPDATE: (salonId: string, eventType: string) => `/api/v1/wa-automation/purchase-templates/${salonId}/${eventType}`,
  PURCHASE_TEMPLATE_SUBMIT: (salonId: string, eventType: string) => `/api/v1/wa-automation/purchase-templates/${salonId}/${eventType}/submit`,
  PURCHASE_TEMPLATE_RESET:  (salonId: string, eventType: string) => `/api/v1/wa-automation/purchase-templates/${salonId}/${eventType}/reset`,
  PURCHASE_TEMPLATE_SYNC:   (salonId: string, eventType: string) => `/api/v1/wa-automation/purchase-templates/${salonId}/${eventType}/sync`,
  PURCHASE_TEMPLATE_TEST_SEND: (salonId: string, eventType: string) => `/api/v1/wa-automation/purchase-templates/${salonId}/${eventType}/test-send`,
  // Per-salon, per-event automation on/off. The backend treats a MISSING row
  // as enabled, so GET only returns events that have been explicitly toggled
  // at some point — an event absent from the response is ON, not OFF.
  // PUT body: { event_type, is_active }.
  SALON_SETTINGS:           (salonId: string) => `/api/v1/wa-automation/settings/${salonId}`,

  // ── Scheduled Templates ──────────────────────────────────────────────────
  SCHEDULED_LIST:       (salonId: string) => `/api/v1/wa-automation/scheduled/${salonId}`,
  SCHEDULED_SEND_NOW:   (salonId: string, id: string) => `/api/v1/wa-automation/scheduled/${salonId}/${id}/send-now`,
  SCHEDULED_RETRY_NOW:  (salonId: string, id: string) => `/api/v1/wa-automation/scheduled/${salonId}/${id}/retry-now`,
  SCHEDULED_RESCHEDULE: (salonId: string, id: string) => `/api/v1/wa-automation/scheduled/${salonId}/${id}/reschedule`,
  SCHEDULED_SKIP:       (salonId: string, id: string) => `/api/v1/wa-automation/scheduled/${salonId}/${id}/skip`,
  SCHEDULED_CANCEL:     (salonId: string, id: string) => `/api/v1/wa-automation/scheduled/${salonId}/${id}/cancel`,
  SCHEDULED_RESEND:     (salonId: string, id: string) => `/api/v1/wa-automation/scheduled/${salonId}/${id}/resend`,
};
