import { useState } from "react";
import {
  Lock,
  Mail,
  ShieldCheck,
  Eye,
  EyeOff,
  Smartphone,
  Key,
  AlertTriangle,
  LogOut,
  Save,
  Pencil,
  X,
  CheckCircle2,
} from "lucide-react";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { performLogout } from "../../../utils/performLogout";
import { changePasswordThunk } from "../../../middleware/user/user.thunk";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api/axios";
import Button from "../../../components/ui/Button";
import SettingsSection from "../components/SettingsSection";

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface PasswordErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

// Mirrors the backend's changePasswordSchema (users.validator.ts) — kept in
// sync so the user sees the exact reason a password is rejected instead of
// round-tripping to the server to find out. Strength (Weak/Fair/Good/Strong)
// is deliberately NOT part of this — it's shown as guidance only and must
// never block the update on its own.
const validateNewPassword = (pw: string): string | undefined => {
  if (pw.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(pw)) return "Password must contain at least one uppercase letter";
  if (!/[0-9]/.test(pw)) return "Password must contain at least one number";
  return undefined;
};

const passwordStrength = (pw: string) => {
  if (!pw) return { label: "", color: "", pct: 0 };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: "Weak", color: "#ef4444", pct: 25 };
  if (score === 2) return { label: "Fair", color: "#f59e0b", pct: 50 };
  if (score === 3) return { label: "Good", color: "#3b82f6", pct: 75 };
  return { label: "Strong", color: "#10b981", pct: 100 };
};

