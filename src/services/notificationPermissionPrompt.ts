/**
 * The "turn on notifications" prompt.
 *
 * OK starts the real OS permission request — notifications can only be switched
 * on by the operating system, never by the app. Once the OS has refused for
 * good, OK is replaced by Open Settings, which is then the only way back.
 */
import { appAlert as Alert } from "@/services/appAlert";

import {
  getNotificationPermission,
  openAppNotificationSettings,
  requestNotificationPermission,
  setNotificationPromptDeclined,
  type NotificationPermissionState,
} from "@/services/notificationPermission";

const WHY = "so SalonOX can alert you about new appointments, sales, and client activity in real time";

/** Offers the settings screen for a permission the OS will no longer prompt for. */
export const showNotificationSettingsPrompt = () =>
  new Promise<void>((resolve) => {
    Alert.alert(
      "Notifications are turned off",
      `Notifications are blocked for SalonOX. Open your device settings and turn them on ${WHY}.`,
      [
        { text: "Not now", style: "cancel", onPress: () => resolve() },
        {
          text: "Open Settings",
          onPress: () => {
            void openAppNotificationSettings();
            resolve();
          },
        },
      ],
      { cancelable: true, onDismiss: () => resolve() },
    );
  });

/**
 * Asks for notification permission, prompting first.
 *
 * Granted already → returns straight away, nothing is shown, so this is safe to
 * call on every launch. Blocked → offers settings. Otherwise → the prompt, and
 * OK fires the native request.
 */
export const promptForNotificationPermission = async ({
  force = false,
}: { force?: boolean } = {}): Promise<NotificationPermissionState> => {
  const current = await getNotificationPermission();

  if (current.granted) {
    return current;
  }

  if (current.blocked) {
    await showNotificationSettingsPrompt();
    return current;
  }

  const accepted = await new Promise<boolean>((resolve) => {
    Alert.alert(
      "Turn on notifications",
      `Allow notifications ${WHY}.`,
      [
        {
          text: "Not now",
          style: "cancel",
          onPress: () => resolve(false),
        },
        { text: "OK", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });

  if (!accepted) {
    // Only an unforced refusal is remembered; asking from Settings is deliberate.
    if (!force) await setNotificationPromptDeclined();
    return current;
  }

  const requested = await requestNotificationPermission();

  // Refused in the OS dialog in a way that cannot be asked again: show the way back.
  if (requested.blocked) {
    await showNotificationSettingsPrompt();
  }

  return requested;
};
