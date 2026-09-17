import { api } from "@/services/api";
import type { NotificationPreferences } from "@/services/notificationPreferencesStorage";
const KEY = "notification_preferences";
type Document = { channels?: Record<string, boolean>; events?: Record<string, { email?: boolean; push?: boolean }>; [key: string]: unknown };
const groups = {
  appointments: ["newAppointment", "appointmentReminder", "appointmentCancelled", "appointmentCompleted"],
  paymentComplete: ["newPayment"],
  productAudit: ["inventoryAlert", "lowInventory", "productAudit"],
  otherUpdates: ["otherUpdates", "paymentFailed", "newClient", "clientReview", "newMessage", "staffLogin", "marketingCampaign", "spotlightFeature"],
};
async function readDocument() {
  const response = await api.get<{ data: { id: string; key: string; value: string | Document }[] }>("/settings");
  const row = response.data.data.find((item) => item.key === KEY);
  const document: Document = row ? (typeof row.value === "string" ? JSON.parse(row.value) : row.value) : {};
  return { row, document };
}
export const salonNotificationPreferences = {
  async get(): Promise<NotificationPreferences> {
    const { document } = await readDocument();
    const enabled = (keys: string[]) => keys.some((key) => document.events?.[key]?.push !== false);
    return {
      allNotifications: document.channels?.push !== false,
      appointments: enabled(groups.appointments), paymentComplete: enabled(groups.paymentComplete),
      productAudit: enabled(groups.productAudit), otherUpdates: enabled(groups.otherUpdates),
    };
  },
  async save(preferences: NotificationPreferences) {
    const { row, document } = await readDocument();
    const events = { ...document.events };
    for (const [category, keys] of Object.entries(groups)) {
      for (const key of keys) events[key] = { ...events[key], push: preferences[category as keyof typeof groups] };
    }
    const value = JSON.stringify({ ...document, channels: { ...document.channels, push: preferences.allNotifications }, events });
    if (row) await api.put(`/settings/${encodeURIComponent(row.id)}`, { key: KEY, value });
    else await api.post("/settings", { key: KEY, value, description: "Notification preferences" });
  },
};
