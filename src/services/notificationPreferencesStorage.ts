import AsyncStorage from "@react-native-async-storage/async-storage";

export type NotificationPreferences = {
  allNotifications: boolean;
  appointments: boolean;
  otherUpdates: boolean;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  allNotifications: true,
  appointments: true,
  otherUpdates: true,
};

const NOTIFICATION_PREFERENCES_KEY = "salonox.notificationPreferences";

const isValidPreferences = (value: unknown): value is NotificationPreferences =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as NotificationPreferences).allNotifications === "boolean" &&
  typeof (value as NotificationPreferences).appointments === "boolean" &&
  typeof (value as NotificationPreferences).otherUpdates === "boolean";

export const notificationPreferencesStorage = {
  async getPreferences(): Promise<NotificationPreferences> {
    const stored = await AsyncStorage.getItem(NOTIFICATION_PREFERENCES_KEY);

    if (!stored) {
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }

    try {
      const parsed = JSON.parse(stored);

      return isValidPreferences(parsed) ? parsed : DEFAULT_NOTIFICATION_PREFERENCES;
    } catch {
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }
  },

  async setPreferences(preferences: NotificationPreferences) {
    await AsyncStorage.setItem(NOTIFICATION_PREFERENCES_KEY, JSON.stringify(preferences));
  },
};

// Backend `type` values (see src/types/notification.ts) that count as an
// "appointment" notification for the Appointments toggle — everything else
// (client, payment, whatsapp, and any future type) falls under "Other Updates".
const APPOINTMENT_NOTIFICATION_TYPES = new Set(["appointment"]);

export const isNotificationTypeEnabled = (
  type: string,
  preferences: NotificationPreferences,
): boolean => {
  if (preferences.allNotifications) {
    return true;
  }

  return APPOINTMENT_NOTIFICATION_TYPES.has(type)
    ? preferences.appointments
    : preferences.otherUpdates;
};
