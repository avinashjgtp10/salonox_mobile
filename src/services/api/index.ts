import {
  AxiosError,
  create,
  getAdapter,
  isAxiosError,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";

import {
  getAuthErrorMessage,
  getAuthErrorStatus,
  getTokenExpiryTimestamp,
  logAuthEvent,
  shouldInvalidateSession,
  shouldRefreshToken,
} from "@/services/authSession";
import { isNetworkOnline, waitForNetworkOnline } from "@/services/networkStatus";
import { tokenStorage } from "@/services/tokenStorage";
import type { ApiResponse, RefreshTokenResponseData } from "@/types/auth";

export const API_BASE_URL = "http://dev.salonox.com/api/v1";

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _networkRetry?: boolean;
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
const defaultApiAdapter = getAdapter(api.defaults.adapter) as AxiosAdapter;
const inFlightSafeRequests = new Map<string, Promise<AxiosResponse>>();

const SAFE_RETRY_METHODS = new Set(["get", "head", "options"]);

const getRequestMethod = (config?: { method?: string }) => (config?.method ?? "get").toLowerCase();

const isSafeRetryRequest = (config?: { method?: string }) => SAFE_RETRY_METHODS.has(getRequestMethod(config));

const stableStringify = (value: unknown): string => {
  if (!value || typeof value !== "object") {
    return JSON.stringify(value ?? null);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
    .join(",")}}`;
};

const getDedupeKey = (config: InternalAxiosRequestConfig) => {
  if (!isSafeRetryRequest(config)) {
    return null;
  }

  return [
    getRequestMethod(config),
    config.baseURL ?? "",
    config.url ?? "",
    stableStringify(config.params),
  ].join("|");
};

api.defaults.adapter = async (config) => {
  const key = getDedupeKey(config as InternalAxiosRequestConfig);

  if (!key) {
    return defaultApiAdapter(config);
  }

  const existingRequest = inFlightSafeRequests.get(key);

  if (existingRequest) {
    return existingRequest;
  }

  const request = defaultApiAdapter(config).finally(() => {
    inFlightSafeRequests.delete(key);
  });

  inFlightSafeRequests.set(key, request);

  return request;
};

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

  if (lowercaseMessage.includes("timeout")) {
    return "The request took too long. Please check your connection and try again.";
  }

  if (lowercaseMessage.includes("network error")) {
    return OFFLINE_MESSAGE;
  }

  if (lowercaseMessage.includes("request failed with status code 5")) {
    return "The server is temporarily unavailable. Please try again in a moment.";
  }

  if (
    lowercaseMessage.includes("staff_employee_code_salon_unique") ||
    (lowercaseMessage.includes("employee_code") && lowercaseMessage.includes("unique"))
  ) {
    return "An employee with this Employee Code already exists in your salon. Please use a different code.";
  }
  return message;
};

// A network-level failure — offline, DNS failure, dropped connection, or a
// timed-out request — never reaches the server, so `error.response` is
// undefined. Axios's own message for this ("Network Error", "timeout of
// 15000ms exceeded") is technically accurate but not something a salon
// front-desk user should see; surface a single friendly, actionable message
// instead so callers can rely on ApiError.status === undefined to mean
// "couldn't reach the server" without re-deriving it from raw axios text.
const OFFLINE_MESSAGE = "Unable to connect. Please check your internet connection and try again.";
const OFFLINE_MUTATION_MESSAGE = "You are offline. Your changes are still on this screen; reconnect and try again.";

const waitForOnlineIfNeeded = async (config: InternalAxiosRequestConfig) => {
  if (isNetworkOnline()) {
    return;
  }

  if (isSafeRetryRequest(config)) {
    await waitForNetworkOnline();
    return;
  }

  throw new ApiError(OFFLINE_MUTATION_MESSAGE);
};

const toApiError = (error: unknown) => {
  if (isAxiosError<ApiErrorPayload>(error)) {
    if (!error.response) {
      return new ApiError(OFFLINE_MESSAGE, undefined, undefined, undefined);
    }

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

  await waitForOnlineIfNeeded(config);

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

    if (!error.response && originalRequest && isSafeRetryRequest(originalRequest) && !originalRequest._networkRetry) {
      originalRequest._networkRetry = true;
      await waitForNetworkOnline();

      return api(originalRequest);
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
