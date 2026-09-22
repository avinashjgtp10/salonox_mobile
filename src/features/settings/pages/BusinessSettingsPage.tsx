import { useState, useEffect, useRef } from "react";
import {
  Building2,
  Globe,
  FileText,
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  Hash,
  Save,
  Pencil,
  X,
  Store,
  Users,
  Star,
  User,
  Upload,
} from "lucide-react";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { getMySalonThunk, updateSalonThunk } from "../../../middleware/salon/salon.thunk";
import { fetchMeThunk, updateUserThunk } from "../../../middleware/user/user.thunk";
import Button from "../../../components/ui/Button";
import api from "../../../services/api/axios";
import { resolveMediaUrl } from "../../../utils/mediaUrl";
import type { Salon, UpdateSalonPayload } from "../../../types/salon.types";
import { TAX_ID_MESSAGES } from "../../../constants/message";
import { toTitleCase } from "../../../utils/titleCase";
// Self-imported (not just relying on SettingsLayout's import) so this page's
// settings-* classnames stay styled even when mounted outside Settings — e.g.
// at /dashboard/profile.
import "../styles/SettingsPage.scss";

const GSTIN_LENGTH = 15;
const PAN_LENGTH = 10;
// 2-digit state code + 10-char PAN + 1-digit entity code + "Z" + 1 checksum char.
const GSTIN_FORMAT_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN_FORMAT_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

const MAX_LOGO_SIZE = 2 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = ["image/jpeg", "image/png"];

// Phone and address are both independently business-level fields — neither
// mirrors the owner's Personal Profile. Cash counter WhatsApp alerts
// (cash-management.service.ts's resolveOwnerNotifyPhone) prefer this
// business phone and only fall back to the owner's personal number when it's
// empty, so leaving it blank here doesn't break that flow.
type BusinessForm = UpdateSalonPayload;
type FormErrors = Partial<Record<"gst_number" | "pan_number", string>>;

