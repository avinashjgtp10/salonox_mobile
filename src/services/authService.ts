import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { ApiError, API_BASE_URL, api } from "@/services/api";
import { USER } from "@/services/api/endpoints";
import { logAuthEvent } from "@/services/authSession";
import { timeStartup } from "@/services/startupPerformance";
import { tokenStorage } from "@/services/tokenStorage";
import type {
  ApiResponse,
  AuthUser,
  ChangePasswordRequest,
  DeleteAccountRequest,
  EmailOtpSendRequest,
  EmailOtpVerifyRequest,
  EmailOtpVerifyResponseData,
  ForgotPasswordResetRequest,
  ForgotPasswordSendOtpRequest,
  ForgotPasswordVerifyOtpRequest,
  ForgotPasswordVerifyOtpResponseData,
  GoogleAuthResult,
  LoginCredentials,
  LoginResponseData,
  RefreshTokenResponseData,
  RegisterCredentials,
  RegisterResponseData,
} from "@/types/auth";
import { normalizeAuthUser } from "@/utils/authUser";

const GOOGLE_REDIRECT_PATH = "auth/google";

const getFirstParam = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) ?? undefined;

export const authService = {
  async login(credentials: LoginCredentials) {
    const response = await timeStartup("Login API", () =>
      api.post<ApiResponse<LoginResponseData>>("/auth/login", credentials),
    );
    console.log("[Auth Debug] Login response:", response.data);
    const authData: LoginResponseData = {
      ...response.data.data,
      user: normalizeAuthUser(response.data.data.user),
    };

    await timeStartup("Token storage", async () => {
      await tokenStorage.setTokens({
        accessToken: authData.accessToken,
        refreshToken: authData.refreshToken,
      });
      console.log("[Auth Debug] Saved access token:", authData.accessToken);
      console.log("[Auth Debug] Saved refresh token:", authData.refreshToken);
      await tokenStorage.clearStoredUser();
    });

    logAuthEvent("login_success", {
      userId: authData.user.id,
    });

    return authData;
  },

  async register(credentials: RegisterCredentials) {
    const response = await api.post<ApiResponse<RegisterResponseData>>(
      "/auth/register",
      credentials,
    );
    const authData: RegisterResponseData = {
      ...response.data.data,
      user: normalizeAuthUser(response.data.data.user),
    };

    await tokenStorage.setTokens({
      accessToken: authData.accessToken,
      refreshToken: authData.refreshToken,
    });
    await tokenStorage.clearStoredUser();

    logAuthEvent("register_success", {
      userId: authData.user.id,
    });

    return authData;
  },

  async logout(tokens?: { accessToken?: string | null; refreshToken?: string | null }) {
    const refreshToken = tokens?.refreshToken ?? (await tokenStorage.getRefreshToken());
    const payload = { refreshToken };
    const config = tokens?.accessToken
      ? { headers: { Authorization: `Bearer ${tokens.accessToken}` } }
      : undefined;

    try {
      await api.post<ApiResponse<{ message?: string }>>("/auth/logout", payload, config);
    } finally {
      await tokenStorage.clearSession();
      logAuthEvent("logout_completed");
    }
  },

  async getCurrentUser() {
    const response = await api.get<ApiResponse<AuthUser>>(USER.ME);

    const normalizedUser = normalizeAuthUser(response.data.data);

    return normalizedUser;
  },

  async refreshToken() {
    const refreshToken = await tokenStorage.getRefreshToken();

    if (!refreshToken) {
      await tokenStorage.clearSession();
      throw new Error("No refresh token is available.");
    }

    const response = await api.post<ApiResponse<RefreshTokenResponseData>>("/auth/refresh", {
      refreshToken,
    });
    const nextTokens = response.data.data;

    await tokenStorage.setTokens({
      accessToken: nextTokens.accessToken,
      refreshToken: nextTokens.refreshToken ?? refreshToken,
    });

    logAuthEvent("manual_refresh_success");

    return nextTokens;
  },

  async sendForgotPasswordOtp(payload: ForgotPasswordSendOtpRequest) {
    const response = await api.post<ApiResponse<unknown>>(
      "/auth/forgot-password/send-otp",
      payload,
    );

    return {
      data: response.data.data,
      message: response.data.message ?? "We sent a verification code to your email.",
    };
  },

  async verifyForgotPasswordOtp(payload: ForgotPasswordVerifyOtpRequest) {
    const response = await api.post<ApiResponse<ForgotPasswordVerifyOtpResponseData>>(
      "/auth/forgot-password/verify-otp",
      payload,
    );

    return {
      data: response.data.data,
      message: response.data.message ?? "Your verification code has been confirmed.",
    };
  },

  async resetForgotPassword(payload: ForgotPasswordResetRequest) {
    const response = await api.post<ApiResponse<unknown>>(
      "/auth/forgot-password/reset",
      payload,
    );

    return {
      data: response.data.data,
      message: response.data.message ?? "Your password has been reset successfully.",
    };
  },

  async logoutAll(tokens?: { accessToken?: string | null }) {
    const config = tokens?.accessToken
      ? { headers: { Authorization: `Bearer ${tokens.accessToken}` } }
      : undefined;

    try {
      await api.post<ApiResponse<{ message?: string }>>("/auth/logout-all", undefined, config);
    } finally {
      await tokenStorage.clearSession();
      logAuthEvent("logout_all_completed");
    }
  },

  async deleteAccount(payload?: DeleteAccountRequest) {
    try {
      await api.delete<ApiResponse<{ message?: string }>>("/auth/account", {
        ...(payload ? { data: payload } : {}),
      });
    } finally {
      await tokenStorage.clearSession();
      logAuthEvent("delete_account_completed");
    }
  },

  async sendEmailOtp(payload: EmailOtpSendRequest) {
    const response = await api.post<ApiResponse<unknown>>("/auth/send-email-otp", payload);

    return {
      data: response.data.data,
      message: response.data.message ?? "We sent a verification code to your email.",
    };
  },

  async verifyEmailOtp(payload: EmailOtpVerifyRequest) {
    const response = await api.post<ApiResponse<EmailOtpVerifyResponseData>>(
      "/auth/verify-email-otp",
      payload,
    );

    return {
      data: response.data.data,
      message: response.data.message ?? "Your email has been verified.",
    };
  },

  async loginWithGoogle(): Promise<GoogleAuthResult> {
    const redirectUri = Linking.createURL(GOOGLE_REDIRECT_PATH);
    const startUrl = `${API_BASE_URL}/auth/google/start?redirect_uri=${encodeURIComponent(
      redirectUri,
    )}`;

    const result = await WebBrowser.openAuthSessionAsync(startUrl, redirectUri);

    if (result.type === "cancel" || result.type === "dismiss") {
      throw new ApiError("Google sign-in was cancelled.");
    }

    if (result.type !== "success" || !result.url) {
      throw new ApiError("Google sign-in could not be completed. Please try again.");
    }

    const { queryParams } = Linking.parse(result.url);
    const accessToken =
      getFirstParam(queryParams?.accessToken) ?? getFirstParam(queryParams?.access_token);
    const refreshToken =
      getFirstParam(queryParams?.refreshToken) ?? getFirstParam(queryParams?.refresh_token);
    const errorParam = getFirstParam(queryParams?.error);

    if (errorParam) {
      throw new ApiError(errorParam);
    }

    if (!accessToken || !refreshToken) {
      throw new ApiError("Google sign-in did not return valid session tokens.");
    }

    await tokenStorage.setTokens({ accessToken, refreshToken });
    await tokenStorage.clearStoredUser();

    logAuthEvent("google_login_success");

    return { accessToken, refreshToken };
  },

  async changePassword(payload: ChangePasswordRequest) {
    // Undocumented contract: send both camelCase and snake_case variants.
    const requestBody = {
      confirmPassword: payload.confirmPassword,
      confirm_password: payload.confirmPassword,
      currentPassword: payload.currentPassword,
      current_password: payload.currentPassword,
      newPassword: payload.newPassword,
      new_password: payload.newPassword,
    };

    const response = await api.post<ApiResponse<unknown>>(
      `${USER.ME}/change-password`,
      requestBody,
    );

    logAuthEvent("change_password_completed");

    return {
      data: response.data.data,
      message: response.data.message ?? "Your password has been updated successfully.",
    };
  },
};
