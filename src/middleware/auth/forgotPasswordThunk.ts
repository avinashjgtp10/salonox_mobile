import { createAsyncThunk } from "@reduxjs/toolkit"
import api from "../../services/api/axios"
import { AUTH } from "../../services/api/endpoints"
import { ApiError } from "../../services/api/interceptors"
import type {
  ForgotPasswordSendOtpPayload,
  ForgotPasswordVerifyOtpPayload,
  ForgotPasswordResetPayload,
  OtpResponse,
} from "../../types/auth.types"

// ── Send OTP ──────────────────────────────────────────────────────────────────
export const forgotPasswordSendOtpThunk = createAsyncThunk<
  void,
  ForgotPasswordSendOtpPayload,
  { rejectValue: string }
>("auth/forgotPasswordSendOtp", async (payload, { rejectWithValue }) => {
  try {
    await api.post<OtpResponse>(AUTH.FORGOT_PASSWORD_SEND_OTP, payload)
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message)
    return rejectWithValue("Failed to send OTP. Please try again.")
  }
})

// ── Verify OTP ────────────────────────────────────────────────────────────────
export const forgotPasswordVerifyOtpThunk = createAsyncThunk<
  void,
  ForgotPasswordVerifyOtpPayload,
  { rejectValue: string }
>("auth/forgotPasswordVerifyOtp", async (payload, { rejectWithValue }) => {
  try {
    await api.post<OtpResponse>(AUTH.FORGOT_PASSWORD_VERIFY_OTP, payload)
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message)
    return rejectWithValue("Invalid OTP. Please try again.")
  }
})

// ── Reset Password ────────────────────────────────────────────────────────────
export const forgotPasswordResetThunk = createAsyncThunk<
  void,
  ForgotPasswordResetPayload & { rawPassword: string },
  { rejectValue: string }
>("auth/forgotPasswordReset", async ({ rawPassword, ...rest }, { rejectWithValue }) => {
  try {
    const payload: ForgotPasswordResetPayload = { ...rest, newPassword: rawPassword }
    await api.post<OtpResponse>(AUTH.FORGOT_PASSWORD_RESET, payload)
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message)
    return rejectWithValue("Failed to reset password. Please try again.")
  }
})
