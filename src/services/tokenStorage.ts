import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AuthTokens, AuthUser } from "@/types/auth";
import { normalizeAuthUser } from "@/utils/authUser";
import { protectedTokenStorage } from "@/services/protectedTokenStorage";
import { createTokenVault } from "@/services/tokenVault";

const AUTH_USER_KEY = "salonox.user";
const vault = createTokenVault(protectedTokenStorage, AsyncStorage);

export const tokenStorage = {
  async getAccessToken() {
    return (await vault.getTokens()).accessToken;
  },

  async getRefreshToken() {
    return (await vault.getTokens()).refreshToken;
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
    const [tokens, user] = await Promise.all([
      vault.getTokens(),
      this.getStoredUser(),
    ]);

    return {
      ...tokens,
      user,
    };
  },

  async setTokens(tokens: AuthTokens) {
    await vault.setTokens(tokens);
  },

  async setStoredUser(user: AuthUser) {
    const normalizedUser = normalizeAuthUser(user);

    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(normalizedUser));
  },

  async updateAccessToken(accessToken: string) {
    await vault.updateAccessToken(accessToken);
  },

  async clearStoredUser() {
    await AsyncStorage.removeItem(AUTH_USER_KEY);
  },

  async clearTokens() {
    await this.clearSession();
  },

  async clearSession() {
    await Promise.all([
      vault.clear(),
      AsyncStorage.removeItem(AUTH_USER_KEY),
    ]);
  },
};
