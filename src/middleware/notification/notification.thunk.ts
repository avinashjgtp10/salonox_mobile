import { createAsyncThunk } from "@reduxjs/toolkit";

import { ApiError, getApiErrorMessage } from "@/services/api";
import { appEnv } from "@/config/environment";
import { notificationService } from "@/services/notification.service";
import { appointmentService } from "@/services/appointment.service";
import { notificationLocalStorage } from "@/services/notificationLocalStorage";
import { notificationDeviceStorage } from "@/services/notificationDeviceStorage";
import * as Notifications from "expo-notifications";
import { trackNotificationRegistration, waitForNotificationRegistrations } from "@/services/notificationRegistrationLifecycle";
import type { RootState } from "@/store";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import { selectCurrentStaff } from "@/store/staff/staff.slice";
import { selectCurrentUser } from "@/store/user/user.slice";
import { canReceiveStaffNotification } from "@/utils/staffAccess";
import { isStaffExperienceUser } from "@/utils/routeResolver";
import { buildStaffAppointmentActivity } from "@/utils/staffAppointmentActivity";
import type {
  MarkAllNotificationsReadResponse,
  MarkNotificationReadResponse,
  NotificationsListResponse,
  RegisterDeviceRequest,
  RegisterDeviceResponse,
  UnregisterDeviceResponse,
  UnreadCountResponse,
} from "@/types/notification";

type RejectValue = { message: string };

const reject = (error: unknown): RejectValue => ({ message: getApiErrorMessage(error) });

const getLocalNotificationScope = (state: RootState) => JSON.stringify([
  selectCurrentUser(state)?.id ?? null,
  selectCurrentStaff(state)?.id ?? null,
  selectActiveBranchId(state) ?? null,
]);

export type FetchNotificationsArgs = {
  refresh?: boolean;
} | undefined;

export const hydrateRegisteredDeviceTokenThunk = createAsyncThunk<string | null>(
  "notification/hydrateRegisteredDeviceToken",
  async () => notificationDeviceStorage.getRegisteredToken(),
);

export const fetchNotificationsThunk = createAsyncThunk<
  NotificationsListResponse,
  FetchNotificationsArgs,
  { rejectValue: RejectValue; state: RootState }
>("notification/fetchNotifications", async (_args, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const user = selectCurrentUser(state);
    if (isStaffExperienceUser(user)) {
      const staff = selectCurrentStaff(state);
      if (!user || !staff) return { notifications: [] };
      const scope = getLocalNotificationScope(state);
      const [response, readIds, removedIds, serverNotifications] = await Promise.all([
        appointmentService.getStaffAppointments({ limit: Number.MAX_SAFE_INTEGER, page: 1, search: "", sort_by: "created_at", sort_order: "DESC" }, staff, selectActiveBranchId(state)),
        notificationLocalStorage.getReadIds(scope), notificationLocalStorage.getRemovedIds(scope),
        notificationService.getNotifications(selectActiveBranchId(state)),
      ]);
      if (getLocalNotificationScope(getState()) !== scope) throw new ApiError("Your staff session has changed. Please refresh.", 403);
      const removed = new Set(removedIds);
      const reminders = serverNotifications.notifications.filter(item => item.type === "attendance" && canReceiveStaffNotification(user, item))
        .map(item => ({ ...item, isRead: item.isRead || readIds.includes(item.id) }));
      return { notifications: [...reminders, ...buildStaffAppointmentActivity(response.appointments, staff, user.id, readIds)].filter(item => !removed.has(item.id)) };
    }
    const [response, removedIds] = await Promise.all([
      notificationService.getNotifications(selectActiveBranchId(state)),
      notificationLocalStorage.getRemovedIds(getLocalNotificationScope(state)),
    ]);
    const removed = new Set(removedIds);
    return { notifications: response.notifications.filter((notification) => !removed.has(notification.id) && canReceiveStaffNotification(selectCurrentUser(state), notification)) };
  } catch (error) {
    return rejectWithValue(reject(error));
  }
});

export const fetchUnreadCountThunk = createAsyncThunk<
  UnreadCountResponse,
  void,
  { rejectValue: RejectValue; state: RootState }
>("notification/fetchUnreadCount", async (_args, { dispatch, getState, rejectWithValue }) => {
  try {
    if (isStaffExperienceUser(selectCurrentUser(getState()))) {
      const response = await dispatch(fetchNotificationsThunk()).unwrap();
      return { count: response.notifications.filter(item => !item.isRead).length };
    }
    return await notificationService.getUnreadCount(selectActiveBranchId(getState()));
  } catch (error) {
    return rejectWithValue(reject(error));
  }
});

export const markNotificationReadThunk = createAsyncThunk<
  MarkNotificationReadResponse,
  string,
  { rejectValue: RejectValue; state: RootState }
>("notification/markRead", async (notificationId, { dispatch, getState, rejectWithValue }) => {
  try {
    const state = getState();
    if (isStaffExperienceUser(selectCurrentUser(state))) {
      const notification = state.notification.notifications.find(item => item.id === notificationId);
      if (!notification || !canReceiveStaffNotification(selectCurrentUser(state), notification)) throw new ApiError("Appointment activity unavailable.", 403);
      await notificationLocalStorage.markRead(getLocalNotificationScope(state), [notificationId]);
      void dispatch(fetchUnreadCountThunk());
      return { notification: { ...notification, isRead: true } };
    }
    const response = await notificationService.markAsRead(notificationId);

    void dispatch(fetchUnreadCountThunk());

    return response;
  } catch (error) {
    return rejectWithValue(reject(error));
  }
}, {
  condition: (notificationId, { getState }) =>
    !getState().notification.markingReadIds.includes(notificationId),
});

