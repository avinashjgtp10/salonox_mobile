import axios, { type AxiosInstance } from "axios";
import { API_ORIGIN } from "./baseUrl";
import { applyInterceptors } from "./interceptors";

const api: AxiosInstance = axios.create({
  baseURL: API_ORIGIN,
  // The backend retries its own DB connection up to 3x (connectionTimeoutMillis:
  // 20000 each attempt, plus backoff) on transient connection blips — a 15s
  // client timeout was cutting requests off before those retries could ever
  // finish and actually succeed. 35s gives that real headroom.
  timeout: 35_000,
  headers: { "Content-Type": "application/json" },
});

applyInterceptors(api);

export default api;
