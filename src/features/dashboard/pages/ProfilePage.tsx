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
import toast from "react-hot-toast";
import type { AppDispatch, RootState } from "../../../store/store";
import {
  fetchMeThunk, updateUserThunk, uploadAvatarThunk, changePasswordThunk,
} from "../../../middleware/user/user.thunk";
import { getMySalonThunk, updateSalonThunk } from "../../../middleware/salon/salon.thunk";
import type { UpdateUserPayload } from "../../../types/user.types";
import type { UpdateSalonPayload } from "../../../types/salon.types";
import "../styles/ProfilePage.scss";

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
  if (gst && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gst))
    e.gst_number = "Invalid GST format (e.g. 22AAAAA0000A1Z5).";

  const pan = String(form.pan_number ?? "").trim().toUpperCase();
  if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan))
    e.pan_number = "Invalid PAN format (e.g. ABCDE1234F).";

  const pincode = String(form.pincode ?? "").trim();
  if (pincode && !/^[0-9]{4,10}$/.test(pincode))
    e.pincode = "Pincode must be 4–10 digits.";

  const currency = String(form.currency ?? "").trim().toUpperCase();
  if (currency && !/^[A-Z]{3}$/.test(currency))
    e.currency = "Use a 3-letter currency code (e.g. INR, USD).";

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
  onChange: (name: string, value: string) => void;
}

