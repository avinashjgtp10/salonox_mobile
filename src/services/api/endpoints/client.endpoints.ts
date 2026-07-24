export const CLIENT = {
  BASE: "/api/v1/clients",
  BY_ID: (id: string | number) => `/api/v1/clients/${id}`,
  SEARCH: (q: string) => `/api/v1/clients/search?q=${encodeURIComponent(q)}`,
  REFERRAL_LOOKUP: (code: string) => `/api/v1/clients/referral/${encodeURIComponent(code)}`,
  BLOCK: "/api/v1/clients/block",
  UNBLOCK: "/api/v1/clients/unblock",
  EXPORT: (format: "excel" | "csv" | "pdf") =>
    `/api/v1/clients/export?format=${format}`,
  IMPORT: "/api/v1/clients/import",
  UPLOAD_AVATAR: "/api/v1/clients/upload-avatar",
  MERGE_DUPLICATES: "/api/v1/clients/merge-duplicates",
  MERGE: "/api/v1/clients/merge",
  APPOINTMENTS: (id: string | number) => `/api/v1/clients/${id}/appointments`,
  SALES: (id: string | number) => `/api/v1/clients/${id}/sales`,
  NOTES: (id: string | number) => `/api/v1/clients/${id}/notes`,
  LOYALTY: (id: string | number) => `/api/v1/clients/${id}/loyalty`,
} as const;
