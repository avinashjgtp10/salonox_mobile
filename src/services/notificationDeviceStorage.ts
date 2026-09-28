import AsyncStorage from "@react-native-async-storage/async-storage";

import { appEnv } from "@/config/environment";

const LEGACY_REGISTERED_DEVICE_TOKEN_KEY = "salonox.notifications.registeredDeviceToken";
const REGISTERED_DEVICE_TOKEN_KEY = `salonox.notifications.${appEnv}.registeredDeviceToken`;
const INSTALLATION_KEY = `salonox.notifications.${appEnv}.installationId`;
let installationPromise: Promise<string> | null = null;

export const notificationDeviceStorage = {
  getInstallationId(): Promise<string> {
    installationPromise ??= (async () => {
      const existing = await AsyncStorage.getItem(INSTALLATION_KEY);
      if (existing) return existing;
      const id = `${appEnv}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
      await AsyncStorage.setItem(INSTALLATION_KEY, id);
      return id;
    })().catch((error) => { installationPromise = null; throw error; });
    return installationPromise;
  },
  async clearRegisteredToken() {
    await Promise.all([
      AsyncStorage.removeItem(REGISTERED_DEVICE_TOKEN_KEY),
      AsyncStorage.removeItem(LEGACY_REGISTERED_DEVICE_TOKEN_KEY),
    ]);
  },

  async getRegisteredToken() {
    const scopedToken = await AsyncStorage.getItem(REGISTERED_DEVICE_TOKEN_KEY);

    if (scopedToken) {
      return scopedToken;
    }

    return AsyncStorage.getItem(LEGACY_REGISTERED_DEVICE_TOKEN_KEY);
  },

  async setRegisteredToken(token: string) {
    await AsyncStorage.setItem(REGISTERED_DEVICE_TOKEN_KEY, token);
  },
};
