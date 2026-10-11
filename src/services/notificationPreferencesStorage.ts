import AsyncStorage from "@react-native-async-storage/async-storage";

// One toggle per individual notification event — mirrors the web app's own
// Notifications settings page (NotificationsPage.tsx's `notifRows`) exactly,
// key for key, so "on" here means the same thing it means there.
export const NOTIFICATION_KEYS = [
  "newAppointment",
  "appointmentReminder",
  "appointmentCancelled",
  "appointmentCompleted",
  "newPayment",
  "paymentFailed",
  "newClient",
  "clientReview",
  "newMessage",
  "lowInventory",
  "staffLogin",
  "marketingCampaign",
] as const;

export type NotificationKey = (typeof NOTIFICATION_KEYS)[number];

export type NotificationPreferences = {
  allNotifications: boolean;
} & Record<NotificationKey, boolean>;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  allNotifications: true,
  ...Object.fromEntries(NOTIFICATION_KEYS.map((key) => [key, true])),
} as NotificationPreferences;

const NOTIFICATION_PREFERENCES_KEY = "salonox.notificationPreferences";

type NotificationPreferencesListener = (preferences: NotificationPreferences) => void;

const listeners = new Set<NotificationPreferencesListener>();

const isValidPreferences = (value: unknown): value is Partial<NotificationPreferences> =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as NotificationPreferences).allNotifications === "boolean";

export const notificationPreferencesStorage = {
  async getPreferences(): Promise<NotificationPreferences> {
    const stored = await AsyncStorage.getItem(NOTIFICATION_PREFERENCES_KEY);

    if (!stored) {
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }

    try {
      const parsed = JSON.parse(stored);

      if (!isValidPreferences(parsed)) {
        return DEFAULT_NOTIFICATION_PREFERENCES;
      }

      // A value saved before a given key existed (app update, or a stored
      // document from before this key was added) falls back to true rather
      // than silently muting a notification the person never actually
      // turned off.
      return {
        allNotifications: parsed.allNotifications ?? true,
        ...Object.fromEntries(
          NOTIFICATION_KEYS.map((key) => [key, typeof parsed[key] === "boolean" ? parsed[key] : true]),
        ),
      } as NotificationPreferences;
    } catch {
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }
  },

  async setPreferences(preferences: NotificationPreferences, notify = true) {
    await AsyncStorage.setItem(NOTIFICATION_PREFERENCES_KEY, JSON.stringify(preferences));
    if (notify) listeners.forEach((listener) => listener(preferences));
  },

  subscribe(listener: NotificationPreferencesListener) {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  },
};

export const hasEnabledNotificationPreference = (
  preferences: NotificationPreferences,
): boolean =>
  preferences.allNotifications && NOTIFICATION_KEYS.some((key) => preferences[key]);

// The backend sends `event_key` on every push payload (see
// notifications.service.ts), which already matches these keys 1:1 for every
// event that has its own toggle — "inventoryAlert" is the one real exception
// (the backend's actual inventory-alerts event key), aliased to the
// equivalent "lowInventory" toggle below.
const KEY_ALIASES: Partial<Record<string, NotificationKey>> = {
  inventoryalert: "lowInventory",
  payment: "newPayment",
  payment_complete: "newPayment",
  payment_completed: "newPayment",
};

const normalizedKeyMap: Record<string, NotificationKey> = Object.fromEntries(
  NOTIFICATION_KEYS.map((key) => [key.toLowerCase(), key]),
);

export const isNotificationTypeEnabled = (
  type: string,
  preferences: NotificationPreferences,
): boolean => {
  if (!preferences.allNotifications) return false;

  const normalizedType = type.trim().toLowerCase().replace(/[\s.-]+/g, "_");
  const matchedKey = normalizedKeyMap[normalizedType] ?? KEY_ALIASES[normalizedType];

  // Anything without its own toggle (attendance reminders, spotlight
  // features, AI handoff, the generic "otherUpdates" bucket) only follows
  // the master switch — same as the web app's own Notifications page, which
  // has no row for these either.
  return matchedKey ? preferences[matchedKey] : true;
};
