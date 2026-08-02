import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  ChevronLeft, PencilSquare, Check2, XLg,
  Person, Envelope, Telephone, Building, GeoAlt,
  Globe, ShieldLock, EyeSlash, Eye, Camera,
  CheckCircleFill, ArrowClockwise,
  PersonBadge, Hash, MapFill, CreditCard, Tag, Clock, FileText,
} from "react-bootstrap-icons";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import type { AppDispatch, RootState } from "../../../store/store";
import {
  fetchMeThunk, updateUserThunk, uploadAvatarThunk, changePasswordThunk,
} from "../../../middleware/user/user.thunk";
import { getMySalonThunk, updateSalonThunk } from "../../../middleware/salon/salon.thunk";
import type { UpdateUserPayload } from "../../../types/user.types";
import type { UpdateSalonPayload } from "../../../types/salon.types";
import { TAX_ID_MESSAGES } from "../../../constants/message";
import "../styles/ProfilePage.scss";

const GSTIN_LENGTH = 15;
const PAN_LENGTH = 10;
// 2-digit state code + 10-char PAN + 1-digit entity code + "Z" + 1 checksum char.
const GSTIN_FORMAT_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN_FORMAT_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

// ── Helpers ────────────────────────────────────────────────────────────────────

const getInitials = (name?: string) => {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const formatRole = (role?: string | null) => {
  if (!role) return null;
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatDate = (iso?: string) => {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  } catch {
    return null;
  }
};

// ── Validation ────────────────────────────────────────────────────────────────

type Errors = Record<string, string>;

function validateUserForm(form: UpdateUserPayload): Errors {
  const e: Errors = {};
  const name = form.fullName?.trim() ?? "";
  if (!name)               e.fullName = "Full name is required.";
  else if (name.length < 2) e.fullName = "Full name must be at least 2 characters.";
  else if (name.length > 100) e.fullName = "Full name must be under 100 characters.";

  const phone = form.phone?.trim() ?? "";
  if (phone && !/^\+?[\d\s\-()\[\]]{7,20}$/.test(phone))
    e.phone = "Enter a valid phone number.";

  if ((form.country?.trim() ?? "").length > 100)
    e.country = "Country name is too long.";

  return e;
}

function validateSalonForm(form: UpdateSalonPayload): Errors {
  const e: Errors = {};

  if (!String(form.business_name ?? "").trim())
    e.business_name = "Salon name is required.";

  const email = String(form.email ?? "").trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    e.email = "Enter a valid email address.";

  const phone = String(form.phone ?? "").trim();
  if (phone && !/^\+?[\d\s\-()\[\]]{7,20}$/.test(phone))
    e.phone = "Enter a valid phone number.";

  const website = String(form.website_url ?? "").trim();
  if (website && !/^https?:\/\/.+/.test(website))
    e.website_url = "Website must start with http:// or https://.";

  const gst = String(form.gst_number ?? "").trim().toUpperCase();
  if (gst && !GSTIN_FORMAT_RE.test(gst))
    e.gst_number = gst.length !== GSTIN_LENGTH ? TAX_ID_MESSAGES.GSTIN_LENGTH : TAX_ID_MESSAGES.GSTIN_FORMAT;

  const pan = String(form.pan_number ?? "").trim().toUpperCase();
  if (pan && !PAN_FORMAT_RE.test(pan))
    e.pan_number = pan.length !== PAN_LENGTH ? TAX_ID_MESSAGES.PAN_LENGTH : TAX_ID_MESSAGES.PAN_FORMAT;

  const pincode = String(form.pincode ?? "").trim();
  if (pincode && !/^[0-9]{4,10}$/.test(pincode))
    e.pincode = "Pincode must be 4–10 digits.";

  const desc = String(form.description ?? "").trim();
  if (desc.length > 500)
    e.description = "Description must be under 500 characters.";

  return e;
}

// ── Field component ───────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  value: string;
  name: string;
  icon: React.ReactNode;
  editing: boolean;
  type?: string;
  placeholder?: string;
  readOnly?: boolean;
  error?: string;
  maxLength?: number;
  onChange: (name: string, value: string) => void;
}

