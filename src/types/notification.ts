export type NotificationItem = {
  body: string | null;
  createdAt: string | null;
  createdDateLabel: string;
  id: string;
  isRead: boolean;
  referenceId: string | null;
  title: string;
  type: string;
  recipientUserIds?: string[];
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
  installation_id?: string;
  app_env?: string;
  platform: DevicePlatform;
  role?: string | null;
  staff_id?: string | null;
  token: string;
  user_id?: string | null;
};

export type RegisterDeviceResponse = {
  message?: string;
};

export type UnregisterDeviceRequest = {
  app_env?: string;
  role?: string | null;
  staff_id?: string | null;
  token: string;
  user_id?: string | null;
};

export type UnregisterDeviceResponse = {
  message?: string;
};
