/**
 * Device notification permission — the one place that reads, requests and
 * repairs it, for both platforms.
 *
 * The three states that matter:
 *  - undetermined  → the OS will show its prompt, so we may ask
 *  - denied, can ask again → Android lets us ask once more
 *  - denied, cannot ask again (permanently denied, or iOS after one refusal)
 *    → only the device settings screen can turn it back on
 *
 * Android 12 and below have no runtime notification permission, so
 * getPermissionsAsync reports granted there and nothing is ever prompted.
 * POST_NOTIFICATIONS is declared in app.config.ts for Android 13+.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Linking, Platform } from "react-native";

const DECLINED_KEY = "salonox.notificationPermission.declined";

export type NotificationPermissionState = {
  granted: boolean;
  /** False once the OS will no longer show its prompt — settings is the only way back. */
  canAskAgain: boolean;
  status: Notifications.PermissionStatus;
  /** True when the OS has refused for good and the user must use settings. */
  blocked: boolean;
};

const toState = (
  permission: Pick<Notifications.NotificationPermissionsStatus, "granted" | "canAskAgain" | "status">,
): NotificationPermissionState => ({
  granted: permission.granted,
  canAskAgain: permission.canAskAgain,
  status: permission.status,
  blocked: !permission.granted && !permission.canAskAgain,
});

const UNKNOWN: NotificationPermissionState = {
  granted: false,
  canAskAgain: true,
  status: Notifications.PermissionStatus.UNDETERMINED,
  blocked: false,
};

/** Reads the live device permission. Never throws. */
export const getNotificationPermission = async (): Promise<NotificationPermissionState> => {
  try {
    return toState(await Notifications.getPermissionsAsync());
  } catch {
    return UNKNOWN;
  }
};

/**
 * Shows the native OS permission request. Call only when `canAskAgain` is true —
 * otherwise the OS returns the old answer without showing anything.
 */
export const requestNotificationPermission = async (): Promise<NotificationPermissionState> => {
  try {
    const state = toState(
      await Notifications.requestPermissionsAsync({
        // Without these iOS grants a bare authorization with no alerts shown.
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      }),
    );

    if (state.granted) {
      await clearNotificationPromptDeclined();
    }

    return state;
  } catch {
    return UNKNOWN;
  }
};

/**
 * Opens the screen where notifications can be switched back on.
 *
 * Android: the app's own notification settings, via APP_NOTIFICATION_SETTINGS —
 * Linking.openSettings() only reaches the generic App info page, from which the
 * user still has to find "Notifications" themselves.
 * iOS: app-settings:, SalonOX's page in Settings (iOS has no deeper link).
 */
export const openAppNotificationSettings = async () => {
  if (Platform.OS === "ios") {
    try {
      await Linking.openURL("app-settings:");
    } catch {
      // Nothing more we can do; the user can reach Settings by hand.
    }
    return;
  }

  const packageName = Constants.expoConfig?.android?.package ?? null;

  if (packageName) {
    try {
      await Linking.sendIntent("android.settings.APP_NOTIFICATION_SETTINGS", [
        { key: "android.provider.extra.APP_PACKAGE", value: packageName },
      ]);
      return;
    } catch {
      // Older or customised ROMs may not resolve it; fall through to App info.
    }
  }

  try {
    await Linking.openSettings();
  } catch {
    // Nothing more we can do; the user can reach Settings by hand.
  }
};

/**
 * Whether the user has already turned our prompt down. Kept so a refusal is not
 * re-asked on every foreground — the settings screen stays the way back in.
 */
export const hasDeclinedNotificationPrompt = async () => {
  try {
    return (await AsyncStorage.getItem(DECLINED_KEY)) === "1";
  } catch {
    return false;
  }
};

export const setNotificationPromptDeclined = async () => {
  try {
    await AsyncStorage.setItem(DECLINED_KEY, "1");
  } catch {
    // A lost flag only means the prompt may appear once more.
  }
};

export const clearNotificationPromptDeclined = async () => {
  try {
    await AsyncStorage.removeItem(DECLINED_KEY);
  } catch {
    // Ignored: see above.
  }
};
