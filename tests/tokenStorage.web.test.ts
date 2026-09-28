import AsyncStorage from "@react-native-async-storage/async-storage";
import { tokenStorage } from "../src/services/tokenStorage.web";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("expo-secure-store", () => {
  throw new Error("Web storage must not import the native SecureStore module");
});

beforeEach(async () => { await AsyncStorage.clear(); });

test("web restores existing persisted sessions without a migration", async () => {
  await AsyncStorage.setItem("salonox.accessToken", "existing-access");
  await AsyncStorage.setItem("salonox.refreshToken", "existing-refresh");
  expect(await tokenStorage.getSession()).toMatchObject({
    accessToken: "existing-access", refreshToken: "existing-refresh",
  });
  expect(await AsyncStorage.getItem("salonox.accessToken")).toBe("existing-access");
});

test("web login persists tokens and a fresh module instance can restore them", async () => {
  await tokenStorage.setTokens({ accessToken: "access", refreshToken: "refresh" });
  expect(await AsyncStorage.getItem("salonox.accessToken")).toBe("access");
  expect(await AsyncStorage.getItem("salonox.refreshToken")).toBe("refresh");
  let restored: typeof tokenStorage;
  jest.isolateModules(() => {
    // Share the persistent backing store while recreating the service module.
    jest.doMock("@react-native-async-storage/async-storage", () => AsyncStorage);
    restored = require("../src/services/tokenStorage.web").tokenStorage;
  });
  expect(await restored!.getSession()).toMatchObject({ accessToken: "access", refreshToken: "refresh" });
});

test("web token refresh preserves the refresh token and logout removes the session", async () => {
  await tokenStorage.setTokens({ accessToken: "access", refreshToken: "refresh" });
  await tokenStorage.setStoredUser({ id: "user-1", email: "test@example.com", role: "owner" });
  await tokenStorage.updateAccessToken("updated-access");
  expect(await tokenStorage.getSession()).toMatchObject({ accessToken: "updated-access", refreshToken: "refresh" });
  await tokenStorage.clearSession();
  expect(await tokenStorage.getSession()).toEqual({ accessToken: null, refreshToken: null, user: null });
});
