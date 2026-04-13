import { useState, useEffect } from "react";
import {
  Building2,
  Globe,
  FileText,
  Phone,
  Mail,
  MapPin,
  Hash,
  Save,
  Upload,
  Store,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { getMySalonThunk, updateSalonThunk } from "../../../middleware/salon/salon.thunk";
import Button from "../../../components/ui/Button";
import type { UpdateSalonPayload } from "../../../types/salon.types";

export default function BusinessSettingsPage() {
  const dispatch = useAppDispatch();
  const { currentSalon, loading } = useAppSelector((s) => s.salon);

  const [form, setForm] = useState<UpdateSalonPayload>({
    business_name: "",
    business_type: "",
    description: "",
    email: "",
    phone: "",
    website_url: "",
    address: "",
    gst_number: "",
    pan_number: "",
    location_type: undefined,
    team_type: undefined,
    team_size: undefined,
  });

  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    dispatch(getMySalonThunk());
  }, [dispatch]);

  useEffect(() => {
    if (currentSalon) {
      setForm({
        business_name: currentSalon.business_name ?? "",
        business_type: currentSalon.business_type ?? "",
        description: currentSalon.description ?? "",
        email: currentSalon.email ?? "",
        phone: currentSalon.phone ?? "",
        website_url: currentSalon.website_url ?? "",
        address: currentSalon.address ?? "",
        gst_number: currentSalon.gst_number ?? "",
        pan_number: currentSalon.pan_number ?? "",
        location_type: currentSalon.location_type ?? undefined,
        team_type: currentSalon.team_type ?? undefined,
        team_size: currentSalon.team_size ?? undefined,
      });
    }
  }, [currentSalon]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value || undefined }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!currentSalon?.id) {
      toast.error("Salon information not found");
      return;
    }

    const result = await dispatch(
      updateSalonThunk({ id: currentSalon.id, payload: form })
    );

    if (updateSalonThunk.fulfilled.match(result)) {
      toast.success("Business settings saved");
      setIsDirty(false);
    } else {
      toast.error((result.payload as string) || "Failed to save business settings");
    }
  };

  const handleReset = () => {
    if (currentSalon) {
      setForm({
        business_name: currentSalon.business_name ?? "",
        business_type: currentSalon.business_type ?? "",
        description: currentSalon.description ?? "",
        email: currentSalon.email ?? "",
        phone: currentSalon.phone ?? "",
        website_url: currentSalon.website_url ?? "",
        address: currentSalon.address ?? "",
        gst_number: currentSalon.gst_number ?? "",
        pan_number: currentSalon.pan_number ?? "",
        location_type: currentSalon.location_type ?? undefined,
        team_type: currentSalon.team_type ?? undefined,
        team_size: currentSalon.team_size ?? undefined,
      });
      setIsDirty(false);
    }
  };

  // Derive initials for the logo placeholder
  const logoInitials = (form.business_name || "B")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      {/* Page Header */}
      <div className="settings-page-header">
        <h2 className="settings-page-title">Business Settings</h2>
        <p className="settings-page-subtitle">
          Manage your salon's public profile, contact information, and operational details.
        </p>
      </div>

      {/* Logo & Branding */}
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
            <div className="settings-avatar" style={{ borderRadius: 14 }}>
              {currentSalon?.logo_url ? (
                <img
                  src={currentSalon.logo_url}
                  alt="Business logo"
                  style={{ borderRadius: 12 }}
                />
              ) : (
                <span>{logoInitials}</span>
              )}
              <div
                className="settings-avatar-overlay"
                style={{ borderRadius: 12 }}
              >
                <Upload size={18} />
              </div>
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
                  onClick={() => toast("Logo upload coming soon", { icon: "ℹ️" })}
                >
                  Upload logo
                </Button>
                {currentSalon?.logo_url && (
                  <Button size="sm" variant="ghost">
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
                placeholder="Tell clients what makes your business special..."
                rows={3}
              />
              <span className="settings-hint">
                Shown on your online booking page (max 500 characters).
              </span>
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
                name="phone"
                value={form.phone ?? ""}
                onChange={handleChange}
                placeholder="+91 98765 43210"
              />
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
                placeholder="https://yoursalon.com"
              />
            </div>

            <div className="settings-form-group span-2">
              <label className="settings-label">
                <MapPin size={13} className="me-1" />
                Business Address
              </label>
              <input
                className="settings-input"
                name="address"
                value={form.address ?? ""}
                onChange={handleChange}
                placeholder="123 Main Street, City, State - 400001"
              />
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
                placeholder="22AAAAA0000A1Z5"
              />
              <span className="settings-hint">15-character GSTIN</span>
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
                placeholder="AAAAA0000A"
              />
              <span className="settings-hint">10-character PAN</span>
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
                Team Type
              </label>
              <select
                className="settings-select"
                name="team_type"
                value={form.team_type ?? ""}
                onChange={handleChange}
              >
                <option value="">Select type</option>
                <option value="independent">Independent — just me</option>
                <option value="team">Team — multiple staff</option>
              </select>
            </div>

            <div className="settings-form-group">
              <label className="settings-label">Team Size</label>
              <select
                className="settings-select"
                name="team_size"
                value={form.team_size ?? ""}
                onChange={handleChange}
              >
                <option value="">Select size</option>
                <option value="2-5">2–5 people</option>
                <option value="6-10">6–10 people</option>
                <option value="11+">11+ people</option>
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
