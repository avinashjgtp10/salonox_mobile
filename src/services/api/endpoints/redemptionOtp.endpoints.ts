// WhatsApp OTP gate for redeeming a client's package session / membership
// benefit. Mirrors the backend module mounted at /api/v1/redemption-otp.
export const REDEMPTION_OTP = {
  STATUS: "/redemption-otp/status",
  REQUEST: "/redemption-otp/request",
  VERIFY: "/redemption-otp/verify",
} as const;
