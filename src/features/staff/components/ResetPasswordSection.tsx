import { useState } from "react";
import type { FC } from "react";
import { Eye, EyeSlash } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { STAFF } from "../../../services/api/endpoints";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { sendEmailOtpThunk, verifyEmailOtpThunk } from "../../../middleware/auth/otpThunk";

interface ResetPasswordSectionProps {
  staffId: string;
  email: string;
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

/**
 * Self-contained "existing login has a password → Reset Password → New/Confirm
 * Password + OTP-gated Update Password" flow. Reusable anywhere a staff member's
 * password needs resetting (Edit Staff, staff detail drawers, etc.) — owns its
 * own state and fires its own PATCH, independent of any surrounding form/Save.
 */
const ResetPasswordSection: FC<ResetPasswordSectionProps> = ({ staffId, email, onSuccess, onError }) => {
  const dispatch = useAppDispatch();

  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password changes require the staff member's email to be OTP-verified
  // first — Update Password stays disabled until this passes, so a reset
  // can't be pushed through without proving control of that inbox.
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpMsg, setOtpMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);

  const isNewPasswordInvalid = attempted && newPassword.trim().length < 8;
  const isConfirmNewPasswordInvalid = attempted && confirmNewPassword !== newPassword;

  const resetOtpState = () => {
    setOtp("");
    setOtpSent(false);
    setOtpVerified(false);
    setOtpMsg(null);
    setOtpError(null);
  };

  const openReset = () => {
    setShowPasswordReset(true);
    setNewPassword("");
    setConfirmNewPassword("");
    setAttempted(false);
    resetOtpState();
  };

  const closeReset = () => {
    setShowPasswordReset(false);
    setNewPassword("");
    setConfirmNewPassword("");
    setAttempted(false);
    resetOtpState();
  };

  const handleSendOtp = async () => {
    setAttempted(true);
    if (newPassword.trim().length < 8 || confirmNewPassword !== newPassword) return;

    setOtpVerified(false);
    setOtpSent(false);
    setOtp("");
    setOtpMsg(null);
    setOtpError(null);
    setOtpLoading(true);

    const result = await dispatch(sendEmailOtpThunk({ email: email.trim() }));
    if (sendEmailOtpThunk.fulfilled.match(result)) {
      setOtpSent(true);
      setOtpMsg({ type: "success", text: "OTP sent! Check the staff member's inbox." });
    } else {
      setOtpMsg({ type: "error", text: (result.payload as string) ?? "Failed to send OTP." });
    }
    setOtpLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      setOtpError("Please enter the OTP");
      return;
    }
    setOtpLoading(true);
    setOtpError(null);
    const result = await dispatch(verifyEmailOtpThunk({ email: email.trim(), otp }));
    if (verifyEmailOtpThunk.fulfilled.match(result)) {
      setOtpVerified(true);
      setOtpMsg(null);
    } else {
      setOtpError((result.payload as string) ?? "Invalid OTP.");
    }
    setOtpLoading(false);
  };

  const handleUpdatePassword = async () => {
    setAttempted(true);
    if (newPassword.trim().length < 8 || confirmNewPassword !== newPassword || !otpVerified) return;

    setLoading(true);
    try {
      await api.patch(STAFF.BY_ID(staffId), { password: newPassword.trim() });
      closeReset();
      onSuccess?.();
    } catch (error: unknown) {
      console.error("Error updating password:", error);
      const err = error as { response?: { data?: { message?: string; error?: { message?: string } } }; message?: string };
      onError?.(err.response?.data?.message || err.response?.data?.error?.message || err.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  if (!showPasswordReset) {
    return (
      <div className="emp-field">
        <label className="emp-field__label">Password</label>
        <div className="emp-input-row">
          <input className="emp-input emp-password-input" type="password" value="********" disabled readOnly />
          <button type="button" className="emp-otp-btn" onClick={openReset}>
            Reset Password
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="emp-login-grid">
        <div className="emp-field">
          <label className="emp-field__label">New Password</label>
          <div className={`emp-password-group ${isNewPasswordInvalid ? "emp-input--invalid" : ""}`}>
            <input
              className="emp-input emp-password-input"
              placeholder="New Password"
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (otpVerified || otpSent) resetOtpState();
              }}
            />
            <button type="button" className="emp-password-eye" onClick={() => setShowPassword((v) => !v)}>
              {showPassword ? <EyeSlash size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {isNewPasswordInvalid && <span className="emp-field__error">Password must be at least 8 characters</span>}
        </div>
        <div className="emp-field">
          <label className="emp-field__label">Confirm Password</label>
          <div className={`emp-password-group ${isConfirmNewPasswordInvalid ? "emp-input--invalid" : ""}`}>
            <input
              className="emp-input emp-password-input"
              placeholder="Confirm Password"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmNewPassword}
              onChange={(e) => {
                setConfirmNewPassword(e.target.value);
                if (otpVerified || otpSent) resetOtpState();
              }}
            />
            <button type="button" className="emp-password-eye" onClick={() => setShowConfirmPassword((v) => !v)}>
              {showConfirmPassword ? <EyeSlash size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {isConfirmNewPasswordInvalid && <span className="emp-field__error">Passwords do not match</span>}
        </div>
      </div>

      {/* OTP gate — Update Password stays disabled until this passes */}
      <div className="emp-field emp-otp-field">
        <div className="emp-input-row">
          <button
            type="button"
            className={`emp-otp-btn ${otpVerified ? "emp-otp-btn--verified" : ""}`}
            onClick={handleSendOtp}
            disabled={otpLoading || otpVerified}
          >
            {otpLoading && !otpSent ? "Sending…" : otpVerified ? "Verified" : otpSent ? "Resend OTP" : "Send OTP"}
          </button>
          {otpVerified && (
            <span className="emp-verified-tag emp-verified-tag--email">
              <span className="emp-verified-tag__check">✓</span>
              Email verified
            </span>
          )}
        </div>
        {otpMsg && <span className={`emp-otp-msg emp-otp-msg--${otpMsg.type}`}>{otpMsg.text}</span>}
        {!otpSent && !otpVerified && !otpMsg && (
          <span className="emp-field__hint">
            OTP verification of this staff member's email is required to update the password.
          </span>
        )}

        {otpSent && !otpVerified && (
          <div className="emp-input-row emp-otp-verify-row">
            <input
              className="emp-input"
              placeholder="6-digit OTP"
              value={otp}
              maxLength={6}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, ""));
                if (otpError) setOtpError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
            />
            <button
              type="button"
              className="emp-verify-btn"
              onClick={handleVerifyOtp}
              disabled={otpLoading || otp.length < 6}
            >
              {otpLoading ? "Verifying…" : "Verify"}
            </button>
          </div>
        )}
        {otpError && <span className="emp-field__error">{otpError}</span>}
        {attempted && !otpVerified && newPassword.trim().length >= 8 && confirmNewPassword === newPassword && (
          <span className="emp-field__error">Verify the OTP before updating the password</span>
        )}
      </div>

      <div className="emp-password-actions">
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={closeReset} disabled={loading}>
          Cancel
        </button>
        <button
          type="button"
          className="btn add-staff__btn-add btn-sm"
          onClick={handleUpdatePassword}
          disabled={loading || !otpVerified}
        >
          {loading ? "Updating..." : "Update Password"}
        </button>
      </div>
    </>
  );
};

export default ResetPasswordSection;
