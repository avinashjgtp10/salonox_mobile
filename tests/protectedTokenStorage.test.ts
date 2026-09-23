import * as SecureStore from "expo-secure-store";
import { protectedTokenStorage } from "../src/services/protectedTokenStorage";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 6,
}));

test("native tokens use protected storage with device-only accessibility", async () => {
  jest.mocked(SecureStore.getItemAsync).mockResolvedValue("protected-record");
  await protectedTokenStorage.setItem("key", "protected-record");
  expect(await protectedTokenStorage.getItem("key")).toBe("protected-record");
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith("key", "protected-record", {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
});

test("native storage failure rejects instead of silently using an insecure fallback", async () => {
  jest.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error("keychain error"));
  await expect(protectedTokenStorage.setItem("key", "record")).rejects.toThrow("keychain error");
});
