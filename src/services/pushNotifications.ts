import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { tokenStorage } from "@/services/tokenStorage";
import {
  getNotificationPermission,
  hasDeclinedNotificationPrompt,
} from "@/services/notificationPermission";
import {
  promptForNotificationPermission,
  showNotificationSettingsPrompt,
} from "@/services/notificationPermissionPrompt";
import { isNotificationRegistrationPaused } from "@/services/notificationRegistrationLifecycle";
import { canReceivePush } from "@/utils/staffAccess";

import {
  isNotificationTypeEnabled,
  notificationPreferencesStorage,
} from "@/services/notificationPreferencesStorage";

export const ANDROID_CHANNEL_ID = "salonox";

/** Reset on each app run, so the "notifications are off" prompt shows once per launch. */
let blockedPromptShownThisSession = false;

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

/**
 * Makes sure the device allows notifications before a push token is requested,
 * asking through the in-app prompt (OK → the native OS request) when it may.
 * Throws PushPermissionDeniedError when the device still says no.
 */
export const ensureNotificationPermission = async (): Promise<void> => {
  const current = await getNotificationPermission();

  if (current.granted) {
    blockedPromptShownThisSession = false;
    return;
  }

  // Turned off in the device settings: the OS will not show its dialog again,
  // so offer the settings screen. Once per app run — this is reached on every
  // foreground, and a dialog each time would be nagging.
  if (current.blocked) {
    if (!blockedPromptShownThisSession) {
      blockedPromptShownThisSession = true;
      await showNotificationSettingsPrompt();
    }

    throw new PushPermissionDeniedError();
  }

  // Said "Not now" to our own prompt before: don't ask again on every launch.
  // The banner in Settings → Notify me about stays the way back in.
  if (await hasDeclinedNotificationPrompt()) {
    throw new PushPermissionDeniedError();
  }

  const requested = await promptForNotificationPermission();

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
    throw new PushTokenGenerationError(error);
  }
};
