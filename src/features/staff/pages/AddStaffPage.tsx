import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { Camera, Eye, EyeSlash } from "react-bootstrap-icons";
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/AddStaffPage.scss";
import api from "../../../services/api/axios";
import { STAFF } from "../../../services/api/endpoints";
import ResetPasswordSection from "../components/ResetPasswordSection";
import CountryCodeSelect from "../../clients/components/CountryCodeSelect";
import Dropdown from "../../../components/ui/Dropdown";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { sendEmailOtpThunk, verifyEmailOtpThunk } from "../../../middleware/auth/otpThunk";
import { fetchRolesThunk, createRoleThunk, assignStaffRoleThunk } from "../../../middleware/roles/roles.thunk";
import { toTitleCase } from "../../../utils/titleCase";

// Three real choices only. There used to be a leading { value: "", label:
// "Gender" } entry — the standard trick for giving a native <select> a
// placeholder row. This field is a Dropdown now, which takes its own
// `placeholder` prop (already passed below), so that entry stopped being a
// placeholder and started rendering as a fourth, selectable option labelled
// "Gender" that quietly set the value back to "".
const GENDER_OPTIONS = [
  { id: "male", name: "Male" },
  { id: "female", name: "Female" },
  { id: "other", name: "Other" },
];

const ROLE_OPTIONS = [
  { id: "Staff", name: "Staff" },
  { id: "Manager", name: "Manager" },
];

const ROLE_TO_LEVEL: Record<string, string> = {
  "No access": "no_access", Basic: "basic", Low: "low", Medium: "medium", High: "high", Manager: "manager",
};
const LEVEL_TO_ROLE: Record<string, string> = {
  no_access: "No access", basic: "Basic", low: "Low", medium: "Medium", high: "High", manager: "Manager",
};

const DOB_PLACEHOLDER_YEAR = 2000;

const AddStaffPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const isEdit = !!id && id !== "undefined" && id !== "add";
  // Where to go after Save/Discard — defaults to the Team Members list, but
  // callers like the Calendar's "no staff yet" empty state pass their own
  // path so the user lands back where they started instead of a page they
  // never visited.
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo || "/dashboard/team/members";

  const today = new Date().toISOString().slice(0, 10);

  const minAdultDob = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d.toISOString().slice(0, 10);
  })();

  const [form, setForm] = useState({
    name: "", email: "", dob: "", doj: today,
    phone: "", phoneCountryCode: "+91",
    address: "", gender: "", designation: "",
    hourlyRate: "", fixedSalary: "", workingHoursPerDay: "", holidays: "",
    password: "", confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [staffLoginEnabled, setStaffLoginEnabled] = useState(false);
  // Edit mode only: an existing staff member with login already set up shows
  // a read-only "has a password" state with Reset Password beside it —
  // handled entirely by the reusable ResetPasswordSection component (its own
  // New/Confirm/OTP fields and Update Password API call), independent of
  // this page's main Save.
  const hasExistingLogin = isEdit && staffLoginEnabled;

  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Individual permission overrides are managed separately, post-creation,
  // from Settings → Roles & Permissions — this form only sets the broad
  // Staff/Manager role tier (below), never staff.custom_permissions directly.
  const [permissionLevel, setPermissionLevel] = useState("Low");

  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [duplicateEmailMessage, setDuplicateEmailMessage] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);
  const { showSuccess, showError, overlay } = useStatusOverlay();

  // ── Email OTP verification (new staff only) ─────────────────────────────────
  const [emailOtp, setEmailOtp] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpVerified, setEmailOtpVerified] = useState(false);
  const [emailOtpLoading, setEmailOtpLoading] = useState(false);
  const [emailOtpMsg, setEmailOtpMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [emailOtpError, setEmailOtpError] = useState<string | null>(null);
  const lastVerifiedEmailRef = useRef("");
  // Editing an existing login's email now needs the same OTP flow Add-staff
  // already has — only while the address has actually changed from the one
  // this staff member's login was last verified against (lastVerifiedEmailRef,
  // seeded from the loaded record below when it already has a working login).
  // Leaving it untouched needs no re-verification; typing a different
  // address does, same as Add.
  const shouldShowEmailOtp = staffLoginEnabled && form.email.trim() !== lastVerifiedEmailRef.current;
  const emailVerifiedForCurrentAddress = emailOtpVerified && lastVerifiedEmailRef.current === form.email.trim();
  const isEmailVerificationInvalid = attemptedSubmit && shouldShowEmailOtp && !emailVerifiedForCurrentAddress;

  const clearEmailOtpState = useCallback(() => {
    setEmailOtpSent(false);
    setEmailOtpVerified(false);
    setEmailOtp("");
    setEmailOtpMsg(null);
    setEmailOtpError(null);
    lastVerifiedEmailRef.current = "";
  }, []);

  useEffect(() => {
    if (!staffLoginEnabled) clearEmailOtpState();
  }, [clearEmailOtpState, staffLoginEnabled]);

  // ── Load existing staff (edit mode) ─────────────────────────────────────────
  useEffect(() => {
    if (!isEdit) return;

    const load = async () => {
      try {
        setIsLoading(true);
        const [staffRes, wagesRes] = await Promise.all([
          api.get(STAFF.BY_ID(id!)),
          api.get(STAFF.WAGES(id!)).catch(() => null),
        ]);
        const staff = staffRes.data?.data || staffRes.data;

        setForm({
          name: [staff.first_name, staff.last_name].filter(Boolean).join(" "),
          email: staff.email || "",
          dob: staff.birthday_day && staff.birthday_month
            ? `${staff.birthday_year || DOB_PLACEHOLDER_YEAR}-${String(staff.birthday_month).padStart(2, "0")}-${String(staff.birthday_day).padStart(2, "0")}`
            : "",
          doj: staff.joined_date ? String(staff.joined_date).slice(0, 10) : today,
          phone: staff.phone_number || staff.phone || "",
          phoneCountryCode: staff.phone_country_code || "+91",
          address: staff.address || "",
          gender: staff.gender || "",
          designation: staff.designation || staff.job_title || "",
          hourlyRate: "", fixedSalary: "", workingHoursPerDay: staff.working_hours_per_day ?? "", holidays: staff.holidays ?? "",
          password: "", confirmPassword: "",
        });
        // Staff Login reflects whether this staff member already has an
        // email on file — without this, the toggle always defaulted to OFF
        // on Edit regardless of the real state, which combined with "Email
        // optional when OFF" would have let an existing logged-in staff
        // member's email be silently cleared on save.
        setStaffLoginEnabled(!!staff.email);
        // Seeds shouldShowEmailOtp's "has this address actually changed"
        // check — an existing staff member's on-file email is already how
        // they log in today, so leaving it untouched needs no
        // re-verification here; editing it to a different address does.
        if (staff.email) {
          lastVerifiedEmailRef.current = staff.email;
        }
        setAvatarUrl(staff.avatar_url || "");
        setPermissionLevel(LEVEL_TO_ROLE[staff.permission_level] || "Low");

        const wages = wagesRes?.data?.data;
        if (wages) {
          setForm((prev) => ({
            ...prev,
            hourlyRate: wages.hourly_rate ?? "",
            fixedSalary: wages.salary_amount ?? "",
          }));
        }
      } catch (error) {
        console.error("Error fetching staff:", error);
        showError("Failed to load staff data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [id, isEdit]);

  // ── Field validation ─────────────────────────────────────────────────────────
  const isNameInvalid = attemptedSubmit && form.name.trim() === "";

  // Email is only mandatory when Staff Login is on — an admin adding a
  // staff member who won't log in at all shouldn't be blocked for lacking
  // one. If a value IS entered, it must still be a real address either way.
  const emailFormatValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const isEmailRequiredAndMissing = staffLoginEnabled && form.email.trim() === "";
  const isEmailInvalid =
    !!duplicateEmailMessage ||
    (attemptedSubmit && isEmailRequiredAndMissing) ||
    (attemptedSubmit && form.email.trim() !== "" && !emailFormatValid);
  const emailErrorMessage =
    duplicateEmailMessage || (isEmailRequiredAndMissing ? "Email is required" : "Enter a valid email address");

  const isDobFuture = !!form.dob && form.dob > today;
  const isDobUnderage = !!form.dob && !isDobFuture && form.dob > minAdultDob;
  const isDobInvalid = attemptedSubmit && !!form.dob && (isDobFuture || isDobUnderage);
  const dobErrorMessage = isDobFuture
    ? "Date of birth cannot be in the future"
    : "Staff must be at least 18 years old";

  const isDojInvalid = attemptedSubmit && (form.doj.trim() === "" || form.doj > today);

  const isPhoneInvalid = attemptedSubmit && (form.phone.trim() === "" || !/^\d{10}$/.test(form.phone.trim()));
  const phoneErrorMessage = form.phone.trim() === "" ? "Contact is required" : "Enter a valid 10-digit phone number";

  const isHourlyRateInvalid = attemptedSubmit && form.hourlyRate !== "" && Number(form.hourlyRate) <= 0;
  const isFixedSalaryInvalid = attemptedSubmit && form.fixedSalary !== "" && Number(form.fixedSalary) <= 0;
  const isCompensationConflict = attemptedSubmit && form.hourlyRate !== "" && form.fixedSalary !== "";

  const isWorkingHoursInvalid =
    attemptedSubmit && form.workingHoursPerDay !== "" &&
    (Number(form.workingHoursPerDay) < 0 || Number(form.workingHoursPerDay) > 24);

  const isHolidaysInvalid = attemptedSubmit && form.holidays !== "" && Number(form.holidays) < 0;

  // Add-staff mode still sets an initial password as part of the regular
  // form/Save flow. Edit mode's password change is handled entirely by
  // ResetPasswordSection below.
  const isPasswordInvalid = attemptedSubmit && !isEdit && staffLoginEnabled && form.password.trim() !== "" && form.password.trim().length < 8;
  const isConfirmPasswordInvalid = attemptedSubmit && !isEdit && staffLoginEnabled && form.password.trim() !== "" && form.confirmPassword !== form.password;

  const setField = (key: keyof typeof form) => (val: string) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    if (key === "email") {
      if (duplicateEmailMessage) setDuplicateEmailMessage(null);
      if (val.trim() !== lastVerifiedEmailRef.current) {
        clearEmailOtpState();
      }
    }
  };

  // ── Email OTP: send / verify ─────────────────────────────────────────────────
  const handleSendEmailOtp = async () => {
    if (!shouldShowEmailOtp) return;
    const email = form.email.trim();
    if (!email || !emailFormatValid) {
      setAttemptedSubmit(true);
      return;
    }
    setEmailOtpVerified(false);
    setEmailOtpSent(false);
    setEmailOtp("");
    setEmailOtpMsg(null);
    setEmailOtpError(null);
    setEmailOtpLoading(true);

    const result = await dispatch(sendEmailOtpThunk({ email }));

    if (sendEmailOtpThunk.fulfilled.match(result)) {
      setEmailOtpSent(true);
      setEmailOtpMsg({ type: "success", text: "OTP sent! Check the staff member's inbox." });
    } else {
      setEmailOtpMsg({ type: "error", text: (result.payload as string) ?? "Failed to send OTP." });
    }
    setEmailOtpLoading(false);
  };

  const handleVerifyEmailOtp = async () => {
    if (!shouldShowEmailOtp) return;
    if (!emailOtp.trim()) {
      setEmailOtpError("Please enter the OTP");
      return;
    }
    setEmailOtpLoading(true);
    setEmailOtpError(null);
    const email = form.email.trim();
    const result = await dispatch(verifyEmailOtpThunk({ email, otp: emailOtp }));
    if (verifyEmailOtpThunk.fulfilled.match(result)) {
      setEmailOtpVerified(true);
      setEmailOtpMsg(null);
      lastVerifiedEmailRef.current = email;
    } else {
      setEmailOtpError((result.payload as string) ?? "Invalid OTP.");
    }
    setEmailOtpLoading(false);
  };

  // ── Avatar upload ────────────────────────────────────────────────────────────
  const handleAvatarPick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    setAvatarPreview(localUrl);
    setAvatarUploading(true);

    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await api.post(STAFF.UPLOAD_AVATAR, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = res.data?.data?.url || res.data?.url;
      if (url) setAvatarUrl(url);
    } catch (error) {
      console.error("Error uploading avatar:", error);
      showError("Failed to upload profile image");
      setAvatarPreview("");
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setAttemptedSubmit(true);
    setDuplicateEmailMessage(null);

    if (
      form.name.trim() === "" || isEmailRequiredAndMissing || (form.email.trim() !== "" && !emailFormatValid) ||
      form.phone.trim() === "" || isPhoneInvalid ||
      form.doj.trim() === "" || isDobInvalid ||
      isHourlyRateInvalid || isFixedSalaryInvalid || isCompensationConflict || isWorkingHoursInvalid || isHolidaysInvalid ||
      isPasswordInvalid || isConfirmPasswordInvalid || isEmailVerificationInvalid
    ) {
      return;
    }

    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    try {
      setIsLoading(true);

      const nameParts = toTitleCase(form.name.trim()).split(/\s+/);
      const first_name = nameParts[0];
      const last_name = nameParts.slice(1).join(" ") || undefined;

      let birthday_day: number | undefined;
      let birthday_month: number | undefined;
      if (form.dob) {
        const [, month, day] = form.dob.split("-").map(Number);
        birthday_day = day;
        birthday_month = month;
      }

      const payload: Record<string, unknown> = {
        first_name,
        last_name,
        // undefined (not "") when blank — an explicit empty string reads as
        // "clear the email" to the API, which isn't the intent of simply
        // leaving the field untouched/empty.
        email: form.email.trim() || undefined,
        phone: form.phone.trim(),
        phone_country_code: form.phoneCountryCode,
        job_title: form.designation || undefined,
        joined_date: form.doj || undefined,
        birthday_day,
        birthday_month,
        permission_level: ROLE_TO_LEVEL[permissionLevel] || "low",
        allow_calendar_bookings: true,
        // Pending DB migration — accepted by the API but not yet persisted server-side.
        gender: form.gender || undefined,
        address: form.address || undefined,
        avatar_url: avatarUrl || undefined,
        working_hours_per_day: form.workingHoursPerDay ? Number(form.workingHoursPerDay) : undefined,
        holidays: form.holidays ? Number(form.holidays) : undefined,
      };

      if (!isEdit) {
        payload.email_verified = shouldShowEmailOtp && emailVerifiedForCurrentAddress;
        // New staff must be usable immediately (bookable in Calendar/Quick
        // Sale, selectable in reports) — don't rely on the backend's own
        // default, which currently creates staff as inactive.
        payload.is_active = true;
      }

      if (staffLoginEnabled && form.password.trim()) {
        payload.password = form.password.trim();
      }

      let staffId = id;
      if (isEdit) {
        await api.patch(STAFF.BY_ID(id!), payload);
      } else {
        const res = await api.post(STAFF.BASE, payload);
        staffId = res.data?.data?.staffId || res.data?.staffId || res.data?.data?.id || res.data?.id;
        if (!staffId) throw new Error("Failed to retrieve new staff ID from server");

        // The create endpoint doesn't reliably honor `is_active` in the
        // payload (new staff still come back Inactive) — explicitly
        // activate right after creation so the record is usable immediately.
        try {
          await api.patch(STAFF.ACTIVATE(staffId));
        } catch (activateError) {
          console.error("Error activating newly created staff:", activateError);
        }
      }

      if (staffId && (form.hourlyRate || form.fixedSalary)) {
        try {
          await api.put(STAFF.WAGES(staffId), {
            wages_enabled: true,
            compensation_type: form.hourlyRate ? "hourly" : "salary",
            hourly_rate: form.hourlyRate ? Number(form.hourlyRate) : null,
            salary_amount: !form.hourlyRate && form.fixedSalary ? Number(form.fixedSalary) : null,
          });
        } catch (wageError) {
          console.error("Error saving wage settings:", wageError);
        }
      }

      // This "Role" field used to only write staff.permission_level, a
      // display-only column the real permission resolver (staffHasPermission
      // in permission.middleware.ts) never reads — selecting "Manager" here
      // silently did nothing to the staff member's actual access, which is
      // controlled entirely by staff.role_id / the role_permissions table
      // (see Settings → Roles & Permissions). Now also assigns them to the
      // matching named role there, auto-creating it (blank) if this salon
      // has never configured that tier yet — same auto-heal the "Individual
      // Staff" override endpoint already does for the Staff tier.
      if (staffId) {
        try {
          const roleName = permissionLevel === "Manager" ? "Manager" : "Staff";
          const roles = await dispatch(fetchRolesThunk()).unwrap();
          let targetRole = roles.find((r) => r.name === roleName);
          if (!targetRole) {
            targetRole = await dispatch(createRoleThunk({ name: roleName, permissions: {} })).unwrap();
          }
          await dispatch(assignStaffRoleThunk({ staffId, roleId: targetRole.id })).unwrap();
        } catch (roleError) {
          console.error("Error assigning staff role:", roleError);
        }
      }

      if (isEdit) {
        showSuccess("Staff updated successfully");
      } else {
        showSuccess(emailVerifiedForCurrentAddress ? "Staff created and email verified successfully" : "Staff created successfully");
      }
      navigate(returnTo);
    } catch (error: unknown) {
      console.error("Error saving staff:", error);
      const err = error as {
        response?: { status?: number; data?: { message?: string; error?: { message?: string } } };
        status?: number;
        message?: string;
      };
      const status = err.response?.status ?? err.status;
      const serverMessage =
        err.response?.data?.message || err.response?.data?.error?.message || err.message;

      if (status === 409) {
        setDuplicateEmailMessage(serverMessage || "A staff member with this email already exists.");
      } else if (status === 401) {
        showError("Your session has expired. Please log in again.");
      } else {
        showError(serverMessage || "Failed to save staff member");
      }
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const displayInitials = form.name.trim() ? form.name.trim()[0].toUpperCase() : "?";

  return (
    <div className="add-staff">
      {overlay}
      <div className="add-staff__header">
        <h5 className="add-staff__header-title">{isEdit ? "Edit Staff" : "Create Staff"}</h5>
        <div className="add-staff__header-actions">
          <button className="btn add-staff__btn-close" onClick={() => setShowUnsavedDialog(true)}>
            Close
          </button>
          <button className="btn add-staff__btn-add" onClick={handleSave} disabled={isLoading}>
            {isLoading && <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />}
            {isLoading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {showUnsavedDialog && (
        <div className="add-staff__dialog-overlay">
          <div className="add-staff__dialog">
            <button className="add-staff__dialog-close" onClick={() => setShowUnsavedDialog(false)}>&times;</button>
            <h5 className="add-staff__dialog-title">Unsaved changes</h5>
            <p className="add-staff__dialog-desc">You have unsaved changes. Are you sure you want to leave?</p>
            <div className="add-staff__dialog-actions">
              <button className="btn add-staff__dialog-btn add-staff__dialog-btn--cancel" onClick={() => setShowUnsavedDialog(false)}>
                Cancel
              </button>
              <button className="btn add-staff__dialog-btn add-staff__dialog-btn--discard" onClick={() => navigate(returnTo)}>
                Discard changes
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="emp-page">
        {/* ── Details + Profile Image ── */}
        <div className="emp-top-row">
          <div className="emp-card emp-details-card">
            <h6 className="emp-card__title">Details</h6>
            <div className="emp-details-grid">
              <div className="emp-field">
                <label className="emp-field__label">Name<span className="text-danger">*</span></label>
                <input
                  className={`emp-input ${isNameInvalid ? "emp-input--invalid" : ""}`}
                  placeholder="Name"
                  value={form.name}
                  onChange={(e) => setField("name")(e.target.value)}
                />
                {isNameInvalid && <span className="emp-field__error">Name is required</span>}
              </div>
              <div className="emp-field">
                <label className="emp-field__label">Date of Birth</label>
                <input
                  className={`emp-input ${isDobInvalid ? "emp-input--invalid" : ""}`}
                  type="date"
                  max={minAdultDob}
                  value={form.dob}
                  onChange={(e) => setField("dob")(e.target.value)}
                  onFocus={() => {
                    if (!form.dob) {
                      const defaultYear = new Date().getFullYear() - 25;
                      setField("dob")(`${defaultYear}-01-01`);
                    }
                  }}
                />
                {isDobInvalid && <span className="emp-field__error">{dobErrorMessage}</span>}
              </div>
              <div className="emp-field">
                <label className="emp-field__label">Date of Joining</label>
                <input
                  className={`emp-input ${isDojInvalid ? "emp-input--invalid" : ""}`}
                  type="date"
                  max={today}
                  value={form.doj}
                  onChange={(e) => setField("doj")(e.target.value)}
                />
                {isDojInvalid && (
                  <span className="emp-field__error">
                    {form.doj.trim() === "" ? "Date of joining is required" : "Date of joining cannot be in the future"}
                  </span>
                )}
              </div>

              <div className="emp-field">
                <label className="emp-field__label">Contact<span className="text-danger">*</span></label>
                <div className={`emp-phone-group ${isPhoneInvalid ? "emp-input--invalid" : ""}`}>
                  <CountryCodeSelect
                    value={form.phoneCountryCode}
                    onChange={(code) => setField("phoneCountryCode")(code)}
                  />
                  <input
                    className="emp-input emp-phone-input"
                    placeholder="Contact"
                    value={form.phone}
                    onChange={(e) => setField("phone")(e.target.value.replace(/\D/g, ""))}
                    maxLength={10}
                  />
                </div>
                {isPhoneInvalid && <span className="emp-field__error">{phoneErrorMessage}</span>}
              </div>
              <div className="emp-field">
                <label className="emp-field__label">Address</label>
                <input
                  className="emp-input"
                  placeholder="Address"
                  value={form.address}
                  onChange={(e) => setField("address")(e.target.value)}
                />
              </div>

              <div className="emp-field">
                <label className="emp-field__label">Gender</label>
                <Dropdown
                  value={form.gender}
                  onChange={(val: string) => setField("gender")(val)}
                  options={GENDER_OPTIONS}
                  placeholder="Gender"
                  className="emp-input emp-select"
                />
              </div>
              <div className="emp-field">
                <label className="emp-field__label">Designation</label>
                <input
                  className="emp-input"
                  placeholder="Designation"
                  value={form.designation}
                  onChange={(e) => setField("designation")(e.target.value)}
                />
              </div>
              <div className="emp-field">
                <label className="emp-field__label">Role</label>
                <Dropdown
                  value={permissionLevel === "Manager" ? "Manager" : "Staff"}
                  onChange={(val: string) => setPermissionLevel(val === "Manager" ? "Manager" : "Low")}
                  options={ROLE_OPTIONS}
                  placeholder="Select role"
                  className="emp-input emp-select"
                />
              </div>

              <div className="emp-field">
                <label className="emp-field__label">Hourly Rate</label>
                <input
                  className={`emp-input ${isHourlyRateInvalid || isCompensationConflict ? "emp-input--invalid" : ""}`}
                  placeholder="Hourly Rate"
                  type="number"
                  min={0}
                  value={form.hourlyRate}
                  onChange={(e) => setField("hourlyRate")(e.target.value)}
                />
                {isHourlyRateInvalid && <span className="emp-field__error">Hourly rate must be greater than 0</span>}
                {!isHourlyRateInvalid && isCompensationConflict && (
                  <span className="emp-field__error">A Fixed Salary is already set below — clear it to switch this staff member to an Hourly Rate</span>
                )}
              </div>
              <div className="emp-field">
                <label className="emp-field__label">Fixed Salary</label>
                <input
                  className={`emp-input ${isFixedSalaryInvalid || isCompensationConflict ? "emp-input--invalid" : ""}`}
                  placeholder="Fixed Salary"
                  type="number"
                  min={0}
                  value={form.fixedSalary}
                  onChange={(e) => setField("fixedSalary")(e.target.value)}
                />
                {isFixedSalaryInvalid && <span className="emp-field__error">Fixed salary must be greater than 0</span>}
                {!isFixedSalaryInvalid && isCompensationConflict && (
                  <span className="emp-field__error">An Hourly Rate is already set above — clear it to switch this staff member to a Fixed Salary</span>
                )}
              </div>

              <div className="emp-field">
                <label className="emp-field__label">Working Hours/Day</label>
                <input
                  className={`emp-input ${isWorkingHoursInvalid ? "emp-input--invalid" : ""}`}
                  placeholder="Working Hours/Day"
                  type="number"
                  min={0}
                  max={24}
                  value={form.workingHoursPerDay}
                  onChange={(e) => setField("workingHoursPerDay")(e.target.value)}
                />
                {isWorkingHoursInvalid && <span className="emp-field__error">Must be between 0 and 24</span>}
              </div>
              <div className="emp-field">
                <label className="emp-field__label">Holidays</label>
                <input
                  className={`emp-input ${isHolidaysInvalid ? "emp-input--invalid" : ""}`}
                  placeholder="Holidays"
                  type="number"
                  min={0}
                  value={form.holidays}
                  onChange={(e) => setField("holidays")(e.target.value)}
                />
                {isHolidaysInvalid && <span className="emp-field__error">Holidays cannot be negative</span>}
              </div>
            </div>
          </div>

          <div className="emp-card emp-photo-card">
            <h6 className="emp-card__title">Profile Image</h6>
            <div className="emp-photo-box" onClick={handleAvatarPick}>
              {avatarPreview || avatarUrl ? (
                <img src={avatarPreview || avatarUrl} alt="Profile" className="emp-photo-preview" />
              ) : (
                <span className="emp-photo-placeholder">{displayInitials}</span>
              )}
              <div className="emp-photo-camera">
                <Camera size={16} />
              </div>
              {avatarUploading && <div className="emp-photo-uploading">Uploading...</div>}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif"
              className="emp-hidden-input"
              onChange={handleAvatarChange}
            />
            <p className="emp-photo-hint">Accepted formats: PNG, GIF or JPG. Maximum file size is 2.0MB.</p>
          </div>
        </div>

        {/* ── Staff Login ── */}
        <div className="emp-card">
          <div className="emp-permissions-header">
            <div className="emp-permissions-header__left">
              <span className="emp-card__title emp-card__title--inline">Staff Login</span>
              <label className="emp-toggle">
                <input
                  type="checkbox"
                  checked={staffLoginEnabled}
                  onChange={(e) => setStaffLoginEnabled(e.target.checked)}
                />
                <span className="emp-toggle__slider" />
              </label>
            </div>
          </div>

          {staffLoginEnabled && (
            <div className="emp-login-grid">
              <div className="emp-field">
                <label className="emp-field__label">
                  Email<span className="text-danger">*</span>
                </label>
                <div className="emp-input-row">
                  <input
                    className={`emp-input ${isEmailInvalid ? "emp-input--invalid" : ""}`}
                    placeholder="Email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setField("email")(e.target.value)}
                  />
                  {shouldShowEmailOtp && (
                    <button
                      type="button"
                      className={`emp-otp-btn ${emailOtpVerified ? "emp-otp-btn--verified" : ""}`}
                      onClick={handleSendEmailOtp}
                      disabled={emailOtpLoading || emailOtpVerified}
                    >
                      {emailOtpLoading && !emailOtpSent
                        ? "Sending…"
                        : emailOtpVerified
                          ? "Verified"
                          : emailOtpSent
                            ? "Resend"
                            : "Send OTP"}
                    </button>
                  )}
                </div>
                {isEmailInvalid && <span className="emp-field__error">{emailErrorMessage}</span>}
                {!isEmailInvalid && emailOtpMsg && (
                  <span className={`emp-otp-msg emp-otp-msg--${emailOtpMsg.type}`}>{emailOtpMsg.text}</span>
                )}
                {!isEmailInvalid && isEmailVerificationInvalid && (
                  <span className="emp-field__error">Email OTP verification is required when Staff Login is enabled</span>
                )}
                {shouldShowEmailOtp && !emailOtpVerified && !emailOtpMsg && !isEmailVerificationInvalid && (
                  <span className="emp-field__hint">
                    {isEdit
                      ? "This email is changing — verify it so the staff member can keep logging in."
                      : "Verify this email so the staff member can log in."}
                  </span>
                )}
                {emailOtpVerified && (
                  <span className="emp-verified-tag emp-verified-tag--email">
                    <span className="emp-verified-tag__check">✓</span>
                    Email verified
                  </span>
                )}
                {/* Unchanged from the address this login already works with —
                    already proven, so shown as verified without re-asking
                    for OTP (see lastVerifiedEmailRef, seeded on load). */}
                {!shouldShowEmailOtp && !emailOtpVerified && staffLoginEnabled && lastVerifiedEmailRef.current && (
                  <span className="emp-verified-tag emp-verified-tag--email">
                    <span className="emp-verified-tag__check">✓</span>
                    Email verified
                  </span>
                )}
              </div>

              {shouldShowEmailOtp && emailOtpSent && !emailOtpVerified && (
                <div className="emp-field emp-otp-field">
                  <label className="emp-field__label">Enter Email OTP</label>
                  <div className="emp-input-row">
                    <input
                      className="emp-input"
                      placeholder="6-digit OTP"
                      value={emailOtp}
                      maxLength={6}
                      onChange={(e) => {
                        setEmailOtp(e.target.value.replace(/\D/g, ""));
                        if (emailOtpError) setEmailOtpError(null);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleVerifyEmailOtp()}
                    />
                    <button
                      type="button"
                      className="emp-verify-btn"
                      onClick={handleVerifyEmailOtp}
                      disabled={emailOtpLoading || emailOtp.length < 6}
                    >
                      {emailOtpLoading ? "Verifying…" : "Verify"}
                    </button>
                  </div>
                  {emailOtpError && <span className="emp-field__error">{emailOtpError}</span>}
                </div>
              )}
            </div>
          )}

          {/* Existing login: masked password + Reset Password, or the New/Confirm
              Password + Update Password flow once clicked. emailAlreadyVerified
              tracks the email field above — true while it's still the
              address this login already works with, false once the admin
              edits it to something new (which then needs its own fresh OTP,
              same gate ResetPasswordSection already applies when this is
              false, before a password reset can go out to an unproven inbox). */}
          {staffLoginEnabled && hasExistingLogin && (
            <ResetPasswordSection
              staffId={id!}
              email={form.email}
              emailAlreadyVerified={!shouldShowEmailOtp}
              onSuccess={() => showSuccess("Password updated successfully")}
              onError={showError}
            />
          )}

          {/* Add-staff flow: unchanged initial password fields */}
          {staffLoginEnabled && !isEdit && (
            <>
              <div className="emp-login-grid">
                <div className="emp-field">
                  <label className="emp-field__label">Password</label>
                  <div className={`emp-password-group ${isPasswordInvalid ? "emp-input--invalid" : ""}`}>
                    <input
                      className="emp-input emp-password-input"
                      placeholder="Password"
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => setField("password")(e.target.value)}
                    />
                    <button type="button" className="emp-password-eye" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeSlash size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {isPasswordInvalid && <span className="emp-field__error">Password must be at least 8 characters</span>}
                </div>
                <div className="emp-field">
                  <label className="emp-field__label">Confirm Password</label>
                  <div className={`emp-password-group ${isConfirmPasswordInvalid ? "emp-input--invalid" : ""}`}>
                    <input
                      className="emp-input emp-password-input"
                      placeholder="Confirm Password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={form.confirmPassword}
                      onChange={(e) => setField("confirmPassword")(e.target.value)}
                    />
                    <button type="button" className="emp-password-eye" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                      {showConfirmPassword ? <EyeSlash size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {isConfirmPasswordInvalid && <span className="emp-field__error">Passwords do not match</span>}
                </div>
              </div>
              <p className="emp-field__hint">
                Set a password so this staff member can log in with their email above once it's verified. Leave blank and they can set their own password later from the login screen using their verified email.
              </p>
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default AddStaffPage;
