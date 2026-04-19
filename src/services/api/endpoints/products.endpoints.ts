export const PRODUCTS = {
  LIST:           "/api/v1/products",
  BY_ID:          (id: string) => `/api/v1/products/${id}`,
  CREATE:         "/api/v1/products",
  UPDATE:         (id: string) => `/api/v1/products/${id}`,
  DELETE:         (id: string) => `/api/v1/products/${id}`,

  BRANDS:         "/api/v1/products/brands",
  BRAND_BY_ID:    (id: string) => `/api/v1/products/brands/${id}`,
  CREATE_BRAND:   "/api/v1/products/brands",
  DELETE_BRAND:   (id: string) => `/api/v1/products/brands/${id}`,

  EXPORT_CSV:     "/api/v1/products/export/csv",
  EXPORT_EXCEL:   "/api/v1/products/export/excel",
  EXPORT_PDF:     "/api/v1/products/export/pdf",
} as const;
