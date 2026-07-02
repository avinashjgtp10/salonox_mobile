import { useState } from "react";
import { X } from "react-bootstrap-icons";
import CountryDialPicker, { type CountryOption } from "./CountryDialPicker";

export interface ExtraClientInfo {
  title?: string;
  email?: string;
  dob?: string;
  anniversary_date?: string;
  gst_number?: string;
  source?: string;
  profession?: string;
  staff_preference?: string;
}

interface StaffOption { id: string; name: string; }

interface Props {
  newClientFirstName: string;
  newClientLastName: string;
  newClientPhone: string;
  newClientGender: "" | "Female" | "Male" | "Other";
  staffList?: StaffOption[];
  selectedCountry: CountryOption;
  isClientSaved: boolean;
  phoneDuplicate: boolean;
  phoneCheckLoading: boolean;
  isSavingClient: boolean;
  formErrors: string[];
  onFirstNameChange: (v: string) => void;
  onLastNameChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onGenderChange: (v: "" | "Female" | "Male" | "Other") => void;
  onCountryChange: (c: CountryOption) => void;
  onPhoneBlur: () => void;
  onSave: (extraInfo?: ExtraClientInfo) => void;
  onCancel?: () => void;
}

const EMPTY_EXTRA: ExtraClientInfo = {
  title: "", email: "",
  dob: "", anniversary_date: "", gst_number: "",
  source: "", profession: "",
  staff_preference: "",
};

