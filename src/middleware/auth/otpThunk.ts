import { createAsyncThunk } from "@reduxjs/toolkit"
import api from "../../services/api/axios"
import { AUTH } from "../../services/api/endpoints"
import { ApiError } from "../../services/api/interceptors"
import type {
  SendEmailOtpPayload,
  VerifyEmailOtpPayload,
  OtpResponse,
} from "../../types/auth.types"

// ── Send Email OTP ────────────────────────────────────────────────────────────
export const sendEmailOtpThunk = createAsyncThunk<
  void,
  SendEmailOtpPayload,
  { rejectValue: string }
>("auth/sendEmailOtp", async (payload, { rejectWithValue }) => {
  try {
    await api.post(AUTH.SEND_EMAIL_OTP, payload)
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message)
    return rejectWithValue("Failed to send OTP. Try again.")
  }
})

// ── Verify Email OTP ──────────────────────────────────────────────────────────
export const verifyEmailOtpThunk = createAsyncThunk<
  boolean,
  VerifyEmailOtpPayload,
  { rejectValue: string }
>("auth/verifyEmailOtp", async (payload, { rejectWithValue }) => {
  try {
    const res = await api.post<OtpResponse>(AUTH.VERIFY_EMAIL_OTP, payload)
    const d = res.data
    if (d?.status === "success" || d?.success || d?.data?.success) return true
    return rejectWithValue("Verification failed. Please check the OTP.")
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message)
    return rejectWithValue("Invalid OTP. Please try again.")
  }
})
