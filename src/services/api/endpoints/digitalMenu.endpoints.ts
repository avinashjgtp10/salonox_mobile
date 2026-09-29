export const DIGITAL_MENU = {
  // Owner-side: this salon's single digital menu (salon_id derived from JWT).
  GET: "/api/v1/digital-menu",
  CREATE: "/api/v1/digital-menu",
  UPDATE: (id: string | number) => `/api/v1/digital-menu/${id}`,
  DELETE: (id: string | number) => `/api/v1/digital-menu/${id}`,

  // Public, unauthenticated — see PUBLIC_ROUTES in auth.endpoints.ts.
  PUBLIC_BY_TOKEN: (token: string) => `/api/v1/digital-menu/public/${token}`,
} as const;
