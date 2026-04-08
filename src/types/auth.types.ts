export interface SendEmailOtpPayload {
  email: string;
}

export interface VerifyEmailOtpPayload {
  email: string;
  otp: string;
}

export interface OtpResponse {
  status?: string;
  success?: boolean;
  data?: {
    success?: boolean;
  };
}

export interface LoginPayload {
  email: string;
  password?: string;
}

export interface LoginResponse {
  data: {
    accessToken: string;
    refreshToken: string;
    isOnboardingComplete: boolean;
  };
}

export interface RegisterPayload {
  email: string;
  password?: string;
  fullName: string;
  businessName: string;
  address: string;
  country: string;
  countryCode: string;
  phone: string;
  terms?: boolean;
}

export interface RegisterResponse {
  data: {
    accessToken: string;
    refreshToken: string;
    isOnboardingComplete: boolean;
  };
}

export interface ForgotPasswordSendOtpPayload {
  email: string;
}

export interface ForgotPasswordVerifyOtpPayload {
  email: string;
  otp: string;
}

export interface ForgotPasswordResetPayload {
  email: string;
  otp: string;
  newPassword?: string;
}
