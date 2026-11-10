import { api } from "@/services/api";
import { USER } from "@/services/api/endpoints";
import { logAuthEvent } from "@/services/authSession";
import { pickGoogleAccountIdToken } from "@/services/googleSignIn";
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
  LoginCredentials,
  LoginResponseData,
  RefreshTokenResponseData,
  RegisterCredentials,
  RegisterResponseData,
} from "@/types/auth";
import { normalizeAuthUser } from "@/utils/authUser";

// Saves the session from a successful sign-in (email or Google): same response shape.
const storeLoginSession = async (data: LoginResponseData, event: string) => {
  const authData: LoginResponseData = { ...data, user: normalizeAuthUser(data.user) };
  await tokenStorage.setTokens({ accessToken: authData.accessToken, refreshToken: authData.refreshToken });
  await tokenStorage.clearStoredUser();
  logAuthEvent(event, { userId: authData.user.id });
  return authData;
};

export const authService = {
  async login(credentials: LoginCredentials) {
    const response = await api.post<ApiResponse<LoginResponseData>>("/auth/login", { ...credentials, clientType: "mobile" });
    return storeLoginSession(response.data.data, "login_success");
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

    await api.post<ApiResponse<{ message?: string }>>("/auth/logout", payload, config);
    logAuthEvent("logout_completed");
  },

  async getCurrentUser() {
    const response = await api.get<ApiResponse<AuthUser>>(USER.PROFILE);

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
    // The API reads the new password from `newPassword`; without it every
    // reset is rejected with "Email, OTP, and new password are required".
    const response = await api.post<ApiResponse<unknown>>(
      "/auth/forgot-password/reset",
      { ...payload, newPassword: payload.password },
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

    await api.post<ApiResponse<{ message?: string }>>("/auth/logout-all", undefined, config);
    logAuthEvent("logout_all_completed");
  },

  async deleteAccount(payload?: DeleteAccountRequest) {
    await api.delete<ApiResponse<{ message?: string }>>("/auth/account", {
      ...(payload ? { data: payload } : {}),
    });
    logAuthEvent("delete_account_completed");
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

  /**
   * In-app Google sign-in: the phone's account picker, then the backend checks the
   * token. Only registered emails sign in; others get 404 NOT_REGISTERED.
   */
  async loginWithGoogle() {
    const idToken = await pickGoogleAccountIdToken();
    const response = await api.post<ApiResponse<LoginResponseData>>("/auth/google/native", { idToken, clientType: "mobile" });
    return storeLoginSession(response.data.data, "google_login_success");
  },

  async changePassword(payload: ChangePasswordRequest) {
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
