/**
 * Sign-in / password-recovery messages (wording from the prototype).
 * One place for every validation and server-error message, so all auth screens
 * read the same: plain language, what went wrong, and what to do next.
 */
import { ApiError, getApiErrorMessage } from "@/services/api";

export const authMessages = {
  // Field validation
  EMAIL_REQUIRED: "Please enter your email address.",
  EMAIL_REQUIRED_RECOVERY: "Please enter the email address registered with SalonOX.",
  EMAIL_INVALID: "Please enter a valid email address, for example name@yoursalon.com.",
  PASSWORD_REQUIRED: "Please enter your password.",
  OTP_INCOMPLETE: "Please enter all 6 digits of the code.",
  NEW_PASSWORD_REQUIRED: "Please enter a new password.",
  NEW_PASSWORD_WEAK: "Your password needs at least 8 characters, including letters and at least one number.",
  CONFIRM_PASSWORD_REQUIRED: "Please re-enter your new password.",
  PASSWORDS_DONT_MATCH: "The passwords don’t match. Please re-enter them.",
  RESET_FLOW_BROKEN: "This reset session is no longer valid. Please start again from “Forgot password?”.",

  // Server / connection
  INVALID_CREDENTIALS: "The email or password you entered is incorrect. Please try again, or use “Forgot password?” to reset it.",
  LAST_ATTEMPT_WARNING: " 1 attempt left before sign-in is paused for a few minutes.",
  ACCOUNT_DISABLED: "This account has been deactivated. Please contact your salon owner or SalonOX support to restore access.",
  SALON_DISABLED: "This salon’s SalonOX account has been deactivated. Please contact SalonOX support to restore access.",
  EMAIL_NOT_FOUND: "We couldn’t find a SalonOX account with this email. Please check the spelling, or register your salon or spa on our website.",
  CODE_SEND_FAILED: "We couldn’t send the code right now. Please try again in a moment.",
  CODE_REQUESTS_LIMITED: "Too many code requests. Please wait a few minutes before asking for a new one.",
  OTP_INVALID: "That code is incorrect. Please check your email and try again.",
  OTP_EXPIRED: "This code has expired. Please request a new one.",
  OTP_USED: "This code has already been used. Please request a new one.",
  OTP_LOCKED: "Too many incorrect attempts. Please request a new code.",
  RESET_CODE_EXPIRED: "Your reset code has expired. Please go back and request a new one.",
  OFFLINE: "You appear to be offline. Please check your internet connection and try again.",
  OFFLINE_CODE: "You’re offline. Please connect to the internet to receive your code.",
  TIMEOUT: "The request took too long. Please check your connection and try again.",
  SERVER: "Something went wrong on our side. Please try again in a moment.",

  // Google sign-in
  GOOGLE_FAILED: "We couldn’t sign you in with Google. Please try again, or sign in with email.",
  GOOGLE_PLAY_SERVICES: "Google sign-in needs Google Play services. Please update it, or sign in with email.",
  GOOGLE_UPDATE_APP: "Google sign-in needs the latest version of SalonOX. Please update the app, or sign in with email.",
} as const;

/** The backend says "Try again in N seconds"; turn that into a friendly pause length. */
export const tooManyAttemptsMessage = (serverMessage?: string) => {
  const seconds = Number(serverMessage?.match(/(\d+)\s*seconds?/i)?.[1]);
  const pause = Number.isFinite(seconds) && seconds > 0
    ? seconds < 60 ? `${seconds} seconds` : `${Math.ceil(seconds / 60)} minute${Math.ceil(seconds / 60) === 1 ? "" : "s"}`
    : "a few minutes";
  return `Too many unsuccessful attempts. For your security, sign-in is paused for ${pause}. You can reset your password now.`;
};

type AuthFlow = "login" | "sendCode" | "verifyCode" | "resetPassword";

type ErrorPayload = { error?: { code?: unknown; details?: { email?: unknown } }; code?: unknown } | undefined;

