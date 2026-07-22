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
  Pencil,
  X,
  Upload,
  Store,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { getMySalonThunk, updateSalonThunk } from "../../../middleware/salon/salon.thunk";
import Button from "../../../components/ui/Button";
import type { Salon, UpdateSalonPayload } from "../../../types/salon.types";

const GSTIN_LENGTH = 15;
const PAN_LENGTH = 10;

type BusinessForm = Omit<UpdateSalonPayload, "phone" | "address">;
type FormErrors = Partial<Record<"gst_number" | "pan_number", string>>;
type SectionKey = "business" | "contact" | "tax" | "operations";

const SECTION_FIELDS: Record<SectionKey, Array<keyof BusinessForm>> = {
  business: ["business_name", "business_type", "description"],
  contact: ["email", "website_url"],
  tax: ["gst_number", "pan_number"],
  operations: ["location_type", "team_type", "team_size"],
};

const EMPTY_DIRTY_SECTIONS: Record<SectionKey, boolean> = {
  business: false,
  contact: false,
  tax: false,
  operations: false,
};

const EMPTY_EDITING_SECTIONS: Record<SectionKey, boolean> = {
  business: false,
  contact: false,
  tax: false,
  operations: false,
};

function salonToForm(salon: Salon): BusinessForm {
  return {
    business_name: salon.business_name ?? "",
    business_type: salon.business_type ?? "",
    description: salon.description ?? "",
    email: salon.email ?? "",
    website_url: salon.website_url ?? "",
    gst_number: salon.gst_number ?? "",
    pan_number: salon.pan_number ?? "",
    location_type: salon.location_type ?? undefined,
    team_type: salon.team_type ?? undefined,
    team_size: salon.team_size ?? undefined,
  };
}

function getFieldSection(field: string): SectionKey | null {
  return (Object.entries(SECTION_FIELDS) as Array<[SectionKey, Array<keyof BusinessForm>]>)
    .find(([, fields]) => fields.includes(field as keyof BusinessForm))?.[0] ?? null;
}

function pickSectionPayload(form: BusinessForm, section: SectionKey): UpdateSalonPayload {
  return SECTION_FIELDS[section].reduce<UpdateSalonPayload>((payload, field) => {
    return { ...payload, [field]: form[field] };
  }, {});
}

