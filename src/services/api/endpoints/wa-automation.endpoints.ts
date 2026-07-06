export const WA_AUTOMATION_ENDPOINTS = {
  PURCHASE_TEMPLATES:       (salonId: string) => `/api/v1/wa-automation/purchase-templates/${salonId}`,
  PURCHASE_TEMPLATE_UPDATE: (salonId: string, eventType: string) => `/api/v1/wa-automation/purchase-templates/${salonId}/${eventType}`,
  PURCHASE_TEMPLATE_SUBMIT: (salonId: string, eventType: string) => `/api/v1/wa-automation/purchase-templates/${salonId}/${eventType}/submit`,
  PURCHASE_TEMPLATE_SYNC:   (salonId: string, eventType: string) => `/api/v1/wa-automation/purchase-templates/${salonId}/${eventType}/sync`,
};
