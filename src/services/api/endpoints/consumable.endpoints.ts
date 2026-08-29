// API_BASE_URL (see src/config/environment.ts / .env.*) already ends in
// /api/v1, so paths here must not repeat that prefix — matches every other
// *.endpoints.ts file in this folder.
export const CONSUMABLE = {
  ADJUST: (id: string) => `/inventory/consumables/${id}/adjust`,
  ASSIGNED_SERVICES: (id: string) => `/inventory/consumables/${id}/assigned-services`,
  DASHBOARD: "/inventory/consumables/dashboard",
  DELETE: (id: string) => `/inventory/consumables/${id}`,
  DETAIL: (id: string) => `/inventory/consumables/${id}`,
  UNIT_CONVERSIONS: (id: string) => `/inventory/consumables/${id}/unit-conversions`,
  USAGE_HISTORY: "/inventory/consumables/usage-history",
} as const;