const ProfileField = ({
  label, value, name, icon, editing, type = "text",
  placeholder, readOnly = false, error, maxLength, onChange,
}: FieldProps) => (
  <div className="pp-field">
    <label className="pp-field-label">{label}</label>
    <div className={`pp-field-wrap ${editing && !readOnly ? "pp-field-wrap--active" : ""} ${error ? "pp-field-wrap--error" : ""}`}>
      <span className="pp-field-icon">{icon}</span>
      {editing && !readOnly ? (
        <input
          type={type}
          className="pp-field-input"
          value={value}
          placeholder={placeholder ?? label}
          maxLength={maxLength}
          onChange={(e) => onChange(name, e.target.value)}
          autoComplete="off"
        />
      ) : (
        <span className={`pp-field-value ${!value ? "pp-field-value--empty" : ""}`}>
          {value || `No ${label.toLowerCase()} set`}
        </span>
      )}
      {readOnly && editing && <span className="pp-field-readonly-badge">locked</span>}
    </div>
    {error && <span className="pp-field-error">{error}</span>}
  </div>
);

// ── Skeleton ──────────────────────────────────────────────────────────────────

const ProfileSkeleton = () => (
  <div className="pp-skeleton-wrap">
    <div className="pp-skeleton pp-skeleton--avatar" />
    <div className="pp-skeleton pp-skeleton--line pp-skeleton--lg" />
    <div className="pp-skeleton pp-skeleton--line pp-skeleton--md" />
    <div className="pp-skeleton pp-skeleton--line pp-skeleton--sm" />
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const handleBack = () => navigate(-1);

  // ── Redux state ───────────────────────────────────────────────────────────
  const profile       = useSelector((s: RootState) => s.user.profile);
  const fetching      = useSelector((s: RootState) => s.user.loading.fetch);
  const saving        = useSelector((s: RootState) => s.user.loading.update);
  const uploading     = useSelector((s: RootState) => s.user.loading.avatar);
  const changingPw    = useSelector((s: RootState) => s.user.loading.changePassword);
  const fetchErr      = useSelector((s: RootState) => s.user.error);
  const currentSalon  = useSelector((s: RootState) => s.salon.currentSalon);
  const salonFetching = useSelector((s: RootState) => s.salon.loading.fetch);
  const salonSaving   = useSelector((s: RootState) => s.salon.loading.update);
  const authRole      = useSelector((s: RootState) => s.auth.role);

  // ── User edit state ───────────────────────────────────────────────────────
  const [editing,     setEditing]     = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [form,        setForm]        = useState<UpdateUserPayload>({});
  const [formError,   setFormError]   = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Errors>({});

  // ── Salon edit state ──────────────────────────────────────────────────────
  const [salonEditing,     setSalonEditing]     = useState(false);
  const [salonSaved,       setSalonSaved]       = useState(false);
  const [salonForm,        setSalonForm]        = useState<UpdateSalonPayload>({});
  const [salonError,       setSalonError]       = useState<string | null>(null);
  const [salonFieldErrors, setSalonFieldErrors] = useState<Errors>({});

  // ── Password state ────────────────────────────────────────────────────────
  const [pwSection,  setPwSection]  = useState(false);
  const [pwCurrent,  setPwCurrent]  = useState("");
  const [pwNew,      setPwNew]      = useState("");
  const [pwConfirm,  setPwConfirm]  = useState("");
  const [showPwCur,  setShowPwCur]  = useState(false);
  const [showPwNew,  setShowPwNew]  = useState(false);
  const [showPwConf, setShowPwConf] = useState(false);
  const [pwError,    setPwError]    = useState<string | null>(null);
  const [pwSuccess,  setPwSuccess]  = useState(false);
  const { showSuccess, showError, overlay } = useStatusOverlay();

  const fileRef = useRef<HTMLInputElement>(null);

  // ── Fetch on mount ────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchMeThunk());
    dispatch(getMySalonThunk());
  }, [dispatch]);

  // ── Sync user form ────────────────────────────────────────────────────────
  useEffect(() => {
    if (profile) {
      setForm({
        fullName:     profile.fullName     ?? "",
        phone:        profile.phone        ?? "",
        businessName: profile.businessName ?? "",
        address:      profile.address      ?? "",
        country:      profile.country      ?? "",
        countryCode:  profile.countryCode  ?? "",
      });
    }
  }, [profile]);

  // ── Sync salon form ───────────────────────────────────────────────────────
  useEffect(() => {
    if (currentSalon) {
      setSalonForm({
        business_name:     currentSalon.business_name     ?? "",
        email:             currentSalon.email             ?? "",
        phone:             currentSalon.phone             ?? "",
        website_url:       currentSalon.website_url       ?? "",
        gst_number:        currentSalon.gst_number        ?? "",
        pan_number:        currentSalon.pan_number        ?? "",
        address:           currentSalon.address           ?? "",
        city:              currentSalon.city              ?? "",
        state:             currentSalon.state             ?? "",
        country:           currentSalon.country           ?? "",
        pincode:           currentSalon.pincode           ?? "",
        timezone:          currentSalon.timezone          ?? "",
        currency:          currentSalon.currency          ?? "",
        business_category: currentSalon.business_category ?? "",
        business_type:     currentSalon.business_type     ?? "",
        description:       currentSalon.description       ?? "",
      });
    }
  }, [currentSalon]);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(t);
  }, [saved]);

  useEffect(() => {
    if (!salonSaved) return;
    const t = setTimeout(() => setSalonSaved(false), 2000);
    return () => clearTimeout(t);
  }, [salonSaved]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleFieldChange = (name: string, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((prev) => { const e = { ...prev }; delete e[name]; return e; });
  };

  const handleSalonFieldChange = (name: string, value: string) => {
    if (name === "gst_number") {
      value = value.toUpperCase().slice(0, GSTIN_LENGTH);
      setSalonFieldErrors((prev) => ({
        ...prev,
        gst_number: value && !GSTIN_FORMAT_RE.test(value)
          ? (value.length !== GSTIN_LENGTH ? TAX_ID_MESSAGES.GSTIN_LENGTH : TAX_ID_MESSAGES.GSTIN_FORMAT)
          : "",
      }));
      setSalonForm((prev) => ({ ...prev, [name]: value }));
      return;
    }

    if (name === "pan_number") {
      value = value.toUpperCase().slice(0, PAN_LENGTH);
      setSalonFieldErrors((prev) => ({
        ...prev,
        pan_number: value && !PAN_FORMAT_RE.test(value)
          ? (value.length !== PAN_LENGTH ? TAX_ID_MESSAGES.PAN_LENGTH : TAX_ID_MESSAGES.PAN_FORMAT)
          : "",
      }));
      setSalonForm((prev) => ({ ...prev, [name]: value }));
      return;
    }

    setSalonForm((prev) => ({ ...prev, [name]: value }));
    if (salonFieldErrors[name]) setSalonFieldErrors((prev) => { const e = { ...prev }; delete e[name]; return e; });
  };

  const handleSave = async () => {
    const errors = validateUserForm(form);
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setFieldErrors({});
    setFormError(null);
    const result = await dispatch(updateUserThunk(form));
    if (updateUserThunk.fulfilled.match(result)) {
      setSaved(true);
      setEditing(false);
      showSuccess("Profile updated successfully!");
    } else {
      const msg = String(result.payload ?? "Failed to save changes.");
      setFormError(msg);
      showError(msg);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setForm({
        fullName: profile.fullName ?? "", phone: profile.phone ?? "",
        businessName: profile.businessName ?? "", address: profile.address ?? "",
        country: profile.country ?? "", countryCode: profile.countryCode ?? "",
      });
    }
    setFieldErrors({});
    setFormError(null);
    setEditing(false);
  };

  const handleSalonSave = async () => {
    if (!currentSalon?.id) return;
    const errors = validateSalonForm(salonForm);
    if (Object.keys(errors).length > 0) { setSalonFieldErrors(errors); return; }
    setSalonFieldErrors({});
    setSalonError(null);
    const result = await dispatch(updateSalonThunk({ id: currentSalon.id, payload: salonForm }));
    if (updateSalonThunk.fulfilled.match(result)) {
      setSalonSaved(true);
      setSalonEditing(false);
      showSuccess("Salon updated successfully!");
    } else {
      const msg = String(result.payload ?? "Failed to save salon.");
      setSalonError(msg);
      showError(msg);
    }
  };

  const handleSalonCancel = () => {
    if (currentSalon) {
      setSalonForm({
        business_name: currentSalon.business_name ?? "", email: currentSalon.email ?? "",
        phone: currentSalon.phone ?? "", website_url: currentSalon.website_url ?? "",
        gst_number: currentSalon.gst_number ?? "", pan_number: currentSalon.pan_number ?? "",
        address: currentSalon.address ?? "", city: currentSalon.city ?? "",
        state: currentSalon.state ?? "", country: currentSalon.country ?? "",
        pincode: currentSalon.pincode ?? "", timezone: currentSalon.timezone ?? "",
        currency: currentSalon.currency ?? "", business_category: currentSalon.business_category ?? "",
        business_type: currentSalon.business_type ?? "", description: currentSalon.description ?? "",
      });
    }
    setSalonFieldErrors({});
    setSalonError(null);
    setSalonEditing(false);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { showError("Please select an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { showError("Image must be under 5 MB."); return; }
    const result = await dispatch(uploadAvatarThunk(file));
    if (uploadAvatarThunk.fulfilled.match(result)) {
      showSuccess("Profile photo updated!");
    } else {
      showError(String(result.payload ?? "Failed to upload photo."));
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handlePasswordChange = async () => {
    if (!pwCurrent)          { setPwError("Current password is required."); return; }
    if (pwNew.length < 8)    { setPwError("New password must be at least 8 characters."); return; }
    if (!/[A-Z]/.test(pwNew)) { setPwError("Must contain at least one uppercase letter."); return; }
    if (!/[a-z]/.test(pwNew)) { setPwError("Must contain at least one lowercase letter."); return; }
    if (!/[0-9]/.test(pwNew)) { setPwError("Must contain at least one number."); return; }
    if (pwNew === pwCurrent) { setPwError("New password must be different from your current password."); return; }
    if (pwNew !== pwConfirm) { setPwError("Passwords do not match."); return; }
    setPwError(null);
    const result = await dispatch(changePasswordThunk({ currentPassword: pwCurrent, newPassword: pwNew }));
    if (changePasswordThunk.fulfilled.match(result)) {
      setPwSuccess(true);
      setPwCurrent(""); setPwNew(""); setPwConfirm("");
      showSuccess("Password updated successfully.");
      setTimeout(() => { setPwSuccess(false); setPwSection(false); }, 2000);
    } else {
      const msg = String(result.payload ?? "Failed to change password.");
      setPwError(msg); showError(msg);
    }
  };

  const displayName = profile?.fullName ?? "Salon Owner";
  const email       = profile?.email    ?? "";
  const initials    = getInitials(displayName);
  const roleBadge   = formatRole(profile?.role ?? authRole);
  const memberSince = formatDate(profile?.createdAt);
  const isVerified  = profile?.isVerified;

  // ── Loading ───────────────────────────────────────────────────────────────
  if (fetching && !profile) {
    return (
      <div className="pp-page">
        <div className="pp-page-header">
          <button className="pp-back-btn" onClick={handleBack}>
            <ChevronLeft size={16} /><span>Back</span>
          </button>
          <h1 className="pp-page-title">My Profile</h1>
          <p className="pp-page-sub">Loading your profile…</p>
        </div>
        <div className="pp-layout">
          <aside className="pp-sidebar"><ProfileSkeleton /></aside>
          <div className="pp-main">
            <div className="pp-section"><ProfileSkeleton /></div>
            <div className="pp-section"><ProfileSkeleton /></div>
          </div>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (fetchErr && !profile) {
    return (
      <div className="pp-page">
        <div className="pp-page-header">
          <button className="pp-back-btn" onClick={handleBack}>
            <ChevronLeft size={16} /><span>Back</span>
          </button>
          <h1 className="pp-page-title">My Profile</h1>
        </div>
        <div className="pp-fetch-error">
          <p>{fetchErr}</p>
          <button className="pp-retry-btn" onClick={() => dispatch(fetchMeThunk())}>
            <ArrowClockwise size={14} /> Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pp-page">
      {overlay}

      <div className="pp-layout">

        {/* ── SIDEBAR ── */}
        <aside className="pp-sidebar">
          <div className="pp-avatar-card">

            {/* Avatar */}
            <div className="pp-avatar-wrap">
              {uploading && (
                <div className="pp-avatar-uploading"><span className="pp-spinner" /></div>
              )}
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={displayName}
                  className={`pp-avatar-img ${uploading ? "pp-avatar-img--dim" : ""}`}
                />
              ) : (
                <div className={`pp-avatar-initials ${uploading ? "pp-avatar-initials--dim" : ""}`}>
                  {initials}
                </div>
              )}
              <button
                className="pp-avatar-camera-btn"
                title="Change photo"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                <Camera size={14} />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="pp-avatar-file"
                aria-label="Upload profile photo"
                title="Upload profile photo"
                onChange={handleAvatarChange}
              />
            </div>

            <h2 className="pp-avatar-name">{displayName}</h2>
            {email && <p className="pp-avatar-email">{email}</p>}

            {/* Role + Verified badges */}
            <div className="pp-badge-row">
              {roleBadge && <span className="pp-role-badge">{roleBadge}</span>}
              {isVerified && (
                <span className="pp-verified-badge">
                  <CheckCircleFill size={10} /> Verified
                </span>
              )}
            </div>

            {memberSince && <p className="pp-member-since">Member since {memberSince}</p>}

            <div className={`pp-completion ${saved || salonSaved ? "pp-completion--green" : ""}`}>
              <CheckCircleFill size={13} />
              <span>{saved || salonSaved ? "Changes saved!" : "Profile active"}</span>
            </div>

            {/* User edit toggle */}
            {!editing ? (
              <button className="pp-edit-btn" onClick={() => setEditing(true)}>
                <PencilSquare size={14} /> Edit Profile
              </button>
            ) : (
              <div className="pp-edit-actions">
                <button className="pp-save-btn" onClick={handleSave} disabled={saving}>
                  {saving ? <span className="pp-spinner" /> : <Check2 size={14} />}
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
              <span className="pp-info-strip-val">
                {currentSalon?.business_name || profile?.businessName || "—"}
              </span>
            </div>
            <div className="pp-info-strip-row">
              <Globe size={13} />
              <span className="pp-info-strip-val">{profile?.country || "—"}</span>
            </div>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <div className="pp-main">

          {/* User banners */}
          {formError && (
            <div className="pp-error-banner">
              <XLg size={13} />
              {formError}
              <button className="pp-error-close" aria-label="Dismiss error" title="Dismiss error" onClick={() => setFormError(null)}><XLg size={11} /></button>
            </div>
          )}
          {saved && (
            <div className="pp-success-banner">
              <CheckCircleFill size={13} /> Profile updated successfully!
            </div>
          )}

          {/* ── Personal Information ── */}
          <section className="pp-section">
            <div className="pp-section-header">
              <div className="pp-section-icon pp-section-icon--blue">
                <Person size={16} />
              </div>
              <div>
                <h3 className="pp-section-title">Personal Information</h3>
                <p className="pp-section-sub">Your name, email and contact details</p>
              </div>
            </div>

            <div className="pp-fields-grid">
              <ProfileField
                label="Full Name" value={form.fullName ?? ""} name="fullName"
                icon={<Person size={14} />} editing={editing}
                placeholder="Enter full name" error={fieldErrors.fullName}
                onChange={handleFieldChange}
              />
              <ProfileField
                label="Email Address" value={email} name="email"
                icon={<Envelope size={14} />} editing={editing}
                readOnly onChange={handleFieldChange}
              />
              <ProfileField
                label="Phone Number" value={form.phone ?? ""} name="phone"
                icon={<Telephone size={14} />} editing={editing}
                type="tel" placeholder="+91 98765 43210" error={fieldErrors.phone}
                onChange={handleFieldChange}
              />
              <ProfileField
                label="Country" value={form.country ?? ""} name="country"
                icon={<Globe size={14} />} editing={editing}
                placeholder="e.g. India" error={fieldErrors.country}
                onChange={handleFieldChange}
              />
              {roleBadge && (
                <div className="pp-field">
                  <label className="pp-field-label">Role</label>
                  <div className="pp-field-wrap">
                    <span className="pp-field-icon"><PersonBadge size={14} /></span>
                    <span className="pp-field-value">{roleBadge}</span>
                    <span className="pp-field-readonly-badge">system</span>
                  </div>
                </div>
              )}
              {memberSince && (
                <div className="pp-field">
                  <label className="pp-field-label">Member Since</label>
                  <div className="pp-field-wrap">
                    <span className="pp-field-icon"><CheckCircleFill size={14} /></span>
                    <span className="pp-field-value">{memberSince}</span>
                  </div>
                </div>
              )}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
