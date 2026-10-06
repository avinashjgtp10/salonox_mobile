import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { tokenStorage } from "@/services/tokenStorage";
import { isNotificationRegistrationPaused } from "@/services/notificationRegistrationLifecycle";
import { canReceivePush } from "@/utils/staffAccess";

import {
  isNotificationTypeEnabled,
  notificationPreferencesStorage,
} from "@/services/notificationPreferencesStorage";

const ANDROID_CHANNEL_ID = "salonox";

export class PushPermissionDeniedError extends Error {
  constructor() {
    super("Notification permission was denied.");
    this.name = "PushPermissionDeniedError";
  }
}

export class PushTokenGenerationError extends Error {
  constructor(cause: unknown) {
    super(cause instanceof Error ? cause.message : "Unable to generate a push token.");
    this.name = "PushTokenGenerationError";
  }
}

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const session = await tokenStorage.getSession();
    const data = notification.request.content.data;
    const recipientSalon = data?.salon_id ?? data?.salonId;
    const userSalon = session.user?.salonId;
    const sessionAllowsNotification = Boolean(session.accessToken && session.user && canReceivePush(session.user, data) &&
      !isNotificationRegistrationPaused() && (!recipientSalon || recipientSalon === userSalon));
    const type = String(notification.request.content.data?.event_key ?? notification.request.content.data?.type ?? "general");
    const preferences = await notificationPreferencesStorage.getPreferences();
    const isEnabled = sessionAllowsNotification && isNotificationTypeEnabled(type, preferences);

    return {
      shouldPlaySound: isEnabled,
      shouldSetBadge: isEnabled,
      shouldShowBanner: isEnabled,
      shouldShowList: isEnabled,
    };
  },
});

export const ensureAndroidNotificationChannel = async () => {
  if (Platform.OS !== "android") {
    return;
  }

  try {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: "SalonOX",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
      sound: "default",
      showBadge: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  } catch (error) {
    throw error;
  }
};

Notifications.addPushTokenListener((tokenData) => {
  void tokenData;
});

export const requestNotificationPermission = async (): Promise<void> => {
  const current = await Notifications.getPermissionsAsync();

  if (current.granted) {
    return;
  }

  if (!current.canAskAgain) {
    throw new PushPermissionDeniedError();
  }

  const requested = await Notifications.requestPermissionsAsync();

  if (!requested.granted) {
    throw new PushPermissionDeniedError();
  }
};

export const getExpoPushToken = async (): Promise<string> => {
  if (!Device.isDevice) {
    throw new PushTokenGenerationError(new Error("Push notifications require a physical device."));
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;

  if (!projectId) {
    throw new PushTokenGenerationError(new Error("Missing EAS project ID — cannot generate a push token."));
  }

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = typeof data === "string" ? data.trim() : "";

    if (!token) {
      throw new Error("Expo returned an empty push token.");
    }

    if (!token.startsWith("ExponentPushToken[")) {
      throw new Error(`Expo returned an unexpected push token format: ${token}`);
    }

    return token;
  } catch (error) {
    console.warn("[PushNotifications] getExpoPushTokenAsync failed:", {
      error,
      projectId,
      platform: Platform.OS,
    });
    throw new PushTokenGenerationError(error);
  }
};
