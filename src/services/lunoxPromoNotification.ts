import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { ANDROID_CHANNEL_ID } from "@/services/pushNotifications";

/**
 * A one-time promotional nudge that markets Lunox AI, delivered as a local
 * notification the OS shows even with the app backgrounded or closed. Because it
 * is scheduled at runtime — not at install time — users who already have the app
 * get it too: the first time this code runs for them (after the store/OTA update
 * that ships it), the nudge is queued. The persisted flag keeps it to a single
 * send per device so no one is nagged on every launch.
 *
 * The tap routes to Lunox AI via the "lunox" type handled in notificationRouting
 * and usePushNotifications.
 */
const PROMO_ID = "lunox-ai-promo";
const PROMO_FLAG = "salonox.lunoxPromoScheduled";

// A few days in, so the nudge lands once the owner has some data worth asking
// Lunox about — not in the first-run rush.
const DELAY_MS = 3 * 24 * 60 * 60 * 1000;

export const scheduleLunoxPromoNotification = async () => {
  try {
    const alreadyScheduled = await AsyncStorage.getItem(PROMO_FLAG);
    if (alreadyScheduled) return;

    // No permission means nothing would be delivered; leave the flag unset so a
    // later launch (after the user allows notifications) can still schedule it.
    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) return;

    await Notifications.cancelScheduledNotificationAsync(PROMO_ID).catch(() => undefined);
    await Notifications.scheduleNotificationAsync({
      identifier: PROMO_ID,
      content: {
        title: "Meet Lunox AI ✨",
        body: "Your salon's AI assistant is ready — ask about today's revenue, bookings, or what to focus on next.",
        // Mirrors the backend push shape so the foreground handler and tap
        // routing treat it exactly like a server-sent Lunox push.
        data: { type: "lunox", event_key: "lunox" },
        ...(Platform.OS === "android" ? {} : { sound: "default" }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(Date.now() + DELAY_MS),
        ...(Platform.OS === "android" ? { channelId: ANDROID_CHANNEL_ID } : {}),
      },
    });

    await AsyncStorage.setItem(PROMO_FLAG, String(Date.now()));
  } catch {
    // Permission revoked mid-flight or the scheduler is unavailable: a promo
    // nudge must never break app startup.
  }
};

export const cancelLunoxPromoNotification = async () => {
  try {
    await Notifications.cancelScheduledNotificationAsync(PROMO_ID);
  } catch {
    // Nothing pending (or notifications unavailable): nothing to clean up.
  }
};
