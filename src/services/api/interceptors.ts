import axios, {
  type AxiosInstance,
  AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";
// Removed static imports for store and authSlice to avoid circular dependencies
import { API_ORIGIN } from "./baseUrl";
import { PUBLIC_ROUTES, AUTH } from "./endpoints";

// ─── Structured API Error ─────────────────────────────────────────────────────
export class ApiError {
  status: number;
  message: string;
  errors?: any;

  constructor(status: number, message: string, errors?: any) {
    this.status = status;
    this.message = message;
    this.errors = errors;
  }
}

// ─── Store Injection (Fixes Circular Dependency & Vite Warnings) ─────────────
let storeRef: any = null;
let authActionsRef: any = null;

export const injectStore = (store: any, authActions: any) => {
  storeRef = store;
  authActionsRef = authActions;
};

// ─── Token Refresh Queue ──────────────────────────────────────────────────────
type FailedRequest = {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
};

let isRefreshing = false;
let failedQueue: FailedRequest[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token!),
  );
  failedQueue = [];
};

// ─── Apply Interceptors ───────────────────────────────────────────────────────
export const applyInterceptors = (instance: AxiosInstance) => {
  // ── REQUEST ─────────────────────────────────────────────────────────────────
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const isPublic = PUBLIC_ROUTES.some((route) =>
        config.url?.includes(route),
      );

      if (!isPublic) {
        const state = storeRef?.getState();

        const accessToken = state?.auth?.accessToken;
        if (accessToken) {
          config.headers["Authorization"] = `Bearer ${accessToken}`;
        }
      }

      return config;
    },
    (error) => Promise.reject(new ApiError(0, "Request setup failed", error)),
  );

  // ── RESPONSE ─────────────────────────────────────────────────────────────────
  instance.interceptors.response.use(
    // ✅ 2xx — pass through
    (response) => response,

    // ❌ Non-2xx
    async (error: AxiosError) => {
      if (error.response) {
        console.error(
          `[API ERROR] ${error.config?.method?.toUpperCase()} ${error.config?.url}:`,
          {
            status: error.response.status,
            data: error.response.data,
          },
        );
      } else {
        console.error(
          `[API ERROR] ${error.config?.method?.toUpperCase()} ${error.config?.url}:`,
          error.message,
        );
      }

      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
      };

      const status = error.response?.status;
      const data = error.response?.data as any;
      const errField = data?.error;
      const message =
        (typeof errField === "string" ? errField : errField?.message ?? errField?.msg) ??
        data?.message ??
        data?.msg ??
        "Something went wrong";

      // ── 401: silent token refresh ──────────────────────────────────────────
      const isPublicRoute = PUBLIC_ROUTES.some((route) =>
        originalRequest.url?.includes(route),
      );

      if (status === 401 && !originalRequest._retry && !isPublicRoute) {
        if (isRefreshing) {
          return new Promise<string>((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((newToken) => {
              originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
              return instance(originalRequest);
            })
            .catch((err) =>
              Promise.reject(new ApiError(401, "Session expired", err)),
            );
        }

        originalRequest._retry = true;
        isRefreshing = true;

        const refreshToken = storeRef?.getState()?.auth?.refreshToken;

        // No refresh token stored — skip the network call and logout immediately
        if (!refreshToken) {
          isRefreshing = false;
          processQueue(new Error("No refresh token"), null);
          if (storeRef && authActionsRef) storeRef.dispatch(authActionsRef.logout());
          window.location.replace("/login");
          return Promise.reject(new ApiError(401, "Session expired. Please log in again."));
        }

        try {
          const { data: refreshData } = await axios.post<{
            data?: { accessToken: string };
            accessToken?: string;
          }>(`${API_ORIGIN}${AUTH.REFRESH_TOKEN}`, {
            refreshToken,
          });

          const newToken = refreshData?.data?.accessToken || refreshData.accessToken;

          if (!newToken) throw new Error("No token returned");

          // Dynamic imports here break the circular dependency at module root
          if (storeRef && authActionsRef) {
            storeRef.dispatch(authActionsRef.updateToken(newToken));
          }
          processQueue(null, newToken);

          originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
          return instance(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);

          if (storeRef && authActionsRef) {
            storeRef.dispatch(authActionsRef.logout());
          }
          window.location.replace("/login");
          return Promise.reject(
            new ApiError(401, "Session expired. Please log in again."),
          );
        } finally {
          isRefreshing = false;
        }
      }

      // ── No response (network error) ────────────────────────────────────────
      if (!error.response) {
        return Promise.reject(
          new ApiError(0, "Network error — check your connection"),
        );
      }

      // ── All other errors ───────────────────────────────────────────────────
      switch (status) {
        case 400:
          return Promise.reject(new ApiError(400, message, data?.errors));
        case 401:
          return Promise.reject(new ApiError(401, message));
        case 403:
          return Promise.reject(new ApiError(403, message));
        case 404:
          return Promise.reject(new ApiError(404, message));
        case 422:
          return Promise.reject(new ApiError(422, message, data?.errors));
        case 500:
          return Promise.reject(new ApiError(500, message));
        default:
          return Promise.reject(new ApiError(status ?? 0, message));
      }
    },
  );
};
