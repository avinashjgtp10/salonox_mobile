import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "react-bootstrap-icons";
import "../styles/StaffSettingsSection.scss";

const PERMISSIONS = ["No access", "Basic", "Low", "Medium", "High", "Manager"];

interface StaffSettingsProps {
  allowCalendarBookings?: boolean;
  setAllowCalendarBookings?: (val: boolean) => void;
  permissionLevel?: string;
  setPermissionLevel?: (val: string) => void;
}

export default function StaffSettingsSection({
  allowCalendarBookings = true,
  setAllowCalendarBookings = () => {},
  permissionLevel = "Low",
  setPermissionLevel = () => {},
}: StaffSettingsProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    <div className="st-section">
      <h5 className="st-section__title">Settings</h5>
      <p className="st-section__subtitle">Configure team member permissions and booking availability</p>

      {/* Appointment Settings */}
      <div className="st-field">
        <h6 className="st-block-title">Appointment settings</h6>
        <p className="st-block-subtitle">Choose if this team member is bookable on the calendar</p>

        <label className="st-toggle-row">
          <div className="st-toggle-content">
            <span className="st-toggle-label">Allow calendar bookings</span>
            <span className="st-toggle-hint">Enable this to let clients book appointments with this member</span>
          </div>
          <div className="st-toggle-switch">
            <input
              type="checkbox"
              checked={allowCalendarBookings}
              onChange={(e) => setAllowCalendarBookings(e.target.checked)}
            />
            <span className="st-slider"></span>
          </div>
        </label>
      </div>

      <hr className="st-divider" />

      {/* Permission level */}
      <div className="st-field">
        <h6 className="st-block-title">Permission level</h6>
        <p className="st-block-subtitle">Control what this team member can access in the workspace</p>

        <div className="st-selector" ref={dropdownRef}>
          <div
            className={`st-selector-trigger ${isDropdownOpen ? "st-open" : ""}`}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <span className="st-current-value">{permissionLevel}</span>
            <ChevronDown size={14} className={`st-chevron ${isDropdownOpen ? "st-rotate" : ""}`} />
          </div>

          {isDropdownOpen && (
            <div className="st-selector-menu">
              {PERMISSIONS.map((perm) => (
                <div
                  key={perm}
                  className={`st-selector-item ${permissionLevel === perm ? "st-active" : ""}`}
                  onClick={() => {
                    setPermissionLevel(perm);
                    setIsDropdownOpen(false);
                  }}
                >
                  <span className="st-item-label">{perm}</span>
                  {permissionLevel === perm && <div className="st-active-dot"></div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
