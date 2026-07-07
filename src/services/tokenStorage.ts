import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AuthTokens, AuthUser } from "@/types/auth";
import { normalizeAuthUser } from "@/utils/authUser";

const ACCESS_TOKEN_KEY = "salonox.accessToken";
const REFRESH_TOKEN_KEY = "salonox.refreshToken";
const AUTH_USER_KEY = "salonox.user";

export const tokenStorage = {
  async getAccessToken() {
    return AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  },

  async getRefreshToken() {
    return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  },

  async getStoredUser() {
    const rawUser = await AsyncStorage.getItem(AUTH_USER_KEY);

    if (!rawUser) {
      return null;
    }

    try {
      const parsedUser = normalizeAuthUser(JSON.parse(rawUser));

      return parsedUser;
    } catch {
      await AsyncStorage.removeItem(AUTH_USER_KEY);
      return null;
    }
  },

  async getSession() {
    const [accessToken, refreshToken, user] = await Promise.all([
      this.getAccessToken(),
      this.getRefreshToken(),
      this.getStoredUser(),
    ]);

    return {
      accessToken,
      refreshToken,
      user,
    };
  },

  async setTokens(tokens: AuthTokens) {
    await Promise.all([
      AsyncStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken),
      AsyncStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken),
    ]);
  },

  async setStoredUser(user: AuthUser) {
    const normalizedUser = normalizeAuthUser(user);

    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(normalizedUser));
  },

  async updateAccessToken(accessToken: string) {
    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  },

  async clearStoredUser() {
    await AsyncStorage.removeItem(AUTH_USER_KEY);
  },

  async clearTokens() {
    await this.clearSession();
  },

  async clearSession() {
    await Promise.all([
      AsyncStorage.removeItem(ACCESS_TOKEN_KEY),
      AsyncStorage.removeItem(REFRESH_TOKEN_KEY),
      AsyncStorage.removeItem(AUTH_USER_KEY),
    ]);
  },
};
