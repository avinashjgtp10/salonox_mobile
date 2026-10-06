import { configureStore } from "@reduxjs/toolkit";

import { fetchNotificationsThunk, markNotificationReadThunk, removeLocalNotificationThunk } from "@/middleware/notification/notification.thunk";
import { notificationService } from "@/services/notification.service";
import { notificationLocalStorage } from "@/services/notificationLocalStorage";
import type { AppDispatch } from "@/store";
import reducer from "@/store/notification/notification.slice";
import type { NotificationItem } from "@/types/notification";

jest.mock("@/services/api", () => ({
  ApiError: Error,
  getApiErrorMessage: (error: Error) => error.message,
}));
jest.mock("@/services/notification.service", () => ({ notificationService: { markAsRead: jest.fn(), getUnreadCount: jest.fn() } }));
jest.mock("@/services/notificationLocalStorage", () => ({ notificationLocalStorage: { remove: jest.fn() } }));
jest.mock("@/services/notificationDeviceStorage", () => ({ notificationDeviceStorage: {} }));
jest.mock("@/services/notificationRegistrationLifecycle", () => ({}));
jest.mock("@/config/environment", () => ({ appEnv: "development" }));
jest.mock("@/store/branch/branch.slice", () => ({ selectActiveBranchId: () => "branch-1" }));
jest.mock("@/store/user/user.slice", () => ({ selectCurrentUser: () => ({ id: "user-1" }) }));
jest.mock("@/store/staff/staff.slice", () => ({ selectCurrentStaff: () => null }));

const item: NotificationItem = {
  id: "n1", isRead: false, title: "Appointment", body: null,
  createdAt: null, createdDateLabel: "", referenceId: null, type: "appointment",
};
const setup = () => {
  const store = configureStore({ reducer: { notification: reducer } });
  store.dispatch(fetchNotificationsThunk.fulfilled({ notifications: [item] }, "load", undefined));
  return { store, dispatch: store.dispatch as unknown as AppDispatch };
};

beforeEach(() => {
  jest.resetAllMocks();
  (notificationService.getUnreadCount as jest.Mock).mockResolvedValue({ count: 0 });
  (notificationLocalStorage.remove as jest.Mock).mockResolvedValue(undefined);
});

test("right swipe waits for mark-read success and rejects a duplicate action", async () => {
  let resolveRead!: (value: { notification: null }) => void;
  (notificationService.markAsRead as jest.Mock).mockImplementation(() => new Promise(resolve => { resolveRead = resolve; }));
  const { store, dispatch } = setup();
  const first = dispatch(removeLocalNotificationThunk(item.id));
  expect(store.getState().notification.removingIds).toEqual([item.id]);
  expect(notificationLocalStorage.remove).not.toHaveBeenCalled();
  const duplicate = await dispatch(removeLocalNotificationThunk(item.id));
  expect(removeLocalNotificationThunk.rejected.match(duplicate) && duplicate.meta.condition).toBe(true);
  expect(notificationService.markAsRead).toHaveBeenCalledTimes(1);
  resolveRead({ notification: null });
  await first.unwrap();
  expect(store.getState().notification.notifications).toEqual([]);
  expect(store.getState().notification.removingIds).toEqual([]);
  store.dispatch(fetchNotificationsThunk.fulfilled({ notifications: [item] }, "old-refresh", undefined));
  expect(store.getState().notification.notifications).toEqual([]);
});

test("failed mark-read keeps the notification available and clears pending actions", async () => {
  (notificationService.markAsRead as jest.Mock).mockRejectedValue(new Error("offline"));
  const { store, dispatch } = setup();
  await expect(dispatch(removeLocalNotificationThunk(item.id)).unwrap()).rejects.toEqual({ message: "offline" });
  expect(notificationLocalStorage.remove).not.toHaveBeenCalled();
  expect(store.getState().notification.notifications[0].isRead).toBe(false);
  expect(store.getState().notification.removingIds).toEqual([]);
  expect(store.getState().notification.markingReadIds).toEqual([]);
});

test("right swipe cannot remove a notification while left swipe is still pending", async () => {
  let resolveRead!: (value: { notification: null }) => void;
  (notificationService.markAsRead as jest.Mock).mockImplementation(() => new Promise(resolve => { resolveRead = resolve; }));
  const { dispatch } = setup();
  const pendingRead = dispatch(markNotificationReadThunk(item.id));
  const removal = await dispatch(removeLocalNotificationThunk(item.id));
  expect(removeLocalNotificationThunk.rejected.match(removal) && removal.meta.condition).toBe(true);
  expect(notificationLocalStorage.remove).not.toHaveBeenCalled();
  resolveRead({ notification: null });
  await pendingRead.unwrap();
});
