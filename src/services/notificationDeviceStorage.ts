import AsyncStorage from "@react-native-async-storage/async-storage";

const REGISTERED_DEVICE_TOKEN_KEY = "salonox.notifications.registeredDeviceToken";

export const notificationDeviceStorage = {
  async clearRegisteredToken() {
    await AsyncStorage.removeItem(REGISTERED_DEVICE_TOKEN_KEY);
  },

  async getRegisteredToken() {
    return AsyncStorage.getItem(REGISTERED_DEVICE_TOKEN_KEY);
  },

  async setRegisteredToken(token: string) {
    await AsyncStorage.setItem(REGISTERED_DEVICE_TOKEN_KEY, token);
  },
};
