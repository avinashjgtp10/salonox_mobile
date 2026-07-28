import { useRef, useState } from "react";
import type { FC } from "react";
import { Country } from "country-state-city";
import { Person, Pencil, Eye, EyeSlash } from "react-bootstrap-icons";
import "../styles/StaffProfileSection.scss";


interface StaffProfileProps {
  firstName?: string;
  setFirstName?: (val: string) => void;
  lastName?: string;
  setLastName?: (val: string) => void;
  email?: string;
  setEmail?: (val: string) => void;
  phone?: string;
  setPhone?: (val: string) => void;
  phoneCountryCode?: string;
  setPhoneCountryCode?: (val: string) => void;
  additionalPhone?: string;
  setAdditionalPhone?: (val: string) => void;
  additionalPhoneCountryCode?: string;
  setAdditionalPhoneCountryCode?: (val: string) => void;
  country?: string;
  setCountry?: (val: string) => void;
  birthdayDayMonth?: string;
  setBirthdayDayMonth?: (val: string) => void;
  birthdayYear?: string;
  setBirthdayYear?: (val: string) => void;
  calendarColor?: string;
  setCalendarColor?: (val: string) => void;
  jobTitle?: string;
  setJobTitle?: (val: string) => void;
  startDateDayMonth?: string;
  setStartDateDayMonth?: (val: string) => void;
  startDateYear?: string;
  setStartDateYear?: (val: string) => void;
  endDateDayMonth?: string;
  setEndDateDayMonth?: (val: string) => void;
  endDateYear?: string;
  setEndDateYear?: (val: string) => void;
  employmentType?: string;
  setEmploymentType?: (val: string) => void;
  memberId?: string;
  setMemberId?: (val: string) => void;
  notes?: string;
  setNotes?: (val: string) => void;
  password?: string;
  setPassword?: (val: string) => void;
  confirmPassword?: string;
  setConfirmPassword?: (val: string) => void;
  isFirstNameInvalid?: boolean;
  isEmailInvalid?: boolean;
  emailErrorMessage?: string;
  isPhoneInvalid?: boolean;
  isAdditionalPhoneInvalid?: boolean;
  isPasswordInvalid?: boolean;
  isConfirmPasswordInvalid?: boolean;
}

const CALENDAR_COLORS: { key: string; hex: string; label: string }[] = [
  { key: "light_blue",  hex: "#7dd3fc", label: "Light Blue" },
  { key: "blue",        hex: "#3b82f6", label: "Blue" },
  { key: "dark_blue",   hex: "#1d4ed8", label: "Dark Blue" },
  { key: "purple",      hex: "#a855f7", label: "Purple" },
  { key: "violet",      hex: "#7c3aed", label: "Violet" },
  { key: "pink",        hex: "#f472b6", label: "Pink" },
  { key: "hot_pink",    hex: "#ec4899", label: "Hot Pink" },
  { key: "rose",        hex: "#f43f5e", label: "Rose" },
  { key: "orange",      hex: "#f97316", label: "Orange" },
  { key: "yellow",      hex: "#eab308", label: "Yellow" },
  { key: "lime",        hex: "#84cc16", label: "Lime" },
  { key: "green",       hex: "#22c55e", label: "Green" },
  { key: "teal",        hex: "#14b8a6", label: "Teal" },
  { key: "cyan",        hex: "#06b6d4", label: "Cyan" },
];

const COUNTRIES = Country.getAllCountries().map((c) => c.name).sort();

const PHONE_CODES = Country.getAllCountries()
  .map((c) => ({
    code: c.phonecode.startsWith("+") ? c.phonecode : `+${c.phonecode}`,
    label: `${c.isoCode} (${c.phonecode.startsWith("+") ? c.phonecode : `+${c.phonecode}`})`,
  }))
  .filter((v, i, a) => a.findIndex((t) => t.label === v.label) === i)
  .sort((a, b) => a.label.localeCompare(b.label));