const ProfileField = ({
  label, value, name, icon, editing, type = "text",
  placeholder, readOnly = false, error, onChange,
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
      toast.success("Profile updated successfully!");
    } else {
      const msg = String(result.payload ?? "Failed to save changes.");
      setFormError(msg);
      toast.error(msg);
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
      toast.success("Salon updated successfully!");
    } else {
      const msg = String(result.payload ?? "Failed to save salon.");
      setSalonError(msg);
      toast.error(msg);
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
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5 MB."); return; }
    const result = await dispatch(uploadAvatarThunk(file));
    if (uploadAvatarThunk.fulfilled.match(result)) {
      toast.success("Profile photo updated!");
    } else {
      toast.error(String(result.payload ?? "Failed to upload photo."));
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handlePasswordChange = async () => {
    if (!pwCurrent)          { setPwError("Current password is required."); return; }
    if (pwNew.length < 8)    { setPwError("New password must be at least 8 characters."); return; }
    if (!/[A-Z]/.test(pwNew)) { setPwError("Must contain at least one uppercase letter."); return; }
    if (!/[a-z]/.test(pwNew)) { setPwError("Must contain at least one lowercase letter."); return; }
    if (!/[0-9]/.test(pwNew)) { setPwError("Must contain at least one number."); return; }
    if (pwNew !== pwConfirm) { setPwError("Passwords do not match."); return; }
    setPwError(null);
    const result = await dispatch(changePasswordThunk({ currentPassword: pwCurrent, newPassword: pwNew }));
    if (changePasswordThunk.fulfilled.match(result)) {
      setPwSuccess(true);
      setPwCurrent(""); setPwNew(""); setPwConfirm("");
      toast.success("Password changed successfully!");
      setTimeout(() => { setPwSuccess(false); setPwSection(false); }, 2000);
    } else {
      const msg = String(result.payload ?? "Failed to change password.");
      setPwError(msg); toast.error(msg);
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
          <button className="pp-back-btn" onClick={() => navigate(-1)}>
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

      {/* ── PAGE HEADER ── */}
      <div className="pp-page-header">
        <button className="pp-back-btn" onClick={() => navigate(-1)}>
          <ChevronLeft size={16} /><span>Back</span>
        </button>
        <h1 className="pp-page-title">My Profile</h1>
        <p className="pp-page-sub">Manage your personal information and salon details</p>
      </div>

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

          {/* ── Salon Information ── */}
          <section className="pp-section">
            <div className="pp-section-header">
              <div className="pp-section-icon pp-section-icon--purple">
                <Building size={16} />
              </div>
              <div>
                <h3 className="pp-section-title">Salon Information</h3>
                <p className="pp-section-sub">
                  {salonFetching ? "Loading salon details…" : "Your salon's business details and location"}
                </p>
              </div>
              {!salonFetching && currentSalon && (
                !salonEditing ? (
                  <button className="pp-section-toggle" onClick={() => setSalonEditing(true)}>
                    Edit
                  </button>
                ) : (
                  <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
                    <button
                      className="pp-section-toggle pp-section-toggle--open"
                      onClick={handleSalonSave}
                      disabled={salonSaving}
                    >
                      {salonSaving ? "Saving…" : "Save"}
                    </button>
                    <button className="pp-section-toggle" onClick={handleSalonCancel}>
                      Cancel
                    </button>
                  </div>
                )
              )}
            </div>

            {/* Salon banners */}
            {salonError && (
              <div className="pp-error-banner" style={{ marginBottom: 16 }}>
                <XLg size={13} />{salonError}
                <button className="pp-error-close" onClick={() => setSalonError(null)}><XLg size={11} /></button>
              </div>
            )}
            {salonSaved && (
              <div className="pp-success-banner" style={{ marginBottom: 16 }}>
                <CheckCircleFill size={13} /> Salon updated successfully!
              </div>
            )}

            {salonFetching && !currentSalon ? (
              <ProfileSkeleton />
            ) : currentSalon ? (
              <>
                {/* Basic */}
                <p className="pp-subsection-label">Basic Details</p>
                <div className="pp-fields-grid" style={{ marginBottom: 20 }}>
                  <ProfileField
                    label="Salon Name" value={String(salonForm.business_name ?? "")} name="business_name"
                    icon={<Building size={14} />} editing={salonEditing}
                    placeholder="Enter salon name" error={salonFieldErrors.business_name}
                    onChange={handleSalonFieldChange}
                  />
                  <ProfileField
                    label="Salon Email" value={String(salonForm.email ?? "")} name="email"
                    icon={<Envelope size={14} />} editing={salonEditing}
                    type="email" placeholder="salon@example.com" error={salonFieldErrors.email}
                    onChange={handleSalonFieldChange}
                  />
                  <ProfileField
                    label="Salon Phone" value={String(salonForm.phone ?? "")} name="phone"
                    icon={<Telephone size={14} />} editing={salonEditing}
                    type="tel" placeholder="+91 98765 43210" error={salonFieldErrors.phone}
                    onChange={handleSalonFieldChange}
                  />
                  <ProfileField
                    label="Website" value={String(salonForm.website_url ?? "")} name="website_url"
                    icon={<Globe size={14} />} editing={salonEditing}
                    placeholder="https://yoursalon.com" error={salonFieldErrors.website_url}
                    onChange={handleSalonFieldChange}
                  />
                </div>

                {/* Business & Tax */}
                <p className="pp-subsection-label">Business &amp; Tax</p>
                <div className="pp-fields-grid" style={{ marginBottom: 20 }}>
                  <ProfileField
                    label="GST Number" value={String(salonForm.gst_number ?? "")} name="gst_number"
                    icon={<Hash size={14} />} editing={salonEditing}
                    placeholder="22AAAAA0000A1Z5" error={salonFieldErrors.gst_number}
                    onChange={handleSalonFieldChange}
                  />
                  <ProfileField
                    label="Business Reg. No. (PAN)" value={String(salonForm.pan_number ?? "")} name="pan_number"
                    icon={<CreditCard size={14} />} editing={salonEditing}
                    placeholder="AAAAA1234A" error={salonFieldErrors.pan_number}
                    onChange={handleSalonFieldChange}
                  />
                  <ProfileField
                    label="Business Type" value={String(salonForm.business_type ?? "")} name="business_type"
                    icon={<Building size={14} />} editing={salonEditing}
                    placeholder="e.g. Salon, Spa" onChange={handleSalonFieldChange}
                  />
                  <ProfileField
                    label="Business Category" value={String(salonForm.business_category ?? "")} name="business_category"
                    icon={<Tag size={14} />} editing={salonEditing}
                    placeholder="e.g. Hair, Beauty" onChange={handleSalonFieldChange}
                  />
                </div>

                {/* Location */}
                <p className="pp-subsection-label">Location</p>
                <div className="pp-fields-grid" style={{ marginBottom: 20 }}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <ProfileField
                      label="Address" value={String(salonForm.address ?? "")} name="address"
                      icon={<GeoAlt size={14} />} editing={salonEditing}
                      placeholder="Street address" onChange={handleSalonFieldChange}
                    />
                  </div>
                  <ProfileField
                    label="City" value={String(salonForm.city ?? "")} name="city"
                    icon={<MapFill size={14} />} editing={salonEditing}
                    placeholder="City" onChange={handleSalonFieldChange}
                  />
                  <ProfileField
                    label="State" value={String(salonForm.state ?? "")} name="state"
                    icon={<MapFill size={14} />} editing={salonEditing}
                    placeholder="State" onChange={handleSalonFieldChange}
                  />
                  <ProfileField
                    label="Country" value={String(salonForm.country ?? "")} name="country"
                    icon={<Globe size={14} />} editing={salonEditing}
                    placeholder="Country" onChange={handleSalonFieldChange}
                  />
                  <ProfileField
                    label="Pincode" value={String(salonForm.pincode ?? "")} name="pincode"
                    icon={<Hash size={14} />} editing={salonEditing}
                    placeholder="400001" error={salonFieldErrors.pincode}
                    onChange={handleSalonFieldChange}
                  />
                </div>

                {/* Regional Settings */}
                <p className="pp-subsection-label">Regional Settings</p>
                <div className="pp-fields-grid">
                  <ProfileField
                    label="Timezone" value={String(salonForm.timezone ?? "")} name="timezone"
                    icon={<Clock size={14} />} editing={salonEditing}
                    placeholder="Asia/Kolkata" onChange={handleSalonFieldChange}
                  />
                  <ProfileField
                    label="Currency" value={String(salonForm.currency ?? "")} name="currency"
                    icon={<CreditCard size={14} />} editing={salonEditing}
                    placeholder="INR" error={salonFieldErrors.currency}
                    onChange={handleSalonFieldChange}
                  />
                  <div style={{ gridColumn: "1 / -1" }}>
                    <ProfileField
                      label="Description" value={String(salonForm.description ?? "")} name="description"
                      icon={<FileText size={14} />} editing={salonEditing}
                      placeholder="Brief description of your salon" error={salonFieldErrors.description}
                      onChange={handleSalonFieldChange}
                    />
                  </div>
                </div>
              </>
            ) : (
              <p style={{ fontSize: 13, color: "#9ca3af", padding: "8px 0" }}>
                No salon linked to your account.
              </p>
            )}
          </section>

          {/* ── Account & Security ── */}
          <section className="pp-section">
            <div className="pp-section-header">
              <div className="pp-section-icon pp-section-icon--amber">
                <ShieldLock size={16} />
              </div>
              <div>
                <h3 className="pp-section-title">Account &amp; Security</h3>
                <p className="pp-section-sub">Manage your password and security settings</p>
              </div>
              <button
                className={`pp-section-toggle ${pwSection ? "pp-section-toggle--open" : ""}`}
                onClick={() => { setPwSection((v) => !v); setPwError(null); setPwSuccess(false); }}
              >
                {pwSection ? "Close" : "Change Password"}
              </button>
            </div>

            {pwSection && (
              <div className="pp-pw-body">
                {pwSuccess && (
                  <div className="pp-success-banner">
                    <CheckCircleFill size={13} /> Password changed successfully!
                  </div>
                )}
                {pwError && (
                  <div className="pp-error-banner">
                    <XLg size={13} />
                    {pwError}
                    <button className="pp-error-close" aria-label="Dismiss error" title="Dismiss error" onClick={() => setPwError(null)}><XLg size={11} /></button>
                  </div>
                )}
                <div className="pp-pw-fields">
                  <div className="pp-pw-field">
                    <label className="pp-field-label">Current Password</label>
                    <div className="pp-pw-input-wrap">
                      <ShieldLock size={14} className="pp-pw-icon" />
                      <input
                        type={showPwCur ? "text" : "password"}
                        className="pp-pw-input"
                        value={pwCurrent}
                        onChange={(e) => setPwCurrent(e.target.value)}
                        placeholder="Enter current password"
                        autoComplete="current-password"
                      />
                      <button
                        className="pp-pw-eye"
                        aria-label={showPwCur ? "Hide password" : "Show password"}
                        title={showPwCur ? "Hide password" : "Show password"}
                        onClick={() => setShowPwCur(v => !v)}
                      >
                        {showPwCur ? <EyeSlash size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <div className="pp-pw-field">
                    <label className="pp-field-label">New Password</label>
                    <div className="pp-pw-input-wrap">
                      <ShieldLock size={14} className="pp-pw-icon" />
                      <input
                        type={showPwNew ? "text" : "password"}
                        className="pp-pw-input"
                        value={pwNew}
                        onChange={(e) => setPwNew(e.target.value)}
                        placeholder="Min 8 characters"
                        autoComplete="new-password"
                      />
                      <button
                        className="pp-pw-eye"
                        aria-label={showPwNew ? "Hide password" : "Show password"}
                        title={showPwNew ? "Hide password" : "Show password"}
                        onClick={() => setShowPwNew(v => !v)}
                      >
                        {showPwNew ? <EyeSlash size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    {pwNew.length > 0 && (
                      <div className="pp-pw-strength">
                        {[1, 2, 3, 4].map((i) => (
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
                  <div className="pp-pw-field">
                    <label className="pp-field-label">Confirm New Password</label>
                    <div className="pp-pw-input-wrap">
                      <ShieldLock size={14} className="pp-pw-icon" />
                      <input
                        type={showPwConf ? "text" : "password"}
                        className="pp-pw-input"
                        value={pwConfirm}
                        onChange={(e) => setPwConfirm(e.target.value)}
                        placeholder="Re-enter new password"
                        autoComplete="new-password"
                      />
                      <button
                        className="pp-pw-eye"
                        aria-label={showPwConf ? "Hide password" : "Show password"}
                        title={showPwConf ? "Hide password" : "Show password"}
                        onClick={() => setShowPwConf(v => !v)}
                      >
                        {showPwConf ? <EyeSlash size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  className="pp-pw-submit-btn"
                  onClick={handlePasswordChange}
                  disabled={changingPw}
                >
                  {changingPw ? <span className="pp-spinner" /> : <ShieldLock size={14} />}
                  {changingPw ? "Updating…" : "Update Password"}
                </button>
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}
