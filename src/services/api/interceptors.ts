import axios, {
  type AxiosInstance,
  AxiosError,
  type InternalAxiosRequestConfig,
} from "axios"
// Removed static imports for store and authSlice to avoid circular dependencies
import { PUBLIC_ROUTES, AUTH } from "./endpoints"

// ─── Structured API Error ─────────────────────────────────────────────────────
export class ApiError extends Error {
  status:  number
  errors?: any

  constructor(status: number, message: string, errors?: any) {
    super(message)
    this.name = "ApiError"
    this.status  = status
    this.errors  = errors
  }
}

// ─── Store Injection (Fixes Circular Dependency & Vite Warnings) ─────────────
let storeRef: any = null
let authActionsRef: any = null

export const injectStore = (store: any, authActions: any) => {
  storeRef = store
  authActionsRef = authActions
}

// ─── Token Refresh Queue ──────────────────────────────────────────────────────
type FailedRequest = {
  resolve: (token: string) => void
  reject:  (error: unknown) => void
}

let isRefreshing = false
let failedQueue: FailedRequest[] = []

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token!)
  )
  failedQueue = []
}

// ─── Apply Interceptors ───────────────────────────────────────────────────────
export const applyInterceptors = (instance: AxiosInstance) => {

  // ── REQUEST ─────────────────────────────────────────────────────────────────
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const isPublic = PUBLIC_ROUTES.some((route) =>
        config.url?.includes(route)
      )

      if (!isPublic) {
        const accessToken = storeRef?.getState()?.auth?.accessToken
        if (accessToken) {
          config.headers["Authorization"] = `Bearer ${accessToken}`
        }
      }

      return config
    },
    (error) => Promise.reject(new ApiError(0, "Request setup failed", error))
  )

  // ── RESPONSE ─────────────────────────────────────────────────────────────────
  instance.interceptors.response.use(

    // ✅ 2xx — pass through
    (response) => response,

    // ❌ Non-2xx
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean
      }

      const status  = error.response?.status
      const data    = error.response?.data as any
      const message = data?.message ?? "Something went wrong"

      // ── 401: silent token refresh ──────────────────────────────────────────
      if (status === 401 && !originalRequest._retry) {

        if (isRefreshing) {
          return new Promise<string>((resolve, reject) => {
            failedQueue.push({ resolve, reject })
          })
            .then((newToken) => {
              originalRequest.headers["Authorization"] = `Bearer ${newToken}`
              return instance(originalRequest)
            })
            .catch((err) =>
              Promise.reject(new ApiError(401, "Session expired", err))
            )
        }

        originalRequest._retry = true
        isRefreshing = true

        const refreshToken = storeRef?.getState()?.auth?.refreshToken

        try {
          const { data: refreshData } = await axios.post<{ accessToken: string }>(
            `${import.meta.env.VITE_API_BASE_URL}${AUTH.REFRESH_TOKEN}`,
            { refreshToken }
          )

          const newToken = refreshData.accessToken

          // Dynamic imports here break the circular dependency at module root
          if (storeRef && authActionsRef) {
            storeRef.dispatch(authActionsRef.updateToken(newToken))
          }
          processQueue(null, newToken)

          originalRequest.headers["Authorization"] = `Bearer ${newToken}`
          return instance(originalRequest)

        } catch (refreshError) {
          processQueue(refreshError, null)
          
          if (storeRef && authActionsRef) {
            storeRef.dispatch(authActionsRef.logout())
          }
          window.location.replace("/login")
          return Promise.reject(
            new ApiError(401, "Session expired. Please log in again.")
          )
        } finally {
          isRefreshing = false
        }
      }

      // ── No response (network error) ────────────────────────────────────────
      if (!error.response) {
        return Promise.reject(
          new ApiError(0, "Network error — check your connection")
        )
      }

      // ── All other errors ───────────────────────────────────────────────────
      switch (status) {
        case 400:
          return Promise.reject(new ApiError(400, message, data?.errors))
        case 403:
          return Promise.reject(new ApiError(403, message))
        case 404:
          return Promise.reject(new ApiError(404, message))
        case 422:
          return Promise.reject(new ApiError(422, message, data?.errors))
        case 500:
          return Promise.reject(new ApiError(500, message))
        default:
          return Promise.reject(new ApiError(status ?? 0, message))
      }
    }
  )
}
