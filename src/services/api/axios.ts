import axios, { type AxiosInstance } from "axios";
import { applyInterceptors } from "./interceptors";

const api: AxiosInstance = axios.create({
  baseURL: "",
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

applyInterceptors(api);

export default api;