const StaffProfileSection: FC<StaffProfileProps> = ({
  firstName = "", setFirstName = () => { },
  lastName = "", setLastName = () => { },
  email = "", setEmail = () => { },
  phone = "", setPhone = () => { },
  phoneCountryCode = "+91", setPhoneCountryCode = () => { },
  additionalPhone = "", setAdditionalPhone = () => { },
  additionalPhoneCountryCode = "+91", setAdditionalPhoneCountryCode = () => { },
  country = "India", setCountry = () => { },
  birthdayDayMonth = "", setBirthdayDayMonth = () => { },
  birthdayYear = "", setBirthdayYear = () => { },
  calendarColor = "#3b82f6", setCalendarColor = () => { },
  jobTitle = "", setJobTitle = () => { },
  startDateDayMonth = "", setStartDateDayMonth = () => { },
  startDateYear = "2026", setStartDateYear = () => { },
  endDateDayMonth = "", setEndDateDayMonth = () => { },
  endDateYear = "", setEndDateYear = () => { },
  employmentType = "", setEmploymentType = () => { },
  memberId = "", setMemberId = () => { },
  notes = "", setNotes = () => { },
  password = "", setPassword = () => { },
  confirmPassword = "", setConfirmPassword = () => { },
  isFirstNameInvalid = false,
  isEmailInvalid = false,
  emailErrorMessage = "Email is required",
  isPhoneInvalid = false,
  isAdditionalPhoneInvalid = false,
  isPasswordInvalid = false,
  isConfirmPasswordInvalid = false,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const selectedColor = CALENDAR_COLORS.find((c) => c.key === calendarColor);
  const selectedColorHex   = selectedColor?.hex   ?? "#3b82f6";
  const selectedColorLabel = selectedColor?.label ?? calendarColor;
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="sp-section">
      <h5 className="sp-section__title">Profile</h5>
      <p className="sp-section__subtitle">
        Manage your staff member's personal profile
      </p>

      {/* Avatar Upload */}
      <div className="sp-avatar-row">
        <div className="sp-avatar-wrap">
          <input
            type="file"
            ref={fileInputRef}
            className="sp-avatar-input"
            accept="image/*"
          />
          <div className="sp-avatar-placeholder">
            <Person className="sp-avatar-icon" size={40} />
          </div>
          <button
            type="button"
            className="sp-avatar-edit-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            <Pencil size={12} />
          </button>
        </div>
      </div>

      {/* First Name */}
      <div className="sp-field">
        <label className="sp-label">
          First name <span className="sp-required">*</span>
        </label>
        <input
          type="text"
          className={`sp-input ${isFirstNameInvalid ? "sp-input--invalid" : ""}`}
          placeholder="e.g. Jane"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
        {isFirstNameInvalid && (
          <p className="sp-error">First name is required</p>
        )}
      </div>

      {/* Last Name */}
      <div className="sp-field">
        <label className="sp-label">Last name</label>
        <input
          type="text"
          className="sp-input"
          placeholder="e.g. Doe"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
      </div>

      {/* Job Title / Role */}
      <div className="sp-field">
        <label className="sp-label">Job title / Role</label>
        <select
          className="sp-select"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
        >
          <option value="">Select a role</option>
          <option value="admin">Admin</option>
          <option value="staff">Staff</option>
          <option value="manager">Manager</option>
        </select>
        <p className="sp-hint">Visible to clients online and shown in the staff member list</p>
      </div>

      {/* Email */}
      <div className="sp-field">
        <label className="sp-label">
          Email <span className="sp-required">*</span>
        </label>
        <input
          type="email"
          className={`sp-input ${isEmailInvalid ? "sp-input--invalid" : ""}`}
          placeholder="email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <p className={`sp-hint ${isEmailInvalid ? "sp-hint--error" : ""}`}>
          {isEmailInvalid ? emailErrorMessage : "Email is required when permission level is greater than 'No Access'"}
        </p>
      </div>

      {/* Password */}
      <div className="sp-field">
        <label className="sp-label">Password <span className="sp-required">*</span></label>
        <div className="sp-input-group">
          <input
            type={showPassword ? "text" : "password"}
            className={`sp-input sp-input--flex ${isPasswordInvalid ? "sp-input--invalid" : ""}`}
            placeholder="Min. 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            className="sp-input-eye-btn"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
          >
            {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {isPasswordInvalid && (
          <p className="sp-error">
            {password.trim() === "" ? "Password is required" : "Password must be at least 8 characters"}
          </p>
        )}
        <p className="sp-hint">Required. Minimum 8 characters</p>
      </div>

      {/* Confirm Password */}
      <div className="sp-field">
        <label className="sp-label">Confirm password</label>
        <div className="sp-input-group">
          <input
            type={showConfirmPassword ? "text" : "password"}
            className={`sp-input sp-input--flex ${isConfirmPasswordInvalid ? "sp-input--invalid" : ""}`}
            placeholder="Re-enter password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <button
            type="button"
            className="sp-input-eye-btn"
            onClick={() => setShowConfirmPassword((v) => !v)}
            tabIndex={-1}
          >
            {showConfirmPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {isConfirmPasswordInvalid && (
          <p className="sp-error">Passwords do not match</p>
        )}
      </div>

      {/* Phone */}
      <div className="sp-field">
        <label className="sp-label">Phone number <span className="sp-required">*</span></label>
        <div className="sp-phone-group">
          <select
            className="sp-select sp-select--narrow"
            value={phoneCountryCode}
            onChange={(e) => setPhoneCountryCode(e.target.value)}
          >
            {PHONE_CODES.map((p) => (
              <option key={p.label} value={p.code}>{p.label}</option>
            ))}
          </select>
          <input
            type="tel"
            className={`sp-input sp-input--flex ${isPhoneInvalid ? "sp-input--invalid" : ""}`}
            placeholder="000 000 0000"
            value={phone}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "");
              if (val.length <= 10) setPhone(val);
            }}
          />
        </div>
        {isPhoneInvalid && (
          <p className="sp-error">{phone.trim() === "" ? "Phone number is required" : "Phone number must be 10 digits"}</p>
        )}
      </div>

      {/* Additional Phone */}
      <div className="sp-field">
        <label className="sp-label">Additional phone number</label>
        <div className="sp-phone-group">
          <select
            className="sp-select sp-select--narrow"
            value={additionalPhoneCountryCode}
            onChange={(e) => setAdditionalPhoneCountryCode(e.target.value)}
          >
            {PHONE_CODES.map((p) => (
              <option key={p.label} value={p.code}>{p.label}</option>
            ))}
          </select>
          <input
            type="tel"
            className={`sp-input sp-input--flex ${isAdditionalPhoneInvalid ? "sp-input--invalid" : ""}`}
            placeholder="000 000 0000"
            value={additionalPhone}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "");
              if (val.length <= 10) setAdditionalPhone(val);
            }}
          />
        </div>
        {isAdditionalPhoneInvalid && (
          <p className="sp-error">Additional phone must be 10 digits</p>
        )}
      </div>

      {/* Country */}
      <div className="sp-field">
        <label className="sp-label">Country</label>
        <select
          className="sp-select"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
        >
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Birthday */}
      <div className="sp-field-row">
        <div className="sp-field sp-field--grow">
          <label className="sp-label">Birthday</label>
          <input
            type="text"
            className="sp-input"
            placeholder="Day and month"
            value={birthdayDayMonth}
            onChange={(e) => setBirthdayDayMonth(e.target.value)}
          />
        </div>
        <div className="sp-field sp-field--narrow">
          <label className="sp-label">Year</label>
          <input
            type="number"
            className="sp-input"
            placeholder="Year"
            value={birthdayYear}
            onChange={(e) => setBirthdayYear(e.target.value)}
          />
        </div>
      </div>

      {/* Calendar Color */}
      <div className="sp-field">
        <label className="sp-label">Calendar color</label>
        <div className="sp-color-preview">
          <span
            className="sp-color-preview__swatch"
            style={{ "--swatch-bg": selectedColorHex } as React.CSSProperties}
          />
          <span className="sp-color-preview__label">{selectedColorLabel}</span>
        </div>
        <div className="sp-color-picker">
          {CALENDAR_COLORS.map(({ key, hex, label }) => (
            <button
              key={key}
              type="button"
              title={label}
              className={`sp-color-swatch${calendarColor === key ? " sp-color-swatch--selected" : ""}`}
              style={{ "--swatch-bg": hex } as React.CSSProperties}
              onClick={() => setCalendarColor(key)}
              aria-label={label}
            />
          ))}
        </div>
        <p className="sp-hint">Shown on the calendar and schedule views</p>
      </div>

      <hr className="sp-divider" />

      <h5 className="sp-block-title">Work details</h5>
      <p className="sp-block-subtitle">
        Manage your staff member's start date, and employment details
      </p>

      {/* Start Date */}
      <div className="sp-field-row">
        <div className="sp-field sp-field--grow">
          <label className="sp-label">Start date</label>
          <input
            type="text"
            className="sp-input"
            placeholder="Day and month"
            value={startDateDayMonth}
            onChange={(e) => setStartDateDayMonth(e.target.value)}
          />
        </div>
        <div className="sp-field sp-field--narrow">
          <label className="sp-label">Year</label>
          <input
            type="number"
            className="sp-input"
            value={startDateYear}
            onChange={(e) => setStartDateYear(e.target.value)}
          />
        </div>
      </div>

      {/* End Date */}
      <div className="sp-field-row">
        <div className="sp-field sp-field--grow">
          <label className="sp-label">End date</label>
          <input
            type="text"
            className="sp-input"
            placeholder="Day and month"
            value={endDateDayMonth}
            onChange={(e) => setEndDateDayMonth(e.target.value)}
          />
        </div>
        <div className="sp-field sp-field--narrow">
          <label className="sp-label">Year</label>
          <input
            type="number"
            className="sp-input"
            placeholder="Year"
            value={endDateYear}
            onChange={(e) => setEndDateYear(e.target.value)}
          />
        </div>
      </div>

      {/* Employment Type + Member ID */}
      <div className="sp-field-row">
        <div className="sp-field sp-field--half">
          <label className="sp-label">Employment type</label>
          <select
            className="sp-select"
            value={employmentType}
            onChange={(e) => setEmploymentType(e.target.value)}
          >
            <option value="">Select an option</option>
            <option value="full_time">Full-time</option>
            <option value="part_time">Part-time</option>
            <option value="contract">Contract</option>
            <option value="intern">Intern</option>
            <option value="freelance">Freelance</option>
          </select>
        </div>
        <div className="sp-field sp-field--half">
          <label className="sp-label">Staff member ID</label>
          <input
            type="text"
            className="sp-input"
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
          />
          <p className="sp-hint">
            An identifier used for external systems like payroll
          </p>
        </div>
      </div>

      {/* Notes */}
      <div className="sp-field">
        <label className="sp-label">Notes</label>
        <textarea
          className="sp-textarea"
          placeholder="Add a private note only viewable in the staff member list"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={1000}
        />
        <p className="sp-hint sp-hint--right">{notes.length}/1000</p>
      </div>
    </div>
  );
};

export default StaffProfileSection;