/**
 * Backend error code: `{ error: { code } }` (AppError), with a flat `{ code }` fallback.
 * Errors raised in the app itself (Google account picker) carry a GOOGLE_* code.
 */
export const getAuthErrorCode = (error: unknown): string | undefined => {
  if (!(error instanceof ApiError)) return undefined;
  const data = error.responseData as ErrorPayload;
  const code = data?.error?.code ?? data?.code ?? (error.code?.startsWith("GOOGLE_") ? error.code : undefined);
  return typeof code === "string" ? code.toUpperCase() : undefined;
};

/** The email the backend reports for a NOT_REGISTERED Google sign-in, if any. */
export const getNotRegisteredEmail = (error: unknown): string | null => {
  if (!(error instanceof ApiError)) return null;
  const email = (error.responseData as ErrorPayload)?.error?.details?.email;
  return typeof email === "string" && email ? email : null;
};

// Requests that never reached the server: the API client reports them with no
// HTTP status and its own offline / timeout sentence.
const isConnectionError = (error: unknown) =>
  error instanceof ApiError && error.status === undefined && /no internet connection|took too long|timeout|network/i.test(error.message);
const isTimeout = (error: unknown) => isConnectionError(error) && /took too long|timeout/i.test(getApiErrorMessage(error));

/** Maps any error from an auth request to the message the screen should show. */
export function getAuthErrorMessage(error: unknown, flow: AuthFlow): string {
  const code = getAuthErrorCode(error);
  const status = error instanceof ApiError ? error.status : undefined;

  if (isTimeout(error)) return authMessages.TIMEOUT;
  if (isConnectionError(error)) return flow === "sendCode" ? authMessages.OFFLINE_CODE : authMessages.OFFLINE;

  switch (code) {
    case "INVALID_CREDENTIALS":
      return authMessages.INVALID_CREDENTIALS;
    case "USER_INACTIVE":
      return authMessages.ACCOUNT_DISABLED;
    case "SALON_INACTIVE":
      return authMessages.SALON_DISABLED;
    case "USER_NOT_FOUND":
      return authMessages.EMAIL_NOT_FOUND;
    case "EMAIL_SEND_FAILED":
      return authMessages.CODE_SEND_FAILED;
    case "OTP_INVALID":
      return flow === "resetPassword" ? authMessages.RESET_CODE_EXPIRED : authMessages.OTP_INVALID;
    case "OTP_EXPIRED":
    case "OTP_NOT_FOUND":
      return flow === "resetPassword" ? authMessages.RESET_CODE_EXPIRED : authMessages.OTP_EXPIRED;
    case "OTP_USED":
      return authMessages.OTP_USED;
    case "VALIDATION_ERROR":
      if (flow === "resetPassword") return authMessages.NEW_PASSWORD_WEAK;
      if (flow === "verifyCode") return authMessages.OTP_INCOMPLETE;
      return authMessages.EMAIL_INVALID;
    case "GOOGLE_PLAY_SERVICES_UNAVAILABLE":
      return authMessages.GOOGLE_PLAY_SERVICES;
    case "GOOGLE_SIGN_IN_UNAVAILABLE":
      return authMessages.GOOGLE_UPDATE_APP;
    case "GOOGLE_SIGN_IN_FAILED":
    case "GOOGLE_TOKEN_INVALID":
    case "GOOGLE_EMAIL_UNVERIFIED":
    case "GOOGLE_UNAVAILABLE":
    case "GOOGLE_NOT_CONFIGURED":
      return authMessages.GOOGLE_FAILED;
  }

  if (status === 429) {
    if (flow === "login") return tooManyAttemptsMessage(getApiErrorMessage(error));
    if (flow === "verifyCode") return authMessages.OTP_LOCKED;
    return authMessages.CODE_REQUESTS_LIMITED;
  }
  if (status === 404 && flow === "sendCode") return authMessages.EMAIL_NOT_FOUND;
  if (status !== undefined && status >= 500) return authMessages.SERVER;

  // Never show the server's own wording: anything unrecognised gets the prototype's generic message.
  return authMessages.SERVER;
}
