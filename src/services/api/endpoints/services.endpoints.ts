export const SERVICES = {
  BASE: "/api/v1/services",
  // Helper to build URL with query params
  LIST: (params: string) => `/api/v1/services${params ? `?${params}` : ""}`,
  BY_ID: (id: string | number) => `/api/v1/services/${id}`,
  DOWNLOAD_PDF:   "/api/v1/services/download/pdf",
  DOWNLOAD_EXCEL: "/api/v1/services/download/excel",
  DOWNLOAD_CSV:   "/api/v1/services/download/csv",
} as const;


export const CATEGORIES = {
  BASE:  "/api/v1/categories",
  BY_ID: (id: string | number) => `/api/v1/categories/${id}`,
} as const;
