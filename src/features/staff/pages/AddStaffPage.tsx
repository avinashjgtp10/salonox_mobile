import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/AddStaffPage.scss";
import StaffProfileSection from "../sections/StaffProfileSection";
import StaffAddressesSection from "../sections/StaffAddressesSection";
import StaffEmergencyContactsSection from "../sections/StaffEmergencyContactsSection";
import StaffServicesSection from "../sections/StaffServicesSection";
import StaffLocationsSection from "../sections/StaffLocationsSection";
import StaffSettingsSection from "../sections/StaffSettingsSection";
import StaffWagesSection from "../sections/StaffWagesSection";
import StaffCommissionsSection from "../sections/StaffCommissionsSection";
import StaffPayRunsSection from "../sections/StaffPayRunsSection";
import { createStaff } from "../services/staffService";
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
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<SectionKey>("profile");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [additionalPhone, setAdditionalPhone] = useState("");
  const [country, setCountry] = useState("India");
  const [birthdayDayMonth, setBirthdayDayMonth] = useState("");
  const [birthdayYear, setBirthdayYear] = useState("");
  const [calendarColor, setCalendarColor] = useState("#93c5fd");
  const [jobTitle, setJobTitle] = useState("");
  const [startDateDayMonth, setStartDateDayMonth] = useState("");
  const [startDateYear, setStartDateYear] = useState("2026");
  const [endDateDayMonth, setEndDateDayMonth] = useState("");
  const [endDateYear, setEndDateYear] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [memberId, setMemberId] = useState("");
  const [notes, setNotes] = useState("");

  const [allowCalendarBookings, setAllowCalendarBookings] = useState(true);
  const [permissionLevel, setPermissionLevel] = useState("Low");

  const [addresses, setAddresses] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);

  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

  const isFirstNameInvalid = attemptedSubmit && firstName.trim() === "";
  const isEmailInvalid = attemptedSubmit && email.trim() === "";
  const hasErrors = isFirstNameInvalid || isEmailInvalid;
  const errorCount = (isFirstNameInvalid ? 1 : 0) + (isEmailInvalid ? 1 : 0);

  const handleAddClick = async () => {
    setAttemptedSubmit(true);
    if (firstName.trim() === "" || email.trim() === "") {
      setShowErrorPopup(true);
      return;
    }
    
    try {
      const payload = {
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone_number: phone,
        additional_phone: additionalPhone,
        country: country,
        birthday: birthdayDayMonth,
        birth_year: birthdayYear,
        calendar_color: calendarColor,
        job_title: jobTitle,
        start_date: startDateDayMonth,
        start_year: startDateYear,
        end_date: endDateDayMonth,
        end_year: endDateYear,
        employment_type: employmentType,
        staff_member_id: memberId,
        notes: notes,
        status: "Active",
        allow_calendar_bookings: allowCalendarBookings,
        permission_level: permissionLevel,
        addresses: addresses,
        emergency_contacts: contacts
      };

      await createStaff(payload);
      console.log("Staff saved successfully");
      navigate("/dashboard/team/members");
    } catch (error) {
      console.error("Error saving staff:", error);
    }
  };

  const navItem = (key: SectionKey, label: string, badge?: number, hasError?: boolean) => (
    <li
      key={key}
      className={`add-staff__nav-item ${activeSection === key ? "add-staff__nav-item--active" : ""}`}
      onClick={() => setActiveSection(key)}
    >
      <span className="add-staff__nav-label">{label}</span>
      {badge !== undefined && <span className="add-staff__nav-badge">{badge}</span>}
      {hasError && <div className="add-staff__nav-dot" />}
    </li>
  );

  const ActiveComponent = sectionComponents[activeSection];

  const componentProps: any = {};
  if (activeSection === "profile") {
    componentProps.firstName = firstName;
    componentProps.setFirstName = setFirstName;
    componentProps.lastName = lastName;
    componentProps.setLastName = setLastName;
    componentProps.email = email;
    componentProps.setEmail = setEmail;
    componentProps.phone = phone;
    componentProps.setPhone = setPhone;
    componentProps.additionalPhone = additionalPhone;
    componentProps.setAdditionalPhone = setAdditionalPhone;
    componentProps.country = country;
    componentProps.setCountry = setCountry;
    componentProps.birthdayDayMonth = birthdayDayMonth;
    componentProps.setBirthdayDayMonth = setBirthdayDayMonth;
    componentProps.birthdayYear = birthdayYear;
    componentProps.setBirthdayYear = setBirthdayYear;
    componentProps.calendarColor = calendarColor;
    componentProps.setCalendarColor = setCalendarColor;
    componentProps.jobTitle = jobTitle;
    componentProps.setJobTitle = setJobTitle;
    componentProps.startDateDayMonth = startDateDayMonth;
    componentProps.setStartDateDayMonth = setStartDateDayMonth;
    componentProps.startDateYear = startDateYear;
    componentProps.setStartDateYear = setStartDateYear;
    componentProps.endDateDayMonth = endDateDayMonth;
    componentProps.setEndDateDayMonth = setEndDateDayMonth;
    componentProps.endDateYear = endDateYear;
    componentProps.setEndDateYear = setEndDateYear;
    componentProps.employmentType = employmentType;
    componentProps.setEmploymentType = setEmploymentType;
    componentProps.memberId = memberId;
    componentProps.setMemberId = setMemberId;
    componentProps.notes = notes;
    componentProps.setNotes = setNotes;
    componentProps.isFirstNameInvalid = isFirstNameInvalid;
    componentProps.isEmailInvalid = isEmailInvalid;
  } else if (activeSection === "settings") {
    componentProps.allowCalendarBookings = allowCalendarBookings;
    componentProps.setAllowCalendarBookings = setAllowCalendarBookings;
    componentProps.permissionLevel = permissionLevel;
    componentProps.setPermissionLevel = setPermissionLevel;
  } else if (activeSection === "addresses") {
    componentProps.addresses = addresses;
    componentProps.setAddresses = setAddresses;
  } else if (activeSection === "emergency") {
    componentProps.contacts = contacts;
    componentProps.setContacts = setContacts;
  }

  return (
    <div className="add-staff">
      <div className="add-staff__header">
        <h5 className="add-staff__header-title">Add team member</h5>
        <div className="add-staff__header-actions position-relative">
          {hasErrors && (
            <button
              className="btn add-staff__btn-warning"
              onClick={() => setShowErrorPopup(!showErrorPopup)}
            >
              <i className="bi bi-exclamation-triangle" style={{ color: '#e53935' }} />
            </button>
          )}

          {showErrorPopup && hasErrors && (
            <div
              className="position-absolute bg-white shadow-lg border rounded p-3"
              style={{ top: "45px", right: "120px", width: "320px", zIndex: 1050 }}
            >
              <h6 className="fw-bold mb-3" style={{ fontSize: "14px" }}>{errorCount} {errorCount === 1 ? 'error' : 'errors'} found</h6>
              {isFirstNameInvalid && <div className="text-muted mb-2 bg-white p-2 rounded" style={{ fontSize: "12px", border: "1px solid #dc3545" }}>First name is required</div>}
              {isEmailInvalid && <div className="text-muted bg-white p-2 rounded" style={{ fontSize: "12px", border: "1px solid #dc3545" }}>Email is required when permission level is greater than 'No Access'</div>}
            </div>
          )}

          <button
            className="btn add-staff__btn-close"
            onClick={() => setShowUnsavedDialog(true)}
          >
            Close
          </button>
          <button className="btn add-staff__btn-add" onClick={handleAddClick}>Add</button>
        </div>
      </div>

      {/* Unsaved Changes Dialog */}
      {showUnsavedDialog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '28px',
              width: '400px',
              position: 'relative',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
          >
            {/* Close X */}
            <button
              onClick={() => setShowUnsavedDialog(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '18px',
                color: '#6b7280',
                lineHeight: 1,
                padding: 0,
              }}
            >
              &times;
            </button>

            <h5 style={{ fontWeight: 700, fontSize: '16px', color: '#111827', marginBottom: '12px' }}>
              Unsaved changes
            </h5>
            <p style={{ fontSize: '14px', color: '#374151', marginBottom: '28px', lineHeight: 1.6 }}>
              You have unsaved changes. Are you sure you want to leave?
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                className="btn"
                style={{
                  borderRadius: '20px',
                  border: '1px solid #e5e7eb',
                  padding: '8px 20px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#374151',
                }}
                onClick={() => setShowUnsavedDialog(false)}
              >
                Cancel
              </button>
              <button
                className="btn"
                style={{
                  borderRadius: '20px',
                  background: '#111827',
                  color: '#fff',
                  padding: '8px 20px',
                  fontSize: '14px',
                  fontWeight: 500,
                  border: 'none',
                }}
                onClick={() => navigate("/dashboard/team/members")}
              >
                Discard changes
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="add-staff__body container-fluid">
        <div className="row g-0 h-100">
          <aside className="col-auto add-staff__sidebar">
            <nav className="add-staff__nav">

              <div className="add-staff__nav-group">
                <p className="add-staff__nav-group-title">Personal</p>
                <ul className="add-staff__nav-list">
                  {navItem("profile", "Profile", undefined, hasErrors)}
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
            <ActiveComponent {...componentProps} />
          </main>
        </div>
      </div>
    </div>
  );
};

export default AddStaffPage;