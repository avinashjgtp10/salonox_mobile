import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import { ExclamationTriangle } from "react-bootstrap-icons";
import { selectCurrentSalon } from "../../../store/selectors/slices.selectors";
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/AddStaffPage.scss";
import StaffProfileSection from "../sections/StaffProfileSection";
import StaffAddressesSection from "../sections/StaffAddressesSection";
import StaffEmergencyContactsSection from "../sections/StaffEmergencyContactsSection";
import StaffServicesSection from "../sections/StaffServicesSection";
import StaffSettingsSection from "../sections/StaffSettingsSection";
import api from "../../../services/api/axios";
import { STAFF } from "../../../services/api/endpoints";

type SectionKey =
  | "profile"
  | "addresses"
  | "emergency"
  | "services"
  | "settings";

const sectionComponents: Record<SectionKey, React.FC<any>> = {
  profile: StaffProfileSection,
  addresses: StaffAddressesSection,
  emergency: StaffEmergencyContactsSection,
  services: StaffServicesSection,
  settings: StaffSettingsSection,
};

const AddStaffPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentSalon = useSelector(selectCurrentSalon);
  const salonId = currentSalon?.id;
  const [activeSection, setActiveSection] = useState<SectionKey>("profile");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    additionalPhone: "",
    country: "India",
    birthdayDayMonth: "",
    birthdayYear: "",
    calendarColor: "light_blue",
    jobTitle: "",
    startDateDayMonth: "",
    startDateYear: "2026",
    endDateDayMonth: "",
    endDateYear: "",
    employmentType: "",
    memberId: "",
    notes: "",
    phoneCountryCode: "+91",
    additionalPhoneCountryCode: "+91",
    specialization: [] as string[],
    password: "",
    confirmPassword: "",
  });

  const [settings, setSettings] = useState({
    allowCalendarBookings: true,
    permissionLevel: "Low",
  });

  const [lists, setLists] = useState({
    addresses: [] as any[],
    contacts: [] as any[],
  });

  const [ui, setUi] = useState({
    attemptedSubmit: false,
    showErrorPopup: false,
    showUnsavedDialog: false,
    isLoading: false,
    isDuplicateEmail: false,
  });
  // Synchronous guard — prevents double-submission before React re-renders the disabled button
  const isSubmittingRef = useRef(false);


  useEffect(() => {
    if (!id || id === "undefined" || id === "add") return;

    const fetchStaff = async () => {
      try {
        setUi((prev) => ({ ...prev, isLoading: true }));
        const response = await api.get(STAFF.BY_ID(id));
        const staff = response.data.data;

        const permissionLevelMapReverse: Record<string, string> = {
          no_access: "No access",
          basic: "Basic",
          low: "Low",
          medium: "Medium",
          high: "High",
          manager: "Manager",
        };

        setFormData((prev) => ({
          ...prev,
          firstName: staff.first_name || "",
          lastName: staff.last_name || "",
          email: staff.email || "",
          phone: staff.phone_number || staff.phone || "",
          additionalPhone: staff.additional_phone || staff.additional_phone_number || "",
          country: staff.country || "India",
          birthdayDayMonth: staff.birthday || staff.birth_day_month || "",
          birthdayYear: staff.birth_year || "",
          calendarColor: staff.calendar_color || "light_blue",
          jobTitle: staff.job_title || "",
          startDateDayMonth: staff.start_date_day_month || staff.start_date || "",
          startDateYear: staff.start_year || "2026",
          endDateDayMonth: staff.end_date_day_month || staff.end_date || "",
          endDateYear: staff.end_year || "",
          employmentType: staff.employment_type || "",
          memberId: staff.staff_member_id || staff.member_id || "",
          notes: staff.notes || "",
          phoneCountryCode: staff.phone_country_code || "+91",
          additionalPhoneCountryCode: staff.additional_phone_country_code || "+91",
          specialization: staff.specialization || [],
        }));

        setSettings({
          allowCalendarBookings: staff.allow_calendar_bookings ?? true,
          permissionLevel: permissionLevelMapReverse[staff.permission_level] || "Low",
        });

        if (staff.addresses) setLists((prev) => ({ ...prev, addresses: staff.addresses }));
        if (staff.emergency_contacts) setLists((prev) => ({ ...prev, contacts: staff.emergency_contacts }));

      } catch (error: any) {
        console.error("Error fetching staff:", error);
        toast.error("Failed to load staff data. Please try again.");
        setUi((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      setUi((prev) => ({ ...prev, isLoading: false }));
    };

    fetchStaff();
  }, [id, salonId]);

  const isFirstNameInvalid =
    ui.attemptedSubmit && formData.firstName.trim() === "";
  const isEmailInvalid =
    ui.attemptedSubmit && formData.email.trim() === "";
  const emailErrorMessage = "Email is required";
  const isPhoneInvalid =
    ui.attemptedSubmit &&
    (formData.phone.trim() === "" || !/^\d{10}$/.test(formData.phone.trim()));

  const isAdditionalPhoneInvalid =
    ui.attemptedSubmit &&
    formData.additionalPhone.trim() !== "" &&
    !/^\d{10}$/.test(formData.additionalPhone.trim());

  const isPasswordInvalid =
    ui.attemptedSubmit &&
    formData.password.trim().length < 8;

  const isConfirmPasswordInvalid =
    ui.attemptedSubmit &&
    formData.confirmPassword !== formData.password;

  const hasErrors = isFirstNameInvalid || isEmailInvalid || isPhoneInvalid || isAdditionalPhoneInvalid || isPasswordInvalid || isConfirmPasswordInvalid;

  const handleAddClick = async () => {
    // Clear stale duplicate-email flag whenever user tries to submit again
    setUi((prev) => ({ ...prev, attemptedSubmit: true, isDuplicateEmail: false }));
    if (formData.firstName.trim() === "" || formData.email.trim() === "" || formData.phone.trim() === "" || isPhoneInvalid || isAdditionalPhoneInvalid || isPasswordInvalid || isConfirmPasswordInvalid) {
      setUi((prev) => ({ ...prev, showErrorPopup: true }));
      return;
    }

    // Synchronous guard: ref is set/read in the same JS tick — prevents duplicate
    // submissions that sneak through before React re-renders the disabled button.
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    try {
      setUi((prev) => ({ ...prev, isLoading: true }));
      const permissionLevelMap: Record<string, string> = {
        "No access": "no_access",
        "Basic": "basic",
        "Low": "low",
        "Medium": "medium",
        "High": "high",
        "Manager": "manager",
      };

      const payload: Record<string, any> = {
        first_name: formData.firstName,
        email: formData.email,
        calendar_color: formData.calendarColor,
        allow_calendar_bookings: settings.allowCalendarBookings,
        permission_level: permissionLevelMap[settings.permissionLevel] || "low",
      };

      if (lists.addresses.length > 0) payload.addresses = lists.addresses;
      if (lists.contacts.length > 0) payload.emergency_contacts = lists.contacts;

      if (formData.lastName) payload.last_name = formData.lastName;
      if (formData.phone) payload.phone = formData.phone;
      if (formData.phoneCountryCode) payload.phone_country_code = formData.phoneCountryCode;
      if (formData.additionalPhone) {
        payload.additional_phone = formData.additionalPhone;
        if (formData.additionalPhoneCountryCode)
          payload.additional_phone_country_code = formData.additionalPhoneCountryCode;
      }
      if (formData.country) payload.country = formData.country;
      if (formData.jobTitle) payload.job_title = formData.jobTitle;
      if (formData.memberId) payload.staff_member_id = formData.memberId;
      if (formData.notes) payload.notes = formData.notes;
      if (formData.employmentType) payload.employment_type = formData.employmentType;
      if (formData.specialization && formData.specialization.length > 0) payload.specialization = formData.specialization;
      if (formData.birthdayDayMonth) payload.birthday = formData.birthdayDayMonth;
      if (formData.birthdayYear) payload.birth_year = formData.birthdayYear;
      if (formData.startDateDayMonth) payload.start_date = formData.startDateDayMonth;
      if (formData.startDateDayMonth && formData.startDateYear)
        payload.start_year = formData.startDateYear;
      if (formData.endDateDayMonth) payload.end_date = formData.endDateDayMonth;
      if (formData.endDateDayMonth && formData.endDateYear)
        payload.end_year = formData.endDateYear;
      payload.password = formData.password.trim();
      if (id && id !== "undefined") {
        await api.patch(STAFF.BY_ID(id), payload);
        toast.success("Staff updated successfully");
        navigate("/dashboard/team/members");
      } else {
        const response = await api.post(STAFF.BASE, payload);
        const newStaffId = response.data?.data?.staffId || response.data?.staffId || response.data?.data?.id || response.data?.id;

        if (!newStaffId) {
          throw new Error("Failed to retrieve new staff ID from server");
        }

        toast.success("Invitation sent successfully");
        navigate("/dashboard/team/members");
      }
    } catch (error: any) {
      console.error("Error saving staff:", error);
      // Axios wraps the HTTP status inside error.response.status
      const status = error?.response?.status ?? error?.status;
      const serverMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error?.message ||
        error?.message;

      if (status === 409) {
        // Duplicate email — highlight the field and jump to profile tab
        setUi((prev) => ({
          ...prev,
          isDuplicateEmail: true,
          showErrorPopup: true,
        }));
        setActiveSection("profile");
        toast.error("A staff member with this email already exists.");
      } else if (status === 401) {
        toast.error("Your session has expired. Please log in again.");
      } else if (status === 400) {
        toast.error(serverMessage || "Invalid data. Please check the form and try again.");
      } else {
        toast.error(serverMessage || "Failed to save staff member");
      }
    } finally {
      setUi((prev) => ({ ...prev, isLoading: false }));
      isSubmittingRef.current = false;
    }
  };

  const navItem = (
    key: SectionKey,
    label: string,
    badge?: number,
    hasError?: boolean,
  ) => (
    <li
      key={key}
      className={`add-staff__nav-item ${activeSection === key ? "add-staff__nav-item--active" : ""}`}
      onClick={() => setActiveSection(key)}
    >
      <span className="add-staff__nav-label">{label}</span>
      {badge !== undefined && (
        <span className="add-staff__nav-badge">{badge}</span>
      )}
      {hasError && <div className="add-staff__nav-dot" />}
    </li>
  );

  const ActiveComponent = sectionComponents[activeSection];

  const componentProps: any = {
    staffId: id,
    salonId: salonId,
  };
  if (activeSection === "profile") {
    // Spread all formData and provide individual update handlers if needed
    // or provide the entire object and a setter.
    // For now, mapping individual ones to avoid breaking child sections if they expect them.
    Object.keys(formData).forEach((key) => {
      componentProps[key] = (formData as any)[key];
      componentProps[`set${key.charAt(0).toUpperCase() + key.slice(1)}`] = (
        val: any,
      ) => {
        setFormData((prev) => ({
          ...prev,
          [key]: typeof val === "function" ? val((prev as any)[key]) : val,
        }));
      };
    });
    componentProps.isFirstNameInvalid = isFirstNameInvalid;
    componentProps.isEmailInvalid = isEmailInvalid;
    componentProps.emailErrorMessage = emailErrorMessage;
    componentProps.isPhoneInvalid = isPhoneInvalid;
    componentProps.isAdditionalPhoneInvalid = isAdditionalPhoneInvalid;
    componentProps.isPasswordInvalid = isPasswordInvalid;
    componentProps.isConfirmPasswordInvalid = isConfirmPasswordInvalid;
    // Override setEmail so editing the field clears the duplicate-email backend error
    componentProps.setEmail = (val: string) => {
      setFormData((prev) => ({ ...prev, email: val }));
      if (ui.isDuplicateEmail) {
        setUi((prev) => ({ ...prev, isDuplicateEmail: false }));
      }
    };
  } else if (activeSection === "settings") {
    componentProps.allowCalendarBookings = settings.allowCalendarBookings;
    componentProps.setAllowCalendarBookings = (val: any) =>
      setSettings((prev) => ({ ...prev, allowCalendarBookings: val }));
    componentProps.permissionLevel = settings.permissionLevel;
    componentProps.setPermissionLevel = (val: any) =>
      setSettings((prev) => ({ ...prev, permissionLevel: val }));
  } else if (activeSection === "addresses") {
    componentProps.addresses = lists.addresses;
    componentProps.setAddresses = (val: any) =>
      setLists((prev) => ({
        ...prev,
        addresses: typeof val === "function" ? val(prev.addresses) : val,
      }));
  } else if (activeSection === "emergency") {
    componentProps.contacts = lists.contacts;
    componentProps.setContacts = (val: any) =>
      setLists((prev) => ({
        ...prev,
        contacts: typeof val === "function" ? val(prev.contacts) : val,
      }));
  } else if (activeSection === "services") {
    componentProps.specialization = formData.specialization || [];
    componentProps.setSpecialization = (val: string[]) => {
      setFormData((prev: any) => ({ ...prev, specialization: val }));
    };
  }

  return (
    <div className="add-staff">
      <div className="add-staff__header">
        <h5 className="add-staff__header-title">{id ? "Edit team member" : "Add team member"}</h5>
        <div className="add-staff__header-actions position-relative">
          {hasErrors && (
            <button
              className="btn add-staff__btn-warning"
              onClick={() =>
                setUi((prev) => ({
                  ...prev,
                  showErrorPopup: !ui.showErrorPopup,
                }))
              }
            >
              <ExclamationTriangle color="#e53935" size={18} />
            </button>
          )}


          <button
            className="btn add-staff__btn-close"
            onClick={() =>
              setUi((prev) => ({ ...prev, showUnsavedDialog: true }))
            }
          >
            Close
          </button>
          <button
            className="btn add-staff__btn-add"
            onClick={handleAddClick}
            disabled={ui.isLoading || (activeSection === "addresses" && lists.addresses.length === 0)}
            title={activeSection === "addresses" && lists.addresses.length === 0 ? "Add at least one address before saving" : undefined}
          >
            {ui.isLoading && (
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
            )}
            {ui.isLoading ? (id ? "Saving..." : "Adding...") : (id ? "Save" : "Add")}
          </button>
        </div>
      </div>

      {/* Unsaved Changes Dialog */}
      {ui.showUnsavedDialog && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "28px",
              width: "400px",
              position: "relative",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            {/* Close X */}
            <button
              onClick={() =>
                setUi((prev) => ({ ...prev, showUnsavedDialog: false }))
              }
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "18px",
                color: "#6b7280",
                lineHeight: 1,
                padding: 0,
              }}
            >
              &times;
            </button>

            <h5
              style={{
                fontWeight: 700,
                fontSize: "16px",
                color: "#111827",
                marginBottom: "12px",
              }}
            >
              Unsaved changes
            </h5>
            <p
              style={{
                fontSize: "14px",
                color: "#374151",
                marginBottom: "28px",
                lineHeight: 1.6,
              }}
            >
              You have unsaved changes. Are you sure you want to leave?
            </p>

            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end",
              }}
            >
              <button
                className="btn"
                style={{
                  borderRadius: "20px",
                  border: "1px solid #e5e7eb",
                  padding: "8px 20px",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#374151",
                }}
                onClick={() =>
                  setUi((prev) => ({ ...prev, showUnsavedDialog: false }))
                }
              >
                Cancel
              </button>
              <button
                className="btn"
                style={{
                  borderRadius: "20px",
                  background: "#111827",
                  color: "#fff",
                  padding: "8px 20px",
                  fontSize: "14px",
                  fontWeight: 500,
                  border: "none",
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
                  {navItem("settings", "Settings")}
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
