export const SERVICES = {
  BASE: "/api/v1/services",
  LIST: (params: string) => `/api/v1/services${params ? `?${params}` : ""}`,
  BY_ID: (id: string | number) => `/api/v1/services/${id}`,
  DOWNLOAD_PDF:   "/api/v1/services/download/pdf",
  DOWNLOAD_EXCEL: "/api/v1/services/download/excel",
  DOWNLOAD_CSV:   "/api/v1/services/download/csv",
  IMPORT:         "/api/v1/services/import",

  // ── Bundles ────────────────────────────────────────────────────────────────
  BUNDLES:       "/api/v1/services/bundles",
  BUNDLE_BY_ID:  (id: string | number) => `/api/v1/services/bundles/${id}`,

  // ── Add-on Groups ──────────────────────────────────────────────────────────
  ADD_ON_GROUPS:  (serviceId: string | number) =>
    `/api/v1/services/${serviceId}/add-on-groups`,
  ADD_ON_GROUP_BY_ID: (serviceId: string | number, groupId: string | number) =>
    `/api/v1/services/${serviceId}/add-on-groups/${groupId}`,

  // ── Add-on Options ─────────────────────────────────────────────────────────
  ADD_ON_OPTIONS: (serviceId: string | number, groupId: string | number) =>
    `/api/v1/services/${serviceId}/add-on-groups/${groupId}/options`,
  ADD_ON_OPTION_BY_ID: (serviceId: string | number, groupId: string | number, optionId: string | number) =>
    `/api/v1/services/${serviceId}/add-on-groups/${groupId}/options/${optionId}`,
} as const;
