import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp } from "react-bootstrap-icons";
import "../styles/StaffSettingsSection.scss";

const PERMISSIONS = ["No access", "Basic", "Low", "Medium", "High", "Manager"];

interface StaffSettingsProps {
  allowCalendarBookings?: boolean;
  setAllowCalendarBookings?: (val: boolean) => void;
  permissionLevel?: string;
  setPermissionLevel?: (val: string) => void;
}

const StaffSettingsSection: React.FC<StaffSettingsProps> = ({
  allowCalendarBookings = true,
  setAllowCalendarBookings = () => { },
  permissionLevel = "Low",
  setPermissionLevel = () => { }
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="section settings-section">

      {/* Appointment Settings */}
      <h5 className="section__block-title">Appointment settings</h5>
      <p className="section__block-subtitle">Choose if this team member is bookable on the calendar</p>

      <div className="custom-checkbox-row">
        <input
          type="checkbox"
          id="calendar-bookings"
          className="custom-checkbox-input"
          checked={allowCalendarBookings}
          onChange={(e) => setAllowCalendarBookings(e.target.checked)}
        />
        <div className="custom-checkbox-content">
          <label htmlFor="calendar-bookings" className="custom-checkbox-label">Allow calendar bookings</label>
          <span className="custom-checkbox-hint">Allow this team member to receive bookings on the calendar</span>
        </div>
      </div>

      {/* Permission level */}
      <h5 className="section__block-title">Permission level</h5>
      <p className="section__block-subtitle">Choose the access level this team member has to the workspace</p>

      <div className="custom-select-wrapper" ref={dropdownRef}>
        <div
          className={`form-control ${isDropdownOpen ? 'open' : ''}`}
          style={{
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderColor: isDropdownOpen ? '#6c3ce1' : '#e5e7eb',
            boxShadow: isDropdownOpen ? '0 0 0 1px #6c3ce1' : 'none',
            borderRadius: isDropdownOpen ? '8px 8px 0 0' : '8px'
          }}
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>{permissionLevel}</span>
          {isDropdownOpen ? <ChevronUp size={12} color="#6b7280" /> : <ChevronDown size={12} color="#6b7280" />}
        </div>

        {isDropdownOpen && (
          <div className="custom-dropdown-menu">
            {PERMISSIONS.map((perm) => (
              <div
                key={perm}
                className={`dropdown-item ${permissionLevel === perm ? 'active' : ''}`}
                style={{
                  backgroundColor: permissionLevel === perm ? '#6b7280' : 'transparent',
                  color: permissionLevel === perm ? '#fff' : '#111827',
                  padding: '12px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  if (permissionLevel !== perm) {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                  }
                }}
                onMouseLeave={(e) => {
                  if (permissionLevel !== perm) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
                onClick={() => {
                  setPermissionLevel(perm);
                  setIsDropdownOpen(false);
                }}
              >
                {perm}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default StaffSettingsSection;