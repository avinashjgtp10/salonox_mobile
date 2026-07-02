export const NOTIFICATIONS = {
  LIST:        "/api/v1/notifications",
  UNREAD_COUNT:"/api/v1/notifications/unread-count",
  MARK_ALL:    "/api/v1/notifications/read-all",
  MARK_ONE:    (id: string) => `/api/v1/notifications/${id}/read`,
} as const;
