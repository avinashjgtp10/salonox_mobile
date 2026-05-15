export const GALLERY = {
  BASE:  "/api/v1/marketplace/images",
  BY_ID: (id: string | number) => `/api/v1/marketplace/images/${id}`,
} as const;
