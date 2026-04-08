export const CLIENT = {
  BASE: "/api/v1/clients",
  BY_ID: (id: string | number) => `/api/v1/clients/${id}`,
  BLOCK: "/api/v1/clients/block",
  UNBLOCK: "/api/v1/clients/unblock",
  EXPORT: (format: "excel" | "csv") =>
    `/api/v1/clients/export?format=${format}`,
  IMPORT: "/api/v1/clients/import",
  MERGE_DUPLICATES: "/api/v1/clients/merge-duplicates",
  MERGE: "/api/v1/clients/merge",
  APPOINTMENTS: (id: string | number) => `/api/v1/clients/${id}/appointments`,
  SALES: (id: string | number) => `/api/v1/clients/${id}/sales`,
  NOTES: (id: string | number) => `/api/v1/clients/${id}/notes`,
  WALLET: (id: string | number) => `/api/v1/clients/${id}/wallet`,
  LOYALTY: (id: string | number) => `/api/v1/clients/${id}/loyalty`,
} as const;
