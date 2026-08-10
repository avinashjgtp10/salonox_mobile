import { api } from "@/services/api";
import { NOTIFICATION } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";
import type {
  MarkAllNotificationsReadResponse,
  MarkNotificationReadResponse,
  NotificationItem,
  NotificationsListResponse,
  RegisterDeviceRequest,
  RegisterDeviceResponse,
  UnregisterDeviceRequest,
  UnregisterDeviceResponse,
  UnreadCountResponse,
} from "@/types/notification";
import { asRecord, firstArray, firstValue, toSafeString } from "@/utils/apiNormalize";
import { formatAppDate, parseAppDateTime } from "@/utils/dateTime";

type UnknownRecord = Record<string, unknown>;
type NotificationListApiData = UnknownRecord[] | { data?: UnknownRecord[] | null; notifications?: UnknownRecord[] | null } | null;
type UnreadCountApiData = UnknownRecord | number | null;
type NotificationDetailApiData = UnknownRecord | null;

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

// Relative time reads better for a notification feed than an absolute
// timestamp ("5m ago" vs "Jul 10, 2:14 PM"), falling back to a short date
// once it's more than a week old.
const formatRelativeTime = (isoValue: string | null): string => {
  if (!isoValue) {
    return "";
  }

  const parsed = parseAppDateTime(isoValue);

  if (!parsed) {
    return "";
  }

  const diffMs = Date.now() - parsed.getTime();

  if (diffMs < MINUTE_MS) {
    return "Just now";
  }

  if (diffMs < HOUR_MS) {
    return `${Math.floor(diffMs / MINUTE_MS)}m ago`;
  }

  if (diffMs < DAY_MS) {
    return `${Math.floor(diffMs / HOUR_MS)}h ago`;
  }

  if (diffMs < 7 * DAY_MS) {
    return `${Math.floor(diffMs / DAY_MS)}d ago`;
  }

  return formatAppDate(parsed, "");
};

const normalizeNotification = (entry: UnknownRecord): NotificationItem => {
  const createdAt = toSafeString(firstValue(entry, ["created_at", "createdAt"])) || null;

  return {
    body: toSafeString(firstValue(entry, ["body", "message"])) || null,
    createdAt,
    createdDateLabel: formatRelativeTime(createdAt),
    id: toSafeString(firstValue(entry, ["id", "_id"])),
    isRead: firstValue(entry, ["is_read", "isRead", "read"]) === true,
    referenceId: toSafeString(firstValue(entry, ["reference_id", "referenceId"])) || null,
    title: toSafeString(firstValue(entry, ["title"]), "Notification"),
    type: toSafeString(firstValue(entry, ["type"]), "general"),
  };
};

const getNotificationArray = (payload: NotificationListApiData): UnknownRecord[] => {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  return firstArray(payload, ["data", "notifications"]);
};

export const notificationService = {
  async getNotifications(salonId?: string | null): Promise<NotificationsListResponse> {
    const response = await api.get<ApiResponse<NotificationListApiData>>(NOTIFICATION.LIST, {
      params: salonId ? { salon_id: salonId } : undefined,
    });
    const notifications = getNotificationArray(response.data.data)
      .map(normalizeNotification)
      .filter((notification) => notification.id)
      // The backend already returns newest-first; this is a defensive
      // re-sort so the UI is correct even if that ever changes.
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;

        return bTime - aTime;
      });

    return { notifications };
  },

  async getUnreadCount(salonId?: string | null): Promise<UnreadCountResponse> {
    const response = await api.get<ApiResponse<UnreadCountApiData>>(NOTIFICATION.UNREAD_COUNT, {
      params: salonId ? { salon_id: salonId } : undefined,
    });
    const payload = response.data.data;

    if (typeof payload === "number") {
      return { count: payload };
    }

    return { count: Number(firstValue(asRecord(payload), ["count", "unread_count", "unreadCount"])) || 0 };
  },

  async markAsRead(notificationId: string): Promise<MarkNotificationReadResponse> {
    const response = await api.patch<ApiResponse<NotificationDetailApiData>>(
      NOTIFICATION.MARK_READ(notificationId),
    );
    const payload = response.data.data;

    return {
      message: response.data.message,
      notification: payload ? normalizeNotification(asRecord(payload)) : null,
    };
  },

  async markAllAsRead(): Promise<MarkAllNotificationsReadResponse> {
    const response = await api.patch<ApiResponse<unknown>>(NOTIFICATION.MARK_ALL_READ);

    return { message: response.data.message };
  },

  async registerDevice(payload: RegisterDeviceRequest): Promise<RegisterDeviceResponse> {
    console.log("[PushNotifications] notification.service entered");
    const expoPushToken = payload.token.trim();
    const requestPayload: RegisterDeviceRequest = {
      ...(payload.app_env ? { app_env: payload.app_env } : {}),
      token: expoPushToken,
      platform: payload.platform,
      ...(payload.role ? { role: payload.role } : {}),
      ...(payload.staff_id ? { staff_id: payload.staff_id } : {}),
      ...(payload.user_id ? { user_id: payload.user_id } : {}),
    };

    console.log("[PushNotifications] Axios POST executed", NOTIFICATION.REGISTER_DEVICE);

    const response = await api.post<ApiResponse<unknown>>(NOTIFICATION.REGISTER_DEVICE, requestPayload);

    console.log("[PushNotifications] Response received", response.status);

    return { message: response.data.message };
  },

  async unregisterDevice(payload: UnregisterDeviceRequest): Promise<UnregisterDeviceResponse> {
    const expoPushToken = payload.token.trim();
    const requestPayload: UnregisterDeviceRequest = {
      ...(payload.app_env ? { app_env: payload.app_env } : {}),
      token: expoPushToken,
      ...(payload.role ? { role: payload.role } : {}),
      ...(payload.staff_id ? { staff_id: payload.staff_id } : {}),
      ...(payload.user_id ? { user_id: payload.user_id } : {}),
    };
    const response = await api.delete<ApiResponse<unknown>>(NOTIFICATION.REGISTER_DEVICE, {
      data: requestPayload,
    });

    return { message: response.data.message };
  },
};
