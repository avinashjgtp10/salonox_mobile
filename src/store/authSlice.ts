import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

function decodeJwt(token: string): { role: string | null; salonId: string | null; impersonatedBy: string | null } {
  try {
    const payload = token.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded  = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const decoded = JSON.parse(atob(padded));
    return {
      role:           decoded?.role     ?? null,
      salonId:        decoded?.salonId  ?? decoded?.salon_id ?? null,
      impersonatedBy: decoded?.impersonatedBy ?? null,
    };
  } catch {
    return { role: null, salonId: null, impersonatedBy: null };
  }
}
import {
  loginThunk,
  registerThunk,
  refreshSessionThunk,
} from "../middleware/auth/authThunk";
import {
  sendEmailOtpThunk,
  verifyEmailOtpThunk,
} from "../middleware/auth/otpThunk";
import {
  forgotPasswordSendOtpThunk,
  forgotPasswordVerifyOtpThunk,
  forgotPasswordResetThunk,
} from "../middleware/auth/forgotPasswordThunk";

export interface AuthLoadingState {
  login: boolean;
  register: boolean;
  sendOtp: boolean;
  verifyOtp: boolean;
  forgotSendOtp: boolean;
  forgotVerifyOtp: boolean;
  forgotReset: boolean;
}

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  isOnboardingComplete: boolean;
  role: string | null;
  salonId: string | null;
  impersonatedBy: string | null;
  custom_permissions: Record<string, boolean> | null;
  loading: AuthLoadingState;
  error: string | null;
}

