export const CATEGORIES = {
  LIST:    "/api/v1/categories",
  BY_ID:   (id: string) => `/api/v1/categories/${id}`,
  CREATE:  "/api/v1/categories",
  UPDATE:  (id: string) => `/api/v1/categories/${id}`,
  DELETE:  (id: string) => `/api/v1/categories/${id}`,
} as const;
