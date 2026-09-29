import { useEffect, useRef, useState } from "react";
import { Pencil, Save, X, Camera } from "lucide-react";
import { PersonBadge, CheckCircleFill } from "react-bootstrap-icons";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchMeThunk, updateUserThunk, uploadAvatarThunk } from "../../../middleware/user/user.thunk";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import Button from "../../../components/ui/Button";
import SettingsSection from "../../settings/components/SettingsSection";

function formatRole(role?: string | null) {
  if (!role) return "Branch Owner";
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function BranchOwnerProfileSection() {
  const dispatch = useAppDispatch();
  const profile = useAppSelector((s) => s.user.profile);
  const fetching = useAppSelector((s) => s.user.loading.fetch);
  const saving = useAppSelector((s) => s.user.loading.update);
  const uploading = useAppSelector((s) => s.user.loading.avatar);
  const authRole = useAppSelector((s) => s.auth.role);
  const { showSuccess, showError, overlay } = useStatusOverlay();
  const fileRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");

  useEffect(() => { dispatch(fetchMeThunk()); }, [dispatch]);

  useEffect(() => {
    if (!profile) return;
    const parts = (profile.fullName ?? "").trim().split(/\s+/);
    setFirstName(parts[0] ?? "");
    setLastName(parts.length > 1 ? parts.slice(1).join(" ") : "");
    setPhone(profile.phone ?? "");
    setCountry(profile.country ?? "");
  }, [profile]);

  const handleCancel = () => {
    if (!profile) { setIsEditing(false); return; }
    const parts = (profile.fullName ?? "").trim().split(/\s+/);
    setFirstName(parts[0] ?? "");
    setLastName(parts.length > 1 ? parts.slice(1).join(" ") : "");
    setPhone(profile.phone ?? "");
    setCountry(profile.country ?? "");
    setIsEditing(false);
  };

  const handleSave = async () => {
    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
    if (!fullName) { showError("First name is required."); return; }
    const result = await dispatch(updateUserThunk({ fullName, phone, country }));
    if (updateUserThunk.fulfilled.match(result)) {
      showSuccess("Profile updated successfully!");
      setIsEditing(false);
    } else {
      showError(String(result.payload ?? "Failed to save changes."));
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      showError("Please upload a JPG, PNG, or WEBP image.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    const result = await dispatch(uploadAvatarThunk(file));
    if (uploadAvatarThunk.fulfilled.match(result)) {
      showSuccess("Profile photo updated!");
    } else {
      showError(String(result.payload ?? "Failed to upload photo."));
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const displayName = profile?.fullName || "Branch Owner";
  const initials = displayName.split(/\s+/).map((n) => n[0]).filter(Boolean).join("").toUpperCase().slice(0, 2) || "BO";

  return (
    <>
      {overlay}
      <div className="settings-page-header settings-page-header--with-actions">
        <div>
          <h2 className="settings-page-title">Profile</h2>
          <p className="settings-page-subtitle">Your personal details as a branch owner.</p>
        </div>
        {!isEditing ? (
          <Button variant="outline-secondary" size="sm" onClick={() => setIsEditing(true)} iconLeft={<Pencil size={13} />}>
            Edit
          </Button>
        ) : (
          <div className="settings-section-actions">
            <Button variant="ghost" size="sm" onClick={handleCancel} disabled={saving} iconLeft={<X size={13} />}>Cancel</Button>
            <Button size="sm" onClick={handleSave} loading={saving} disabled={saving} iconLeft={<Save size={14} />}>Save changes</Button>
          </div>
        )}
      </div>

      <SettingsSection title="Personal Details" desc="Your name, contact details, and photo.">
        {fetching && !profile ? (
          <p style={{ fontSize: 13, color: "#6b7280" }}>Loading profile…</p>
        ) : (
          <>
            <div className="settings-avatar-row">
              <div className="settings-avatar" style={{ position: "relative" }}>
                {profile?.avatarUrl ? <img src={profile.avatarUrl} alt={displayName} /> : initials}
                {uploading && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%" }}>
                    <span style={{ fontSize: 10 }}>…</span>
                  </div>
                )}
              </div>
              <Button variant="outline-secondary" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading} iconLeft={<Camera size={13} />}>
                Change photo
              </Button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handleAvatarChange} />
            </div>

            <div className="settings-form-grid">
              <div className="settings-form-group">
                <label className="settings-label">First name</label>
                <input className="settings-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={!isEditing} placeholder="First name" />
              </div>
              <div className="settings-form-group">
                <label className="settings-label">Last name</label>
                <input className="settings-input" value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={!isEditing} placeholder="Last name" />
              </div>
              <div className="settings-form-group">
                <label className="settings-label">Email</label>
                <input className="settings-input" type="email" value={profile?.email ?? ""} disabled readOnly placeholder="you@example.com" />
              </div>
              <div className="settings-form-group">
                <label className="settings-label">Phone</label>
                <input className="settings-input" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!isEditing} placeholder="+91 98765 43210" />
              </div>
              <div className="settings-form-group">
                <label className="settings-label">Country</label>
                <input className="settings-input" value={country} onChange={(e) => setCountry(e.target.value)} disabled={!isEditing} placeholder="e.g. India" />
              </div>
            </div>

            <p className="settings-hint" style={{ margin: "20px 0 10px", fontWeight: 700, color: "#111827", fontSize: 12.5, textTransform: "uppercase", letterSpacing: "0.04em" }}>Account Info</p>
            <div className="settings-form-grid">
              <div className="settings-form-group">
                <label className="settings-label">Role</label>
                <div className="settings-security-item" style={{ padding: "8px 0", border: "none" }}>
                  <div className="settings-security-icon" style={{ width: 32, height: 32 }}><PersonBadge size={15} /></div>
                  <div className="settings-security-info">
                    <p className="settings-security-name" style={{ margin: 0 }}>{formatRole(profile?.role ?? authRole)}</p>
                  </div>
                </div>
              </div>
              <div className="settings-form-group">
                <label className="settings-label">Account status</label>
                <div className="settings-security-item" style={{ padding: "8px 0", border: "none" }}>
                  <div className="settings-security-icon" style={{ width: 32, height: 32, background: "#f0fdf4", color: "#16a34a" }}><CheckCircleFill size={14} /></div>
                  <div className="settings-security-info">
                    <p className="settings-security-name" style={{ margin: 0 }}>{profile?.isActive === false ? "Inactive" : "Active"}</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </SettingsSection>
    </>
  );
}
