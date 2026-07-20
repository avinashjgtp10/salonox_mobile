import { createAsyncThunk } from "@reduxjs/toolkit";

import { getApiErrorMessage } from "@/services/api";
import { notificationService } from "@/services/notification.service";
import { notificationDeviceStorage } from "@/services/notificationDeviceStorage";
import type { RootState } from "@/store";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
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
export const registerDeviceThunk = createAsyncThunk<
  RegisterDeviceResponse,
  RegisterDeviceRequest,
  { rejectValue: RejectValue; state: RootState }
>("notification/registerDevice", async (payload, { rejectWithValue }) => {
  try {
    const response = await notificationService.registerDevice(payload);

    await notificationDeviceStorage.setRegisteredToken(payload.token);

    return response;
  } catch (error) {
    return rejectWithValue(reject(error));
  }
});

export const unregisterDeviceThunk = createAsyncThunk<
  UnregisterDeviceResponse,
  void,
  { rejectValue: RejectValue; state: RootState }
>("notification/unregisterDevice", async (_arg, { getState, rejectWithValue }) => {
  const storedToken =
    getState().notification.registeredDeviceToken ??
    (await notificationDeviceStorage.getRegisteredToken());

  try {
    if (!storedToken) {
      await notificationDeviceStorage.clearRegisteredToken();
      return {};
    }

    const response = await notificationService.unregisterDevice({ token: storedToken });

    await notificationDeviceStorage.clearRegisteredToken();

    return response;
  } catch (error) {
    await notificationDeviceStorage.clearRegisteredToken();

    return rejectWithValue(reject(error));
  }
});
