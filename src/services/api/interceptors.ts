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
  code?: string;
  errors?: any;

  constructor(status: number, message: string, errors?: any, code?: string) {
    this.status = status;
    this.message = message;
    this.errors = errors;
    this.code = code;
  }
}

// ─── Store Injection (Fixes Circular Dependency & Vite Warnings) ─────────────
let storeRef: any = null;
let authActionsRef: any = null;

export const injectStore = (store: any, authActions: any) => {
  storeRef = store;
  authActionsRef = authActions;
  // Proactive refresh: (re)schedule every time the access token actually
  // changes, so a freshly logged-in/refreshed token gets its own timer
  // instead of relying solely on the reactive 401 path below.
  let lastToken: string | null = store.getState()?.auth?.accessToken ?? null;
  scheduleProactiveRefresh();
  store.subscribe(() => {
    const token = store.getState()?.auth?.accessToken ?? null;
    if (token !== lastToken) {
      lastToken = token;
      scheduleProactiveRefresh();
    }
  });
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

// How long before the access token's real expiry to refresh it proactively.
// Comfortably inside a 15-minute token's lifetime, so ordinary clock skew or
// a slow network round-trip can't let the token expire before this fires.
const PROACTIVE_REFRESH_LEAD_MS = 60_000;

let proactiveRefreshTimer: ReturnType<typeof setTimeout> | null = null;

// Runs the same refresh + queue-processing path the 401 handler below uses,
// so a proactive refresh and a reactive one can never both hit the network:
// whichever starts first sets isRefreshing, and the other just queues.
// Callers that don't have an in-flight request to retry (the proactive
// scheduler) pass no originalRequest and simply let the queue flush.
async function refreshAccessToken(): Promise<string> {
  if (isRefreshing) {
    return new Promise<string>((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    });
  }

  isRefreshing = true;
  const refreshToken = storeRef?.getState()?.auth?.refreshToken;

  if (!refreshToken) {
    isRefreshing = false;
    const err = new Error("No refresh token");
    processQueue(err, null);
    throw err;
  }

  try {
    const { data: refreshData } = await axios.post<{
      data?: { accessToken: string };
      accessToken?: string;
    }>(`${API_ORIGIN}${AUTH.REFRESH_TOKEN}`, { refreshToken });

    const newToken = refreshData?.data?.accessToken || refreshData.accessToken;
    if (!newToken) throw new Error("No token returned");

    if (storeRef && authActionsRef) {
      storeRef.dispatch(authActionsRef.updateToken(newToken));
    }
    processQueue(null, newToken);
    return newToken;
  } catch (refreshError) {
    processQueue(refreshError, null);
    throw refreshError;
  } finally {
    isRefreshing = false;
  }
}

function scheduleProactiveRefresh() {
  if (proactiveRefreshTimer) {
    clearTimeout(proactiveRefreshTimer);
    proactiveRefreshTimer = null;
  }

  const state = storeRef?.getState()?.auth;
  const expiresAt: number | null = state?.accessTokenExpiresAt ?? null;
  if (!state?.accessToken || !state?.refreshToken || !expiresAt) return;

  const fireIn = expiresAt - PROACTIVE_REFRESH_LEAD_MS - Date.now();
  // Token is already inside its lead window (or expired) — refresh now
  // rather than scheduling a negative/zero-delay timeout.
  const delay = Math.max(fireIn, 0);

  proactiveRefreshTimer = setTimeout(() => {
    refreshAccessToken().catch(() => {
      // Reactive 401 handling (or the user's next action) takes over from
      // here; nothing else to do — this timer's only job was to try early.
    });
  }, delay);
}

// ─── Subscription error code sent by the backend ─────────────────────────────
const SUBSCRIPTION_REQUIRED_CODE = "SUBSCRIPTION_REQUIRED";

// Endpoints whose controllers derive salon_id exclusively from the JWT
// (getSalonId(req) → req.user.salonId) and never read a salon_id query
// param — sending it there is pure dead weight on every request URL.
// Matched as whole path segments (not a substring) so this doesn't
// accidentally also skip injection for a similarly-named but unverified
// endpoint like /client-notes or /client-communication.
// NOT applied globally: salons.controller.ts's mySalon handler and the
// staff commission endpoints genuinely fall back to this query param when
// a freshly-registered user's JWT doesn't have salonId yet (e.g. a
// salon_owner who just registered and hasn't created their salon).
// /report/ covers the whole independent reports module (reports.controller.ts)
// — every one of its ~40 endpoints calls getSalonId(req) exclusively and none
// ever reads req.query.salon_id, confirmed by grep.
const SALON_ID_NOT_NEEDED = [/\/clients(\/|\?|$)/, /\/services(\/|\?|$)/, /\/products(\/|\?|$)/, /\/report\//];

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

        const role = state?.auth?.role;
        const salonId = role !== "super_admin"
          ? (state?.auth?.salonId ?? state?.salon?.currentSalon?.id)
          : null;
        const skipSalonId = SALON_ID_NOT_NEEDED.some((re) => re.test(config.url ?? ""));
        if (salonId && !skipSalonId) {
          const url = new URL(config.url ?? "", "http://x");
          const inParams =
            config.params instanceof URLSearchParams
              ? config.params.has("salon_id")
              : config.params != null && typeof config.params === "object"
                ? "salon_id" in config.params
                : false;
          if (!url.searchParams.has("salon_id") && !inParams) {
            url.searchParams.set("salon_id", String(salonId));
            config.url = url.pathname + "?" + url.searchParams.toString();
          }
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
      // Pass cancel/abort errors through unchanged so callers can detect them.
      // Without this, AbortController aborts get wrapped into ApiError and the
      // caller's `err?.name === "CanceledError"` guard never fires.
      if (axios.isCancel(error) || (error as any).code === "ERR_CANCELED") {
        return Promise.reject(error);
      }

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

      // error.code can be a string (e.g. "SUBSCRIPTION_REQUIRED") or an object with .code
      const errorCode: string | undefined =
        (typeof errField === "object" ? errField?.code : undefined) ??
        data?.code ??
        undefined;

      const message =
        (typeof errField === "string" ? errField : errField?.message ?? errField?.msg) ??
        data?.message ??
        data?.msg ??
        "Something went wrong";

      // ── 401: silent token refresh ──────────────────────────────────────────
      // Skip refresh for public routes (e.g. /login returning 401 for wrong credentials)
      const isPublicRoute = PUBLIC_ROUTES.some((route) =>
        originalRequest.url?.includes(route),
      );

      if (status === 401 && !originalRequest._retry && !isPublicRoute) {
        originalRequest._retry = true;

        try {
          // Shares isRefreshing/failedQueue with the proactive scheduler
          // above: if a proactive refresh is already in flight when this
          // 401 lands, this just queues behind it instead of firing a
          // second concurrent request to the refresh endpoint.
          const newToken = await refreshAccessToken();
          originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
          return instance(originalRequest);
        } catch (refreshError) {
          // Read role BEFORE logout() clears it, and route super admins back
          // to their own login page — /login is the regular-user page and
          // isn't where a super_admin session can re-authenticate, so this
          // used to silently strand the History (and every other super-admin)
          // page on an expired token instead of navigating anywhere useful.
          const isSuperAdmin = storeRef?.getState()?.auth?.role === "super_admin";
          if (storeRef && authActionsRef) {
            storeRef.dispatch(authActionsRef.logout());
          }
          window.location.replace(isSuperAdmin ? "/super-admin/login" : "/login");
          return Promise.reject(
            new ApiError(401, "Session expired. Please log in again."),
          );
        }
      }

      // ── 403 SUBSCRIPTION_REQUIRED: show full-screen subscription wall ────
      if (status === 403 && errorCode === SUBSCRIPTION_REQUIRED_CODE) {
        if (storeRef) {
          // Dynamically import to avoid circular dependency
          import("../../store/billingSlice").then(({ setSubscriptionExpired }) => {
            storeRef.dispatch(setSubscriptionExpired(true));
          });
        }
        return Promise.reject(new ApiError(403, message, undefined, errorCode));
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
          return Promise.reject(new ApiError(400, message, data?.errors, errorCode));
        case 401:
          return Promise.reject(new ApiError(401, message, undefined, errorCode));
        case 403:
          return Promise.reject(new ApiError(403, message, undefined, errorCode));
        case 404:
          return Promise.reject(new ApiError(404, message, undefined, errorCode));
        // DUPLICATE_PHONE / DUPLICATE_EMAIL (clients) and any other
        // code-carrying conflict rely on errorCode surviving past this
        // interceptor — every branch here used to drop it, so every 409
        // resolved to the same generic "conflict" with no way for a caller to
        // tell which field actually collided.
        case 409:
          return Promise.reject(new ApiError(409, message, undefined, errorCode));
        case 422:
          return Promise.reject(new ApiError(422, message, data?.errors, errorCode));
        case 500:
          return Promise.reject(new ApiError(500, message, undefined, errorCode));
        default:
          return Promise.reject(new ApiError(status ?? 0, message, undefined, errorCode));
      }
    },
  );
};