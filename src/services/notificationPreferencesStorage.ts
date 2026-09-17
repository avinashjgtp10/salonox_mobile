import AsyncStorage from "@react-native-async-storage/async-storage";

export type NotificationPreferences = {
  allNotifications: boolean;
  appointments: boolean;
  otherUpdates: boolean;
  paymentComplete: boolean;
  productAudit: boolean;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  allNotifications: true,
  appointments: true,
  otherUpdates: true,
  paymentComplete: true,
  productAudit: true,
};

const NOTIFICATION_PREFERENCES_KEY = "salonox.notificationPreferences";

type NotificationPreferencesListener = (preferences: NotificationPreferences) => void;

const listeners = new Set<NotificationPreferencesListener>();

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

      return isValidPreferences(parsed) ? {
        ...parsed,
        paymentComplete: typeof parsed.paymentComplete === "boolean" ? parsed.paymentComplete : parsed.otherUpdates,
        productAudit: typeof parsed.productAudit === "boolean" ? parsed.productAudit : parsed.otherUpdates,
      } : DEFAULT_NOTIFICATION_PREFERENCES;
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
  preferences.allNotifications && (preferences.appointments || preferences.otherUpdates || preferences.paymentComplete || preferences.productAudit);

// Backend `type` values (see src/types/notification.ts) that count as an
// "appointment" notification for the Appointments toggle — everything else
// (client, payment, whatsapp, and any future type) falls under "Other Updates".
const APPOINTMENT_NOTIFICATION_TYPES = new Set(["appointment", "newappointment", "appointmentreminder", "appointmentcancelled", "appointmentcompleted"]);

export const isNotificationTypeEnabled = (
  type: string,
  preferences: NotificationPreferences,
): boolean => {
  if (!preferences.allNotifications) return false;

  const normalizedType = type.trim().toLowerCase().replace(/[\s.-]+/g, "_");
  if (["payment", "payment_complete", "payment_completed", "newpayment"].includes(normalizedType)) return preferences.paymentComplete;
  if (["product_audit", "product_audit_completed", "product_audit_complete", "inventory_audit", "productaudit", "inventoryalert", "lowinventory"].includes(normalizedType)) return preferences.productAudit;

  return APPOINTMENT_NOTIFICATION_TYPES.has(normalizedType)
    ? preferences.appointments
    : preferences.otherUpdates;
};
