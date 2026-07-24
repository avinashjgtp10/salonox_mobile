import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

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

// Foreground behavior — the OS banner/sound/badge would otherwise stay
// silent while the app is open, which is exactly the case task #5 requires
// ("show native notification banner" even in foreground).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const ensureAndroidNotificationChannel = async () => {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: "SalonOX",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    enableVibrate: true,
    sound: "default",
    showBadge: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
};

// Only ever returns "granted" or throws — callers branch on the error type
// (denied vs. everything else) rather than juggling a status string.
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

// Physical-device check matches Expo's own guidance — push tokens can't be
// generated on a simulator/emulator, and failing there isn't a real error
// the user needs to see.
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
