import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { ANDROID_CHANNEL_ID } from "@/services/pushNotifications";
import type { StaffSelfAttendance } from "@/services/staffSelfAttendance.service";
import { getCheckoutReminder } from "./checkoutReminder";

/**
 * The in-app dialog only reaches staff who still have the app open, so a shift that
 * ends after they put the phone away produced no reminder at all. This schedules a
 * local notification for the same deadline, which the OS delivers with the app in the
 * background or closed. One fixed id keeps at most a single reminder pending.
 */
const NOTIFICATION_ID = "staff-checkout-reminder";

/** The reminder currently scheduled, so repeated state refreshes don't reschedule it. */
let scheduledKey: string | null = null;

export const cancelCheckoutReminderNotification = async () => {
  scheduledKey = null;
  try {
    await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_ID);
  } catch {
    // Nothing scheduled (or notifications unavailable): there is nothing to clean up.
  }
};

/**
 * Keeps the pending reminder in step with the latest attendance state: scheduled once
 * the shift has a known end, rescheduled when that end moves, and cancelled as soon as
 * the checkout lands or the shift no longer qualifies.
 */
export const syncCheckoutReminderNotification = async (
  state: StaffSelfAttendance | null,
  userId: string | null | undefined,
) => {
  const reminder = getCheckoutReminder(state);

  if (!reminder || !userId) {
    if (scheduledKey) await cancelCheckoutReminderNotification();
    return;
  }

  if (reminder.key === scheduledKey) return;

  // Server time, so a phone with a wrong clock or timezone still fires on the shift's
  // real deadline — the same basis the in-app dialog's timer uses.
  const elapsed = Math.max(0, Date.now() - (state?.received_at ?? Date.now()));
  const msFromNow = reminder.dueAt - reminder.serverNow - elapsed;

  // Already past the deadline: the in-app dialog covers this refresh, and a
  // notification scheduled in the past would fire immediately on every refresh.
  if (msFromNow <= 0) {
    if (scheduledKey) await cancelCheckoutReminderNotification();
    return;
  }

  try {
    await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_ID).catch(() => undefined);
    await Notifications.scheduleNotificationAsync({
      identifier: NOTIFICATION_ID,
      content: {
        title: "You haven't checked out",
        body: "Your shift has ended. Please check out to record your hours.",
        // The foreground handler only lets staff through for their own
        // attendance pushes, so this carries the same shape the backend sends.
        data: { type: "attendance", event_key: "attendance", recipient_user_ids: [userId] },
        ...(Platform.OS === "android" ? {} : { sound: "default" }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(Date.now() + msFromNow),
        ...(Platform.OS === "android" ? { channelId: ANDROID_CHANNEL_ID } : {}),
      },
    });
    scheduledKey = reminder.key;
  } catch {
    // Permission denied or the scheduler is unavailable: the in-app dialog still covers
    // staff who have the app open, so this must never break the attendance screen.
    scheduledKey = null;
  }
};
