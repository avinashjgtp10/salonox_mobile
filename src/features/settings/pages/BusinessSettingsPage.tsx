import { useState, useEffect, useRef } from "react";
import {
  Building2,
  Globe,
  FileText,
  Phone,
  Mail,
  MapPin,
  Hash,
  Save,
  Pencil,
  X,
  Upload,
  Store,
  Users,
  Star,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { getMySalonThunk, updateSalonThunk } from "../../../middleware/salon/salon.thunk";
import Button from "../../../components/ui/Button";
import api from "../../../services/api/axios";
import type { Salon, UpdateSalonPayload } from "../../../types/salon.types";
import { TAX_ID_MESSAGES } from "../../../constants/message";
import { toTitleCase } from "../../../utils/titleCase";

const GSTIN_LENGTH = 15;
const PAN_LENGTH = 10;
// 2-digit state code + 10-char PAN + 1-digit entity code + "Z" + 1 checksum char.
const GSTIN_FORMAT_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN_FORMAT_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

const MAX_LOGO_SIZE = 2 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = ["image/jpeg", "image/png"];

// Strip an absolute localhost origin (as returned by the API) down to a
// relative path, so the Vite dev proxy serves it instead of the browser
// trying to hit the backend's own port directly. Same fix as the logo
// upload in MarketplaceProfilePage.
function toRelativeUrl(u?: string | null) {
  if (!u) return "";
  try {
    const p = new URL(u);
    if (p.hostname === "localhost") return p.pathname + p.search;
  } catch {
    // already relative
  }
  return u;
}

type BusinessForm = Omit<UpdateSalonPayload, "phone" | "address">;
type FormErrors = Partial<Record<"gst_number" | "pan_number", string>>;

function salonToForm(salon: Salon): BusinessForm {
  return {
    business_name: salon.business_name ?? "",
    business_type: salon.business_type ?? "",
    description: salon.description ?? "",
    email: salon.email ?? "",
    website_url: salon.website_url ?? "",
    google_review_url: salon.google_review_url ?? "",
    gst_number: salon.gst_number ?? "",
    pan_number: salon.pan_number ?? "",
    location_type: salon.location_type ?? undefined,
    team_type: salon.team_type ?? undefined,
    team_size: salon.team_size ?? undefined,
  };
}

const EMPTY_FORM: BusinessForm = {
  business_name: "",
  business_type: "",
  description: "",
  email: "",
  website_url: "",
  google_review_url: "",
  gst_number: "",
  pan_number: "",
  location_type: undefined,
  team_type: undefined,
  team_size: undefined,
};

export default function BusinessSettingsPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { currentSalon } = useAppSelector((s) => s.salon);

  // Phone/address are intentionally excluded from this form — they always
  // mirror the owner's Personal Profile (Settings > Profile) now, so they're
  // read-only here rather than a second, independently-editable copy.
  const [form, setForm] = useState<BusinessForm>(EMPTY_FORM);

  // Single page-level View <-> Edit toggle (not per-section) — every field
  // across every section becomes editable together, and saves together.
  const [isEditing, setIsEditing] = useState(false);
  const [isDirty,   setIsDirty]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [errors,    setErrors]    = useState<FormErrors>({});
  const { showSuccess, showError, overlay } = useStatusOverlay();

  const [logoUploading, setLogoUploading] = useState(false);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState("");
  const logoFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    dispatch(getMySalonThunk());
  }, [dispatch]);

  useEffect(() => {
    return () => {
      if (logoPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(logoPreviewUrl);
    };
  }, [logoPreviewUrl]);

  // Only re-sync from the server while NOT editing — otherwise a background
  // refetch (e.g. another tab saving) would silently overwrite in-progress
  // edits out from under the user.
  useEffect(() => {
    if (currentSalon && !isEditing) {
      setForm(salonToForm(currentSalon));
    }
  }, [currentSalon, isEditing]);

  // Warn on tab close/refresh with unsaved changes still pending.
  useEffect(() => {
    if (!isEditing || !isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isEditing, isDirty]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name } = e.target;
    let value = e.target.value;

    if (name === "gst_number") {
      value = value.toUpperCase().slice(0, GSTIN_LENGTH);
      setErrors((prev) => ({
        ...prev,
        gst_number: value && !GSTIN_FORMAT_RE.test(value)
          ? (value.length !== GSTIN_LENGTH ? TAX_ID_MESSAGES.GSTIN_LENGTH : TAX_ID_MESSAGES.GSTIN_FORMAT)
          : undefined,
      }));
    }

    if (name === "pan_number") {
      value = value.toUpperCase().slice(0, PAN_LENGTH);
      setErrors((prev) => ({
        ...prev,
        pan_number: value && !PAN_FORMAT_RE.test(value)
          ? (value.length !== PAN_LENGTH ? TAX_ID_MESSAGES.PAN_LENGTH : TAX_ID_MESSAGES.PAN_FORMAT)
          : undefined,
      }));
    }

    setForm((prev) => ({ ...prev, [name]: value || undefined }));
    setIsDirty(true);
  };

  const validateForm = () => {
    const nextErrors: FormErrors = {};
    const gstNumber = form.gst_number?.trim() ?? "";
    const panNumber = form.pan_number?.trim() ?? "";

    if (gstNumber && !GSTIN_FORMAT_RE.test(gstNumber)) {
      nextErrors.gst_number = gstNumber.length !== GSTIN_LENGTH
        ? TAX_ID_MESSAGES.GSTIN_LENGTH
        : TAX_ID_MESSAGES.GSTIN_FORMAT;
    }

    if (panNumber && !PAN_FORMAT_RE.test(panNumber)) {
      nextErrors.pan_number = panNumber.length !== PAN_LENGTH
        ? TAX_ID_MESSAGES.PAN_LENGTH
        : TAX_ID_MESSAGES.PAN_FORMAT;
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const startEditing = () => {
    setIsEditing(true);
    setIsDirty(false);
    setErrors({});
  };

  const handleCancel = () => {
    if (isDirty && !window.confirm("Discard your unsaved changes?")) return;
    if (currentSalon) setForm(salonToForm(currentSalon));
    setErrors({});
    setIsDirty(false);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!currentSalon?.id) {
      showError("Salon information not found");
      return;
    }
    if (!isDirty) {
      // Nothing changed — just leave edit mode instead of firing a no-op save.
      setIsEditing(false);
      return;
    }
    if (!validateForm()) {
      showError("Please fix the highlighted fields before saving");
      return;
    }

    setSaving(true);
    const result = await dispatch(
      updateSalonThunk({
        id: currentSalon.id,
        payload: { ...form, business_name: toTitleCase(form.business_name.trim()) },
      })
    );
    setSaving(false);

    if (updateSalonThunk.fulfilled.match(result)) {
      showSuccess("Business settings saved");
      setIsDirty(false);
      setIsEditing(false);
    } else {
      showError((result.payload as string) || "Failed to save business settings");
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      showError("Please upload a JPG or PNG image.");
      if (logoFileRef.current) logoFileRef.current.value = "";
      return;
    }
    if (file.size > MAX_LOGO_SIZE) {
      showError("Logo must be under 2 MB.");
      if (logoFileRef.current) logoFileRef.current.value = "";
      return;
    }

    setLogoUploading(true);
    const localPreviewUrl = URL.createObjectURL(file);
    setLogoPreviewUrl((current) => {
      if (current.startsWith("blob:")) URL.revokeObjectURL(current);
      return localPreviewUrl;
    });
    const formData = new FormData();
    formData.append("image", file);
    try {
      // Same upload endpoint the Online Booking marketplace profile uses for
      // its logo (see MarketplaceProfilePage) — it writes the salon's own
      // logo_url, which is what Business Settings reads, so this is a
      // separate image from the owner's Personal Profile photo (uploaded via
      // uploadAvatarThunk to /users/me/avatar) and updating one never touches
      // the other.
      const res = await api.post("/api/v1/marketplace/logo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const saved = res.data?.data ?? res.data ?? {};
      const uploadedLogoUrl =
        typeof saved.logo_url === "string" && saved.logo_url.trim()
          ? toRelativeUrl(saved.logo_url)
          : localPreviewUrl;
      setLogoPreviewUrl(uploadedLogoUrl);
      void dispatch(getMySalonThunk());
      showSuccess("Business logo updated!");
    } catch (err: unknown) {
      setLogoPreviewUrl((current) => (current === localPreviewUrl ? "" : current));
      URL.revokeObjectURL(localPreviewUrl);
      const msg =
        err && typeof err === "object"
          ? ((err as { response?: { data?: { message?: unknown } } }).response?.data?.message ?? "Logo upload failed.")
          : "Logo upload failed.";
      showError(msg);
    } finally {
      setLogoUploading(false);
      if (logoFileRef.current) logoFileRef.current.value = "";
    }
  };

  const handleLogoRemove = async () => {
    if (!currentSalon?.id || logoUploading) return;

    const previousPreviewUrl = logoPreviewUrl;
    if (previousPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(previousPreviewUrl);
    setLogoPreviewUrl("");
    setLogoUploading(true);

    const result = await dispatch(
      updateSalonThunk({
        id: currentSalon.id,
        payload: { logo_url: "" },
      }),
    );

    setLogoUploading(false);

    if (updateSalonThunk.fulfilled.match(result)) {
      showSuccess("Business logo removed.");
      void dispatch(getMySalonThunk());
      return;
    }

    setLogoPreviewUrl(previousPreviewUrl);
    showError((result.payload as string) || "Failed to remove business logo.");
  };

  // Derive initials for the logo placeholder
  const logoInitials = (form.business_name || "B")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const displayLogoUrl = logoPreviewUrl || toRelativeUrl(currentSalon?.logo_url) || "";

  return (
    <>
      {overlay}
      {/* Page Header */}
      <div className="settings-page-header settings-page-header--with-actions">
        <div>
          <h2 className="settings-page-title">Business Settings</h2>
          <p className="settings-page-subtitle">
            Manage your salon's public profile, contact information, and operational details.
          </p>
        </div>
        {!isEditing ? (
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={startEditing}
            iconLeft={<Pencil size={13} />}
          >
            Edit
          </Button>
        ) : (
          <div className="settings-section-actions">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={saving}
              iconLeft={<X size={13} />}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              loading={saving}
              onClick={handleSave}
              disabled={saving}
              iconLeft={<Save size={14} />}
            >
              Save changes
            </Button>
          </div>
        )}
      </div>

      {/* Logo & Branding — an independent, immediate action (not part of the
          view/edit form below), so it stays available regardless of edit mode. */}
      <div className="settings-section">
        <div className="settings-section-header">
          <div>
            <p className="settings-section-title">Logo & Branding</p>
            <p className="settings-section-desc">
              Your logo appears on invoices, receipts, and the online booking page.
            </p>
          </div>
        </div>
        <div className="settings-section-body">
          <div className="settings-avatar-row">
            <div
              className="settings-avatar settings-avatar--square"
              onClick={() => !logoUploading && logoFileRef.current?.click()}
              style={{ cursor: logoUploading ? "default" : "pointer" }}
            >
              {displayLogoUrl ? (
                <img src={displayLogoUrl} alt="Business logo" />
              ) : (
                <span>{logoInitials}</span>
              )}
              <div className="settings-avatar-overlay">
                <Upload size={18} />
              </div>
              <input
                ref={logoFileRef}
                type="file"
                accept=".jpg,.jpeg,.png"
                aria-label="Upload business logo"
                style={{ display: "none" }}
                onChange={handleLogoUpload}
              />
            </div>
            <div className="settings-avatar-info">
              <p className="settings-avatar-name">
                {form.business_name || "Your Business"}
              </p>
              <p className="settings-avatar-meta">
                Recommended: 400×400px PNG or JPG, max 2 MB
              </p>
              <div className="settings-avatar-actions">
                <Button
                  size="sm"
                  variant="outline-secondary"
                  loading={logoUploading}
                  onClick={() => logoFileRef.current?.click()}
                >
                  Upload logo
                </Button>
                {displayLogoUrl && (
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={logoUploading}
                    disabled={logoUploading}
                    onClick={handleLogoRemove}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Basic Information */}
      <div className="settings-section">
        <div className="settings-section-header">
          <div>
            <p className="settings-section-title">Business Information</p>
            <p className="settings-section-desc">
              Core details about your business.
            </p>
          </div>
        </div>
        <div className="settings-section-body">
          <div className="settings-form-grid">
            {/* Business Name */}
            <div className="settings-form-group">
              <label className="settings-label">
                <Building2 size={13} className="me-1" />
                Business Name
              </label>
              <input
                className="settings-input"
                name="business_name"
                value={form.business_name ?? ""}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="Glamour Studio"
              />
            </div>

            {/* Business Type */}
            <div className="settings-form-group">
              <label className="settings-label">
                <Store size={13} className="me-1" />
                Business Type
              </label>
              <select
                className="settings-select"
                name="business_type"
                value={form.business_type ?? ""}
                onChange={handleChange}
                disabled={!isEditing}
              >
                <option value="">Select type</option>
                <option value="salon">Hair Salon</option>
                <option value="spa">Spa & Wellness</option>
                <option value="beauty_parlour">Beauty Parlour</option>
                <option value="nail_studio">Nail Studio</option>
                <option value="barbershop">Barbershop</option>
                <option value="medspa">Medical Spa</option>
                <option value="tattoo_studio">Tattoo Studio</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Description */}
            <div className="settings-form-group span-2">
              <label className="settings-label">
                <FileText size={13} className="me-1" />
                Business Description
              </label>
              <textarea
                className="settings-textarea"
                name="description"
                value={form.description ?? ""}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="Tell clients what makes your business special..."
                rows={3}
              />
              <span className="settings-hint">
                Shown on your online booking page (max 500 characters).
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Details */}
      <div className="settings-section">
        <div className="settings-section-header">
          <div>
            <p className="settings-section-title">Contact Details</p>
            <p className="settings-section-desc">
              Public contact info shown on your booking page.
            </p>
          </div>
        </div>
        <div className="settings-section-body">
          <div className="settings-form-grid">
            <div className="settings-form-group">
              <label className="settings-label">
                <Mail size={13} className="me-1" />
                Business Email
              </label>
              <input
                className="settings-input"
                type="email"
                name="email"
                value={form.email ?? ""}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="hello@yoursalon.com"
              />
            </div>

            <div className="settings-form-group">
              <label className="settings-label">
                <Phone size={13} className="me-1" />
                Business Phone
              </label>
              <input
                className="settings-input"
                value={currentSalon?.phone || "Not set"}
                readOnly
                disabled
              />
              <span className="settings-hint">
                Synced from your{" "}
                <a href="#" onClick={(e) => { e.preventDefault(); navigate("/dashboard/settings/profile"); }}>
                  Personal Profile
                </a>.
              </span>
            </div>

            <div className="settings-form-group">
              <label className="settings-label">
                <Globe size={13} className="me-1" />
                Website URL
              </label>
              <input
                className="settings-input"
                name="website_url"
                value={form.website_url ?? ""}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="https://yoursalon.com"
              />
            </div>

            <div className="settings-form-group">
              <label className="settings-label">
                <Star size={13} className="me-1" />
                Google Review Link
              </label>
              <input
                className="settings-input"
                name="google_review_url"
                value={form.google_review_url ?? ""}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="https://g.page/r/your-salon/review"
              />
              <span className="settings-hint">
                Shown to clients after they submit feedback, so happy customers can leave you a Google review too.
              </span>
            </div>

            <div className="settings-form-group span-2">
              <label className="settings-label">
                <MapPin size={13} className="me-1" />
                Business Address
              </label>
              <input
                className="settings-input"
                value={currentSalon?.address || "Not set"}
                readOnly
                disabled
              />
              <span className="settings-hint">
                Synced from your{" "}
                <a href="#" onClick={(e) => { e.preventDefault(); navigate("/dashboard/settings/profile"); }}>
                  Personal Profile
                </a>.
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* Tax & Compliance */}
      <div className="settings-section">
        <div className="settings-section-header">
          <div>
            <p className="settings-section-title">Tax & Compliance</p>
            <p className="settings-section-desc">
              Required for invoices and tax filings.
            </p>
          </div>
        </div>
        <div className="settings-section-body">
          <div className="settings-form-grid">
            <div className="settings-form-group">
              <label className="settings-label">
                <Hash size={13} className="me-1" />
                GST Number
              </label>
              <input
                className="settings-input"
                name="gst_number"
                value={form.gst_number ?? ""}
                onChange={handleChange}
                maxLength={GSTIN_LENGTH}
                disabled={!isEditing}
                placeholder="22AAAAA0000A1Z5"
              />
              {errors.gst_number && <span className="settings-error">{errors.gst_number}</span>}
            </div>

            <div className="settings-form-group">
              <label className="settings-label">
                <Hash size={13} className="me-1" />
                PAN Number
              </label>
              <input
                className="settings-input"
                name="pan_number"
                value={form.pan_number ?? ""}
                onChange={handleChange}
                maxLength={PAN_LENGTH}
                disabled={!isEditing}
                placeholder="AAAAA0000A"
              />
              {errors.pan_number && <span className="settings-error">{errors.pan_number}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Operations */}
      <div className="settings-section">
        <div className="settings-section-header">
          <div>
            <p className="settings-section-title">Operations</p>
            <p className="settings-section-desc">
              Configure how your business operates.
            </p>
          </div>
        </div>
        <div className="settings-section-body">
          <div className="settings-form-grid">
            <div className="settings-form-group">
              <label className="settings-label">
                <MapPin size={13} className="me-1" />
                Location Type
              </label>
              <select
                className="settings-select"
                name="location_type"
                value={form.location_type ?? ""}
                onChange={handleChange}
                disabled={!isEditing}
              >
                <option value="">Select type</option>
                <option value="physical">Physical — clients come to you</option>
                <option value="mobile">Mobile — you go to clients</option>
                <option value="virtual">Virtual — remote services</option>
              </select>
            </div>

            <div className="settings-form-group">
              <label className="settings-label">
                <Users size={13} className="me-1" />
                Staff Type
              </label>
              <select
                className="settings-select"
                name="team_type"
                value={form.team_type ?? ""}
                onChange={handleChange}
                disabled={!isEditing}
              >
                <option value="">Select type</option>
                <option value="independent">Independent — just me</option>
                <option value="team">Staff team — multiple staff</option>
              </select>
            </div>

            <div className="settings-form-group">
              <label className="settings-label">Staff Size</label>
              <select
                className="settings-select"
                name="team_size"
                value={form.team_size ?? ""}
                onChange={handleChange}
                disabled={!isEditing}
              >
                <option value="">Select size</option>
                <option value="2-5">2–5 people</option>
                <option value="6-10">6–10 people</option>
                <option value="11+">11+ people</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
