export const NOTIFICATIONS = {
  BASE: "/api/v1/notifications",
  MARK_READ: (id: string) => `/api/v1/notifications/${id}/read`,
  MARK_ALL_READ: "/api/v1/notifications/read-all",
} as const;
