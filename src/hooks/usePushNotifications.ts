import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { Alert, Platform } from "react-native";
import * as Notifications from "expo-notifications";

import { useAppForeground } from "@/hooks/useAppForeground";
import {
  registerDeviceThunk,
  fetchNotificationsThunk,
  fetchUnreadCountThunk,
  hydrateRegisteredDeviceTokenThunk,
} from "@/middleware/notification/notification.thunk";
import {
  ensureAndroidNotificationChannel,
  getExpoPushToken,
  PushPermissionDeniedError,
  requestNotificationPermission,
} from "@/services/pushNotifications";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectRegisteredDeviceToken,
  selectRegisterDeviceStatus,
} from "@/store/notification/notification.slice";
import { resolveRouteFromPushData } from "@/utils/notificationRouting";

const PLATFORM: "android" | "ios" = Platform.OS === "ios" ? "ios" : "android";

// Mounted exactly once (see root layout) — every listener here is a
// singleton for the app's lifetime. Re-mounting this hook anywhere else
// would double-fire notification handling, which is explicitly what task
// #12 ("avoid duplicate listeners") rules out.
export const usePushNotifications = (isAuthenticated: boolean) => {
  const dispatch = useAppDispatch();
  const registeredToken = useAppSelector(selectRegisteredDeviceToken);
  const registerDeviceStatus = useAppSelector(selectRegisterDeviceStatus);
  const registeredTokenRef = useRef(registeredToken);
  const registerDeviceStatusRef = useRef(registerDeviceStatus);
  const hydratedStoredTokenRef = useRef(false);
  const hasWarnedPermissionRef = useRef(false);
  const handledResponseIdsRef = useRef(new Set<string>());
  registeredTokenRef.current = registeredToken;
  registerDeviceStatusRef.current = registerDeviceStatus;

  const syncDeviceToken = async () => {
    try {
      await ensureAndroidNotificationChannel();
      await requestNotificationPermission();

      const token = await getExpoPushToken();
      const expoPushToken = token.trim();

      console.log("[PushNotifications] Token obtained");
      console.log("Expo Push Token:", expoPushToken);

      if (!expoPushToken) {
        console.warn("[PushNotifications] Skipping device registration because Expo push token is empty.");
        return;
      }

      if (expoPushToken === registeredTokenRef.current) {
        console.log("[PushNotifications] Token matches local registered token; re-confirming with backend.");
      }

      if (registerDeviceStatusRef.current === "loading") {
        console.log("[PushNotifications] Registration skipped because registerDevice is already loading.");
        return;
      }

      console.log("[PushNotifications] Dispatch registerDevice");
      console.log("Register Device Payload:", {
        token: expoPushToken,
        platform: PLATFORM,
      });

      void dispatch(registerDeviceThunk({ platform: PLATFORM, token: expoPushToken }));
    } catch (error) {
      if (error instanceof PushPermissionDeniedError) {
        if (!hasWarnedPermissionRef.current) {
          hasWarnedPermissionRef.current = true;
          Alert.alert(
            "Notifications are off",
            "Turn on notifications in your device settings so SalonOX can alert you about new appointments, sales, and client activity in real time.",
          );
        }
        return;
      }

      console.warn("[PushNotifications] Registration flow failed before dispatch completed:", error);

      // Token generation / network failure — silent by design. This runs on
      // every login and every foreground, so a transient failure will
      // simply retry next time rather than nagging the user repeatedly.
    }
  };

  // Register (or re-register, if the token rotated) whenever the user is
  // authenticated — covers both the immediately-after-login case and a
  // returning user whose session was restored from storage.
  useEffect(() => {
    if (!isAuthenticated) {
      hydratedStoredTokenRef.current = false;
      return;
    }

    if (hydratedStoredTokenRef.current) {
      void syncDeviceToken();
      return;
    }

    hydratedStoredTokenRef.current = true;
    void dispatch(hydrateRegisteredDeviceTokenThunk()).finally(() => {
      void syncDeviceToken();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Token rotation can happen at any time (app reinstall keeps the same
  // device but Expo may issue a new token) — re-check on every return to
  // foreground rather than only once at login.
  useAppForeground(() => {
    if (isAuthenticated) {
      void syncDeviceToken();
    }
  });

  useEffect(() => {
    const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
      const responseId = response.notification.request.identifier;

      if (handledResponseIdsRef.current.has(responseId)) {
        return;
      }

      handledResponseIdsRef.current.add(responseId);
      const href = resolveRouteFromPushData(response.notification.request.content.data);
      router.push(href);
      void dispatch(fetchNotificationsThunk());
      void dispatch(fetchUnreadCountThunk());
    };

    const receivedSubscription = Notifications.addNotificationReceivedListener(() => {
      // Foreground receipt: the OS banner is already handled by the
      // notification handler configured in pushNotifications.ts — this just
      // keeps in-app state (list + badge) in sync without the user having
      // to pull-to-refresh.
      void dispatch(fetchNotificationsThunk());
      void dispatch(fetchUnreadCountThunk());
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationResponse(response);
    });

    // App was fully closed and got launched by tapping a notification —
    // addNotificationResponseReceivedListener alone misses this case since
    // it wasn't there yet to hear the tap.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        handleNotificationResponse(response);
        void Notifications.clearLastNotificationResponseAsync();
      }
    });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [dispatch]);
};
