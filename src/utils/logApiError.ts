import { ApiError } from "@/services/api";

// A 401 reaching a thunk means the token refresh already failed and the user is
// being signed out (e.g. this account logged in on another phone), so every
// in-flight request fails at once. That is expected, not an error to report.
const isSessionEnded = (value: unknown) =>
  (value instanceof ApiError && value.status === 401) ||
  (typeof value === "object" && value !== null && (value as { status?: unknown }).status === 401);

/** console.error for failed API work, minus the noise of a session that just ended. */
export const logApiError = (...args: unknown[]) => {
  if (args.some(isSessionEnded)) return;
  console.error(...args);
};
