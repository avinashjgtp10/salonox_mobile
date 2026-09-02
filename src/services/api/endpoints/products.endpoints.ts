export const PRODUCTS = {
  LIST:           "/api/v1/products",
  SEARCH:         "/api/v1/products/search",
  BY_ID:          (id: string) => `/api/v1/products/${id}`,
  CREATE:         "/api/v1/products",
  UPDATE:         (id: string) => `/api/v1/products/${id}`,
  DELETE:         (id: string) => `/api/v1/products/${id}`,

  BRANDS:         "/api/v1/products/brands",
  BRAND_BY_ID:    (id: string) => `/api/v1/products/brands/${id}`,
  CREATE_BRAND:   "/api/v1/products/brands",
  UPDATE_BRAND:   (id: string) => `/api/v1/products/brands/${id}`,
  DELETE_BRAND:   (id: string) => `/api/v1/products/brands/${id}`,

  // ── Product photos ─────────────────────────────────────────────────────────
  PHOTOS:         (id: string) => `/api/v1/products/${id}/photos`,
  PHOTOS_REORDER: (id: string) => `/api/v1/products/${id}/photos/reorder`,
  PHOTO_BY_ID:    (id: string, photoId: string) => `/api/v1/products/${id}/photos/${photoId}`,

  // ── Import / Export ────────────────────────────────────────────────────────
  IMPORT:         "/api/v1/products/import",
  EXPORT_CSV:     "/api/v1/products/export/csv",
  EXPORT_EXCEL:   "/api/v1/products/export/excel",
  EXPORT_PDF:     "/api/v1/products/export/pdf",
} as const;
