import { createAsyncThunk } from "@reduxjs/toolkit";

import { ApiError, getApiErrorMessage } from "@/services/api";
import { appEnv } from "@/config/environment";
import { notificationService } from "@/services/notification.service";
import { notificationDeviceStorage } from "@/services/notificationDeviceStorage";
import type { RootState } from "@/store";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import { selectCurrentStaff } from "@/store/staff/staff.slice";
import { selectCurrentUser } from "@/store/user/user.slice";
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
    return await notificationService.getNotifications(selectActiveBranchId(getState()));
  } catch (error) {
    return rejectWithValue(reject(error));
  }
});

export const fetchUnreadCountThunk = createAsyncThunk<
  UnreadCountResponse,
  void,
  { rejectValue: RejectValue; state: RootState }
>("notification/fetchUnreadCount", async (_args, { getState, rejectWithValue }) => {
  try {
    return await notificationService.getUnreadCount(selectActiveBranchId(getState()));
  } catch (error) {
    return rejectWithValue(reject(error));
  }
});

export const markNotificationReadThunk = createAsyncThunk<
  MarkNotificationReadResponse,
  string,
  { rejectValue: RejectValue; state: RootState }
>("notification/markRead", async (notificationId, { dispatch, rejectWithValue }) => {
  try {
    const response = await notificationService.markAsRead(notificationId);

    void dispatch(fetchUnreadCountThunk());

    return response;
  } catch (error) {
    return rejectWithValue(reject(error));
  }
});

export const markAllNotificationsReadThunk = createAsyncThunk<
  MarkAllNotificationsReadResponse,
  void,
  { rejectValue: RejectValue; state: RootState }
>("notification/markAllRead", async (_args, { dispatch, rejectWithValue }) => {
  try {
    const response = await notificationService.markAllAsRead();

    void dispatch(fetchUnreadCountThunk());

    return response;
  } catch (error) {
    return rejectWithValue(reject(error));
  }
});

// Fire-and-forget from the caller's perspective (push registration should
// never block login or surface an error banner) — still a real thunk so its
// pending/failed state is visible in Redux devtools and other slices can
// react to it if needed later.
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

    const response = await notificationService.registerDevice({
      ...payload,
      token,
    });

    console.log("[PushNotifications] notification.thunk response received");

    await notificationDeviceStorage.setRegisteredToken(token);

    return response;
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
  const state = getState();
  const storedToken =
    state.notification.registeredDeviceToken ??
    (await notificationDeviceStorage.getRegisteredToken());
  const deviceContext = getNotificationDeviceContext(state);

  try {
    if (!storedToken) {
      await notificationDeviceStorage.clearRegisteredToken();
      return {};
    }

    const response = await notificationService.unregisterDevice({
      ...deviceContext,
      token: storedToken,
    });

    await notificationDeviceStorage.clearRegisteredToken();

    return response;
  } catch (error) {
    await notificationDeviceStorage.clearRegisteredToken();

    return rejectWithValue(reject(error));
  }
});
