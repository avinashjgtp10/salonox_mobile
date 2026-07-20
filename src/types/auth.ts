export type AuthUser = {
  id: string;
  email: string;
  role: string;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  businessName?: string | null;
  address?: string | null;
  country?: string | null;
  countryCode?: string | null;
  isVerified?: boolean;
  isActive?: boolean;
  isOnboardingComplete?: boolean;
  custom_permissions?: Record<string, unknown> | string[] | null;
  clientId?: string | null;
  salonId?: string | null;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type LoginResponseData = AuthTokens & {
  isOnboardingComplete: boolean;
  user: AuthUser;
};

export type RegisterCredentials = {
  fullName: string;
  businessName: string;
  address: string;
  email: string;
  country: string;
  countryCode: string;
  phone: string;
  password: string;
  terms: boolean;
  formatted_address?: string;
  address_line_1?: string;
  area?: string;
  city?: string;
  state?: string;
  country_name?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  place_id?: string;
};

export type RegisterResponseData = AuthTokens & {
  isOnboardingComplete: boolean;
  user: AuthUser;
};

export type RefreshTokenResponseData = {
  accessToken: string;
  refreshToken?: string;
};

export type ForgotPasswordSendOtpRequest = {
  email: string;
};

export type ForgotPasswordVerifyOtpRequest = {
  email: string;
  otp: string;
};

export type ForgotPasswordVerifyOtpResponseData = {
  resetToken?: string;
  token?: string;
  verificationToken?: string;
};

export type ForgotPasswordResetRequest = {
  confirmPassword: string;
  email: string;
  otp?: string;
  password: string;
  resetToken?: string;
  token?: string;
  verificationToken?: string;
};

export type EmailOtpSendRequest = {
  email: string;
};

export type EmailOtpVerifyRequest = {
  email: string;
  otp: string;
};

export type EmailOtpVerifyResponseData = {
  isVerified?: boolean;
  verified?: boolean;
} | null;

export type DeleteAccountRequest = {
  password?: string;
};

export type ChangePasswordRequest = {
  confirmPassword: string;
  currentPassword: string;
  newPassword: string;
};

export type GoogleAuthResult = AuthTokens & {
  user?: AuthUser | null;
};

export type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};
