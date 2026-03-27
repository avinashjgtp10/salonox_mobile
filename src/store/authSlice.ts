import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import { loginThunk, registerThunk } from "../middleware/auth/authThunk"
import { sendEmailOtpThunk, verifyEmailOtpThunk } from "../middleware/auth/otpThunk"

export interface AuthState {
  accessToken:          string | null
  refreshToken:         string | null
  isOnboardingComplete: boolean
  loading:              boolean
  error:                string | null
}

const initialState: AuthState = {
  accessToken:          localStorage.getItem("accessToken"),
  refreshToken:         localStorage.getItem("refreshToken"),
  isOnboardingComplete: localStorage.getItem("isOnboardingComplete") === "true",
  loading:              false,
  error:                null,
}

const persist = (
  accessToken: string,
  refreshToken: string,
  isOnboardingComplete: boolean
) => {
  localStorage.setItem("accessToken",          accessToken)
  localStorage.setItem("refreshToken",         refreshToken)
  localStorage.setItem("isOnboardingComplete", String(isOnboardingComplete))
}

const clear = () => {
  localStorage.removeItem("accessToken")
  localStorage.removeItem("refreshToken")
  localStorage.removeItem("isOnboardingComplete")
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
      localStorage.setItem("accessToken", action.payload)
    },

    updateOnboardingStatus(state, action: PayloadAction<boolean>) {
      state.isOnboardingComplete = action.payload
      localStorage.setItem("isOnboardingComplete", String(action.payload))
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
        state.loading = true
        state.error   = null
      })
      .addCase(loginThunk.fulfilled, (state, { payload }) => {
        state.loading              = false
        state.accessToken          = payload.accessToken
        state.refreshToken         = payload.refreshToken
        state.isOnboardingComplete = payload.isOnboardingComplete
        persist(payload.accessToken, payload.refreshToken, payload.isOnboardingComplete)
      })
      .addCase(loginThunk.rejected, (state, { payload }) => {
        state.loading = false
        state.error   = payload ?? "Login failed"
      })

    // ── registerThunk ─────────────────────────────────────────────────────────
    builder
      .addCase(registerThunk.pending, (state) => {
        state.loading = true
        state.error   = null
      })
      .addCase(registerThunk.fulfilled, (state, { payload }) => {
        state.loading              = false
        state.accessToken          = payload.accessToken
        state.refreshToken         = payload.refreshToken
        state.isOnboardingComplete = payload.isOnboardingComplete
        persist(payload.accessToken, payload.refreshToken, payload.isOnboardingComplete)
      })
      .addCase(registerThunk.rejected, (state, { payload }) => {
        state.loading = false
        state.error   = payload ?? "Registration failed"
      })

    // ── OTP thunks ────────────────────────────────────────────────────────────
    builder
      .addCase(sendEmailOtpThunk.pending,   (state) => { state.loading = true  })
      .addCase(sendEmailOtpThunk.fulfilled, (state) => { state.loading = false })
      .addCase(sendEmailOtpThunk.rejected,  (state) => { state.loading = false })

    builder
      .addCase(verifyEmailOtpThunk.pending,   (state) => { state.loading = true  })
      .addCase(verifyEmailOtpThunk.fulfilled, (state) => { state.loading = false })
      .addCase(verifyEmailOtpThunk.rejected,  (state) => { state.loading = false })
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
