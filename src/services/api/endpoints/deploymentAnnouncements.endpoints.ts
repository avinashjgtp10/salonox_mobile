export const DEPLOYMENT_ANNOUNCEMENTS = {
  ACTIVE: "/api/v1/deployment-announcements/active",
  CREATE: "/api/v1/deployment-announcements",
  STOP: (id: string) => `/api/v1/deployment-announcements/${id}/stop`,
  RECENT: "/api/v1/deployment-announcements/recent",
} as const;
