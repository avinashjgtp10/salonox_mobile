import { X } from "react-bootstrap-icons";
import CountryDialPicker, { type CountryOption } from "./CountryDialPicker";

interface Props {
  newClientFirstName: string;
  newClientLastName: string;
  newClientPhone: string;
  newClientGender: "" | "Female" | "Male" | "Other";
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
  onSave: () => void;
  onCancel?: () => void;
}

export default function AddClientForm({
  newClientFirstName, newClientLastName, newClientPhone, newClientGender,
  selectedCountry, isClientSaved, phoneDuplicate, phoneCheckLoading,
  isSavingClient, formErrors,
  onFirstNameChange, onLastNameChange, onPhoneChange, onGenderChange,
  onCountryChange, onPhoneBlur, onSave, onCancel,
}: Props) {
  return (
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
          <button
            type="button"
            className="qs-add-client-form__cancel-btn"
            onClick={onCancel}
          >
            <X size={14} /> Cancel
          </button>
        )}
        <button
          type="button"
          className="qs-save-client-btn"
          disabled={isClientSaved || phoneDuplicate || phoneCheckLoading || isSavingClient}
          onClick={onSave}
        >
          {isSavingClient ? "Saving…" : isClientSaved ? "✓ Saved" : "Save Client"}
        </button>
      </div>
    </div>
  );
}
