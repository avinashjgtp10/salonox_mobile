import * as SecureStore from "expo-secure-store";
const options: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export const protectedTokenStorage = {
  async getItem(key: string): Promise<string | null> {
    return SecureStore.getItemAsync(key, options);
  },
  async setItem(key: string, value: string): Promise<void> {
    // Let failures propagate: never fall back to plaintext token storage.
    await SecureStore.setItemAsync(key, value, options);
  },
};
