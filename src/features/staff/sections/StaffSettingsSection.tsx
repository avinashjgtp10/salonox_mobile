import React, { useState } from "react";

const SETTINGS = [
  { key: "online_booking", label: "Accept online bookings", hint: "Allow clients to book appointments with this team member online" },
  { key: "show_profile",   label: "Show profile on booking page", hint: "Display this team member's profile and photo to clients" },
  { key: "auto_assign",    label: "Auto-assign appointments", hint: "Automatically assign walk-in appointments to this team member" },
  { key: "double_book",    label: "Allow double booking", hint: "Let this team member be booked for overlapping appointments" },
  { key: "send_reminders", label: "Send appointment reminders", hint: "Notify this team member of upcoming appointments via email/SMS" },
];

const StaffSettingsSection: React.FC = () => {
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    online_booking: true, show_profile: true,
    auto_assign: false, double_book: false, send_reminders: true,
  });

  return (
    <div className="section staff-form">
      <h4 className="section__title">Settings</h4>
      <p className="section__subtitle">Configure booking and scheduling preferences</p>

      {SETTINGS.map((item) => (
        <div className="staff-toggle" key={item.key}>
          <div className="staff-toggle__info">
            <div className="staff-toggle__label">{item.label}</div>
            <div className="staff-toggle__hint">{item.hint}</div>
          </div>
          <div className="form-check form-switch ms-3">
            <input className="form-check-input" type="checkbox" role="switch"
              checked={toggles[item.key]}
              onChange={() => setToggles((p) => ({ ...p, [item.key]: !p[item.key] }))} />
          </div>
        </div>
      ))}

      <hr className="section__divider" />

      <h5 className="section__block-title">Permission level</h5>
      <p className="section__block-subtitle">Control what this team member can access</p>
      <div className="mb-3">
        <select className="form-select">
          <option>No Access</option><option>Basic</option><option>Low</option>
          <option>Medium</option><option>High</option><option>Manager</option>
        </select>
        <div className="form-hint mt-1">Higher permission levels require a valid email address</div>
      </div>
    </div>
  );
};

export default StaffSettingsSection;