export default function AddClientForm({
  newClientFirstName, newClientLastName, newClientPhone, newClientGender,
  selectedCountry, isClientSaved, phoneDuplicate, phoneCheckLoading,
  isSavingClient, formErrors, staffList = [],
  onFirstNameChange, onLastNameChange, onPhoneChange, onGenderChange,
  onCountryChange, onPhoneBlur, onSave, onCancel,
}: Props) {
  const [showMoreInfo, setShowMoreInfo] = useState(false);
  const [extra, setExtra] = useState<ExtraClientInfo>(EMPTY_EXTRA);

  function setField(key: keyof ExtraClientInfo, val: string) {
    setExtra((prev) => ({ ...prev, [key]: val }));
  }

  function handleSave() {
    const cleaned: ExtraClientInfo = {};
    (Object.keys(extra) as (keyof ExtraClientInfo)[]).forEach((k) => {
      if (extra[k]?.trim()) cleaned[k] = extra[k]!.trim();
    });
    onSave(Object.keys(cleaned).length > 0 ? cleaned : undefined);
  }

  return (
    <>
      <div className="qs-add-client-form">
        <div className="qs-add-client-form__grid">

          {/* First Name */}
          <div className="qs-add-client-form__field">
            <label className="qs-label">First Name <span style={{ color: "#ef4444" }}>*</span></label>
            <input
              className={`qs-inp${(formErrors.includes("first_name_required") || formErrors.includes("first_name_length")) ? " qs-inp--error" : ""}`}
              placeholder="e.g. Priya"
              value={newClientFirstName}
              onChange={(e) => onFirstNameChange(e.target.value.replace(/[^a-zA-Z\s]/g, ""))}
            />
            {formErrors.includes("first_name_required") && <span className="qs-form-error">First name is required</span>}
            {formErrors.includes("first_name_length") && <span className="qs-form-error">Min. 3 characters</span>}
          </div>

          {/* Last Name */}
          <div className="qs-add-client-form__field">
            <label className="qs-label">Last Name</label>
            <input
              className={`qs-inp${formErrors.includes("last_name_length") ? " qs-inp--error" : ""}`}
              placeholder="e.g. Sharma"
              value={newClientLastName}
              onChange={(e) => onLastNameChange(e.target.value.replace(/[^a-zA-Z\s]/g, ""))}
            />
            {formErrors.includes("last_name_length") && <span className="qs-form-error">Min. 3 characters</span>}
          </div>

          {/* Mobile */}
          <div className="qs-add-client-form__field">
            <label className="qs-label">Mobile <span style={{ color: "#ef4444" }}>*</span></label>
            <div className={`qs-phone-group${formErrors.includes("phone") || (!formErrors.includes("phone") && phoneDuplicate) ? " qs-phone-group--error" : ""}`}>
              <CountryDialPicker value={selectedCountry} onChange={onCountryChange} />
              <input
                className="qs-inp qs-inp--phone-right"
                placeholder="10-digit number"
                value={newClientPhone}
                maxLength={10}
                inputMode="numeric"
                onChange={(e) => onPhoneChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
                onBlur={onPhoneBlur}
              />
            </div>
            {formErrors.includes("phone") && (
              <span className="qs-form-error">
                {newClientPhone.length === 0 ? "Mobile number is required" : "Enter a valid 10-digit number"}
              </span>
            )}
            {!formErrors.includes("phone") && phoneDuplicate && (
              <span className="qs-form-error">Mobile number already exists</span>
            )}
            {!formErrors.includes("phone") && !phoneDuplicate && phoneCheckLoading && (
              <span style={{ fontSize: 11, color: "#6b7280" }}>Checking…</span>
            )}
          </div>

          {/* Gender */}
          <div className="qs-add-client-form__field">
            <label className="qs-label">Gender <span style={{ color: "#ef4444" }}>*</span></label>
            <select
              className={`qs-inp${formErrors.includes("gender") ? " qs-inp--error" : ""}`}
              value={newClientGender}
              onChange={(e) => onGenderChange(e.target.value as "" | "Female" | "Male" | "Other")}
            >
              <option value="">Select</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Other">Other</option>
            </select>
            {formErrors.includes("gender") && <span className="qs-form-error">Please select a gender</span>}
          </div>

        </div>

        {/* Action buttons */}
        <div className="qs-add-client-form__actions">
          {onCancel && (
            <button type="button" className="qs-add-client-form__cancel-btn" onClick={onCancel}>
              <X size={14} /> Cancel
            </button>
          )}
          <button
            type="button"
            className="qs-add-client-form__cancel-btn"
            onClick={() => setShowMoreInfo(true)}
          >
            More Info
          </button>
          <button
            type="button"
            className="qs-save-client-btn"
            disabled={isClientSaved || phoneDuplicate || phoneCheckLoading || isSavingClient}
            onClick={handleSave}
          >
            {isSavingClient ? "Saving…" : isClientSaved ? "✓ Saved" : "Save Client"}
          </button>
        </div>
      </div>

      {/* ── More Info Modal ── */}
      {showMoreInfo && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: "#fff", borderRadius: 14, width: "100%", maxWidth: 620,
            maxHeight: "90vh", display: "flex", flexDirection: "column",
            boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
            margin: "0 16px",
          }}>
            {/* Header */}
            <div style={{
              padding: "18px 24px", borderBottom: "1px solid #e5e7eb",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#1f2937" }}>More Info</span>
              <button
                onClick={() => setShowMoreInfo(false)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 6, color: "#6b7280", fontSize: 18, lineHeight: 1 }}
              >✕</button>
            </div>

            {/* Body */}
            <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 20px" }}>

                {/* Mobile Number */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>
                    Mobile Number <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <div className={`qs-phone-group${formErrors.includes("phone") ? " qs-phone-group--error" : ""}`}>
                    <CountryDialPicker value={selectedCountry} onChange={onCountryChange} />
                    <input
                      className="qs-inp qs-inp--phone-right"
                      placeholder="10-digit number"
                      value={newClientPhone}
                      maxLength={10}
                      inputMode="numeric"
                      onChange={(e) => onPhoneChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      onBlur={onPhoneBlur}
                    />
                  </div>
                  {formErrors.includes("phone") && <span className="qs-form-error">Enter a valid 10-digit number</span>}
                  {!formErrors.includes("phone") && phoneDuplicate && <span className="qs-form-error">Mobile number already exists</span>}
                </div>

                {/* Title */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Title</label>
                  <select className="qs-inp" value={extra.title} onChange={(e) => setField("title", e.target.value)}>
                    <option value="">Select</option>
                    <option value="Mr">Mr</option>
                    <option value="Mrs">Mrs</option>
                    <option value="Ms">Ms</option>
                    <option value="Dr">Dr</option>
                    <option value="Master">Master</option>
                    <option value="Miss">Miss</option>
                  </select>
                </div>

                {/* First Name */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>
                    First Name <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    className={`qs-inp${formErrors.includes("first_name_required") || formErrors.includes("first_name_length") ? " qs-inp--error" : ""}`}
                    placeholder="e.g. Priya"
                    value={newClientFirstName}
                    onChange={(e) => onFirstNameChange(e.target.value.replace(/[^a-zA-Z\s]/g, ""))}
                  />
                  {formErrors.includes("first_name_required") && <span className="qs-form-error">First name is required</span>}
                  {formErrors.includes("first_name_length") && <span className="qs-form-error">Min. 3 characters</span>}
                </div>

                {/* Last Name */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Last Name</label>
                  <input
                    className={`qs-inp${formErrors.includes("last_name_length") ? " qs-inp--error" : ""}`}
                    placeholder="e.g. Sharma"
                    value={newClientLastName}
                    onChange={(e) => onLastNameChange(e.target.value.replace(/[^a-zA-Z\s]/g, ""))}
                  />
                  {formErrors.includes("last_name_length") && <span className="qs-form-error">Min. 3 characters</span>}
                </div>

                {/* Gender */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>
                    Gender <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <select
                    className={`qs-inp${formErrors.includes("gender") ? " qs-inp--error" : ""}`}
                    value={newClientGender}
                    onChange={(e) => onGenderChange(e.target.value as "" | "Female" | "Male" | "Other")}
                  >
                    <option value="">Select</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                  {formErrors.includes("gender") && <span className="qs-form-error">Please select a gender</span>}
                </div>

                {/* Email */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Email</label>
                  <input
                    className="qs-inp"
                    type="email"
                    placeholder="email@example.com"
                    value={extra.email}
                    onChange={(e) => setField("email", e.target.value)}
                  />
                </div>

                {/* DOB */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Date of Birth</label>
                  <input
                    className="qs-inp"
                    type="date"
                    value={extra.dob}
                    onChange={(e) => setField("dob", e.target.value)}
                  />
                </div>

                {/* Anniversary Date */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Anniversary Date</label>
                  <input
                    className="qs-inp"
                    type="date"
                    value={extra.anniversary_date}
                    onChange={(e) => setField("anniversary_date", e.target.value)}
                  />
                </div>

                {/* GST Number */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>GST Number</label>
                  <input
                    className="qs-inp"
                    placeholder="GST Number"
                    value={extra.gst_number}
                    onChange={(e) => setField("gst_number", e.target.value.toUpperCase())}
                  />
                </div>

                {/* Source */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Source</label>
                  <select className="qs-inp" value={extra.source} onChange={(e) => setField("source", e.target.value)}>
                    <option value="">Select Source</option>
                    <option value="Walk-in">Walk-in</option>
                    <option value="Referral">Referral</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Google">Google</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Profession */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Profession</label>
                  <select className="qs-inp" value={extra.profession} onChange={(e) => setField("profession", e.target.value)}>
                    <option value=""></option>
                    <option value="Student">Student</option>
                    <option value="Employed">Employed</option>
                    <option value="Self-Employed">Self-Employed</option>
                    <option value="Business">Business</option>
                    <option value="Homemaker">Homemaker</option>
                    <option value="Retired">Retired</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Staff */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Staff</label>
                  <select className="qs-inp" value={extra.staff_preference} onChange={(e) => setField("staff_preference", e.target.value)}>
                    <option value=""></option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: "14px 24px", borderTop: "1px solid #e5e7eb",
              display: "flex", justifyContent: "flex-end", gap: 10,
            }}>
              <button
                onClick={() => setShowMoreInfo(false)}
                style={{
                  padding: "8px 20px", borderRadius: 8, border: "1px solid #d1d5db",
                  background: "#fff", color: "#374151", fontSize: 13, fontWeight: 500, cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowMoreInfo(false);
                  handleSave();
                }}
                style={{
                  padding: "8px 20px", borderRadius: 8, border: "none",
                  background: "#1a1a2e", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
