export const CATEGORIES = {
  BASE:    "/api/v1/categories",
  LIST:    "/api/v1/categories",
  BY_ID:   (id: string | number) => `/api/v1/categories/${id}`,
  CREATE:  "/api/v1/categories",
  UPDATE:  (id: string | number) => `/api/v1/categories/${id}`,
  DELETE:  (id: string | number) => `/api/v1/categories/${id}`,
} as const;
