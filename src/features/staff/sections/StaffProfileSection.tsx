import { useState, useRef } from "react";
import type { FC } from "react";
import { Person, Pencil } from "react-bootstrap-icons";

const CALENDAR_COLORS = [
  "#93c5fd", "#60a5fa", "#3b82f6", "#6366f1", "#8b5cf6",
  "#a78bfa", "#c084fc", "#e879f9", "#f472b6", "#fb7185",
  "#fb923c", "#fbbf24", "#facc15", "#a3e635", "#34d399",
  "#2dd4bf", "#67e8f9",
];

interface StaffProfileProps {
  firstName?: string;
  setFirstName?: (val: string) => void;
  email?: string;
  setEmail?: (val: string) => void;
  isFirstNameInvalid?: boolean;
  isEmailInvalid?: boolean;
}

const StaffProfileSection: FC<StaffProfileProps> = ({
  firstName = "",
  setFirstName = () => { },
  email = "",
  setEmail = () => { },
  isFirstNameInvalid = false,
  isEmailInvalid = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedColor, setSelectedColor] = useState(CALENDAR_COLORS[0]);
  const [notes, setNotes] = useState("");

  return (
    <div className="section staff-form">
      <h4 className="section__title">Profile</h4>
      <p className="section__subtitle">Manage your team member's personal profile</p>

      <div className="d-flex align-items-center mb-4 mt-3">
        <div className="profile-image-upload position-relative d-inline-block">
          <input
            type="file"
            ref={fileInputRef}
            className="d-none"
            accept="image/*"
          />
          <div
            className="profile-placeholder rounded-circle d-flex justify-content-center align-items-center"
            style={{ width: "80px", height: "80px", backgroundColor: "#F0F0FE" }}
          >
            <Person style={{ color: "#7A5CFF" }} size={48} />
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
              backgroundColor: "#FAFAFA",
              border: "1px solid #EAEAEA",
              padding: "0"
            }}
          >
            <Pencil size={12} style={{ color: "#888" }} />
          </button>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-6">
          <label className="form-label">First name <span className="text-danger">*</span></label>
          <input
            type="text"
            className={`form-control ${isFirstNameInvalid ? "is-invalid" : ""}`}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          {isFirstNameInvalid && <div className="invalid-feedback">First name is required</div>}
        </div>
        <div className="col-6">
          <label className="form-label">Last name</label>
          <input type="text" className="form-control" />
        </div>
      </div>

      <div className="mb-3">
        <label className="form-label">Email <span className="text-danger">*</span></label>
        <input
          type="email"
          className={`form-control ${isEmailInvalid ? "is-invalid" : ""}`}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {isEmailInvalid ? (
          <div className="invalid-feedback">Email is required when permission level is greater than 'No Access'</div>
        ) : (
          <div className="form-hint">Email is required when permission level is greater than 'No Access'</div>
        )}
      </div>

      <div className="mb-3">
        <label className="form-label">Phone number</label>
        <div className="phone-group">
          <select className="form-select">
            <option>+91</option><option>+1</option><option>+44</option><option>+61</option>
          </select>
          <input type="tel" className="form-control" />
        </div>
      </div>

      <div className="mb-3">
        <label className="form-label">Additional phone number</label>
        <div className="phone-group">
          <select className="form-select">
            <option>+91</option><option>+1</option><option>+44</option>
          </select>
          <input type="tel" className="form-control" />
        </div>
      </div>

      <div className="mb-3">
        <label className="form-label">Country</label>
        <select className="form-select">
          <option value="">Select country</option>
          <option>India</option><option>United States</option>
          <option>United Kingdom</option><option>Australia</option>
        </select>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-7">
          <label className="form-label">Birthday</label>
          <input type="text" className="form-control" placeholder="Day and month" />
        </div>
        <div className="col-5">
          <label className="form-label">Year</label>
          <input type="number" className="form-control" placeholder="Year" />
        </div>
      </div>

      <div className="mb-4">
        <label className="form-label">Calendar color</label>
        <div className="color-picker">
          {CALENDAR_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={`color-picker__swatch ${selectedColor === color ? "color-picker__swatch--selected" : ""}`}
              style={{ backgroundColor: color }}
              onClick={() => setSelectedColor(color)}
            />
          ))}
        </div>
      </div>

      <div className="mb-3">
        <label className="form-label">Job title</label>
        <input type="text" className="form-control" />
        <div className="form-hint">Visible to clients online</div>
      </div>

      <hr className="section__divider" />

      <h5 className="section__block-title">Work details</h5>
      <p className="section__block-subtitle">Manage your team member's start date, and employment details</p>

      <div className="row g-3 mb-3">
        <div className="col-7">
          <label className="form-label">Start date</label>
          <input type="text" className="form-control" placeholder="Day and month" />
        </div>
        <div className="col-5">
          <label className="form-label">Year</label>
          <input type="number" className="form-control" defaultValue={2026} />
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-7">
          <label className="form-label">End date</label>
          <input type="text" className="form-control" placeholder="Day and month" />
        </div>
        <div className="col-5">
          <label className="form-label">Year</label>
          <input type="number" className="form-control" placeholder="Year" />
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-6">
          <label className="form-label">Employment type</label>
          <select className="form-select">
            <option value="">Select an option</option>
            <option>Full-time</option><option>Part-time</option>
            <option>Casual</option><option>Contract</option>
          </select>
        </div>
        <div className="col-6">
          <label className="form-label">Team member ID</label>
          <input type="text" className="form-control" />
          <div className="form-hint">An identifier used for external systems like payroll</div>
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