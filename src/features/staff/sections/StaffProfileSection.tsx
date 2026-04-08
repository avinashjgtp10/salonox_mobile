import { useRef } from "react";
import type { FC } from "react";
import { Person, Pencil } from "react-bootstrap-icons";

const CALENDAR_COLORS = [
  "#93c5fd",
  "#60a5fa",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a78bfa",
  "#c084fc",
  "#e879f9",
  "#f472b6",
  "#fb7185",
  "#fb923c",
  "#fbbf24",
  "#facc15",
  "#a3e635",
  "#34d399",
  "#2dd4bf",
  "#67e8f9",
];

interface StaffProfileProps {
  firstName?: string;
  setFirstName?: (val: string) => void;
  lastName?: string;
  setLastName?: (val: string) => void;
  email?: string;
  setEmail?: (val: string) => void;
  phone?: string;
  setPhone?: (val: string) => void;
  additionalPhone?: string;
  setAdditionalPhone?: (val: string) => void;
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
  isFirstNameInvalid?: boolean;
  isEmailInvalid?: boolean;
}

const COUNTRIES = [
  "India",
  "United States",
  "United Kingdom",
  "United Arab Emirates",
  "Australia",
  "Canada",
  "Germany",
  "France",
  "Italy",
  "Spain",
  "Netherlands",
  "Singapore",
  "Japan",
  "Saudi Arabia",
  "South Africa",
  "Brazil",
  "Mexico",
  "Russia",
  "China",
  "New Zealand",
  "Ireland",
  "Sweden",
  "Norway",
  "Denmark",
  "Switzerland",
  "Belgium",
  "Portugal",
  "Greece",
  "Turkey",
  "Israel",
  "Malaysia",
  "Thailand",
  "Vietnam",
  "Indonesia",
  "Philippines",
  "South Korea",
].sort();

const PHONE_CODES = [
  { code: "+91", label: "IN (+91)" },
  { code: "+1", label: "US (+1)" },
  { code: "+44", label: "UK (+44)" },
  { code: "+971", label: "UAE (+971)" },
  { code: "+61", label: "AU (+61)" },
  { code: "+65", label: "SG (+65)" },
  { code: "+27", label: "ZA (+27)" },
  { code: "+49", label: "DE (+49)" },
];

