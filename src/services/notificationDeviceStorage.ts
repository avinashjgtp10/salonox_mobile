import AsyncStorage from "@react-native-async-storage/async-storage";

import { appEnv } from "@/config/environment";

const LEGACY_REGISTERED_DEVICE_TOKEN_KEY = "salonox.notifications.registeredDeviceToken";
const REGISTERED_DEVICE_TOKEN_KEY = `salonox.notifications.${appEnv}.registeredDeviceToken`;

export const notificationDeviceStorage = {
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
