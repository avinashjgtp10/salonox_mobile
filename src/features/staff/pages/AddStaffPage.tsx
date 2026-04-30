import React, { useEffect, useState } from "react";
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
import StaffWagesSection from "../sections/StaffWagesSection";
import StaffCommissionsSection from "../sections/StaffCommissionsSection";
import StaffPayRunsSection from "../sections/StaffPayRunsSection";
import api from "../../../services/api/axios";
import { STAFF } from "../../../services/api/endpoints";

type SectionKey =
  | "profile"
  | "addresses"
  | "emergency"
  | "services"
  | "settings"
  | "wages"
  | "commissions"
  | "payruns";

const sectionComponents: Record<SectionKey, React.FC<any>> = {
  profile: StaffProfileSection,
  addresses: StaffAddressesSection,
  emergency: StaffEmergencyContactsSection,
  services: StaffServicesSection,
  settings: StaffSettingsSection,
  wages: StaffWagesSection,
  commissions: StaffCommissionsSection,
  payruns: StaffPayRunsSection,
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

  const [wages, setWages] = useState({
    wages_enabled: false,
    compensation_type: "none",
    hourly_rate: null as number | null,
    salary_amount: null as number | null,
    location_restriction: "workspace_default",
    auto_clock_in: "workspace_default",
    auto_clock_out: "workspace_default",
    automated_breaks: "workspace_default",
  });

  const [payRuns, setPayRuns] = useState({
    pay_runs_enabled: true,
    payment_method: "pay_manually",
    calculation_type: "automatic",
    deduct_payment_processing_fees: false,
    deduct_new_client_fees: false,
    record_cash_advances: false,
  });

  const [commissions, setCommissions] = useState<Record<string, any>>({
    services: { category: "services", is_enabled: true, commission_kind: "percentage", default_rate: 0, use_default_calculation: true, pass_cancellation_fee_late: false, pass_cancellation_fee_noshow: false },
    products: { category: "products", is_enabled: false, commission_kind: "percentage", default_rate: 0, use_default_calculation: true, pass_cancellation_fee_late: false, pass_cancellation_fee_noshow: false },
    memberships: { category: "memberships", is_enabled: false, commission_kind: "percentage", default_rate: 0, use_default_calculation: true, pass_cancellation_fee_late: false, pass_cancellation_fee_noshow: false },
    gift_cards: { category: "gift_cards", is_enabled: true, commission_kind: "percentage", default_rate: 0, use_default_calculation: true, pass_cancellation_fee_late: false, pass_cancellation_fee_noshow: false },
    cancellation: { category: "cancellation", is_enabled: true, commission_kind: "percentage", default_rate: 0, use_default_calculation: true, pass_cancellation_fee_late: false, pass_cancellation_fee_noshow: false },
  });

  useEffect(() => {
    if (id && salonId && id !== "undefined") {
      const fetchStaff = async () => {
        try {
          setUi((prev) => ({ ...prev, isLoading: true }));
          const response = await api.get(STAFF.BY_ID(id), {
            headers: { "x-salon-id": salonId },
          });
          const staff = response.data.data;

          setFormData((prev) => ({
            ...prev,
            firstName: staff.first_name || "",
            lastName: staff.last_name || "",
            email: staff.email || "",
            phone: staff.phone_number || "",
            additionalPhone: staff.additional_phone || "",
            country: staff.country || "India",
            birthdayDayMonth: staff.birthday || "",
            birthdayYear: staff.birth_year || "",
            calendarColor: staff.calendar_color || "light_blue",
            jobTitle: staff.job_title || "",
            startDateDayMonth: staff.start_date || "",
            startDateYear: staff.start_year || "2026",
            endDateDayMonth: staff.end_date || "",
            endDateYear: staff.end_year || "",
            employmentType: staff.employment_type || "",
            memberId: staff.staff_member_id || "",
            notes: staff.notes || "",
            phoneCountryCode: staff.phone_country_code || "+91",
            additionalPhoneCountryCode: staff.additional_phone_country_code || "+91",
            specialization: staff.specialization || [],
          }));

          const permissionLevelMapReverse: Record<string, string> = {
            no_access: "No access",
            basic: "Basic",
            low: "Low",
            medium: "Medium",
            high: "High",
            manager: "Manager",
          };

          setSettings({
            allowCalendarBookings: staff.allow_calendar_bookings ?? true,
            permissionLevel: permissionLevelMapReverse[staff.permission_level] || "Low",
          });

          // Fetch addresses and emergency contacts if they are separate endpoints or part of staff object
          // Usually they are part of staff object in getById if implemented that way
          if (staff.addresses) setLists((prev) => ({ ...prev, addresses: staff.addresses }));
          if (staff.emergency_contacts) setLists((prev) => ({ ...prev, contacts: staff.emergency_contacts }));

        } catch (error) {
          console.error("Error fetching staff:", error);
        }

        // Fetch additional settings
        try {
          const [wagesRes, commissionsRes, payRunsRes] = await Promise.all([
            api.get(STAFF.WAGES(id), { headers: { "x-salon-id": salonId } }),
            api.get(STAFF.COMMISSIONS(id), { headers: { "x-salon-id": salonId } }),
            api.get(STAFF.PAY_RUNS(id), { headers: { "x-salon-id": salonId } }),
          ]);

          if (wagesRes.data.data) setWages(wagesRes.data.data);
          if (commissionsRes.data.data) {
            const fetchedCommissions = commissionsRes.data.data;
            const newCommissions = { ...commissions };
            fetchedCommissions.forEach((c: any) => {
              newCommissions[c.category] = c;
            });
            setCommissions(newCommissions);
          }
          if (payRunsRes.data.data) setPayRuns(payRunsRes.data.data);
        } catch (error) {
          console.error("Error fetching sub-settings:", error);
        } finally {
          setUi((prev) => ({ ...prev, isLoading: false }));
        }
      };
      fetchStaff();
    }
  }, [id, salonId]);

  const isFirstNameInvalid =
    ui.attemptedSubmit && formData.firstName.trim() === "";
  const isEmailInvalid =
    (ui.attemptedSubmit && formData.email.trim() === "") || ui.isDuplicateEmail;
  const emailErrorMessage = ui.isDuplicateEmail
    ? "A staff member with this email already exists"
    : "Email is required";
  const isPhoneInvalid =
    ui.attemptedSubmit &&
    formData.phone.trim() !== "" &&
    !/^\d{10}$/.test(formData.phone.trim());

  const isAdditionalPhoneInvalid =
    ui.attemptedSubmit &&
    formData.additionalPhone.trim() !== "" &&
    !/^\d{10}$/.test(formData.additionalPhone.trim());

  const hasErrors = isFirstNameInvalid || isEmailInvalid || isPhoneInvalid || isAdditionalPhoneInvalid;
  const errorCount =
    (isFirstNameInvalid ? 1 : 0) +
    (isEmailInvalid ? 1 : 0) +
    (isPhoneInvalid ? 1 : 0) +
    (isAdditionalPhoneInvalid ? 1 : 0);

  const handleAddClick = async () => {
    // Clear stale duplicate-email flag whenever user tries to submit again
    setUi((prev) => ({ ...prev, attemptedSubmit: true, isDuplicateEmail: false }));
    if (formData.firstName.trim() === "" || formData.email.trim() === "" || isPhoneInvalid || isAdditionalPhoneInvalid) {
      setUi((prev) => ({ ...prev, showErrorPopup: true }));
      return;
    }

    try {
      setUi((prev) => ({ ...prev, isLoading: true }));
      // Convert display label → backend enum (e.g. "No access" → "no_access")
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
        permission_level: permissionLevelMap[settings.permissionLevel] ?? settings.permissionLevel.toLowerCase(),
      };

      if (lists.addresses.length > 0) payload.addresses = lists.addresses;
      if (lists.contacts.length > 0) payload.emergency_contacts = lists.contacts;

      if (formData.lastName) payload.last_name = formData.lastName;
      if (formData.phone) payload.phone = formData.phone;
      if (formData.phoneCountryCode) payload.phone_country_code = formData.phoneCountryCode;
      if (formData.additionalPhone) payload.additional_phone = formData.additionalPhone;
      if (formData.additionalPhoneCountryCode)
        payload.additional_phone_country_code = formData.additionalPhoneCountryCode;
      if (formData.country) payload.country = formData.country;
      if (formData.jobTitle) payload.job_title = formData.jobTitle;
      if (formData.memberId) payload.staff_member_id = formData.memberId;
      if (formData.notes) payload.notes = formData.notes;
      if (formData.employmentType) payload.employment_type = formData.employmentType;
      if (formData.specialization) payload.specialization = formData.specialization;
      if (formData.birthdayDayMonth) payload.birthday = formData.birthdayDayMonth;
      if (formData.birthdayYear) payload.birth_year = formData.birthdayYear;
      if (formData.startDateDayMonth) payload.start_date = formData.startDateDayMonth;
      if (formData.startDateDayMonth && formData.startDateYear)
        payload.start_year = formData.startDateYear;
      if (formData.endDateDayMonth) payload.end_date = formData.endDateDayMonth;
      if (formData.endDateDayMonth && formData.endDateYear)
        payload.end_year = formData.endDateYear;
      if (salonId) payload.salon_id = String(salonId);

      const config = {
        headers: { "x-salon-id": salonId }
      };

      if (id && id !== "undefined") {
        await api.patch(STAFF.BY_ID(id), payload, config);
        toast.success("Staff updated successfully");
        navigate("/dashboard/team/members");
      } else {
        const response = await api.post(STAFF.BASE, payload, config);
        const newStaffId = response.data?.data?.staffId || response.data?.staffId || response.data?.data?.id || response.data?.id;

        if (!newStaffId) {
          throw new Error("Failed to retrieve new staff ID from server");
        }

        // After creation, save sub-settings if they have been configured
        try {
          const subPromises = [];

          // Save Wages
          subPromises.push(api.put(STAFF.WAGES(newStaffId), wages, config));

          // Save Commissions
          Object.values(commissions).forEach((c) => {
            subPromises.push(api.put(STAFF.COMMISSIONS(newStaffId), c, config));
          });

          // Save Pay Runs
          subPromises.push(api.put(STAFF.PAY_RUNS(newStaffId), payRuns, config));

          await Promise.all(subPromises);
        } catch (subError) {
          console.error("Error saving initial sub-settings:", subError);
          // Don't block navigation, just warn
          toast.error("Staff created, but some settings failed to save.");
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
  } else if (activeSection === "wages") {
    componentProps.wages = wages;
    componentProps.setWages = setWages;
  } else if (activeSection === "commissions") {
    componentProps.commissions = commissions;
    componentProps.setCommissions = setCommissions;
  } else if (activeSection === "payruns") {
    componentProps.payRuns = payRuns;
    componentProps.setPayRuns = setPayRuns;
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

          {ui.showErrorPopup && hasErrors && (
            <div
              className="position-absolute bg-white shadow-lg border rounded p-3"
              style={{
                top: "45px",
                right: "120px",
                width: "320px",
                zIndex: 1050,
              }}
            >
              <h6 className="fw-bold mb-3" style={{ fontSize: "14px" }}>
                {errorCount} {errorCount === 1 ? "error" : "errors"} found
              </h6>
              {isFirstNameInvalid && (
                <div
                  className="text-muted mb-2 bg-white p-2 rounded"
                  style={{ fontSize: "12px", border: "1px solid #dc3545" }}
                >
                  First name is required
                </div>
              )}
              {isEmailInvalid && (
                <div
                  className="text-muted mb-2 bg-white p-2 rounded"
                  style={{ fontSize: "12px", border: "1px solid #dc3545" }}
                >
                  {emailErrorMessage}
                </div>
              )}
              {isPhoneInvalid && (
                <div
                  className="text-muted mb-2 bg-white p-2 rounded"
                  style={{ fontSize: "12px", border: "1px solid #dc3545" }}
                >
                  Phone number must be exactly 10 digits
                </div>
              )}
              {isAdditionalPhoneInvalid && (
                <div
                  className="text-muted bg-white p-2 rounded"
                  style={{ fontSize: "12px", border: "1px solid #dc3545" }}
                >
                  Additional phone must be exactly 10 digits
                </div>
              )}
            </div>
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
            disabled={ui.isLoading}
          >
            {ui.isLoading ? (
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            ) : null}
            {id ? "Save" : "Add"}
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