export default function BusinessSettingsPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { currentSalon } = useAppSelector((s) => s.salon);

  // Phone/address are intentionally excluded from this form — they always
  // mirror the owner's Personal Profile (Settings > Profile) now, so they're
  // read-only here rather than a second, independently-editable copy.
  const [form, setForm] = useState<BusinessForm>({
    business_name: "",
    business_type: "",
    description: "",
    email: "",
    website_url: "",
    gst_number: "",
    pan_number: "",
    location_type: undefined,
    team_type: undefined,
    team_size: undefined,
  });

  const [dirtySections, setDirtySections] = useState<Record<SectionKey, boolean>>(EMPTY_DIRTY_SECTIONS);
  const [editingSections, setEditingSections] = useState<Record<SectionKey, boolean>>(EMPTY_EDITING_SECTIONS);
  const [savingSection, setSavingSection] = useState<SectionKey | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const { showSuccess, showError, overlay } = useStatusOverlay();

  useEffect(() => {
    dispatch(getMySalonThunk());
  }, [dispatch]);

  useEffect(() => {
    if (currentSalon) {
      const nextForm = salonToForm(currentSalon);
      setForm((prev) => {
        return (Object.entries(SECTION_FIELDS) as Array<[SectionKey, Array<keyof BusinessForm>]>)
          .reduce<BusinessForm>((merged, [section, fields]) => {
            if (dirtySections[section]) {
              fields.forEach((field) => {
                merged[field] = prev[field] as never;
              });
            }
            return merged;
          }, nextForm);
      });
    }
  }, [currentSalon, dirtySections]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name } = e.target;
    let value = e.target.value;

    if (name === "gst_number") {
      value = value.toUpperCase().slice(0, GSTIN_LENGTH);
      setErrors((prev) => ({
        ...prev,
        gst_number: value && value.length !== GSTIN_LENGTH ? "GSTIN must be exactly 15 characters." : undefined,
      }));
    }

    if (name === "pan_number") {
      value = value.toUpperCase().slice(0, PAN_LENGTH);
      setErrors((prev) => ({
        ...prev,
        pan_number: value && value.length !== PAN_LENGTH ? "PAN must be exactly 10 characters." : undefined,
      }));
    }

    setForm((prev) => ({ ...prev, [name]: value || undefined }));
    const section = getFieldSection(name);
    if (section) {
      setDirtySections((prev) => ({ ...prev, [section]: true }));
    }
  };

  const validateForm = () => {
    const nextErrors: FormErrors = {};
    const gstNumber = form.gst_number?.trim() ?? "";
    const panNumber = form.pan_number?.trim() ?? "";

    if (gstNumber && gstNumber.length !== GSTIN_LENGTH) {
      nextErrors.gst_number = "GSTIN must be exactly 15 characters.";
    }

    if (panNumber && panNumber.length !== PAN_LENGTH) {
      nextErrors.pan_number = "PAN must be exactly 10 characters.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async (section: SectionKey) => {
    if (!currentSalon?.id) {
      showError("Salon information not found");
      return;
    }

    if (section === "tax" && !validateForm()) {
      showError("Please fix the highlighted fields before saving");
      return;
    }

    setSavingSection(section);
    const result = await dispatch(
      updateSalonThunk({ id: currentSalon.id, payload: pickSectionPayload(form, section) })
    );
    setSavingSection(null);

    if (updateSalonThunk.fulfilled.match(result)) {
      showSuccess("Business settings saved");
      setDirtySections((prev) => ({ ...prev, [section]: false }));
      setEditingSections((prev) => ({ ...prev, [section]: false }));
    } else {
      showError((result.payload as string) || "Failed to save business settings");
    }
  };

  const handleReset = (section: SectionKey) => {
    if (currentSalon) {
      const savedForm = salonToForm(currentSalon);
      setForm((prev) => {
        const next = { ...prev };
        SECTION_FIELDS[section].forEach((field) => {
          next[field] = savedForm[field] as never;
        });
        return next;
      });
      if (section === "tax") setErrors({});
      setDirtySections((prev) => ({ ...prev, [section]: false }));
      setEditingSections((prev) => ({ ...prev, [section]: false }));
    }
  };

  const renderSectionActions = (section: SectionKey) => {
    if (!editingSections[section]) {
      return (
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={() => setEditingSections((prev) => ({ ...prev, [section]: true }))}
          disabled={savingSection !== null}
          iconLeft={<Pencil size={13} />}
        >
          Edit
        </Button>
      );
    }

    return (
      <div className="settings-section-actions">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleReset(section)}
          disabled={savingSection !== null}
          iconLeft={<X size={13} />}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          loading={savingSection === section}
          onClick={() => handleSave(section)}
          disabled={!dirtySections[section] || savingSection !== null}
          iconLeft={<Save size={14} />}
        >
          Save changes
        </Button>
      </div>
    );
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
      {overlay}
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
            <div className="settings-avatar settings-avatar--square">
              {currentSalon?.logo_url ? (
                <img src={currentSalon.logo_url} alt="Business logo" />
              ) : (
                <span>{logoInitials}</span>
              )}
              <div className="settings-avatar-overlay">
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
                  onClick={() => showError("Logo upload coming soon")}
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
          {renderSectionActions("business")}
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
                disabled={!editingSections.business}
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
                disabled={!editingSections.business}
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
                disabled={!editingSections.business}
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
          {renderSectionActions("contact")}
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
                disabled={!editingSections.contact}
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
                disabled={!editingSections.contact}
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
          {renderSectionActions("tax")}
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
                disabled={!editingSections.tax}
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
                disabled={!editingSections.tax}
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
          {renderSectionActions("operations")}
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
                disabled={!editingSections.operations}
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
                disabled={!editingSections.operations}
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
                disabled={!editingSections.operations}
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
