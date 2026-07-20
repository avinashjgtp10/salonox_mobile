import { createSlice } from "@reduxjs/toolkit";

import {
  fetchNotificationsThunk,
  fetchUnreadCountThunk,
  hydrateRegisteredDeviceTokenThunk,
  markAllNotificationsReadThunk,
  markNotificationReadThunk,
  registerDeviceThunk,
  unregisterDeviceThunk,
} from "@/middleware/notification/notification.thunk";
import type { RootState } from "@/store";
import type { NotificationItem } from "@/types/notification";

type ResourceStatus = "idle" | "loading" | "succeeded" | "failed";

type NotificationState = {
  listError: string | null;
  listRefreshing: boolean;
  listStatus: ResourceStatus;
  markingAllRead: boolean;
  markingReadIds: string[];
  notifications: NotificationItem[];
  // The device token most recently confirmed registered with the backend —
  // lets the push-setup hook skip a redundant network call when the token
  // hasn't actually changed since last app launch.
  registeredDeviceToken: string | null;
  registerDeviceError: string | null;
  registerDeviceStatus: ResourceStatus;
  unreadCount: number;
  unreadCountStatus: ResourceStatus;
};

const initialState: NotificationState = {
  listError: null,
  listRefreshing: false,
  listStatus: "idle",
  markingAllRead: false,
  markingReadIds: [],
  notifications: [],
  registeredDeviceToken: null,
  registerDeviceError: null,
  registerDeviceStatus: "idle",
  unreadCount: 0,
  unreadCountStatus: "idle",
};

const notificationSlice = createSlice({
  name: "notification",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(hydrateRegisteredDeviceTokenThunk.fulfilled, (state, action) => {
        state.registeredDeviceToken = action.payload;
      })
      .addCase(fetchNotificationsThunk.pending, (state, action) => {
        const hasExistingData = state.notifications.length > 0;
        const isRefresh = Boolean(action.meta.arg?.refresh);

        state.listError = null;
        state.listRefreshing = isRefresh;
        state.listStatus = hasExistingData || isRefresh ? "succeeded" : "loading";
      })
      .addCase(fetchNotificationsThunk.fulfilled, (state, action) => {
        state.notifications = action.payload.notifications;
        state.listError = null;
        state.listRefreshing = false;
        state.listStatus = "succeeded";
      })
      .addCase(fetchNotificationsThunk.rejected, (state, action) => {
        const hasExistingData = state.notifications.length > 0;

        state.listError = action.payload?.message ?? action.error.message ?? "Unable to load notifications.";
        state.listRefreshing = false;
        state.listStatus = hasExistingData ? "succeeded" : "failed";
      })
      .addCase(fetchUnreadCountThunk.pending, (state) => {
        state.unreadCountStatus = state.unreadCountStatus === "idle" ? "loading" : state.unreadCountStatus;
      })
      .addCase(fetchUnreadCountThunk.fulfilled, (state, action) => {
        state.unreadCount = action.payload.count;
        state.unreadCountStatus = "succeeded";
      })
      .addCase(fetchUnreadCountThunk.rejected, (state) => {
        state.unreadCountStatus = "failed";
      })
      .addCase(markNotificationReadThunk.pending, (state, action) => {
        const notificationId = action.meta.arg;
        const target = state.notifications.find((notification) => notification.id === notificationId);

        // Optimistic: reflect the read state immediately rather than waiting
        // on the round-trip, per the "immediately reflect" requirement.
        if (target && !target.isRead) {
          target.isRead = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }

        state.markingReadIds = [...state.markingReadIds, notificationId];
      })
      .addCase(markNotificationReadThunk.fulfilled, (state, action) => {
        state.markingReadIds = state.markingReadIds.filter((id) => id !== action.meta.arg);
      })
      .addCase(markNotificationReadThunk.rejected, (state, action) => {
        const notificationId = action.meta.arg;
        const target = state.notifications.find((notification) => notification.id === notificationId);

        // Roll back the optimistic update — the request never actually
        // succeeded, so the badge/list should not claim it's read.
        if (target) {
          target.isRead = false;
          state.unreadCount += 1;
        }

        state.markingReadIds = state.markingReadIds.filter((id) => id !== notificationId);
      })
      .addCase(markAllNotificationsReadThunk.pending, (state) => {
        state.markingAllRead = true;
        state.notifications.forEach((notification) => {
          notification.isRead = true;
        });
        state.unreadCount = 0;
      })
      .addCase(markAllNotificationsReadThunk.fulfilled, (state) => {
        state.markingAllRead = false;
      })
      .addCase(markAllNotificationsReadThunk.rejected, (state) => {
        state.markingAllRead = false;
        // Can't safely un-mark individual items post-hoc (we didn't snapshot
        // prior state) — resync from the server instead of guessing.
      })
      .addCase(registerDeviceThunk.pending, (state) => {
        state.registerDeviceError = null;
        state.registerDeviceStatus = "loading";
      })
      .addCase(registerDeviceThunk.fulfilled, (state, action) => {
        state.registeredDeviceToken = action.meta.arg.token;
        state.registerDeviceError = null;
        state.registerDeviceStatus = "succeeded";
      })
      .addCase(registerDeviceThunk.rejected, (state, action) => {
        state.registerDeviceError = action.payload?.message ?? action.error.message ?? "Unable to register this device for push notifications.";
        state.registerDeviceStatus = "failed";
      })
      .addCase(unregisterDeviceThunk.pending, (state) => {
        state.registerDeviceError = null;
        state.registerDeviceStatus = "loading";
      })
      .addCase(unregisterDeviceThunk.fulfilled, (state) => {
        state.registeredDeviceToken = null;
        state.registerDeviceError = null;
        state.registerDeviceStatus = "idle";
      })
      .addCase(unregisterDeviceThunk.rejected, (state, action) => {
        state.registeredDeviceToken = null;
        state.registerDeviceError = action.payload?.message ?? action.error.message ?? "Unable to unregister this device for push notifications.";
        state.registerDeviceStatus = "idle";
      });
  },
});

export const selectNotifications = (state: RootState) => state.notification.notifications;
export const selectNotificationsListStatus = (state: RootState) => state.notification.listStatus;
export const selectNotificationsListLoading = (state: RootState) => state.notification.listStatus === "loading";
export const selectNotificationsListRefreshing = (state: RootState) => state.notification.listRefreshing;
export const selectNotificationsListError = (state: RootState) => state.notification.listError;

export const selectUnreadCount = (state: RootState) => state.notification.unreadCount;
export const selectUnreadCountStatus = (state: RootState) => state.notification.unreadCountStatus;

export const selectMarkingReadIds = (state: RootState) => state.notification.markingReadIds;
export const selectMarkingAllRead = (state: RootState) => state.notification.markingAllRead;

export const selectRegisteredDeviceToken = (state: RootState) => state.notification.registeredDeviceToken;
export const selectRegisterDeviceStatus = (state: RootState) => state.notification.registerDeviceStatus;
export const selectRegisterDeviceError = (state: RootState) => state.notification.registerDeviceError;

export default notificationSlice.reducer;