function salonToForm(salon: Salon): BusinessForm {
  return {
    business_name: salon.business_name ?? "",
    business_type: salon.business_type ?? "",
    description: salon.description ?? "",
    email: salon.email ?? "",
    phone: salon.phone ?? "",
    website_url: salon.website_url ?? "",
    google_review_url: salon.google_review_url ?? "",
    gst_number: salon.gst_number ?? "",
    pan_number: salon.pan_number ?? "",
    gst_registration_type: salon.gst_registration_type ?? undefined,
    address: salon.address ?? "",
    address_line2: salon.address_line2 ?? "",
    city: salon.city ?? "",
    state: salon.state ?? "",
    country: salon.country ?? "",
    pincode: salon.pincode ?? "",
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
  phone: "",
  website_url: "",
  google_review_url: "",
  gst_number: "",
  pan_number: "",
  gst_registration_type: undefined,
  address: "",
  address_line2: "",
  city: "",
  state: "",
  country: "",
  pincode: "",
  location_type: undefined,
  team_type: undefined,
  team_size: undefined,
};

const Required = () => <span className="settings-required">*</span>;

export default function BusinessSettingsPage() {
  const dispatch = useAppDispatch();
  const { currentSalon } = useAppSelector((s) => s.salon);
  const profile = useAppSelector((s) => s.user.profile);

  const [form, setForm] = useState<BusinessForm>(EMPTY_FORM);
  const [fullName, setFullName] = useState("");
  // The owner's own number — separate from Business Phone (which prints on
  // receipts/invoices). This is where cash counter open/close and other
  // internal owner alerts go; never shown to clients. Lives on users.phone,
  // same as before, just no longer doubling as the printed business number.
  const [alertsPhone, setAlertsPhone] = useState("");
  // Single page-level Edit toggle — every field below (except the logo,
  // which stays its own immediate action) is disabled until Edit is
  // clicked, and Save Changes only appears once it is.
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const { showSuccess, showError, overlay } = useStatusOverlay();

  // ── Logo state (single logo, salons.logo_url — used everywhere: navbar
  // dropdown, receipts/print, invoices, online booking page, digital menu) ──
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState("");
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const logoFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    dispatch(getMySalonThunk());
    dispatch(fetchMeThunk());
  }, [dispatch]);

  // Only re-sync from the server while NOT editing — otherwise a background
  // refetch (getMySalonThunk/fetchMeThunk run on every mount, and other
  // pages can trigger them too) would silently overwrite in-progress edits
  // out from under the user before they ever reach Save Changes.
  useEffect(() => {
    if (currentSalon && !isEditing) setForm(salonToForm(currentSalon));
  }, [currentSalon, isEditing]);

  useEffect(() => {
    if (profile && !isEditing) {
      setFullName(profile.fullName ?? "");
      setAlertsPhone(profile.phone ?? "");
    }
  }, [profile, isEditing]);

  useEffect(() => {
    return () => {
      if (logoPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(logoPreviewUrl);
    };
  }, [logoPreviewUrl]);

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
    setErrors({});
  };

  const handleCancel = () => {
    if (currentSalon) setForm(salonToForm(currentSalon));
    if (profile) {
      setFullName(profile.fullName ?? "");
      setAlertsPhone(profile.phone ?? "");
    }
    setErrors({});
    setIsEditing(false);
  };

  // One Save Changes button persists both the personal Full Name (users
  // table, via updateUserThunk) and every business field (salons table, via
  // updateSalonThunk) together.
  const handleSave = async () => {
    if (!currentSalon?.id) {
      showError("Salon information not found");
      return;
    }
    if (!fullName.trim()) {
      showError("Full name is required");
      return;
    }
    if (!validateForm()) {
      showError("Please fix the highlighted fields before saving");
      return;
    }

    setSaving(true);
    const [userResult, salonResult] = await Promise.all([
      dispatch(updateUserThunk({ fullName: toTitleCase(fullName.trim()), phone: alertsPhone.trim() })),
      dispatch(updateSalonThunk({
        id: currentSalon.id,
        payload: { ...form, business_name: toTitleCase((form.business_name ?? "").trim()) },
      })),
    ]);
    setSaving(false);

    const userOk = updateUserThunk.fulfilled.match(userResult);
    const salonOk = updateSalonThunk.fulfilled.match(salonResult);

    if (userOk && salonOk) {
      showSuccess("Settings saved");
      setIsEditing(false);
    } else {
      const msg = !salonOk
        ? String((salonResult as any).payload ?? "Failed to save business settings")
        : String((userResult as any).payload ?? "Failed to save profile");
      showError(msg);
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
      const res = await api.post("/api/v1/marketplace/logo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const savedData = res.data?.data ?? res.data ?? {};
      const uploadedLogoUrl =
        typeof savedData.logo_url === "string" && savedData.logo_url.trim()
          ? resolveMediaUrl(savedData.logo_url)
          : localPreviewUrl;
      setLogoPreviewUrl(uploadedLogoUrl);
      setLogoLoadFailed(false);
      void dispatch(getMySalonThunk());
      showSuccess("Logo updated!");
    } catch (err: unknown) {
      setLogoPreviewUrl((current) => (current === localPreviewUrl ? "" : current));
      URL.revokeObjectURL(localPreviewUrl);
      const msg =
        err && typeof err === "object"
          ? String((err as { response?: { data?: { message?: unknown } } }).response?.data?.message ?? "Logo upload failed.")
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
    setLogoLoadFailed(false);
    setLogoUploading(true);

    const result = await dispatch(
      updateSalonThunk({ id: currentSalon.id, payload: { logo_url: "" } }),
    );

    setLogoUploading(false);

    if (updateSalonThunk.fulfilled.match(result)) {
      showSuccess("Logo removed.");
      void dispatch(getMySalonThunk());
      return;
    }

    setLogoPreviewUrl(previousPreviewUrl);
    showError((result.payload as string) || "Failed to remove logo.");
  };

  const logoInitials = (form.business_name || "B")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const displayLogoUrl = logoLoadFailed
    ? ""
    : logoPreviewUrl || resolveMediaUrl(currentSalon?.logo_url) || "";

  return (
    <>
      {overlay}

      {/* Page Header — one global Edit toggle for the whole page (not a
          per-section one). Every field below is disabled until Edit is
          clicked; Save Changes only appears once it is. */}
      <div className="settings-page-header settings-page-header--with-actions">
        <div>
          <h2 className="settings-page-title">Settings</h2>
          <p className="settings-page-subtitle">
            Manage your personal and business information.
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
              Save Changes
            </Button>
          </div>
        )}
      </div>

      {/* Logo & Profile */}
      <div className="settings-section">
        <div className="settings-section-header">
          <div>
            <p className="settings-section-title">Logo & Profile</p>
            <p className="settings-section-desc">
              This logo represents you and your business. It will be used on invoices, receipts, and your online booking page.
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
                <img
                  src={displayLogoUrl}
                  alt="Logo"
                  onLoad={() => setLogoLoadFailed(false)}
                  onError={() => setLogoLoadFailed(true)}
                />
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
                aria-label="Upload logo"
                style={{ display: "none" }}
                onChange={handleLogoUpload}
              />
            </div>
            <div className="settings-avatar-info">
              <div className="settings-avatar-actions">
                <Button
                  size="sm"
                  variant="outline-secondary"
                  loading={logoUploading}
                  onClick={() => logoFileRef.current?.click()}
                  iconLeft={<Upload size={13} />}
                >
                  Upload Logo
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
              <p className="settings-avatar-meta">
                Recommended: 400×400px (PNG or JPG, max 2 MB)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Basic Information */}
      <div className="settings-section">
        <div className="settings-section-header">
          <div>
            <p className="settings-section-title">Basic Information</p>
            <p className="settings-section-desc">
              Your personal and business details.
            </p>
          </div>
        </div>
        <div className="settings-section-body">
          <div className="settings-form-grid settings-form-grid--3">
            <div className="settings-form-group">
              <label className="settings-label">
                <User size={13} className="me-1" />
                Full Name <Required />
              </label>
              <input
                className="settings-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={!isEditing}
                placeholder="Your full name"
              />
            </div>

            <div className="settings-form-group">
              <label className="settings-label">
                <Building2 size={13} className="me-1" />
                Business Name <Required />
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

            <div className="settings-form-group span-3">
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
                maxLength={500}
              />
              <span className="settings-hint">
                {(form.description ?? "").length}/500
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Details + Business Address — side by side */}
      <div className="settings-pair-row">
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
                  Business Email <Required />
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
                  Business Phone <Required />
                </label>
                <input
                  className="settings-input"
                  name="phone"
                  value={form.phone ?? ""}
                  onChange={handleChange}
                  disabled={!isEditing}
                  placeholder="+91 98765 43210"
                />
                <span className="settings-hint">Shown to clients on invoices, receipts, and your booking page.</span>
              </div>

              <div className="settings-form-group">
                <label className="settings-label">
                  <MessageCircle size={13} className="me-1" />
                  WhatsApp Alerts Number
                </label>
                <input
                  className="settings-input"
                  value={alertsPhone}
                  onChange={(e) => setAlertsPhone(e.target.value)}
                  disabled={!isEditing}
                  placeholder="+91 98765 43210"
                />
                <span className="settings-hint">Your own number — cash counter open/close and other owner alerts go here. Never shown to clients.</span>
              </div>

              <div className="settings-form-group">
                <label className="settings-label">
                  <Mail size={13} className="me-1" />
                  Alerts Email
                </label>
                <input
                  className="settings-input"
                  value={profile?.email ?? ""}
                  readOnly
                  disabled
                />
                <span className="settings-hint">
                  Your login email — where "New Appointment"/"New Payment" alerts go. Contact support to change it.
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
              </div>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-section-header">
            <div>
              <p className="settings-section-title">Business Address</p>
              <p className="settings-section-desc">Your salon's address.</p>
            </div>
          </div>
          <div className="settings-section-body">
            <div className="settings-form-grid">
              <div className="settings-form-group">
                <label className="settings-label">
                  <MapPin size={13} className="me-1" />
                  Address Line 1 <Required />
                </label>
                <input
                  className="settings-input"
                  name="address"
                  value={form.address ?? ""}
                  onChange={handleChange}
                  disabled={!isEditing}
                  placeholder="Shop No. 12, ABC Complex"
                />
              </div>

              <div className="settings-form-group">
                <label className="settings-label">
                  <MapPin size={13} className="me-1" />
                  Address Line 2
                </label>
                <input
                  className="settings-input"
                  name="address_line2"
                  value={form.address_line2 ?? ""}
                  onChange={handleChange}
                  disabled={!isEditing}
                  placeholder="Apartment, Floor, etc."
                />
              </div>

              <div className="settings-form-group">
                <label className="settings-label">City <Required /></label>
                <input
                  className="settings-input"
                  name="city"
                  value={form.city ?? ""}
                  onChange={handleChange}
                  disabled={!isEditing}
                  placeholder="City"
                />
              </div>

              <div className="settings-form-group">
                <label className="settings-label">State <Required /></label>
                <input
                  className="settings-input"
                  name="state"
                  value={form.state ?? ""}
                  onChange={handleChange}
                  disabled={!isEditing}
                  placeholder="State"
                />
              </div>

              <div className="settings-form-group">
                <label className="settings-label">Pincode <Required /></label>
                <input
                  className="settings-input"
                  name="pincode"
                  value={form.pincode ?? ""}
                  onChange={handleChange}
                  disabled={!isEditing}
                  placeholder="400001"
                />
              </div>

              <div className="settings-form-group">
                <label className="settings-label">Country <Required /></label>
                <input
                  className="settings-input"
                  name="country"
                  value={form.country ?? ""}
                  onChange={handleChange}
                  disabled={!isEditing}
                  placeholder="India"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tax & Compliance + Business Profile — side by side */}
      <div className="settings-pair-row">
        <div className="settings-section">
          <div className="settings-section-header">
            <div>
              <p className="settings-section-title">Tax & Compliance</p>
              <p className="settings-section-desc">Required for invoices and tax filings.</p>
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

              <div className="settings-form-group span-2">
                <label className="settings-label">GST Registration Type</label>
                <select
                  className="settings-select"
                  name="gst_registration_type"
                  value={form.gst_registration_type ?? ""}
                  onChange={handleChange}
                  disabled={!isEditing}
                >
                  <option value="">Select type</option>
                  <option value="regular">Regular</option>
                  <option value="composition">Composition</option>
                  <option value="unregistered">Unregistered</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-section-header">
            <div>
              <p className="settings-section-title">Business Profile</p>
              <p className="settings-section-desc">Basic details about your operations.</p>
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

              <div className="settings-form-group span-2">
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
      </div>
    </>
  );
}
