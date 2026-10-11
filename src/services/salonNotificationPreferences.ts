import { api } from "@/services/api";
import { NOTIFICATION_KEYS, type NotificationPreferences } from "@/services/notificationPreferencesStorage";

const KEY = "notification_preferences";
type Document = { channels?: Record<string, boolean>; events?: Record<string, { email?: boolean; push?: boolean }>; [key: string]: unknown };

async function readDocument() {
  const response = await api.get<{ data: { id: string; key: string; value: string | Document }[] }>("/settings");
  const row = response.data.data.find((item) => item.key === KEY);
  const document: Document = row ? (typeof row.value === "string" ? JSON.parse(row.value) : row.value) : {};
  return { row, document };
}

export const salonNotificationPreferences = {
  async get(): Promise<NotificationPreferences> {
    const { document } = await readDocument();

    return {
      allNotifications: document.channels?.push !== false,
      ...Object.fromEntries(
        NOTIFICATION_KEYS.map((key) => [key, document.events?.[key]?.push !== false]),
      ),
    } as NotificationPreferences;
  },

  async save(preferences: NotificationPreferences) {
    const { row, document } = await readDocument();
    const events = { ...document.events };

    for (const key of NOTIFICATION_KEYS) {
      events[key] = { ...events[key], push: preferences[key] };
    }

    const value = JSON.stringify({ ...document, channels: { ...document.channels, push: preferences.allNotifications }, events });

    if (row) await api.put(`/settings/${encodeURIComponent(row.id)}`, { key: KEY, value });
    else await api.post("/settings", { key: KEY, value, description: "Notification preferences" });
  },
};