interface PasswordFieldProps {
  name: string;
  label: string;
  value: string;
  show: boolean;
  error?: string;
  onToggle: () => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function PasswordField({
  name,
  label,
  value,
  show,
  error,
  onToggle,
  onChange,
}: PasswordFieldProps) {
  return (
    <div className="settings-form-group">
      <label className="settings-label">
        <Lock size={13} className="me-1" />
        {label}
      </label>
      <div className="settings-pw-wrap">
        <input
          className={`settings-input${error ? " settings-input--error" : ""}`}
          type={show ? "text" : "password"}
          name={name}
          value={value}
          onChange={onChange}
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

export default function AccountSettingsPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { profile, loading: userLoading } = useAppSelector((s) => s.user);

  const [pwForm, setPwForm] = useState<PasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [pwErrors, setPwErrors] = useState<PasswordErrors>({});
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // View -> Edit workflow: password fields stay hidden until Edit is clicked.
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [justChangedPassword, setJustChangedPassword] = useState(false);
  const pwIsDirty = !!(pwForm.currentPassword || pwForm.newPassword || pwForm.confirmPassword);

  const [twoFAEnabled, setTwoFAEnabled] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { showSuccess, showError, overlay } = useStatusOverlay();

  const strength = passwordStrength(pwForm.newPassword);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPwForm((prev) => ({ ...prev, [name]: value }));
    // Clear that field's error the moment the user edits it, rather than
    // leaving a stale error up until the next submit attempt.
    setPwErrors((prev) => (prev[name as keyof PasswordErrors] ? { ...prev, [name]: undefined } : prev));
  };

  const handleSavePassword = async () => {
    const errors: PasswordErrors = {};

    if (!pwForm.currentPassword) {
      errors.currentPassword = "Current password is required";
    }

    const strengthError = validateNewPassword(pwForm.newPassword);
    if (strengthError) {
      // Strength (Weak/Fair/Good/Strong) is guidance only — this only fires
      // for the actual required rules (length, upper/lower/number), never
      // for a low strength score on an otherwise-valid password.
      errors.newPassword = strengthError;
    } else if (pwForm.currentPassword && pwForm.newPassword === pwForm.currentPassword) {
      errors.newPassword = "New password must be different from your current password";
    }

    if (!pwForm.confirmPassword) {
      errors.confirmPassword = "Please confirm your new password";
    } else if (pwForm.confirmPassword !== pwForm.newPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setPwErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const result = await dispatch(
      changePasswordThunk({
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      })
    );
    if (changePasswordThunk.fulfilled.match(result)) {
      showSuccess("Password updated successfully.");
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPwErrors({});
      setIsEditingPassword(false);
      setJustChangedPassword(true);
    } else {
      const message = (result.payload as string) || "Failed to change password";
      // A wrong current password is a field-level concern, not a toast.
      if (/current password/i.test(message)) {
        setPwErrors({ currentPassword: message });
      } else {
        showError(message);
      }
    }
  };

  const startEditPassword = () => {
    setIsEditingPassword(true);
    setJustChangedPassword(false);
  };

  const handleCancelPassword = () => {
    if (pwIsDirty && !window.confirm("Discard your unsaved changes?")) return;
    setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setPwErrors({});
    setIsEditingPassword(false);
  };

  const handleLogoutAllDevices = async () => {
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
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") {
      showError('Type "DELETE" to confirm');
      return;
    }
    setDeleteLoading(true);
    try {
      await api.delete("/api/v1/auth/account");
      showSuccess("Account deletion requested");
      await performLogout(navigate);
    } catch {
      showError("Failed to delete account. Contact support.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      {overlay}
      {/* Page Header */}
      <div className="settings-page-header">
        <h2 className="settings-page-title">Account & Security</h2>
        <p className="settings-page-subtitle">
          Manage your login credentials, two-factor authentication, and account security.
        </p>
      </div>

      {/* Email */}
      <SettingsSection
        title="Email Address"
        desc="Your verified login email. Contact support to change it."
      >
        <div className="settings-form-grid">
          <div className="settings-form-group">
            <label className="settings-label">
              <Mail size={13} className="me-1" />
              Email
            </label>
            <input
              className="settings-input"
              type="email"
              value={profile?.email ?? ""}
              readOnly
            />
            <span className="settings-hint">
              To change your email, contact support.
            </span>
          </div>
        </div>
      </SettingsSection>

      {/* Change Password — View -> Edit: fields stay hidden until Edit is
          clicked, matching Business Settings' single-toggle workflow. */}
      <SettingsSection
        title="Change Password"
        desc="Use a strong password that you don't use elsewhere."
        headerAction={
          !isEditingPassword ? (
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={startEditPassword}
              iconLeft={<Pencil size={13} />}
            >
              Edit
            </Button>
          ) : undefined
        }
      >
        {!isEditingPassword ? (
          justChangedPassword && (
            <div className="settings-pw-success">
              <CheckCircle2 size={15} />
              Password updated successfully.
            </div>
          )
        ) : (
          <>
            <div className="settings-form-grid">
              <PasswordField
                name="currentPassword"
                label="Current Password"
                value={pwForm.currentPassword}
                show={showCurrent}
                error={pwErrors.currentPassword}
                onToggle={() => setShowCurrent((v) => !v)}
                onChange={handlePasswordChange}
              />

              <div />

              <PasswordField
                name="newPassword"
                label="New Password"
                value={pwForm.newPassword}
                show={showNew}
                error={pwErrors.newPassword}
                onToggle={() => setShowNew((v) => !v)}
                onChange={handlePasswordChange}
              />

              <PasswordField
                name="confirmPassword"
                label="Confirm New Password"
                value={pwForm.confirmPassword}
                show={showConfirm}
                error={pwErrors.confirmPassword}
                onToggle={() => setShowConfirm((v) => !v)}
                onChange={handlePasswordChange}
              />
            </div>

            {/* Password Strength Indicator */}
            {pwForm.newPassword && (
              <div className="settings-pw-strength">
                <div className="settings-pw-strength-header">
                  <span>Password strength</span>
                  <span style={{ fontWeight: 600, color: strength.color }}>
                    {strength.label}
                  </span>
                </div>
                <div className="settings-pw-strength-track">
                  <div
                    className="settings-pw-strength-fill"
                    style={{ width: `${strength.pct}%`, background: strength.color }}
                  />
                </div>
                <ul className="settings-pw-strength-list">
                  <li style={{ color: pwForm.newPassword.length >= 8 ? "#10b981" : "#9ca3af" }}>
                    At least 8 characters
                  </li>
                  <li style={{ color: /[A-Z]/.test(pwForm.newPassword) ? "#10b981" : "#9ca3af" }}>
                    Uppercase letter
                  </li>
                  <li style={{ color: /[0-9]/.test(pwForm.newPassword) ? "#10b981" : "#9ca3af" }}>
                    Number
                  </li>
                  <li style={{ color: /[^A-Za-z0-9]/.test(pwForm.newPassword) ? "#10b981" : "#9ca3af" }}>
                    Special character
                  </li>
                </ul>
              </div>
            )}

            <div className="settings-form-actions">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelPassword}
                disabled={userLoading.changePassword}
                iconLeft={<X size={13} />}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                loading={userLoading.changePassword}
                onClick={handleSavePassword}
                iconLeft={<Save size={14} />}
              >
                Save changes
              </Button>
            </div>
          </>
        )}
      </SettingsSection>

      {/* Two-Factor Authentication */}
      <SettingsSection
        title="Two-Factor Authentication"
        desc="Add an extra layer of security to your account."
      >
        <div className="settings-security-item">
          <div className="settings-security-icon">
            <Smartphone size={18} />
          </div>
          <div className="settings-security-info">
            <p className="settings-security-name">Authenticator App</p>
            <p className="settings-security-desc">
              Use Google Authenticator, Authy, or any TOTP app to generate
              one-time codes.
            </p>
          </div>
          <div className="d-flex align-items-center gap-2">
            {twoFAEnabled ? (
              <span className="s-badge s-badge-success">Enabled</span>
            ) : (
              <span className="s-badge s-badge-gray">Disabled</span>
            )}
            <Button
              size="sm"
              variant={twoFAEnabled ? "outline-danger" : "outline-secondary"}
              onClick={() => {
                setTwoFAEnabled((v) => !v);
                showError(
                  twoFAEnabled ? "2FA disabled (demo)" : "2FA setup coming soon"
                );
              }}
            >
              {twoFAEnabled ? "Disable" : "Enable"}
            </Button>
          </div>
        </div>

        <div className="settings-security-item">
          <div className="settings-security-icon">
            <Smartphone size={18} />
          </div>
          <div className="settings-security-info">
            <p className="settings-security-name">SMS Verification</p>
            <p className="settings-security-desc">
              Receive a one-time code on your registered mobile number.
            </p>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="s-badge s-badge-gray">Not set up</span>
            <Button
              size="sm"
              variant="outline-secondary"
              onClick={() => void showError("SMS 2FA coming soon")}
            >
              Set up
            </Button>
          </div>
        </div>
      </SettingsSection>

      {/* Active Sessions */}
      <SettingsSection
        title="Active Sessions"
        desc="Manage devices where you are currently signed in."
      >
        <div className="settings-security-item">
          <div className="settings-security-icon">
            <Key size={18} />
          </div>
          <div className="settings-security-info">
            <p className="settings-security-name">Current session</p>
            <p className="settings-security-desc">
              This browser &nbsp;·&nbsp; Active now
            </p>
          </div>
          <span className="s-badge s-badge-success">Current</span>
        </div>

        <div className="settings-form-actions">
          <Button
            size="sm"
            variant="outline-danger"
            iconLeft={<LogOut size={14} />}
            onClick={handleLogoutAllDevices}
          >
            Sign out all other devices
          </Button>
        </div>
      </SettingsSection>

      {/* Danger Zone */}
      <div className="settings-danger-zone">
        <p className="settings-danger-title">
          <AlertTriangle size={16} />
          Danger Zone
        </p>
        <p className="settings-danger-desc">
          Permanently delete your account and all associated data. This action
          is irreversible. All your business data, clients, appointments, and
          settings will be permanently erased.
        </p>
        <div>
          <label className="settings-label mb-2" style={{ color: "#b91c1c" }}>
            <ShieldCheck size={13} className="me-1" />
            Type <strong>DELETE</strong> to confirm
          </label>
          <div className="d-flex gap-2 flex-wrap align-items-center mt-2">
            <input
              className="settings-input"
              style={{
                maxWidth: 220,
                borderColor: deleteConfirm === "DELETE" ? "#ef4444" : undefined,
              }}
              placeholder="DELETE"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
            />
            <Button
              size="sm"
              variant="danger"
              loading={deleteLoading}
              onClick={handleDeleteAccount}
              disabled={deleteConfirm !== "DELETE"}
            >
              Delete my account
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
