export const AUTH = {
  LOGIN: "/api/v1/auth/login",
  REGISTER: "/api/v1/auth/register",
  REFRESH_TOKEN: "/api/v1/auth/refresh",
  LOGOUT: "/api/v1/auth/logout",
  GOOGLE_START: "/api/v1/auth/google/start",
  SEND_EMAIL_OTP: "/api/v1/auth/send-email-otp",
  VERIFY_EMAIL_OTP: "/api/v1/auth/verify-email-otp",
  SEND_MOBILE_OTP: "/api/v1/auth/send-mobile-otp",
  VERIFY_MOBILE_OTP: "/api/v1/auth/verify-mobile-otp",
  FORGOT_PASSWORD_SEND_OTP: "/api/v1/auth/forgot-password/send-otp",
  FORGOT_PASSWORD_VERIFY_OTP: "/api/v1/auth/forgot-password/verify-otp",
  FORGOT_PASSWORD_RESET: "/api/v1/auth/forgot-password/reset",
} as const;

export const PUBLIC_ROUTES: string[] = [
  AUTH.LOGIN,
  AUTH.REGISTER,
  AUTH.GOOGLE_START,
  AUTH.SEND_EMAIL_OTP,
  AUTH.VERIFY_EMAIL_OTP,
  AUTH.SEND_MOBILE_OTP,
  AUTH.VERIFY_MOBILE_OTP,
  AUTH.FORGOT_PASSWORD_SEND_OTP,
  AUTH.FORGOT_PASSWORD_VERIFY_OTP,
  AUTH.FORGOT_PASSWORD_RESET,
  "/api/v1/staff/invite",
];
