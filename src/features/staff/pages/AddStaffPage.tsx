import React, { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./AddStaffPage.scss";

import StaffProfileSection from "../sections/StaffProfileSection";
import StaffAddressesSection from "../sections/StaffAddressesSection";
import StaffEmergencyContactsSection from "../sections/StaffEmergencyContactsSection";
import StaffServicesSection from "../sections/StaffServicesSection";
import StaffLocationsSection from "../sections/StaffLocationsSection";
import StaffSettingsSection from "../sections/StaffSettingsSection";
import StaffWagesSection from "../sections/StaffWagesSection";
import StaffCommissionsSection from "../sections/StaffCommissionsSection";
import StaffPayRunsSection from "../sections/StaffPayRunsSection";
type SectionKey =
  | "profile" | "addresses" | "emergency"
  | "services" | "locations" | "settings"
  | "wages" | "commissions" | "payruns";

const sectionComponents: Record<SectionKey, React.FC> = {
  profile: StaffProfileSection,
  addresses: StaffAddressesSection,
  emergency: StaffEmergencyContactsSection,
  services: StaffServicesSection,
  locations: StaffLocationsSection,
  settings: StaffSettingsSection,
  wages: StaffWagesSection,
  commissions: StaffCommissionsSection,
  payruns: StaffPayRunsSection,
};

const AddStaffPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SectionKey>("profile");

  const navItem = (key: SectionKey, label: string, badge?: number) => (
    <li
      key={key}
      className={`add-staff__nav-item ${activeSection === key ? "add-staff__nav-item--active" : ""}`}
      onClick={() => setActiveSection(key)}
    >
      <span className="add-staff__nav-label">{label}</span>
      {badge !== undefined && <span className="add-staff__nav-badge">{badge}</span>}
      {activeSection === key && <span className="add-staff__nav-dot" />}
    </li>
  );

  const ActiveComponent = sectionComponents[activeSection];

  return (
    <div className="add-staff">
      <div className="add-staff__header">
        <h5 className="add-staff__header-title">Add team member</h5>
        <div className="add-staff__header-actions">
          <button className="btn add-staff__btn-warning">
            <i className="bi bi-exclamation-triangle" />
          </button>
          <button className="btn add-staff__btn-close">Close</button>
          <button className="btn add-staff__btn-add">Add</button>
        </div>
      </div>

      <div className="add-staff__body container-fluid">
        <div className="row g-0 h-100">
          <aside className="col-auto add-staff__sidebar">
            <nav className="add-staff__nav">

              <div className="add-staff__nav-group">
                <p className="add-staff__nav-group-title">Personal</p>
                <ul className="add-staff__nav-list">
                  {navItem("profile", "Profile")}
                  {navItem("addresses", "Addresses")}
                  {navItem("emergency", "Emergency contacts")}
                </ul>
              </div>

              <hr className="add-staff__nav-divider" />

              <div className="add-staff__nav-group">
                <p className="add-staff__nav-group-title">Workspace</p>
                <ul className="add-staff__nav-list">
                  {navItem("services", "Services", 2)}
                  {navItem("locations", "Locations", 1)}
                  {navItem("settings", "Settings")}
                </ul>
              </div>

              <hr className="add-staff__nav-divider" />

              <div className="add-staff__nav-group">
                <p className="add-staff__nav-group-title">Pay</p>
                <ul className="add-staff__nav-list">
                  {navItem("wages", "Wages and timesheets")}
                  {navItem("commissions", "Commissions")}
                  {navItem("payruns", "Pay runs")}
                </ul>
              </div>

            </nav>
          </aside>

          <main className="col add-staff__content">
            <ActiveComponent />
          </main>
        </div>
      </div>
    </div>
  );
};

export default AddStaffPage;