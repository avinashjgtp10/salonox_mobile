export const SALON = {
  ME: "/api/v1/salons/me",
  CREATE: "/api/v1/salons",
  BY_ID: (id: string) => `/api/v1/salons/${id}`,
  UPDATE: (id: string) => `/api/v1/salons/${id}`,
  LIST: "/api/v1/salons",
  BRANCHES_BY_SALON: (salonId: string) => `/api/v1/branches/by-salon/${salonId}`,
  CREATE_BRANCH: "/api/v1/branches",
  BRANCH_BY_ID: (id: string) => `/api/v1/branches/${id}`,
  BRANCH_TIMINGS: (id: string) => `/api/v1/branches/${id}/timings`,
  BRANCH_HOLIDAYS: (id: string) => `/api/v1/branches/${id}/holidays`,
  BRANCH_HOLIDAY_BY_ID: (holidayId: string) => `/api/v1/branches/holidays/${holidayId}`,
} as const;
