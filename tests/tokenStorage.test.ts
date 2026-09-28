import AsyncStorage from "@react-native-async-storage/async-storage";
import { tokenStorage } from "../src/services/tokenStorage";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("@/services/protectedTokenStorage", () => {
  let value: string | null = null;
  return { protectedTokenStorage: {
    getItem: async () => value,
    setItem: async (_key: string, next: string) => { value = next; },
  } };
});

beforeEach(async () => { await tokenStorage.clearSession(); });

test("login persists a session without placing either token in AsyncStorage", async () => {
  await tokenStorage.setTokens({ accessToken: "access", refreshToken: "refresh" });
  await tokenStorage.setStoredUser({ id: "user-1", email: "test@example.com", role: "owner", salonId: "salon-1" });
  expect(await tokenStorage.getSession()).toMatchObject({
    accessToken: "access", refreshToken: "refresh", user: { id: "user-1", salonId: "salon-1" },
  });
  expect(await AsyncStorage.getItem("salonox.accessToken")).toBeNull();
  expect(await AsyncStorage.getItem("salonox.refreshToken")).toBeNull();
  expect(AsyncStorage.setItem).not.toHaveBeenCalledWith("salonox.accessToken", expect.anything());
});

test("logout clears the protected tokens and cached user", async () => {
  await tokenStorage.setTokens({ accessToken: "access", refreshToken: "refresh" });
  await tokenStorage.setStoredUser({ id: "user-1", email: "test@example.com", role: "owner" });
  await tokenStorage.clearTokens();
  expect(await tokenStorage.getSession()).toEqual({ accessToken: null, refreshToken: null, user: null });
});

test("malformed cached profile does not crash session restoration", async () => {
  await AsyncStorage.setItem("salonox.user", "{broken json");
  expect(await tokenStorage.getStoredUser()).toBeNull();
  expect(await AsyncStorage.getItem("salonox.user")).toBeNull();
});
