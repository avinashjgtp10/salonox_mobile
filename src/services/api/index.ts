import { AxiosError, create, isAxiosError, type InternalAxiosRequestConfig } from "axios";

import {
  getAuthErrorMessage,
  getAuthErrorStatus,
  getTokenExpiryTimestamp,
  logAuthEvent,
  shouldInvalidateSession,
  shouldRefreshToken,
} from "@/services/authSession";
import { tokenStorage } from "@/services/tokenStorage";
import type { ApiResponse, RefreshTokenResponseData } from "@/types/auth";

export const API_BASE_URL = "https://dev.salonox.com/api/v1";

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

type ApiErrorPayload = {
  message?: unknown;
  error?: unknown;
  errors?: Record<string, string[] | string> | string[] | string;
};

export class ApiError extends Error {
  status?: number;
  details?: ApiErrorPayload["errors"];
  responseData?: unknown;

  constructor(
    message: string,
    status?: number,
    details?: ApiErrorPayload["errors"],
    responseData?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
    this.responseData = responseData;
  }
}

const refreshClient = create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

export const api = create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshAccessTokenPromise: Promise<string> | null = null;

const formatValue = (value: unknown): string | null => {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(formatValue).filter(Boolean).join("\n");
  }

  if (typeof value === "object") {
    return Object.values(value)
      .map(formatValue)
      .filter(Boolean)
      .join("\n");
  }

  return String(value);
};

const getPayloadMessage = (payload?: ApiErrorPayload) => {
  if (!payload) {
    return null;
  }

  return (
    formatValue(payload.message) ??
    formatValue(payload.error) ??
    formatValue(payload.errors)
  );
};

const formatErrorMessage = (message: string): string => {
  const lowercaseMessage = message.toLowerCase();
  if (
    lowercaseMessage.includes("staff_employee_code_salon_unique") ||
    (lowercaseMessage.includes("employee_code") && lowercaseMessage.includes("unique"))
  ) {
    return "An employee with this Employee Code already exists in your salon. Please use a different code.";
  }
  return message;
};

const toApiError = (error: unknown) => {
  if (isAxiosError<ApiErrorPayload>(error)) {
    const rawMessage =
      getPayloadMessage(error.response?.data) ??
      error.message ??
      "Something went wrong. Please try again.";

    const message = formatErrorMessage(rawMessage);

    return new ApiError(
      message,
      error.response?.status,
      error.response?.data?.errors,
      error.response?.data,
    );
  }

  if (error instanceof Error) {
    return new ApiError(formatErrorMessage(error.message));
  }

  return new ApiError("Something went wrong. Please try again.");
};

const shouldSkipRefreshForRequest = (requestUrl: string) =>
  requestUrl.includes("/auth/login") ||
  requestUrl.includes("/auth/refresh") ||
  requestUrl.includes("/auth/logout") ||
  requestUrl.includes("/auth/forgot-password");

const refreshAccessToken = async (reason: string) => {
  if (!refreshAccessTokenPromise) {
    refreshAccessTokenPromise = (async () => {
      const refreshToken = await tokenStorage.getRefreshToken();

      if (!refreshToken) {
        logAuthEvent("refresh_missing_refresh_token", { reason });
        await tokenStorage.clearSession();
        throw new ApiError("Your session has expired.", 401);
      }

      try {
        logAuthEvent("refresh_started", { reason });

        const response = await refreshClient.post<ApiResponse<RefreshTokenResponseData>>(
          "/auth/refresh",
          { refreshToken },
        );
        const nextTokens = response.data.data;
        const nextRefreshToken = nextTokens.refreshToken ?? refreshToken;

        await tokenStorage.setTokens({
          accessToken: nextTokens.accessToken,
          refreshToken: nextRefreshToken,
        });

        logAuthEvent("refresh_succeeded", {
          reason,
          accessTokenExpiresAt: getTokenExpiryTimestamp(nextTokens.accessToken),
          refreshTokenRotated: Boolean(nextTokens.refreshToken),
        });

        return nextTokens.accessToken;
      } catch (refreshError) {
        const shouldClearSession = shouldInvalidateSession(refreshError);

        logAuthEvent("refresh_failed", {
          reason,
          shouldClearSession,
          status: getAuthErrorStatus(refreshError),
          message: getAuthErrorMessage(refreshError),
        });

        if (shouldClearSession) {
          await tokenStorage.clearSession();
        }

        throw toApiError(refreshError);
      } finally {
        refreshAccessTokenPromise = null;
      }
    })();
  }

  return refreshAccessTokenPromise;
};

api.interceptors.request.use(async (config) => {
  const requestUrl = config.url ?? "";

  if (shouldSkipRefreshForRequest(requestUrl)) {
    return config;
  }

  const accessToken = await tokenStorage.getAccessToken();

  if (!accessToken) {
    return config;
  }

  if (shouldRefreshToken(accessToken)) {
    const refreshToken = await tokenStorage.getRefreshToken();

    if (refreshToken) {
      try {
        const nextAccessToken = await refreshAccessToken(`request:${requestUrl}`);
        config.headers.Authorization = `Bearer ${nextAccessToken}`;

        return config;
      } catch (refreshError) {
        logAuthEvent("request_refresh_unavailable", {
          requestUrl,
          status: getAuthErrorStatus(refreshError),
          message: getAuthErrorMessage(refreshError),
        });
      }
    }
  }

  config.headers.Authorization = `Bearer ${accessToken}`;

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorPayload>) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const status = error.response?.status;
    const requestUrl = originalRequest?.url ?? "";
    const shouldSkipRefresh = shouldSkipRefreshForRequest(requestUrl);

    if (status === 401 && originalRequest && !originalRequest._retry && !shouldSkipRefresh) {
      originalRequest._retry = true;

      try {
        const nextAccessToken = await refreshAccessToken(`response_401:${requestUrl}`);

        originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        logAuthEvent("request_rejected_after_refresh_failure", {
          requestUrl,
          status: getAuthErrorStatus(refreshError),
          message: getAuthErrorMessage(refreshError),
        });

        return Promise.reject(toApiError(refreshError));
      }
    }

    return Promise.reject(toApiError(error));
  },
);

export const getApiErrorMessage = (error: unknown) => {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
};
