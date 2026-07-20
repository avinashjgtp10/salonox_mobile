export const NOTIFICATION = {
  LIST: "/notifications",
  MARK_ALL_READ: "/notifications/read-all",
  MARK_READ: (notificationId: string) => `/notifications/${notificationId}/read`,
  REGISTER_DEVICE: "/notifications/register-device",
  UNREAD_COUNT: "/notifications/unread-count",
} as const;