const initialState: AuthState = {
  accessToken: null,
  refreshToken: null,
  isOnboardingComplete: false,
  role: null,
  salonId: null,
  impersonatedBy: null,
  custom_permissions: null,
  loading: {
    login: false,
    register: false,
    sendOtp: false,
    verifyOtp: false,
    forgotSendOtp: false,
    forgotVerifyOtp: false,
    forgotReset: false,
  },
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Google OAuth — tokens come from URL params
    login(
      state,
      action: PayloadAction<{
        accessToken: string;
        refreshToken: string | null;
        isOnboardingComplete: boolean;
      }>,
    ) {
      const { accessToken, refreshToken, isOnboardingComplete } =
        action.payload;
      state.accessToken = accessToken;
      state.refreshToken = refreshToken ?? null;
      state.isOnboardingComplete = isOnboardingComplete;
      const jwt = decodeJwt(accessToken);
      state.role           = jwt.role;
      state.salonId        = jwt.salonId;
      state.impersonatedBy = jwt.impersonatedBy;
    },

    updateToken(state, action: PayloadAction<string>) {
      state.accessToken = action.payload;
      const jwt = decodeJwt(action.payload);
      state.role           = jwt.role;
      state.salonId        = jwt.salonId;
      state.impersonatedBy = jwt.impersonatedBy;
    },

    updateOnboardingStatus(state, action: PayloadAction<boolean>) {
      state.isOnboardingComplete = action.payload;
    },

    setCustomPermissions(state, action: PayloadAction<Record<string, boolean> | null>) {
      state.custom_permissions = action.payload;
    },

    logout(state) {
      state.accessToken = null;
      state.refreshToken = null;
      state.isOnboardingComplete = false;
      state.role = null;
      state.salonId = null;
      state.impersonatedBy = null;
      state.custom_permissions = null;
      state.error = null;
    },

    clearError(state) {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    // ── loginThunk ────────────────────────────────────────────────────────────
    builder
      .addCase(loginThunk.pending, (state) => {
        state.loading.login = true;
        state.error = null;
      })
      .addCase(loginThunk.fulfilled, (state, { payload }) => {
        state.loading.login = false;
        state.accessToken = payload.accessToken;
        state.refreshToken = payload.refreshToken;
        state.isOnboardingComplete = payload.isOnboardingComplete;
        const jwt = decodeJwt(payload.accessToken);
        state.role           = payload.user?.role    ?? jwt.role;
        state.salonId        = payload.user?.salonId ?? jwt.salonId;
        state.impersonatedBy = jwt.impersonatedBy;
        state.custom_permissions = payload.user?.custom_permissions ?? null;
      })
      .addCase(loginThunk.rejected, (state, { payload }) => {
        state.loading.login = false;
        state.error = payload ?? "Login failed";
      });

    // ── refreshSessionThunk ───────────────────────────────────────────────────
    // Runs on every app boot when accessToken is absent but refreshToken exists.
    // On success  → store the new access token in Redux memory only (not localStorage).
    // On failure  → clear auth state so the user is redirected to /login.
    builder
      .addCase(refreshSessionThunk.fulfilled, (state, { payload }) => {
        state.accessToken = payload;
        const jwt = decodeJwt(payload);
        state.role           = jwt.role;
        state.salonId        = jwt.salonId;
        state.impersonatedBy = jwt.impersonatedBy;
      })
      .addCase(refreshSessionThunk.rejected, (state) => {
        state.accessToken = null;
        state.refreshToken = null;
        state.isOnboardingComplete = false;
        state.error = null;
      });

    // ── registerThunk ─────────────────────────────────────────────────────────
    builder
      .addCase(registerThunk.pending, (state) => {
        state.loading.register = true;
        state.error = null;
      })
      .addCase(registerThunk.fulfilled, (state, { payload }) => {
        state.loading.register = false;
        state.accessToken = payload.accessToken;
        state.refreshToken = payload.refreshToken;
        state.isOnboardingComplete = payload.isOnboardingComplete;
      })
      .addCase(registerThunk.rejected, (state, { payload }) => {
        state.loading.register = false;
        state.error = payload ?? "Registration failed";
      });

    // ── OTP thunks ────────────────────────────────────────────────────────────
    builder
      .addCase(sendEmailOtpThunk.pending, (state) => {
        state.loading.sendOtp = true;
      })
      .addCase(sendEmailOtpThunk.fulfilled, (state) => {
        state.loading.sendOtp = false;
      })
      .addCase(sendEmailOtpThunk.rejected, (state) => {
        state.loading.sendOtp = false;
      });

    builder
      .addCase(verifyEmailOtpThunk.pending, (state) => {
        state.loading.verifyOtp = true;
      })
      .addCase(verifyEmailOtpThunk.fulfilled, (state) => {
        state.loading.verifyOtp = false;
      })
      .addCase(verifyEmailOtpThunk.rejected, (state, { payload }) => {
        state.loading.verifyOtp = false;
        state.error = payload ?? "Verification failed";
      });

    // ── Forgot Password thunks ────────────────────────────────────────────────
    builder
      .addCase(forgotPasswordSendOtpThunk.pending, (state) => {
        state.loading.forgotSendOtp = true;
        state.error = null;
      })
      .addCase(forgotPasswordSendOtpThunk.fulfilled, (state) => {
        state.loading.forgotSendOtp = false;
      })
      .addCase(forgotPasswordSendOtpThunk.rejected, (state, { payload }) => {
        state.loading.forgotSendOtp = false;
        state.error = payload ?? "Failed to send OTP";
      });

    builder
      .addCase(forgotPasswordVerifyOtpThunk.pending, (state) => {
        state.loading.forgotVerifyOtp = true;
        state.error = null;
      })
      .addCase(forgotPasswordVerifyOtpThunk.fulfilled, (state) => {
        state.loading.forgotVerifyOtp = false;
      })
      .addCase(forgotPasswordVerifyOtpThunk.rejected, (state, { payload }) => {
        state.loading.forgotVerifyOtp = false;
        state.error = payload ?? "Invalid OTP";
      });

    builder
      .addCase(forgotPasswordResetThunk.pending, (state) => {
        state.loading.forgotReset = true;
        state.error = null;
      })
      .addCase(forgotPasswordResetThunk.fulfilled, (state) => {
        state.loading.forgotReset = false;
      })
      .addCase(forgotPasswordResetThunk.rejected, (state, { payload }) => {
        state.loading.forgotReset = false;
        state.error = payload ?? "Failed to reset password";
      });
  },
});

export const {
  login,
  updateToken,
  updateOnboardingStatus,
  setCustomPermissions,
  logout,
  clearError,
} = authSlice.actions;

export default authSlice.reducer;
