import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, LogOut, Key, History, Shield } from "lucide-react";
import Button from "../../../components/ui/Button";
import SettingsSection from "../../settings/components/SettingsSection";
import SettingsToggle from "../../settings/components/SettingsToggle";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { changePasswordThunk } from "../../../middleware/user/user.thunk";
import { performLogout } from "../../../utils/performLogout";
import api from "../../../services/api/axios";

interface PwErrors { currentPassword?: string; newPassword?: string; confirmPassword?: string }

const validateNewPassword = (pw: string): string | undefined => {
  if (pw.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(pw)) return "Password must contain at least one uppercase letter";
  if (!/[0-9]/.test(pw)) return "Password must contain at least one number";
  return undefined;
};

function PasswordField({ label, value, show, error, onToggle, onChange }: {
  label: string; value: string; show: boolean; error?: string; onToggle: () => void; onChange: (v: string) => void;
}) {
  return (
    <div className="settings-form-group">
      <label className="settings-label"><Lock size={13} /> {label}</label>
      <div className="settings-pw-wrap">
        <input
          className={`settings-input${error ? " settings-input--error" : ""}`}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          style={{ paddingRight: 40 }}
        />
        <button type="button" onClick={onToggle} className="settings-pw-eye-btn">
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && <span className="settings-error">{error}</span>}
    </div>
  );
}

export default function BranchOwnerAccountSecuritySection() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { showSuccess, showError, overlay } = useStatusOverlay();

  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwErrors, setPwErrors] = useState<PwErrors>({});
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  const resetPasswordForm = () => {
    setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setPwErrors({});
  };

  const handleSavePassword = async () => {
    const errors: PwErrors = {};
    if (!currentPassword) errors.currentPassword = "Current password is required";
    const strengthError = validateNewPassword(newPassword);
    if (strengthError) errors.newPassword = strengthError;
    else if (currentPassword && newPassword === currentPassword) errors.newPassword = "New password must be different from your current password";
    if (!confirmPassword) errors.confirmPassword = "Please confirm your new password";
    else if (confirmPassword !== newPassword) errors.confirmPassword = "Passwords do not match";

    setPwErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    const result = await dispatch(changePasswordThunk({ currentPassword, newPassword }));
    setSaving(false);
    if (changePasswordThunk.fulfilled.match(result)) {
      showSuccess("Password updated successfully.");
      resetPasswordForm();
      setIsEditingPassword(false);
    } else {
      const message = (result.payload as string) || "Failed to change password";
      if (/current password/i.test(message)) setPwErrors({ currentPassword: message });
      else showError(message);
    }
  };

  const handleCancelPassword = () => {
    resetPasswordForm();
    setIsEditingPassword(false);
  };

  const handleLogoutAllDevices = async () => {
    setLoggingOutAll(true);
    try {
      await api.post("/api/v1/auth/logout-all");
      showSuccess("Logged out of all devices");
      // logout-all already revoked every refresh token server-side
      // (including this session's own) — performLogout's own revoke call
      // just no-ops against an already-deleted token; its real job here is
      // the full client-side reset (every Redux slice + persisted storage).
      await performLogout(navigate);
    } catch {
      showError("Failed to log out all devices");
    } finally {
      setLoggingOutAll(false);
    }
  };

  return (
    <>
      {overlay}
      <div className="settings-page-header">
        <h2 className="settings-page-title">Account &amp; Security</h2>
        <p className="settings-page-subtitle">Your password and sessions across salons.</p>
      </div>

      <SettingsSection
        title="Password"
        desc="Change your login password."
        headerAction={!isEditingPassword ? (
          <Button variant="outline-secondary" size="sm" onClick={() => setIsEditingPassword(true)} iconLeft={<Key size={13} />}>
            Change password
          </Button>
        ) : undefined}
      >
        {!isEditingPassword ? (
          <div className="settings-security-item">
            <div className="settings-security-icon"><Key size={18} /></div>
            <div className="settings-security-info">
              <p className="settings-security-name">Password</p>
              <p className="settings-security-desc">••••••••</p>
            </div>
          </div>
        ) : (
          <>
            <div className="settings-form-grid">
              <PasswordField label="Current password" value={currentPassword} show={showCurrent} error={pwErrors.currentPassword} onToggle={() => setShowCurrent((v) => !v)} onChange={setCurrentPassword} />
              <div />
              <PasswordField label="New password" value={newPassword} show={showNew} error={pwErrors.newPassword} onToggle={() => setShowNew((v) => !v)} onChange={setNewPassword} />
              <PasswordField label="Confirm new password" value={confirmPassword} show={showConfirm} error={pwErrors.confirmPassword} onToggle={() => setShowConfirm((v) => !v)} onChange={setConfirmPassword} />
            </div>
            <div className="settings-form-actions">
              <Button variant="ghost" size="sm" onClick={handleCancelPassword} disabled={saving}>Cancel</Button>
              <Button size="sm" onClick={handleSavePassword} loading={saving} disabled={saving}>Update password</Button>
            </div>
          </>
        )}
      </SettingsSection>

      <SettingsSection title="Sessions & Devices" desc="Sign out everywhere if you suspect unauthorized access.">
        <div className="settings-security-item">
          <div className="settings-security-icon"><LogOut size={18} /></div>
          <div className="settings-security-info">
            <p className="settings-security-name">Log out of all devices</p>
            <p className="settings-security-desc">Ends every active session, including this one</p>
          </div>
          <Button variant="outline-danger" size="sm" onClick={handleLogoutAllDevices} loading={loggingOutAll} disabled={loggingOutAll}>
            Log out everywhere
          </Button>
        </div>
        <div className="settings-security-item">
          <div className="settings-security-icon"><History size={18} /></div>
          <div className="settings-security-info">
            <p className="settings-security-name">Per-device session list</p>
            <p className="settings-security-desc">Not available yet — sessions aren't tracked per-device</p>
          </div>
          <Button variant="outline-secondary" size="sm" disabled>Coming soon</Button>
        </div>
      </SettingsSection>

      <SettingsSection title="Two-Factor Authentication" desc="Not available yet on this account.">
        <div className="settings-toggle-row">
          <div className="settings-security-icon" style={{ background: "#f3f4f6", color: "#9ca3af" }}>
            <Shield size={18} />
          </div>
          <div className="settings-toggle-info">
            <p className="settings-toggle-title">Require a code at sign-in</p>
            <p className="settings-toggle-desc">Two-factor authentication isn't supported yet</p>
          </div>
          <SettingsToggle checked={false} onChange={() => {}} disabled />
        </div>
      </SettingsSection>
    </>
  );
}
