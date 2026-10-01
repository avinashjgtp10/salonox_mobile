import AsyncStorage from "@react-native-async-storage/async-storage";

import { notificationLocalStorage } from "@/services/notificationLocalStorage";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("@/config/environment", () => ({ appEnv: "qa" }));

beforeEach(async () => { await AsyncStorage.clear(); });

test("removed notifications persist and are isolated by account and branch", async () => {
  await notificationLocalStorage.remove("owner-branch-a", "notification-1");
  expect(await notificationLocalStorage.getRemovedIds("owner-branch-a")).toEqual(["notification-1"]);
  expect(await notificationLocalStorage.getRemovedIds("owner-branch-b")).toEqual([]);
});

test("rapid removals preserve both notifications without duplicates", async () => {
  await Promise.all([
    notificationLocalStorage.remove("owner", "first"),
    notificationLocalStorage.remove("owner", "second"),
    notificationLocalStorage.remove("owner", "first"),
  ]);
  expect(await notificationLocalStorage.getRemovedIds("owner")).toEqual(["first", "second"]);
});

test("damaged local data does not break loading or subsequent removals", async () => {
  await AsyncStorage.setItem("salonox.notifications.qa.removed.owner", "{broken");
  expect(await notificationLocalStorage.getRemovedIds("owner")).toEqual([]);
  await notificationLocalStorage.remove("owner", "notification-1");
  expect(await notificationLocalStorage.getRemovedIds("owner")).toEqual(["notification-1"]);
});
