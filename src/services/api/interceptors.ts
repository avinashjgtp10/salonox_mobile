import axios, {
  type AxiosInstance,
  AxiosError,
  type InternalAxiosRequestConfig,
} from "axios"
// Removed static imports for store and authSlice to avoid circular dependencies
import { PUBLIC_ROUTES, AUTH } from "./endpoints"

// ─── Structured API Error ─────────────────────────────────────────────────────
export class ApiError {
  status:  number
  message: string
  errors?: any

  constructor(status: number, message: string, errors?: any) {
    this.status  = status
    this.message = message
    this.errors  = errors
  }
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
        const accessToken = localStorage.getItem("accessToken")
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

        const refreshToken = localStorage.getItem("refreshToken")

        try {
          const { data: refreshData } = await axios.post<{ accessToken: string }>(
            `${import.meta.env.VITE_API_BASE_URL}${AUTH.REFRESH_TOKEN}`,
            { refreshToken }
          )

          const newToken = refreshData.accessToken

          // Dynamic imports here break the circular dependency at module root
          const { store } = await import("../../store/store")
          const { updateToken } = await import("../../store/authSlice")

          store.dispatch(updateToken(newToken))
          processQueue(null, newToken)

          originalRequest.headers["Authorization"] = `Bearer ${newToken}`
          return instance(originalRequest)

        } catch (refreshError) {
          processQueue(refreshError, null)
          
          const { store } = await import("../../store/store")
          const { logout } = await import("../../store/authSlice")
          
          store.dispatch(logout())
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
