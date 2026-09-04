export const LINK_BUILDER = {
  GENERATE: "/api/v1/link-builder/generate",
  SAVED: "/api/v1/link-builder/saved",
  SAVED_BY_ID: (id: string) => `/api/v1/link-builder/saved/${id}`,
} as const;
