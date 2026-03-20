import axios from "axios";
import { store } from "../../store/store";
const api = axios.create({
  baseURL: "http://192.168.0.118:3000",
  headers: {
    "Content-Type": "application/json",
  },
});

// 🔐 JWT Request Interceptor
api.interceptors.request.use(
  (config) => {
    const state = store.getState();
    const token = state.auth.accessToken;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

export default api;
