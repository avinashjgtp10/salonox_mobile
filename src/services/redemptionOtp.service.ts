import { api } from "@/services/api";
import { REDEMPTION_OTP } from "@/services/api/endpoints";

// Client-facing contract of the backend's redemption-otp module. The salon's
// own switch (redeem_otp_required) decides whether these are enforced; the
// endpoints themselves are the gate for redeeming a package session or a
// membership benefit at checkout.

export type RedemptionOtpStatus = {
  /** True when the salon requires an OTP for at least one of package / membership. */
  required: boolean;
  /** True when no OTP is required, or a verified window is still open for this client. */
  verified: boolean;
  /** Seconds left on the verified window (0 when none). */
  expiresIn: number;
};

export type RedemptionOtpRequestResult = {
  /** Masked destination, e.g. "+91 •••••• 6381". */
  sentTo: string;
  /** Seconds the code stays valid. */
  expiresIn: number;
  /** Seconds before another code can be requested. */
  resendIn: number;
};

const num = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const redemptionOtpService = {
  /** Whether this client still needs to verify before redeeming. */
  async status(clientId: string): Promise<RedemptionOtpStatus> {
    const response = await api.get<{ data: { required?: boolean; verified?: boolean; expires_in?: number } }>(
      REDEMPTION_OTP.STATUS,
      { params: { clientId } },
    );
    const data = response.data.data ?? {};
    return {
      required: data.required === true,
      verified: data.verified !== false,
      expiresIn: num(data.expires_in),
    };
  },

  /** Send a fresh OTP to the client's registered WhatsApp number. */
  async request(clientId: string): Promise<RedemptionOtpRequestResult> {
    const response = await api.post<{ data: { sent_to?: string; expires_in?: number; resend_in?: number } }>(
      REDEMPTION_OTP.REQUEST,
      { clientId },
    );
    const data = response.data.data ?? {};
    return {
      sentTo: String(data.sent_to ?? ""),
      expiresIn: num(data.expires_in),
      resendIn: num(data.resend_in),
    };
  },

  /** Verify the code the client read out. Throws on an incorrect / expired code. */
  async verify(clientId: string, code: string): Promise<{ verified: boolean; expiresIn: number }> {
    const response = await api.post<{ data: { verified?: boolean; expires_in?: number } }>(
      REDEMPTION_OTP.VERIFY,
      { clientId, code },
    );
    const data = response.data.data ?? {};
    return { verified: data.verified === true, expiresIn: num(data.expires_in) };
  },
};
