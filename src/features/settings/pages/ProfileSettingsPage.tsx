import { useState, useEffect, useRef } from "react";
import { Camera, User, Mail, Phone, MapPin, Globe, Save } from "lucide-react";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchMeThunk, updateUserThunk } from "../../../middleware/user/user.thunk";
import Button from "../../../components/ui/Button";

export default function ProfileSettingsPage() {
  const dispatch = useAppDispatch();
  const { profile, loading } = useAppSelector((s) => s.user);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    address: "",
    country: "",
    countryCode: "",
  });

  const [isDirty, setIsDirty] = useState(false);
  const { showSuccess, showError, overlay } = useStatusOverlay();

  useEffect(() => {
    dispatch(fetchMeThunk());
  }, [dispatch]);

  useEffect(() => {
    if (profile) {
      setForm({
        fullName: profile.fullName ?? "",
        phone: profile.phone ?? "",
        address: profile.address ?? "",
        country: profile.country ?? "",
        countryCode: profile.countryCode ?? "",
      });
    }
  }, [profile]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    const result = await dispatch(updateUserThunk(form));
    if (updateUserThunk.fulfilled.match(result)) {
      showSuccess("Profile updated successfully");
      setIsDirty(false);
    } else {
      showError((result.payload as string) || "Failed to update profile");
    }
  };

  const handleReset = () => {
    if (profile) {
      setForm({
        fullName: profile.fullName ?? "",
        phone: profile.phone ?? "",
        address: profile.address ?? "",
        country: profile.country ?? "",
        countryCode: profile.countryCode ?? "",
      });
      setIsDirty(false);
    }
  };

  const initials = profile?.fullName
    ? profile.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <>
      {overlay}
      {/* Page Header */}
      <div className="settings-page-header">
        <h2 className="settings-page-title">Profile Settings</h2>
        <p className="settings-page-subtitle">
          Manage your personal information and how it appears across the platform.
        </p>
      </div>

      {/* Avatar Section */}
      <div className="settings-section">
        <div className="settings-section-header">
          <div>
            <p className="settings-section-title">Profile Photo</p>
            <p className="settings-section-desc">
              A photo helps your team recognize you.
            </p>
          </div>
        </div>
        <div className="settings-section-body">
          <div className="settings-avatar-row">
            <div
              className="settings-avatar"
              onClick={() => fileInputRef.current?.click()}
              title="Change photo"
            >
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.fullName} />
              ) : (
                <span>{initials}</span>
              )}
              <div className="settings-avatar-overlay">
                <Camera size={18} />
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={() => showError("Photo upload coming soon")}
            />
            <div className="settings-avatar-info">
              <p className="settings-avatar-name">
                {profile?.fullName || "Your Name"}
              </p>
              <p className="settings-avatar-meta">
                {profile?.email} &nbsp;·&nbsp;{" "}
                {profile?.businessName || "No business set"}
              </p>
              <div className="settings-avatar-actions">
                <Button
                  size="sm"
                  variant="outline-secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload photo
                </Button>
                {profile?.avatarUrl && (
                  <Button size="sm" variant="ghost">
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="settings-section">
        <div className="settings-section-header">
          <div>
            <p className="settings-section-title">Personal Information</p>
            <p className="settings-section-desc">
              Update your name and contact details.
            </p>
          </div>
        </div>
        <div className="settings-section-body">
          <div className="settings-form-grid">
            {/* Full Name */}
            <div className="settings-form-group">
              <label className="settings-label">
                <User size={13} className="me-1" />
                Full Name
              </label>
              <input
                className="settings-input"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                placeholder="Enter your full name"
              />
            </div>

            {/* Email (read-only) */}
            <div className="settings-form-group">
              <label className="settings-label">
                <Mail size={13} className="me-1" />
                Email Address
              </label>
              <input
                className="settings-input"
                type="email"
                value={profile?.email ?? ""}
                readOnly
                placeholder="your@email.com"
              />
              <span className="settings-hint">
                Email cannot be changed here. Use Account &amp; Security.
              </span>
            </div>

            {/* Phone */}
            <div className="settings-form-group">
              <label className="settings-label">
                <Phone size={13} className="me-1" />
                Phone Number
              </label>
              <input
                className="settings-input"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+91 98765 43210"
              />
            </div>

            {/* Country Code */}
            <div className="settings-form-group">
              <label className="settings-label">
                <Globe size={13} className="me-1" />
                Country Code
              </label>
              <select
                className="settings-select"
                name="countryCode"
                value={form.countryCode}
                onChange={handleChange}
              >
                <option value="">Select country code</option>
                <option value="+91">+91 India</option>
                <option value="+1">+1 United States</option>
                <option value="+44">+44 United Kingdom</option>
                <option value="+61">+61 Australia</option>
                <option value="+971">+971 UAE</option>
                <option value="+65">+65 Singapore</option>
                <option value="+60">+60 Malaysia</option>
              </select>
            </div>

            {/* Address */}
            <div className="settings-form-group span-2">
              <label className="settings-label">
                <MapPin size={13} className="me-1" />
                Address
              </label>
              <input
                className="settings-input"
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="123 Main Street, City"
              />
            </div>

            {/* Country */}
            <div className="settings-form-group">
              <label className="settings-label">Country</label>
              <select
                className="settings-select"
                name="country"
                value={form.country}
                onChange={handleChange}
              >
                <option value="">Select country</option>
                <option value="India">India</option>
                <option value="United States">United States</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="Australia">Australia</option>
                <option value="UAE">UAE</option>
                <option value="Singapore">Singapore</option>
                <option value="Malaysia">Malaysia</option>
                <option value="Canada">Canada</option>
                <option value="Germany">Germany</option>
                <option value="France">France</option>
              </select>
            </div>
          </div>

          <div className="settings-form-actions">
            {isDirty && (
              <Button variant="ghost" size="sm" onClick={handleReset}>
                Discard changes
              </Button>
            )}
            <Button
              size="sm"
              loading={loading.update}
              onClick={handleSave}
              disabled={!isDirty}
              iconLeft={<Save size={14} />}
            >
              Save changes
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
