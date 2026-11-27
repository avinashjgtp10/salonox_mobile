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
  ensureNotificationPermission,
  getExpoPushToken,
  PushPermissionDeniedError,
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
import { lunoxLauncher } from "@/services/lunoxLauncher";
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
      const staffSession = isStaffExperienceUser(startedUser);
      const preferences = staffSession
        ? await notificationPreferencesStorage.getPreferences()
        : await salonNotificationPreferences.get();
      if (!staffSession) await notificationPreferencesStorage.setPreferences(preferences, false);
      if (!isCurrentSession()) return;

      if (!hasEnabledNotificationPreference(preferences)) {
        confirmedRegistrationSignatureRef.current = null;

        if (registeredTokenRef.current && registerDeviceStatusRef.current !== "loading") {
          void dispatch(unregisterDeviceThunk()).unwrap().catch(() => {});
        }
        return;
      }

      const activeUser = currentUserRef.current;
      const activeStaff = currentStaffRef.current;
      const isStaffUser = isStaffExperienceUser(activeUser);
      const activeSalonId = activeUser?.salonId?.trim() ?? "";

      if (isStaffUser && !activeStaff?.id) {
        return;
      }

      if (!isStaffUser && !activeSalonId) {
        return;
      }

      await ensureAndroidNotificationChannel();
      await ensureNotificationPermission();

      const token = await getExpoPushToken();
      const expoPushToken = token.trim();
      if (!isCurrentSession()) return;


      if (!expoPushToken) {
        return;
      }

      if (registerDeviceStatusRef.current === "loading") {
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
        return;
      }


      void dispatch(registerDeviceThunk(registrationPayload))
        .unwrap()
        .then(() => {
          confirmedRegistrationSignatureRef.current = registrationSignature;
        })
        .catch(() => {});
    } catch (error) {
      // ensureNotificationPermission has already shown the prompt, or the way to
      // settings, or deliberately stayed quiet because the user said no before.
      if (error instanceof PushPermissionDeniedError) {
        return;
      }


    }
  }, [dispatch]);

  useEffect(() => notificationPreferencesStorage.subscribe((nextPreferences) => {
    if (!isAuthenticatedRef.current) {
      return;
    }

    if (!hasEnabledNotificationPreference(nextPreferences)) {
      confirmedRegistrationSignatureRef.current = null;

      if (registeredTokenRef.current && registerDeviceStatusRef.current !== "loading") {
        void dispatch(unregisterDeviceThunk()).unwrap().catch(() => {});
      }
      return;
    }

    void syncDeviceToken();
  }), [dispatch, syncDeviceToken]);

  useEffect(() => {
    if (!isAuthenticated) {
      hydratedStoredTokenRef.current = false;
      confirmedRegistrationSignatureRef.current = null;
      pendingNotificationResponseRef.current = null;
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
      return;
    }

    const responseId = response.notification.request.identifier;

    if (handledResponseIdsRef.current.has(responseId)) {
      return;
    }

    handledResponseIdsRef.current.add(responseId);
    const data = response.notification.request.content.data;
    if (!canReceivePush(currentUserRef.current, data)) return;
    const href = resolveRouteFromPushData(
      data,
      isStaffExperienceUser(currentUserRef.current) ? "staff" : "owner",
    );
    router.push(href);

    // Lunox AI is a sheet, not a route: after landing on the dashboard, ask the
    // owner-tabs layout to open it (replayed once mounted on a cold start).
    const pushType = String((data as { type?: unknown; event_key?: unknown })?.event_key ??
      (data as { type?: unknown })?.type ?? "").toLowerCase();
    if (pushType === "lunox") {
      const seed = (data as { seed?: unknown })?.seed;
      lunoxLauncher.open(typeof seed === "string" ? seed : null);
    }
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
    const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
      if (!isAuthenticatedRef.current || !canReceivePush(currentUserRef.current, notification.request.content.data)) return;
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
