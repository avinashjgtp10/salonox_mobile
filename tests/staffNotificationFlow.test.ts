import { configureStore } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchNotificationsThunk, fetchUnreadCountThunk, markAllNotificationsReadThunk, markNotificationReadThunk, registerDeviceThunk } from "@/middleware/notification/notification.thunk";
import { appointmentService } from "@/services/appointment.service";
import { notificationService } from "@/services/notification.service";
import reducer from "@/store/notification/notification.slice";
import type { AppDispatch } from "@/store";
import type { AppointmentListItem } from "@/types/appointment";

jest.mock("@react-native-async-storage/async-storage", () => jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("@/services/api", () => ({ ApiError: Error, getApiErrorMessage: (error: Error) => error.message }));
jest.mock("@/services/appointment.service", () => ({ appointmentService: { getStaffAppointments: jest.fn() } }));
jest.mock("@/services/notification.service", () => ({ notificationService: {
  getNotifications: jest.fn(), getUnreadCount: jest.fn(), markAsRead: jest.fn(), markAllAsRead: jest.fn(), registerDevice: jest.fn(),
} }));
jest.mock("@/services/notificationDeviceStorage", () => ({ notificationDeviceStorage: {} }));
jest.mock("@/services/notificationRegistrationLifecycle", () => ({}));
jest.mock("@/config/environment", () => ({ appEnv: "test" }));
jest.mock("@/store/branch/branch.slice", () => ({ selectActiveBranchId: () => "salon" }));
jest.mock("@/store/user/user.slice", () => ({ selectCurrentUser: () => ({ id: "user-self", role: "staff" }) }));
jest.mock("@/store/staff/staff.slice", () => ({ selectCurrentStaff: () => ({ id: "staff-self", userId: "user-self", name: "Shubham" }) }));

const appointment = (id: string, staffId: string) => ({
  id, staffId, staffName: "Shubham", clientName: "Client", serviceName: "Haircut", status: "Confirmed",
  createdAt: "2026-10-01T10:00:00+05:30", scheduledAt: "2026-10-02T10:00:00+05:30",
  raw: { staff_id: staffId },
}) as AppointmentListItem;
const setup = () => {
  const store = configureStore({ reducer: { notification: reducer } });
  return { store, dispatch: store.dispatch as unknown as AppDispatch };
};

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  jest.mocked(appointmentService.getStaffAppointments).mockResolvedValue({
    appointments: [appointment("own", "staff-self"), appointment("other", "staff-other")],
  } as Awaited<ReturnType<typeof appointmentService.getStaffAppointments>>);
});

test("staff activity and unread counts use own appointments without the salon notification API", async () => {
  const { dispatch, store } = setup();
  const feed = await dispatch(fetchNotificationsThunk()).unwrap();
  expect(feed.notifications.map(item => item.referenceId)).toEqual(["own"]);
  expect(await dispatch(fetchUnreadCountThunk()).unwrap()).toEqual({ count: 1 });
  expect(store.getState().notification.unreadCount).toBe(1);
  expect(notificationService.getNotifications).not.toHaveBeenCalled();
  expect(notificationService.getUnreadCount).not.toHaveBeenCalled();
});

test("staff mark-read is local and never changes web notification read state", async () => {
  const { dispatch } = setup();
  const feed = await dispatch(fetchNotificationsThunk()).unwrap();
  await dispatch(markNotificationReadThunk(feed.notifications[0].id)).unwrap();
  expect(await dispatch(fetchUnreadCountThunk()).unwrap()).toEqual({ count: 0 });
  expect(notificationService.markAsRead).not.toHaveBeenCalled();
});

test("staff mark-all-read remains local", async () => {
  const { dispatch } = setup();
  await dispatch(fetchNotificationsThunk()).unwrap();
  await dispatch(markAllNotificationsReadThunk()).unwrap();
  expect(await dispatch(fetchUnreadCountThunk()).unwrap()).toEqual({ count: 0 });
  expect(notificationService.markAllAsRead).not.toHaveBeenCalled();
});

test("staff never registers for the unchanged server's salon-wide pushes", async () => {
  const { dispatch } = setup();
  await expect(dispatch(registerDeviceThunk({ token: "ExpoPushToken[test]", platform: "android" })).unwrap()).rejects.toEqual({ message: "Staff appointment activity is available inside the app." });
  expect(notificationService.registerDevice).not.toHaveBeenCalled();
});
