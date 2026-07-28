import { router } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
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
import { selectCurrentStaff, selectCurrentStaffLoading } from "@/store/staff/staff.slice";
import { selectCurrentUser } from "@/store/user/user.slice";
import { appEnv } from "@/config/environment";
import { resolveRouteFromPushData } from "@/utils/notificationRouting";
import { isStaffExperienceUser } from "@/utils/routeResolver";

const PLATFORM: "android" | "ios" = Platform.OS === "ios" ? "ios" : "android";

// Mounted exactly once (see root layout) — every listener here is a
// singleton for the app's lifetime. Re-mounting this hook anywhere else
// would double-fire notification handling, which is explicitly what task
// #12 ("avoid duplicate listeners") rules out.
export const usePushNotifications = (isAuthenticated: boolean) => {
  const dispatch = useAppDispatch();
  const registeredToken = useAppSelector(selectRegisteredDeviceToken);
  const registerDeviceStatus = useAppSelector(selectRegisterDeviceStatus);
  const currentUser = useAppSelector(selectCurrentUser);
  const currentStaff = useAppSelector(selectCurrentStaff);
  const currentStaffLoading = useAppSelector(selectCurrentStaffLoading);
  const registeredTokenRef = useRef(registeredToken);
  const registerDeviceStatusRef = useRef(registerDeviceStatus);
  const currentUserRef = useRef(currentUser);
  const currentStaffRef = useRef(currentStaff);
  const currentStaffLoadingRef = useRef(currentStaffLoading);
  const isAuthenticatedRef = useRef(isAuthenticated);
  const hydratedStoredTokenRef = useRef(false);
  const hasWarnedPermissionRef = useRef(false);
  const handledResponseIdsRef = useRef(new Set<string>());
  const pendingNotificationResponseRef = useRef<Notifications.NotificationResponse | null>(null);
  const confirmedRegistrationSignatureRef = useRef<string | null>(null);
  registeredTokenRef.current = registeredToken;
  registerDeviceStatusRef.current = registerDeviceStatus;
  currentUserRef.current = currentUser;
  currentStaffRef.current = currentStaff;
  currentStaffLoadingRef.current = currentStaffLoading;
  isAuthenticatedRef.current = isAuthenticated;

  const syncDeviceToken = async () => {
    try {
      const activeUser = currentUserRef.current;
      const activeStaff = currentStaffRef.current;
      const isStaffUser = isStaffExperienceUser(activeUser);

      if (isStaffUser && !activeStaff?.id) {
        if (currentStaffLoadingRef.current) {
          console.log("[PushNotifications] Staff device registration waiting for currentStaff.");
        } else {
          console.warn("[PushNotifications] Staff device registration skipped because currentStaff is unavailable.");
        }
        return;
      }

      await ensureAndroidNotificationChannel();
      await requestNotificationPermission();

      const token = await getExpoPushToken();
      const expoPushToken = token.trim();

      console.log("[PushNotifications] Token obtained");

      if (!expoPushToken) {
        console.warn("[PushNotifications] Skipping device registration because Expo push token is empty.");
        return;
      }

      if (registerDeviceStatusRef.current === "loading") {
        console.log("[PushNotifications] Registration skipped because registerDevice is already loading.");
        return;
      }

      const registrationPayload = {
        app_env: appEnv,
        platform: PLATFORM,
        role: activeUser?.role ?? null,
        staff_id: isStaffUser ? activeStaff?.id ?? null : null,
        token: expoPushToken,
        user_id: activeUser?.id ?? null,
      };
      const registrationSignature = JSON.stringify(registrationPayload);

      if (
        expoPushToken === registeredTokenRef.current &&
        registrationSignature === confirmedRegistrationSignatureRef.current
      ) {
        console.log("[PushNotifications] Registration skipped because this device context is already confirmed.");
        return;
      }

      console.log("[PushNotifications] Dispatch registerDevice");

      void dispatch(registerDeviceThunk(registrationPayload))
        .unwrap()
        .then(() => {
          confirmedRegistrationSignatureRef.current = registrationSignature;
        })
        .catch((error) => {
          console.warn("[PushNotifications] Device registration failed:", error);
        });
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
      confirmedRegistrationSignatureRef.current = null;
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
  }, [currentStaff?.id, currentStaffLoading, currentUser?.id, currentUser?.role, isAuthenticated]);

  // Token rotation can happen at any time (app reinstall keeps the same
  // device but Expo may issue a new token) — re-check on every return to
  // foreground rather than only once at login.
  useAppForeground(() => {
    if (isAuthenticated) {
      void syncDeviceToken();
    }
  });

  const handleNotificationResponse = useCallback((response: Notifications.NotificationResponse) => {
    if (!isAuthenticatedRef.current || !currentUserRef.current) {
      pendingNotificationResponseRef.current = response;
      return;
    }

    const responseId = response.notification.request.identifier;

    if (handledResponseIdsRef.current.has(responseId)) {
      return;
    }

    handledResponseIdsRef.current.add(responseId);
    const href = resolveRouteFromPushData(
      response.notification.request.content.data,
      isStaffExperienceUser(currentUserRef.current) ? "staff" : "owner",
    );
    router.push(href);
    void dispatch(fetchNotificationsThunk());
    void dispatch(fetchUnreadCountThunk());
  }, [dispatch]);

  useEffect(() => {
    const pendingResponse = pendingNotificationResponseRef.current;

    if (isAuthenticated && currentUser && pendingResponse) {
      pendingNotificationResponseRef.current = null;
      handleNotificationResponse(pendingResponse);
    }
  }, [currentUser, handleNotificationResponse, isAuthenticated]);

  useEffect(() => {

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
  }, [dispatch, handleNotificationResponse]);
};
