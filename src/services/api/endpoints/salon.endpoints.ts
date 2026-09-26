export const SALON = {
  ME: "/api/v1/salons/current",
  CREATE: "/api/v1/salons",
  BY_ID: (id: string) => `/api/v1/salons/${id}`,
  UPDATE: (id: string) => `/api/v1/salons/${id}`,
  LIST: "/api/v1/salons",
  BRANCHES_BY_SALON: (salonId: string) => `/api/v1/branches/by-salon/${salonId}`,
} as const;
