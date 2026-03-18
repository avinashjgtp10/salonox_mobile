import axios from "axios";
import { store } from "../../store/store";
import { logout, updateToken } from "../../store/authSlice";

const api = axios.create({
  baseURL: "http://192.168.0.130:3000",
  headers: {
    "Content-Type": "application/json",
  },
});

// 🔐 JWT Interceptor
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

// 🔄 Refresh Token Interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const state = store.getState();
        const refreshToken = state.auth.refreshToken;

        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        const res = await axios.post("http://192.168.0.147:3000/api/v1/auth/refresh", {
          refreshToken,
        });

        const newAccessToken = res.data?.data?.accessToken;

        if (newAccessToken) {
          store.dispatch(updateToken(newAccessToken));
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        store.dispatch(logout());
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
