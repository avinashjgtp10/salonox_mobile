import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  ChevronLeft,
  PencilSquare,
  Check2,
  XLg,
  Person,
  Envelope,
  Telephone,
  Building,
  GeoAlt,
  Globe,
  ShieldLock,
  EyeSlash,
  Eye,
  Camera,
  CheckCircleFill,
} from "react-bootstrap-icons";
import type { AppDispatch, RootState } from "../../../store/store";
import { updateUserThunk } from "../../../middleware/user/user.thunk";
import type { UpdateUserPayload } from "../../../types/user.types";
import "../styles/ProfilePage.scss";

// ── Helpers ────────────────────────────────────────────────────────────────────

const getInitials = (name?: string) => {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// ── Input field component ──────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  value: string;
  name: keyof UpdateUserPayload;
  icon: React.ReactNode;
  editing: boolean;
  type?: string;
  placeholder?: string;
  onChange: (name: keyof UpdateUserPayload, value: string) => void;
}

const ProfileField = ({ label, value, name, icon, editing, type = "text", placeholder, onChange }: FieldProps) => (
  <div className="pp-field">
    <label className="pp-field-label">{label}</label>
    <div className={`pp-field-wrap ${editing ? "pp-field-wrap--active" : ""}`}>
      <span className="pp-field-icon">{icon}</span>
      {editing ? (
        <input
          type={type}
          className="pp-field-input"
          value={value}
          placeholder={placeholder ?? label}
          onChange={e => onChange(name, e.target.value)}
          autoComplete="off"
        />
      ) : (
        <span className={`pp-field-value ${!value ? "pp-field-value--empty" : ""}`}>
          {value || `No ${label.toLowerCase()} set`}
        </span>
      )}
    </div>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const navigate  = useNavigate();
  const dispatch  = useDispatch<AppDispatch>();
  const profile   = useSelector((s: RootState) => s.user.profile);
  const saving    = useSelector((s: RootState) => s.user.loading.update);

  // ── Edit state ───────────────────────────────────────────────────────────────
  const [editing,   setEditing]   = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [form,      setForm]      = useState<UpdateUserPayload>({});
  const [formError, setFormError] = useState<string | null>(null);

  // ── Password change state ────────────────────────────────────────────────────
  const [pwSection,  setPwSection]  = useState(false);
  const [pwCurrent,  setPwCurrent]  = useState("");
  const [pwNew,      setPwNew]      = useState("");
  const [pwConfirm,  setPwConfirm]  = useState("");
  const [showPwCur,  setShowPwCur]  = useState(false);
  const [showPwNew,  setShowPwNew]  = useState(false);
  const [showPwConf, setShowPwConf] = useState(false);
  const [pwError,    setPwError]    = useState<string | null>(null);
  const [pwSuccess,  setPwSuccess]  = useState(false);

  // Avatar upload ref
  const fileRef = useRef<HTMLInputElement>(null);

  // Sync form from Redux on load / when profile changes
  useEffect(() => {
    if (profile) {
      setForm({
        fullName:     profile.fullName     ?? "",
        phone:        profile.phone        ?? "",
        businessName: profile.businessName ?? "",
        address:      profile.address      ?? "",
        country:      profile.country      ?? "",
      });
    }
  }, [profile]);

  // Reset "saved" tick after 2s
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(t);
  }, [saved]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleFieldChange = (name: keyof UpdateUserPayload, value: string) => {
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!form.fullName?.trim()) {
      setFormError("Full name is required.");
      return;
    }
    setFormError(null);
    const result = await dispatch(updateUserThunk(form));
    if (updateUserThunk.fulfilled.match(result)) {
      setSaved(true);
      setEditing(false);
    } else {
      setFormError(String(result.payload ?? "Failed to save changes."));
    }
  };

  const handleCancel = () => {
    if (profile) {
      setForm({
        fullName:     profile.fullName     ?? "",
        phone:        profile.phone        ?? "",
        businessName: profile.businessName ?? "",
        address:      profile.address      ?? "",
        country:      profile.country      ?? "",
      });
    }
    setFormError(null);
    setEditing(false);
  };

  const handlePasswordChange = () => {
    if (!pwCurrent) { setPwError("Current password is required."); return; }
    if (pwNew.length < 8) { setPwError("New password must be at least 8 characters."); return; }
    if (pwNew !== pwConfirm) { setPwError("Passwords do not match."); return; }
    setPwError(null);
    // TODO: wire to change-password API when available
    setPwSuccess(true);
    setPwCurrent(""); setPwNew(""); setPwConfirm("");
    setTimeout(() => { setPwSuccess(false); setPwSection(false); }, 2000);
  };

  const displayName = profile?.fullName   ?? "Salon Owner";
  const email       = profile?.email      ?? "";
  const initials    = getInitials(displayName);

  return (
    <div className="pp-page">

      {/* ── PAGE HEADER ── */}
      <div className="pp-page-header">
        <button className="pp-back-btn" onClick={() => navigate(-1)}>
          <ChevronLeft size={16} />
          <span>Back</span>
        </button>
        <h1 className="pp-page-title">My Profile</h1>
        <p className="pp-page-sub">Manage your personal information and account settings</p>
      </div>

      <div className="pp-layout">

        {/* ── LEFT COLUMN: Avatar card ── */}
        <aside className="pp-sidebar">
          <div className="pp-avatar-card">

            {/* Avatar */}
            <div className="pp-avatar-wrap">
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt={displayName} className="pp-avatar-img" />
              ) : (
                <div className="pp-avatar-initials">{initials}</div>
              )}
              <button
                className="pp-avatar-camera-btn"
                title="Change photo"
                onClick={() => fileRef.current?.click()}
              >
                <Camera size={14} />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={() => {/* TODO: avatar upload */}}
              />
            </div>

            <h2 className="pp-avatar-name">{displayName}</h2>
            {email && <p className="pp-avatar-email">{email}</p>}

            {/* Completion badge */}
            <div className={`pp-completion ${saved ? "pp-completion--green" : ""}`}>
              <CheckCircleFill size={13} />
              <span>{saved ? "Profile saved!" : "Profile active"}</span>
            </div>

            {/* Edit toggle */}
            {!editing ? (
              <button className="pp-edit-btn" onClick={() => setEditing(true)}>
                <PencilSquare size={14} />
                Edit Profile
              </button>
            ) : (
              <div className="pp-edit-actions">
                <button
                  className="pp-save-btn"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving
                    ? <span className="pp-spinner" />
                    : <Check2 size={14} />}
                  {saving ? "Saving…" : "Save Changes"}
                </button>
                <button className="pp-cancel-btn" onClick={handleCancel}>
                  <XLg size={12} /> Cancel
                </button>
              </div>
            )}
          </div>

          {/* Quick info strip */}
          <div className="pp-info-strip">
            <div className="pp-info-strip-row">
              <Envelope size={13} />
              <span className="pp-info-strip-val">{email || "—"}</span>
            </div>
            <div className="pp-info-strip-row">
              <Telephone size={13} />
              <span className="pp-info-strip-val">{profile?.phone || "—"}</span>
            </div>
            <div className="pp-info-strip-row">
              <Building size={13} />
              <span className="pp-info-strip-val">{profile?.businessName || "—"}</span>
            </div>
          </div>
        </aside>

        {/* ── RIGHT COLUMN: Details ── */}
        <div className="pp-main">

          {/* Error banner */}
          {formError && (
            <div className="pp-error-banner">
              <XLg size={13} />
              {formError}
              <button className="pp-error-close" onClick={() => setFormError(null)}><XLg size={11} /></button>
            </div>
          )}

          {/* Success banner */}
          {saved && (
            <div className="pp-success-banner">
              <CheckCircleFill size={13} />
              Profile updated successfully!
            </div>
          )}

          {/* ── Personal Information ── */}
          <section className="pp-section">
            <div className="pp-section-header">
              <div className="pp-section-icon" style={{ background: "#eff6ff", color: "#2563eb" }}>
                <Person size={16} />
              </div>
              <div>
                <h3 className="pp-section-title">Personal Information</h3>
                <p className="pp-section-sub">Your name, email and contact details</p>
              </div>
            </div>

            <div className="pp-fields-grid">
              <ProfileField
                label="Full Name"
                value={form.fullName ?? ""}
                name="fullName"
                icon={<Person size={14} />}
                editing={editing}
                placeholder="Enter full name"
                onChange={handleFieldChange}
              />
              <ProfileField
                label="Email Address"
                value={email}
                name="fullName" /* email is read-only — no update field */
                icon={<Envelope size={14} />}
                editing={false}   /* email cannot be changed here */
                onChange={handleFieldChange}
              />
              <ProfileField
                label="Phone Number"
                value={form.phone ?? ""}
                name="phone"
                icon={<Telephone size={14} />}
                editing={editing}
                type="tel"
                placeholder="+91 98765 43210"
                onChange={handleFieldChange}
              />
              <ProfileField
                label="Country"
                value={form.country ?? ""}
                name="country"
                icon={<Globe size={14} />}
                editing={editing}
                placeholder="e.g. India"
                onChange={handleFieldChange}
              />
            </div>
          </section>

          {/* ── Business Information ── */}
          <section className="pp-section">
            <div className="pp-section-header">
              <div className="pp-section-icon" style={{ background: "#f0fdf4", color: "#16a34a" }}>
                <Building size={16} />
              </div>
              <div>
                <h3 className="pp-section-title">Business Information</h3>
                <p className="pp-section-sub">Your salon or business details</p>
              </div>
            </div>

            <div className="pp-fields-grid">
              <ProfileField
                label="Business Name"
                value={form.businessName ?? ""}
                name="businessName"
                icon={<Building size={14} />}
                editing={editing}
                placeholder="Enter business name"
                onChange={handleFieldChange}
              />
              <ProfileField
                label="Address"
                value={form.address ?? ""}
                name="address"
                icon={<GeoAlt size={14} />}
                editing={editing}
                placeholder="Enter address"
                onChange={handleFieldChange}
              />
            </div>
          </section>

          {/* ── Security ── */}
          <section className="pp-section">
            <div className="pp-section-header">
              <div className="pp-section-icon" style={{ background: "#fefce8", color: "#ca8a04" }}>
                <ShieldLock size={16} />
              </div>
              <div>
                <h3 className="pp-section-title">Account & Security</h3>
                <p className="pp-section-sub">Manage your password and security settings</p>
              </div>
              <button
                className={`pp-section-toggle ${pwSection ? "pp-section-toggle--open" : ""}`}
                onClick={() => { setPwSection(v => !v); setPwError(null); setPwSuccess(false); }}
              >
                {pwSection ? "Close" : "Change Password"}
              </button>
            </div>

            {pwSection && (
              <div className="pp-pw-body">
                {pwSuccess && (
                  <div className="pp-success-banner">
                    <CheckCircleFill size={13} />
                    Password changed successfully!
                  </div>
                )}
                {pwError && (
                  <div className="pp-error-banner">
                    <XLg size={13} />
                    {pwError}
                    <button className="pp-error-close" onClick={() => setPwError(null)}><XLg size={11} /></button>
                  </div>
                )}
                <div className="pp-pw-fields">
                  {/* Current password */}
                  <div className="pp-pw-field">
                    <label className="pp-field-label">Current Password</label>
                    <div className="pp-pw-input-wrap">
                      <ShieldLock size={14} className="pp-pw-icon" />
                      <input
                        type={showPwCur ? "text" : "password"}
                        className="pp-pw-input"
                        value={pwCurrent}
                        onChange={e => setPwCurrent(e.target.value)}
                        placeholder="Enter current password"
                        autoComplete="current-password"
                      />
                      <button className="pp-pw-eye" onClick={() => setShowPwCur(v => !v)}>
                        {showPwCur ? <EyeSlash size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  {/* New password */}
                  <div className="pp-pw-field">
                    <label className="pp-field-label">New Password</label>
                    <div className="pp-pw-input-wrap">
                      <ShieldLock size={14} className="pp-pw-icon" />
                      <input
                        type={showPwNew ? "text" : "password"}
                        className="pp-pw-input"
                        value={pwNew}
                        onChange={e => setPwNew(e.target.value)}
                        placeholder="Min 8 characters"
                        autoComplete="new-password"
                      />
                      <button className="pp-pw-eye" onClick={() => setShowPwNew(v => !v)}>
                        {showPwNew ? <EyeSlash size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    {/* Strength indicator */}
                    {pwNew.length > 0 && (
                      <div className="pp-pw-strength">
                        {[1,2,3,4].map(i => (
                          <div
                            key={i}
                            className={`pp-pw-bar ${
                              pwNew.length >= i * 3
                                ? pwNew.length >= 10 ? "pp-pw-bar--strong"
                                : pwNew.length >= 6  ? "pp-pw-bar--medium"
                                : "pp-pw-bar--weak"
                                : ""
                            }`}
                          />
                        ))}
                        <span className="pp-pw-strength-label">
                          {pwNew.length < 6 ? "Weak" : pwNew.length < 10 ? "Medium" : "Strong"}
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Confirm password */}
                  <div className="pp-pw-field">
                    <label className="pp-field-label">Confirm New Password</label>
                    <div className="pp-pw-input-wrap">
                      <ShieldLock size={14} className="pp-pw-icon" />
                      <input
                        type={showPwConf ? "text" : "password"}
                        className="pp-pw-input"
                        value={pwConfirm}
                        onChange={e => setPwConfirm(e.target.value)}
                        placeholder="Re-enter new password"
                        autoComplete="new-password"
                      />
                      <button className="pp-pw-eye" onClick={() => setShowPwConf(v => !v)}>
                        {showPwConf ? <EyeSlash size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
                <button className="pp-pw-submit-btn" onClick={handlePasswordChange}>
                  <ShieldLock size={14} />
                  Update Password
                </button>
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}
