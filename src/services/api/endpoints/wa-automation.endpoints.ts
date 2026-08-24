export const WA_AUTOMATION_ENDPOINTS = {
  PURCHASE_TEMPLATES:       (salonId: string) => `/api/v1/wa-automation/purchase-templates/${salonId}`,
  PURCHASE_TEMPLATE_UPDATE: (salonId: string, eventType: string) => `/api/v1/wa-automation/purchase-templates/${salonId}/${eventType}`,
  PURCHASE_TEMPLATE_SUBMIT: (salonId: string, eventType: string) => `/api/v1/wa-automation/purchase-templates/${salonId}/${eventType}/submit`,
  PURCHASE_TEMPLATE_RESET:  (salonId: string, eventType: string) => `/api/v1/wa-automation/purchase-templates/${salonId}/${eventType}/reset`,
  PURCHASE_TEMPLATE_SYNC:   (salonId: string, eventType: string) => `/api/v1/wa-automation/purchase-templates/${salonId}/${eventType}/sync`,
  // Per-salon, per-event automation on/off. The backend treats a MISSING row
  // as enabled, so GET only returns events that have been explicitly toggled
  // at some point — an event absent from the response is ON, not OFF.
  // PUT body: { event_type, is_active }.
  SALON_SETTINGS:           (salonId: string) => `/api/v1/wa-automation/settings/${salonId}`,
};
