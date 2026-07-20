export const PRODUCT = {
  CREATE: "/products",
  DELETE: (id: string) => `/products/${id}`,
  DETAIL: (id: string) => `/products/${id}`,
  LIST: "/products",
  UPDATE: (id: string) => `/products/${id}`,
  BRAND_CREATE: "/products/brands",
  BRAND_DELETE: (id: string) => `/products/brands/${id}`,
  BRAND_DETAIL: (id: string) => `/products/brands/${id}`,
  BRAND_LIST: "/products/brands",
  BRAND_UPDATE: (id: string) => `/products/brands/${id}`,
} as const;
