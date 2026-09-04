// Real Spotlight backend — see src/modules/spotlight in the backend repo.
export const SPOTLIGHT = {
  UPLOAD_IMAGE: "/api/v1/spotlight/upload-image",

  // Salon-facing (any authenticated salon user: owner/admin/staff) — only
  // published features, plus this user's own explored-feature ids.
  LIST: "/api/v1/spotlight",
  EXPLORE: (id: string) => `/api/v1/spotlight/${id}/explore`,

  // Superadmin-only — sees draft/published/archived, full CRUD + publish.
  ADMIN_LIST: "/api/v1/spotlight/admin",
  ADMIN_BY_ID: (id: string) => `/api/v1/spotlight/admin/${id}`,
  ADMIN_CREATE: "/api/v1/spotlight/admin",
  ADMIN_UPDATE: (id: string) => `/api/v1/spotlight/admin/${id}`,
  ADMIN_PUBLISH: (id: string) => `/api/v1/spotlight/admin/${id}/publish`,
  ADMIN_DELETE: (id: string) => `/api/v1/spotlight/admin/${id}`,
} as const;
