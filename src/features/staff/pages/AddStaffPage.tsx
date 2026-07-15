import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Country } from "country-state-city";
import { Camera, Eye, EyeSlash } from "react-bootstrap-icons";
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/AddStaffPage.scss";
import api from "../../../services/api/axios";
import { STAFF } from "../../../services/api/endpoints";
import {
  defaultPermissions,
  PERM_CATEGORIES,
  buildPermissions,
  permsToRecord,
  type Permission,
} from "../../settings/data/permissionMatrix";

const ROLE_TO_LEVEL: Record<string, string> = {
  "No access": "no_access", Basic: "basic", Low: "low", Medium: "medium", High: "high", Manager: "manager",
};
const LEVEL_TO_ROLE: Record<string, string> = {
  no_access: "No access", basic: "Basic", low: "Low", medium: "Medium", high: "High", manager: "Manager",
};

const PHONE_CODES = Country.getAllCountries()
  .map((c) => ({
    code: c.phonecode.startsWith("+") ? c.phonecode : `+${c.phonecode}`,
    label: `${c.isoCode} (${c.phonecode.startsWith("+") ? c.phonecode : `+${c.phonecode}`})`,
  }))
  .filter((v, i, a) => a.findIndex((t) => t.label === v.label) === i)
  .sort((a, b) => a.label.localeCompare(b.label));

const DOB_PLACEHOLDER_YEAR = 2000;

const AddStaffPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id && id !== "undefined" && id !== "add";

  const [form, setForm] = useState({
    name: "", email: "", dob: "", doj: "",
    phone: "", phoneCountryCode: "+91",
    address: "", gender: "", designation: "",
    hourlyRate: "", fixedSalary: "", workingHoursPerDay: "", holidays: "",
    password: "", confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [staffLoginEnabled, setStaffLoginEnabled] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [permissionLevel, setPermissionLevel] = useState("Low");
  const [permissionsEnabled, setPermissionsEnabled] = useState(false);
  const [perms, setPerms] = useState<Permission[]>(() => buildPermissions(defaultPermissions, null));

  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [duplicateEmailMessage, setDuplicateEmailMessage] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

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
            ? `${DOB_PLACEHOLDER_YEAR}-${String(staff.birthday_month).padStart(2, "0")}-${String(staff.birthday_day).padStart(2, "0")}`
            : "",
          doj: staff.joined_date ? String(staff.joined_date).slice(0, 10) : "",
          phone: staff.phone_number || staff.phone || "",
          phoneCountryCode: staff.phone_country_code || "+91",
          address: staff.address || "",
          gender: staff.gender || "",
          designation: staff.designation || staff.job_title || "",
          hourlyRate: "", fixedSalary: "", workingHoursPerDay: staff.working_hours_per_day ?? "", holidays: staff.holidays ?? "",
          password: "", confirmPassword: "",
        });
        setAvatarUrl(staff.avatar_url || "");
        setPermissionLevel(LEVEL_TO_ROLE[staff.permission_level] || "Low");

        if (staff.custom_permissions) {
          setPermissionsEnabled(true);
          setPerms(buildPermissions(defaultPermissions, staff.custom_permissions));
        } else {
          setPerms(buildPermissions(defaultPermissions, null));
        }

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
        toast.error("Failed to load staff data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [id, isEdit]);

  // ── Field validation ─────────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);

  const isNameInvalid = attemptedSubmit && form.name.trim() === "";

  const emailFormatValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const isEmailInvalid =
    !!duplicateEmailMessage ||
    (attemptedSubmit && (form.email.trim() === "" || !emailFormatValid));
  const emailErrorMessage =
    duplicateEmailMessage || (form.email.trim() === "" ? "Email is required" : "Enter a valid email address");

  const isDobInvalid = attemptedSubmit && !!form.dob && form.dob > today;

  const isDojInvalid = attemptedSubmit && form.doj.trim() === "";

  const isPhoneInvalid = attemptedSubmit && (form.phone.trim() === "" || !/^\d{10}$/.test(form.phone.trim()));
  const phoneErrorMessage = form.phone.trim() === "" ? "Contact is required" : "Enter a valid 10-digit phone number";

  const isGenderInvalid = attemptedSubmit && form.gender.trim() === "";

  const isHourlyRateInvalid = attemptedSubmit && form.hourlyRate !== "" && Number(form.hourlyRate) <= 0;
  const isFixedSalaryInvalid = attemptedSubmit && form.fixedSalary !== "" && Number(form.fixedSalary) <= 0;
  const isCompensationConflict = attemptedSubmit && form.hourlyRate !== "" && form.fixedSalary !== "";

  const isWorkingHoursInvalid =
    attemptedSubmit && form.workingHoursPerDay !== "" &&
    (Number(form.workingHoursPerDay) < 0 || Number(form.workingHoursPerDay) > 24);

  const isHolidaysInvalid = attemptedSubmit && form.holidays !== "" && Number(form.holidays) < 0;

  const isPasswordInvalid = attemptedSubmit && staffLoginEnabled && form.password.trim() !== "" && form.password.trim().length < 8;
  const isConfirmPasswordInvalid = attemptedSubmit && staffLoginEnabled && form.password.trim() !== "" && form.confirmPassword !== form.password;

  const setField = (key: keyof typeof form) => (val: string) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    if (key === "email" && duplicateEmailMessage) setDuplicateEmailMessage(null);
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
      toast.error("Failed to upload profile image");
      setAvatarPreview("");
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Permissions ──────────────────────────────────────────────────────────────
  const togglePerm = (key: string) => {
    setPerms((prev) => prev.map((p) => (p.key === key ? { ...p, staff: !p.staff } : p)));
    setPermissionsEnabled(true);
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setAttemptedSubmit(true);
    setDuplicateEmailMessage(null);

    if (
      form.name.trim() === "" || form.email.trim() === "" || !emailFormatValid || form.phone.trim() === "" || isPhoneInvalid ||
      form.doj.trim() === "" || form.gender.trim() === "" || isDobInvalid ||
      isHourlyRateInvalid || isFixedSalaryInvalid || isCompensationConflict || isWorkingHoursInvalid || isHolidaysInvalid ||
      isPasswordInvalid || isConfirmPasswordInvalid
    ) {
      toast.error("Please fix the highlighted fields");
      return;
    }

    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    try {
      setIsLoading(true);

      const nameParts = form.name.trim().split(/\s+/);
      const first_name = nameParts[0];
      const last_name = nameParts.slice(1).join(" ") || undefined;

      let birthday_day: number | undefined;
      let birthday_month: number | undefined;
      if (form.dob) {
        const [, month, day] = form.dob.split("-").map(Number);
        birthday_day = day;
        birthday_month = month;
      }

      const payload: Record<string, any> = {
        first_name,
        last_name,
        email: form.email.trim(),
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

      if (staffLoginEnabled && form.password.trim()) {
        payload.password = form.password.trim();
      }

      if (permissionsEnabled) {
        payload.custom_permissions = permsToRecord(perms);
      } else if (isEdit) {
        payload.custom_permissions = null;
      }

      let staffId = id;
      if (isEdit) {
        await api.patch(STAFF.BY_ID(id!), payload);
      } else {
        const res = await api.post(STAFF.BASE, payload);
        staffId = res.data?.data?.staffId || res.data?.staffId || res.data?.data?.id || res.data?.id;
        if (!staffId) throw new Error("Failed to retrieve new staff ID from server");
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

      toast.success(isEdit ? "Staff updated successfully" : "Invitation sent successfully");
      navigate("/dashboard/team/members");
    } catch (error: any) {
      console.error("Error saving staff:", error);
      const status = error?.response?.status ?? error?.status;
      const serverMessage =
        error?.response?.data?.message || error?.response?.data?.error?.message || error?.message;

      if (status === 409) {
        setDuplicateEmailMessage(serverMessage || "A staff member with this email already exists.");
      } else if (status === 401) {
        toast.error("Your session has expired. Please log in again.");
      } else {
        toast.error(serverMessage || "Failed to save staff member");
      }
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const displayInitials = form.name.trim() ? form.name.trim()[0].toUpperCase() : "?";

  return (
    <div className="add-staff">
      <div className="add-staff__header">
        <h5 className="add-staff__header-title">{isEdit ? "Edit Employee" : "Create Employee"}</h5>
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
              <button className="btn add-staff__dialog-btn add-staff__dialog-btn--discard" onClick={() => navigate("/dashboard/team/members")}>
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
                <input
                  className={`emp-input ${isNameInvalid ? "emp-input--invalid" : ""}`}
                  placeholder="Name*"
                  value={form.name}
                  onChange={(e) => setField("name")(e.target.value)}
                />
                {isNameInvalid && <span className="emp-field__error">Name is required</span>}
              </div>
              <div className="emp-field">
                <input
                  className={`emp-input ${isEmailInvalid ? "emp-input--invalid" : ""}`}
                  placeholder="Email*"
                  type="email"
                  value={form.email}
                  onChange={(e) => setField("email")(e.target.value)}
                />
                {isEmailInvalid && <span className="emp-field__error">{emailErrorMessage}</span>}
              </div>

              <div className="emp-field">
                <label className="emp-field__label">Date of Birth</label>
                <input
                  className={`emp-input ${isDobInvalid ? "emp-input--invalid" : ""}`}
                  type="date"
                  max={today}
                  value={form.dob}
                  onChange={(e) => setField("dob")(e.target.value)}
                />
                {isDobInvalid && <span className="emp-field__error">Date of birth cannot be in the future</span>}
              </div>
              <div className="emp-field">
                <label className="emp-field__label">Date of Joining*</label>
                <input
                  className={`emp-input ${isDojInvalid ? "emp-input--invalid" : ""}`}
                  type="date"
                  value={form.doj}
                  onChange={(e) => setField("doj")(e.target.value)}
                />
                {isDojInvalid && <span className="emp-field__error">Date of joining is required</span>}
              </div>

              <div className="emp-field">
                <div className={`emp-phone-group ${isPhoneInvalid ? "emp-input--invalid" : ""}`}>
                  <select
                    className="emp-phone-code"
                    value={form.phoneCountryCode}
                    onChange={(e) => setField("phoneCountryCode")(e.target.value)}
                  >
                    {PHONE_CODES.map((c) => (
                      <option key={c.label} value={c.code}>{c.code}</option>
                    ))}
                  </select>
                  <input
                    className="emp-input emp-phone-input"
                    placeholder="Contact*"
                    value={form.phone}
                    onChange={(e) => setField("phone")(e.target.value.replace(/\D/g, ""))}
                    maxLength={10}
                  />
                </div>
                {isPhoneInvalid && <span className="emp-field__error">{phoneErrorMessage}</span>}
              </div>
              <div className="emp-field">
                <input
                  className="emp-input"
                  placeholder="Address"
                  value={form.address}
                  onChange={(e) => setField("address")(e.target.value)}
                />
              </div>

              <div className="emp-field">
                <select
                  className={`emp-input emp-select ${isGenderInvalid ? "emp-input--invalid" : ""}`}
                  value={form.gender}
                  onChange={(e) => setField("gender")(e.target.value)}
                >
                  <option value="">Gender*</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                {isGenderInvalid && <span className="emp-field__error">Gender is required</span>}
              </div>
              <div className="emp-field">
                <input
                  className="emp-input"
                  placeholder="Designation"
                  value={form.designation}
                  onChange={(e) => setField("designation")(e.target.value)}
                />
              </div>

              <div className="emp-field">
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
                  <span className="emp-field__error">Provide either Hourly Rate or Fixed Salary, not both</span>
                )}
              </div>
              <div className="emp-field">
                <input
                  className={`emp-input ${isFixedSalaryInvalid || isCompensationConflict ? "emp-input--invalid" : ""}`}
                  placeholder="Fixed Salary"
                  type="number"
                  min={0}
                  value={form.fixedSalary}
                  onChange={(e) => setField("fixedSalary")(e.target.value)}
                />
                {isFixedSalaryInvalid && <span className="emp-field__error">Fixed salary must be greater than 0</span>}
              </div>

              <div className="emp-field">
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
            <>
              <div className="emp-login-grid">
                <div className="emp-field">
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
                Set a password so this employee can log in with their email above right away. Leave blank to send an email invite instead — they'll set their own password and get the same permissions once they accept it.
              </p>
            </>
          )}
        </div>

        {/* ── Staff Permissions ── */}
        <div className="emp-card">
          <div className="emp-permissions-header">
            <div className="emp-permissions-header__left">
              <span className="emp-card__title emp-card__title--inline">Staff Permissions</span>
              <label className="emp-toggle">
                <input
                  type="checkbox"
                  checked={permissionsEnabled}
                  onChange={(e) => setPermissionsEnabled(e.target.checked)}
                />
                <span className="emp-toggle__slider" />
              </label>
            </div>
          </div>

          <div className={`emp-permissions-grid ${!permissionsEnabled ? "emp-permissions-grid--disabled" : ""}`}>
            {PERM_CATEGORIES.map((cat) => (
              <div key={cat} className="emp-perm-category">
                <p className="emp-perm-category__title">{cat}</p>
                {perms.filter((p) => p.category === cat).map((perm) => (
                  <label key={perm.key} className="emp-checkbox-row emp-checkbox-row--perm">
                    <input
                      type="checkbox"
                      checked={perm.staff}
                      disabled={!permissionsEnabled}
                      onChange={() => togglePerm(perm.key)}
                    />
                    <span>{perm.label}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddStaffPage;