const StaffProfileSection: FC<StaffProfileProps> = ({
  firstName = "",
  setFirstName = () => {},
  lastName = "",
  setLastName = () => {},
  email = "",
  setEmail = () => {},
  phone = "",
  setPhone = () => {},
  additionalPhone = "",
  setAdditionalPhone = () => {},
  country = "India",
  setCountry = () => {},
  birthdayDayMonth = "",
  setBirthdayDayMonth = () => {},
  birthdayYear = "",
  setBirthdayYear = () => {},
  calendarColor = CALENDAR_COLORS[0],
  setCalendarColor = () => {},
  jobTitle = "",
  setJobTitle = () => {},
  startDateDayMonth = "",
  setStartDateDayMonth = () => {},
  startDateYear = "2026",
  setStartDateYear = () => {},
  endDateDayMonth = "",
  setEndDateDayMonth = () => {},
  endDateYear = "",
  setEndDateYear = () => {},
  employmentType = "",
  setEmploymentType = () => {},
  memberId = "",
  setMemberId = () => {},
  notes = "",
  setNotes = () => {},
  isFirstNameInvalid = false,
  isEmailInvalid = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="section staff-form">
      <h5 className="section__title">Profile</h5>
      <p className="section__subtitle mb-4">
        Manage your team member's personal profile
      </p>

      <div className="d-flex align-items-center mb-4 mt-2">
        <div className="profile-image-upload position-relative d-inline-block">
          <input
            type="file"
            ref={fileInputRef}
            className="d-none"
            accept="image/*"
          />
          <div
            className="profile-placeholder rounded-circle d-flex justify-content-center align-items-center shadow-sm"
            style={{
              width: "72px",
              height: "72px",
              backgroundColor: "#f0f0fe",
            }}
          >
            <Person style={{ color: "#7a5cff" }} size={40} />
          </div>
          <button
            type="button"
            className="btn btn-white rounded-circle position-absolute d-flex justify-content-center align-items-center shadow-sm p-0 m-0"
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: "28px",
              height: "28px",
              bottom: "0px",
              right: "0px",
              backgroundColor: "#fff",
              border: "1px solid #e5e7eb",
              padding: "0",
            }}
          >
            <Pencil size={12} style={{ color: "#6b7280" }} />
          </button>
        </div>
      </div>

      <div className="mb-4">
        <label className="form-label">
          First name <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          className={`form-control ${isFirstNameInvalid ? "is-invalid" : ""}`}
          placeholder="e.g. Jane"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
        {isFirstNameInvalid && (
          <div className="invalid-feedback">First name is required</div>
        )}
      </div>

      <div className="mb-4">
        <label className="form-label">Last name</label>
        <input
          type="text"
          className="form-control"
          placeholder="e.g. Doe"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
      </div>

      <div className="mb-4">
        <label className="form-label">
          Email <span className="text-danger">*</span>
        </label>
        <input
          type="email"
          className={`form-control ${isEmailInvalid ? "is-invalid" : ""}`}
          placeholder="email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div
          className={`form-hint ${isEmailInvalid ? "text-danger" : ""}`}
          style={{ fontSize: "12px", marginTop: "6px" }}
        >
          Email is required when permission level is greater than 'No Access'
        </div>
      </div>

      <div className="mb-4">
        <label className="form-label">Phone number</label>
        <div className="phone-group-container">
          <div className="phone-group d-flex gap-2">
            <select
              className="form-select phone-code-select"
              style={{ width: "110px" }}
            >
              {PHONE_CODES.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.label}
                </option>
              ))}
            </select>
            <input
              type="tel"
              className="form-control flex-grow-1"
              placeholder="000 000 0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="mb-4">
        <label className="form-label">Additional phone number</label>
        <div className="phone-group d-flex gap-2">
          <select
            className="form-select phone-code-select"
            style={{ width: "110px" }}
          >
            {PHONE_CODES.map((p) => (
              <option key={p.code} value={p.code}>
                {p.label}
              </option>
            ))}
          </select>
          <input
            type="tel"
            className="form-control flex-grow-1"
            placeholder="000 000 0000"
            value={additionalPhone}
            onChange={(e) => setAdditionalPhone(e.target.value)}
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="form-label">Country</label>
        <select
          className="form-select"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
        >
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-7">
          <label className="form-label">Birthday</label>
          <input
            type="text"
            className="form-control"
            placeholder="Day and month"
            value={birthdayDayMonth}
            onChange={(e) => setBirthdayDayMonth(e.target.value)}
          />
        </div>
        <div className="col-5">
          <label className="form-label">Year</label>
          <input
            type="number"
            className="form-control"
            placeholder="Year"
            value={birthdayYear}
            onChange={(e) => setBirthdayYear(e.target.value)}
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="form-label">Calendar color</label>
        <div className="color-picker">
          {CALENDAR_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={`color-picker__swatch ${calendarColor === color ? "color-picker__swatch--selected" : ""}`}
              style={{ backgroundColor: color }}
              onClick={() => setCalendarColor(color)}
            />
          ))}
        </div>
      </div>

      <div className="mb-3">
        <label className="form-label">Job title</label>
        <input
          type="text"
          className="form-control"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
        />
        <div className="form-hint">Visible to clients online</div>
      </div>

      <hr className="section__divider" />

      <h5 className="section__block-title">Work details</h5>
      <p className="section__block-subtitle">
        Manage your team member's start date, and employment details
      </p>

      <div className="row g-3 mb-3">
        <div className="col-7">
          <label className="form-label">Start date</label>
          <input
            type="text"
            className="form-control"
            placeholder="Day and month"
            value={startDateDayMonth}
            onChange={(e) => setStartDateDayMonth(e.target.value)}
          />
        </div>
        <div className="col-5">
          <label className="form-label">Year</label>
          <input
            type="number"
            className="form-control"
            value={startDateYear}
            onChange={(e) => setStartDateYear(e.target.value)}
          />
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-7">
          <label className="form-label">End date</label>
          <input
            type="text"
            className="form-control"
            placeholder="Day and month"
            value={endDateDayMonth}
            onChange={(e) => setEndDateDayMonth(e.target.value)}
          />
        </div>
        <div className="col-5">
          <label className="form-label">Year</label>
          <input
            type="number"
            className="form-control"
            placeholder="Year"
            value={endDateYear}
            onChange={(e) => setEndDateYear(e.target.value)}
          />
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-6">
          <label className="form-label">Employment type</label>
          <select
            className="form-select"
            value={employmentType}
            onChange={(e) => setEmploymentType(e.target.value)}
          >
            <option value="">Select an option</option>
            <option value="Full-time">Full-time</option>
            <option value="Part-time">Part-time</option>
            <option value="Casual">Casual</option>
            <option value="Contract">Contract</option>
          </select>
        </div>
        <div className="col-6">
          <label className="form-label">Team member ID</label>
          <input
            type="text"
            className="form-control"
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
          />
          <div className="form-hint">
            An identifier used for external systems like payroll
          </div>
        </div>
      </div>

      <div className="mb-4">
        <label className="form-label">Notes</label>
        <textarea
          className="form-control"
          placeholder="Add a private note only viewable in the team member list"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={1000}
        />
        <div className="form-hint text-end">{notes.length}/1000</div>
      </div>
    </div>
  );
};

export default StaffProfileSection;
