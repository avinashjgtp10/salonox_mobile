export const WA_AUTOMATION_ENDPOINTS = {
  // Per-salon, per-event automation on/off. The backend treats a MISSING row
  // as enabled, so GET only returns events that have been explicitly toggled
  // at some point — an event absent from the response is ON, not OFF.
  // PUT body: { event_type, is_active }.
  SALON_SETTINGS:           (salonId: string) => `/api/v1/wa-automation/settings/${salonId}`,
};
