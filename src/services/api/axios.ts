import axios from "axios";
import { store } from "../../store/store";
import { logout, updateToken } from "../../store/authSlice";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://192.168.0.201:3000",
  headers: {
    "Content-Type": "application/json",
  },
});

// 🔐 JWT Request Interceptor
api.interceptors.request.use(
  (config) => {
    const state = store.getState();
    const token = state.auth.token;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// 🔄 Token Refresh Interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 or 403 with INVALID_TOKEN
    const isUnauthorized = error.response?.status === 401;
    const isForbiddenToken = error.response?.status === 403 && error.response?.data?.error?.code === "INVALID_TOKEN";

    if ((isUnauthorized || isForbiddenToken) && !originalRequest._retry) {
      originalRequest._retry = true;

      const state = store.getState();
      const refreshToken = state.auth.refreshToken;

      if (refreshToken) {
        try {
          console.log("🔄 Access token expired. Attempting refresh...");
          // Ensure protocol is present in fallback
          const baseURL = import.meta.env.VITE_API_BASE_URL || "http://192.168.0.132:3000";

          const res = await axios.post(`${baseURL}/api/v1/auth/refresh`, {
            refreshToken,
          });

          const newAccessToken = res.data?.data?.accessToken;

          if (newAccessToken) {
            console.log("✅ Token refreshed successfully.");
            store.dispatch(updateToken(newAccessToken));
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          console.error("❌ Refresh token failed. Logging out...", refreshError);
          store.dispatch(logout());
          window.location.replace("/login");
          return Promise.reject(refreshError);
        }
      } else {
        console.warn("⚠️ No refresh token available. Logging out...");
        store.dispatch(logout());
        window.location.replace("/login");
      }
    }

    return Promise.reject(error);
  }
);

export default api;
