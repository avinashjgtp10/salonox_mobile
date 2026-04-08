export const SALON = {
  ME: "/api/v1/salons/me",
  CREATE: "/api/v1/salons",
  BY_ID: (id: string) => `/api/v1/salons/${id}`,
  UPDATE: (id: string) => `/api/v1/salons/${id}`,
  LIST: "/api/v1/salons",
} as const;
