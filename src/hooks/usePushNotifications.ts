import { appAlert as Alert } from "@/services/appAlert";
import { router } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

import { useAppForeground } from "@/hooks/useAppForeground";
import { salonNotificationPreferences } from "@/services/salonNotificationPreferences";
import {
  registerDeviceThunk,
  fetchNotificationsThunk,
  fetchUnreadCountThunk,
  hydrateRegisteredDeviceTokenThunk,
  unregisterDeviceThunk,
} from "@/middleware/notification/notification.thunk";
import {
  hasEnabledNotificationPreference,
  notificationPreferencesStorage,
} from "@/services/notificationPreferencesStorage";
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
import { isNotificationRegistrationPaused } from "@/services/notificationRegistrationLifecycle";
import { resolveRouteFromPushData } from "@/utils/notificationRouting";
import { isStaffExperienceUser } from "@/utils/routeResolver";
import { canReceivePush } from "@/utils/staffAccess";

const PLATFORM: "android" | "ios" = Platform.OS === "ios" ? "ios" : "android";

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

  const syncDeviceToken = useCallback(async () => {
    const startedUser = currentUserRef.current;
    const isCurrentSession = () => isAuthenticatedRef.current && !isNotificationRegistrationPaused() &&
      startedUser?.id === currentUserRef.current?.id && startedUser?.salonId === currentUserRef.current?.salonId;
    if (!isCurrentSession()) return;
    try {
      if (isStaffExperienceUser(startedUser)) {
        confirmedRegistrationSignatureRef.current = null;
        await dispatch(unregisterDeviceThunk()).unwrap();
        return;
      }
      const preferences = await salonNotificationPreferences.get();
      await notificationPreferencesStorage.setPreferences(preferences, false);
      if (!isCurrentSession()) return;

      if (!hasEnabledNotificationPreference(preferences)) {
        confirmedRegistrationSignatureRef.current = null;

        if (registeredTokenRef.current && registerDeviceStatusRef.current !== "loading") {
          void dispatch(unregisterDeviceThunk()).unwrap().catch((error) => {
            console.warn("[PushNotifications] Device unregistration failed:", error);
          });
        }
        return;
      }

      const activeUser = currentUserRef.current;
      const activeStaff = currentStaffRef.current;
      const isStaffUser = isStaffExperienceUser(activeUser);
      const activeSalonId = activeUser?.salonId?.trim() ?? "";

      if (isStaffUser && !activeStaff?.id) {
        if (currentStaffLoadingRef.current) {
          console.log("[PushNotifications] Staff device registration waiting for currentStaff.");
        } else {
          console.warn("[PushNotifications] Staff device registration skipped because currentStaff is unavailable.");
        }
        return;
      }

      if (!isStaffUser && !activeSalonId) {
        console.log("[PushNotifications] Device registration deferred — no salon context yet (onboarding/registration phase).");
        return;
      }

      await ensureAndroidNotificationChannel();
      await requestNotificationPermission();

      const token = await getExpoPushToken();
      const expoPushToken = token.trim();
      if (!isCurrentSession()) return;

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
        salon_id: activeSalonId,
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

    }
  }, [dispatch]);

  useEffect(() => notificationPreferencesStorage.subscribe((nextPreferences) => {
    if (!isAuthenticatedRef.current) {
      return;
    }

    if (!hasEnabledNotificationPreference(nextPreferences)) {
      confirmedRegistrationSignatureRef.current = null;

      if (registeredTokenRef.current && registerDeviceStatusRef.current !== "loading") {
        void dispatch(unregisterDeviceThunk()).unwrap().catch((error) => {
          console.warn("[PushNotifications] Device unregistration failed:", error);
        });
      }
      return;
    }

    void syncDeviceToken();
  }), [dispatch, syncDeviceToken]);

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
  }, [currentStaff?.id, currentStaffLoading, currentUser?.id, currentUser?.salonId, currentUser?.role, isAuthenticated, dispatch, syncDeviceToken]);

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
    if (!canReceivePush(currentUserRef.current, response.notification.request.content.data)) return;
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
      void dispatch(fetchNotificationsThunk());
      void dispatch(fetchUnreadCountThunk());
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationResponse(response);
    });

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
