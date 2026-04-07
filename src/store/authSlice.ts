import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import { loginThunk, registerThunk } from "../middleware/auth/authThunk"
import { sendEmailOtpThunk, verifyEmailOtpThunk } from "../middleware/auth/otpThunk"
import {
  forgotPasswordSendOtpThunk,
  forgotPasswordVerifyOtpThunk,
  forgotPasswordResetThunk,
} from "../middleware/auth/forgotPasswordThunk"

export interface AuthLoadingState {
  login:           boolean
  register:        boolean
  sendOtp:         boolean
  verifyOtp:       boolean
  forgotSendOtp:   boolean
  forgotVerifyOtp: boolean
  forgotReset:     boolean
}

export interface AuthState {
  accessToken:          string | null
  refreshToken:         string | null
  isOnboardingComplete: boolean
  loading:              AuthLoadingState
  error:                string | null
}

const initialState: AuthState = {
  accessToken:          sessionStorage.getItem("accessToken"),
  refreshToken:         sessionStorage.getItem("refreshToken"),
  isOnboardingComplete: sessionStorage.getItem("isOnboardingComplete") === "true",
  loading: {
    login:           false,
    register:        false,
    sendOtp:         false,
    verifyOtp:       false,
    forgotSendOtp:   false,
    forgotVerifyOtp: false,
    forgotReset:     false,
  },
  error: null,
}

const persist = (
  accessToken: string,
  refreshToken: string,
  isOnboardingComplete: boolean
) => {
  sessionStorage.setItem("accessToken",          accessToken)
  sessionStorage.setItem("refreshToken",         refreshToken)
  sessionStorage.setItem("isOnboardingComplete", String(isOnboardingComplete))
}

const clear = () => {
  sessionStorage.removeItem("accessToken")
  sessionStorage.removeItem("refreshToken")
  sessionStorage.removeItem("isOnboardingComplete")
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Google OAuth — tokens come from URL params
    login(
      state,
      action: PayloadAction<{
        accessToken:          string
        refreshToken:         string | null
        isOnboardingComplete: boolean
      }>
    ) {
      const { accessToken, refreshToken, isOnboardingComplete } = action.payload
      state.accessToken          = accessToken
      state.refreshToken         = refreshToken ?? null
      state.isOnboardingComplete = isOnboardingComplete
      persist(accessToken, refreshToken ?? "", isOnboardingComplete)
    },

    updateToken(state, action: PayloadAction<string>) {
      state.accessToken = action.payload
      sessionStorage.setItem("accessToken", action.payload)
    },

    updateOnboardingStatus(state, action: PayloadAction<boolean>) {
      state.isOnboardingComplete = action.payload
      sessionStorage.setItem("isOnboardingComplete", String(action.payload))
    },

    logout(state) {
      state.accessToken          = null
      state.refreshToken         = null
      state.isOnboardingComplete = false
      state.error                = null
      clear()
    },

    clearError(state) {
      state.error = null
    },
  },

  extraReducers: (builder) => {
    // ── loginThunk ────────────────────────────────────────────────────────────
    builder
      .addCase(loginThunk.pending, (state) => {
        state.loading.login = true
        state.error         = null
      })
      .addCase(loginThunk.fulfilled, (state, { payload }) => {
        state.loading.login        = false
        state.accessToken          = payload.accessToken
        state.refreshToken         = payload.refreshToken
        state.isOnboardingComplete = payload.isOnboardingComplete
        persist(payload.accessToken, payload.refreshToken ?? "", payload.isOnboardingComplete)
      })
      .addCase(loginThunk.rejected, (state, { payload }) => {
        state.loading.login = false
        state.error         = payload ?? "Login failed"
      })

    // ── registerThunk ─────────────────────────────────────────────────────────
    builder
      .addCase(registerThunk.pending, (state) => {
        state.loading.register = true
        state.error            = null
      })
      .addCase(registerThunk.fulfilled, (state, { payload }) => {
        state.loading.register     = false
        state.accessToken          = payload.accessToken
        state.refreshToken         = payload.refreshToken
        state.isOnboardingComplete = payload.isOnboardingComplete
        persist(payload.accessToken, payload.refreshToken ?? "", payload.isOnboardingComplete)
      })
      .addCase(registerThunk.rejected, (state, { payload }) => {
        state.loading.register = false
        state.error            = payload ?? "Registration failed"
      })

    // ── OTP thunks ────────────────────────────────────────────────────────────
    builder
      .addCase(sendEmailOtpThunk.pending,   (state) => { state.loading.sendOtp = true  })
      .addCase(sendEmailOtpThunk.fulfilled, (state) => { state.loading.sendOtp = false })
      .addCase(sendEmailOtpThunk.rejected,  (state) => { state.loading.sendOtp = false })

    builder
      .addCase(verifyEmailOtpThunk.pending,   (state) => { state.loading.verifyOtp = true  })
      .addCase(verifyEmailOtpThunk.fulfilled, (state) => { state.loading.verifyOtp = false })
      .addCase(verifyEmailOtpThunk.rejected,  (state, { payload }) => {
        state.loading.verifyOtp = false
        state.error             = payload ?? "Verification failed"
      })

    // ── Forgot Password thunks ────────────────────────────────────────────────
    builder
      .addCase(forgotPasswordSendOtpThunk.pending,   (state) => { state.loading.forgotSendOtp = true;  state.error = null })
      .addCase(forgotPasswordSendOtpThunk.fulfilled, (state) => { state.loading.forgotSendOtp = false })
      .addCase(forgotPasswordSendOtpThunk.rejected,  (state, { payload }) => {
        state.loading.forgotSendOtp = false
        state.error                 = payload ?? "Failed to send OTP"
      })

    builder
      .addCase(forgotPasswordVerifyOtpThunk.pending,   (state) => { state.loading.forgotVerifyOtp = true;  state.error = null })
      .addCase(forgotPasswordVerifyOtpThunk.fulfilled, (state) => { state.loading.forgotVerifyOtp = false })
      .addCase(forgotPasswordVerifyOtpThunk.rejected,  (state, { payload }) => {
        state.loading.forgotVerifyOtp = false
        state.error                   = payload ?? "Invalid OTP"
      })

    builder
      .addCase(forgotPasswordResetThunk.pending,   (state) => { state.loading.forgotReset = true;  state.error = null })
      .addCase(forgotPasswordResetThunk.fulfilled, (state) => { state.loading.forgotReset = false })
      .addCase(forgotPasswordResetThunk.rejected,  (state, { payload }) => {
        state.loading.forgotReset = false
        state.error               = payload ?? "Failed to reset password"
      })
  },
})

export const {
  login,
  updateToken,
  updateOnboardingStatus,
  logout,
  clearError,
} = authSlice.actions

export default authSlice.reducer
