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
} from "lucide-react";
import toast from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { logout } from "../../../store/authSlice";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api/axios";
import Button from "../../../components/ui/Button";
import SettingsSection from "../components/SettingsSection";

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

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
  onToggle: () => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function PasswordField({
  name,
  label,
  value,
  show,
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
          className="settings-input"
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
    </div>
  );
}

export default function AccountSettingsPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { profile } = useAppSelector((s) => s.user);

  const [pwForm, setPwForm] = useState<PasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const [twoFAEnabled, setTwoFAEnabled] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const strength = passwordStrength(pwForm.newPassword);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPwForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSavePassword = async () => {
    if (!pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (pwForm.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setPwLoading(true);
    try {
      await api.put("/api/v1/auth/change-password", {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      toast.success("Password changed successfully");
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch {
      toast.error("Failed to change password. Check your current password.");
    } finally {
      setPwLoading(false);
    }
  };

  const handleLogoutAllDevices = async () => {
    try {
      await api.post("/api/v1/auth/logout-all");
      toast.success("Logged out of all devices");
      dispatch(logout());
      navigate("/login");
    } catch {
      toast.error("Failed to log out all devices");
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") {
      toast.error('Type "DELETE" to confirm');
      return;
    }
    setDeleteLoading(true);
    try {
      await api.delete("/api/v1/auth/account");
      toast.success("Account deletion requested");
      dispatch(logout());
      navigate("/login");
    } catch {
      toast.error("Failed to delete account. Contact support.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
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

      {/* Change Password */}
      <SettingsSection
        title="Change Password"
        desc="Use a strong password that you don't use elsewhere."
      >
        <div className="settings-form-grid">
          <PasswordField
            name="currentPassword"
            label="Current Password"
            value={pwForm.currentPassword}
            show={showCurrent}
            onToggle={() => setShowCurrent((v) => !v)}
            onChange={handlePasswordChange}
          />

          <div />

          <PasswordField
            name="newPassword"
            label="New Password"
            value={pwForm.newPassword}
            show={showNew}
            onToggle={() => setShowNew((v) => !v)}
            onChange={handlePasswordChange}
          />

          <PasswordField
            name="confirmPassword"
            label="Confirm New Password"
            value={pwForm.confirmPassword}
            show={showConfirm}
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
            size="sm"
            loading={pwLoading}
            onClick={handleSavePassword}
            iconLeft={<Save size={14} />}
          >
            Update password
          </Button>
        </div>
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
                toast(
                  twoFAEnabled ? "2FA disabled (demo)" : "2FA setup coming soon",
                  { icon: "🔐" }
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
              onClick={() => toast("SMS 2FA coming soon", { icon: "📱" })}
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
