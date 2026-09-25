// Keep the existing web persistence behavior. Metro selects this file on web;
// Android and iOS use tokenStorage.ts and Expo SecureStore instead.
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
    if (!rawUser) return null;
    try {
      return normalizeAuthUser(JSON.parse(rawUser));
    } catch {
      await AsyncStorage.removeItem(AUTH_USER_KEY);
      return null;
    }
  },
  async getSession() {
    const [accessToken, refreshToken, user] = await Promise.all([
      this.getAccessToken(), this.getRefreshToken(), this.getStoredUser(),
    ]);
    return { accessToken, refreshToken, user };
  },
  async setTokens(tokens: AuthTokens) {
    await Promise.all([
      AsyncStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken),
      AsyncStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken),
    ]);
  },
  async setStoredUser(user: AuthUser) {
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(normalizeAuthUser(user)));
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
