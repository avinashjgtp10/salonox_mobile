// Verified against salon_mgm_backend/src/modules/notifications — the real
// row shape is { id, salon_id, type, title, body, is_read, created_at }.
// `type` is a free-form string set by whichever backend module created the
// notification (e.g. "appointment", "client", "payment", "whatsapp") — new
// values can appear at any time, so nothing here should assume a fixed set.
export type NotificationItem = {
  body: string | null;
  createdAt: string | null;
  createdDateLabel: string;
  id: string;
  isRead: boolean;
  referenceId: string | null;
  title: string;
  type: string;
};

export type NotificationsListResponse = {
  notifications: NotificationItem[];
};

export type UnreadCountResponse = {
  count: number;
};

export type MarkNotificationReadResponse = {
  message?: string;
  notification: NotificationItem | null;
};

export type MarkAllNotificationsReadResponse = {
  message?: string;
};

export type DevicePlatform = "android" | "ios";

export type RegisterDeviceRequest = {
  platform: DevicePlatform;
  token: string;
};

export type RegisterDeviceResponse = {
  message?: string;
};

export type UnregisterDeviceRequest = {
  token: string;
};

export type UnregisterDeviceResponse = {
  message?: string;
};