export const removeLocalNotificationThunk = createAsyncThunk<
  string,
  string,
  { rejectValue: RejectValue; state: RootState }
>("notification/removeLocal", async (notificationId, { dispatch, getState, rejectWithValue }) => {
  const state = getState();
  const scope = getLocalNotificationScope(state);
  try {
    const target = state.notification.notifications.find((notification) => notification.id === notificationId);
    if (target && !target.isRead) {
      await dispatch(markNotificationReadThunk(notificationId)).unwrap();
    }
    await notificationLocalStorage.remove(scope, notificationId);
    return notificationId;
  } catch (error) {
    return rejectWithValue(reject(error));
  }
}, {
  condition: (notificationId, { getState }) => {
    const state = getState().notification;
    return !state.removingIds.includes(notificationId) && !state.markingReadIds.includes(notificationId);
  },
});

export const markAllNotificationsReadThunk = createAsyncThunk<
  MarkAllNotificationsReadResponse,
  void,
  { rejectValue: RejectValue; state: RootState }
>("notification/markAllRead", async (_args, { dispatch, getState, rejectWithValue }) => {
  try {
    const state = getState();
    if (isStaffExperienceUser(selectCurrentUser(state))) {
      await notificationLocalStorage.markRead(getLocalNotificationScope(state), state.notification.notifications
        .filter(item => canReceiveStaffNotification(selectCurrentUser(state), item)).map(item => item.id));
      void dispatch(fetchUnreadCountThunk());
      return {};
    }
    const response = await notificationService.markAllAsRead();

    void dispatch(fetchUnreadCountThunk());

    return response;
  } catch (error) {
    return rejectWithValue(reject(error));
  }
});

const EXPECTED_REGISTER_DEVICE_ERROR_CODES = new Set(["NO_SALON_CONTEXT"]);

const isExpectedRegisterDeviceError = (error: unknown) => {
  if (error instanceof ApiError) {
    const responseData = error.responseData as { code?: string; error?: { code?: string } } | undefined;
    const errorCode = responseData?.code ?? responseData?.error?.code;
    return errorCode !== undefined && EXPECTED_REGISTER_DEVICE_ERROR_CODES.has(errorCode);
  }
  return false;
};

export const registerDeviceThunk = createAsyncThunk<
  RegisterDeviceResponse,
  RegisterDeviceRequest,
  { rejectValue: RejectValue; state: RootState }
>("notification/registerDevice", async (payload, { rejectWithValue }) => {
  try {
    console.log("[PushNotifications] notification.thunk entered");
    const token = payload.token.trim();

    if (!token) {
      console.warn("[PushNotifications] notification.thunk blocked empty token");
      return rejectWithValue({ message: "Expo push token is empty; device registration was skipped." });
    }

    return await trackNotificationRegistration(async () => {
      await notificationDeviceStorage.setRegisteredToken(token);
      const response = await notificationService.registerDevice({
        ...payload,
        token,
      });
      console.log("[PushNotifications] notification.thunk response received");
      return response;
    });
  } catch (error) {
    if (isExpectedRegisterDeviceError(error)) {
      console.log("[PushNotifications] Device registration deferred — no salon context (NO_SALON_CONTEXT).");
      return rejectWithValue({ message: "Salon context required; device registration deferred." });
    }
    return rejectWithValue(reject(error));
  }
});

const getNotificationDeviceContext = (state: RootState) => {
  const currentUser = selectCurrentUser(state);
  const currentStaff = selectCurrentStaff(state);

  return {
    app_env: appEnv,
    role: currentUser?.role ?? null,
    staff_id: currentStaff?.id ?? null,
    user_id: currentUser?.id ?? null,
  };
};

export const unregisterDeviceThunk = createAsyncThunk<
  UnregisterDeviceResponse,
  void,
  { rejectValue: RejectValue; state: RootState }
>("notification/unregisterDevice", async (_arg, { getState, rejectWithValue }) => {
  await waitForNotificationRegistrations();
  const state = getState();
  const deviceContext = getNotificationDeviceContext(state);

  try {
    const tokens = new Set([
      state.notification.registeredDeviceToken,
      await notificationDeviceStorage.getRegisteredToken(),
    ].filter((token): token is string => Boolean(token)));
    // Older sessions may have lost their local registration record while the
    // backend still holds this installation's token. Recover it without asking
    // for notification permission during logout.
    if (!tokens.size && (await Notifications.getPermissionsAsync()).granted) {
      const { getExpoPushToken } = await import("@/services/pushNotifications");
      tokens.add(await getExpoPushToken());
    }
    if (!tokens.size) {
      await notificationDeviceStorage.clearRegisteredToken();
      return {};
    }

    let response: UnregisterDeviceResponse = {};
    for (const token of tokens) {
      response = await notificationService.unregisterDevice({ ...deviceContext, token });
    }

    await notificationDeviceStorage.clearRegisteredToken();

    return response;
  } catch (error) {
    return rejectWithValue(reject(error));
  }
});
