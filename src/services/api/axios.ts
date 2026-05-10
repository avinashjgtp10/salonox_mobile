import axios, { type AxiosInstance } from "axios";
import { API_ORIGIN } from "./baseUrl";
import { applyInterceptors } from "./interceptors";

const api: AxiosInstance = axios.create({
  baseURL: API_ORIGIN,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

applyInterceptors(api);

export default api;
