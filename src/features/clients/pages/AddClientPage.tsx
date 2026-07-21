import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { Country } from "country-state-city";
import { Camera } from "react-bootstrap-icons";
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/AddClientPage.scss";
import api from "../../../services/api/axios";
import { CLIENT } from "../../../services/api/endpoints";

const PHONE_CODES = Country.getAllCountries()
  .map((c) => ({
    code: c.phonecode.startsWith("+") ? c.phonecode : `+${c.phonecode}`,
    label: `${c.isoCode} (${c.phonecode.startsWith("+") ? c.phonecode : `+${c.phonecode}`})`,
  }))
  .filter((v, i, a) => a.findIndex((t) => t.label === v.label) === i)
  .sort((a, b) => a.label.localeCompare(b.label));

const DOB_PLACEHOLDER_YEAR = 2000;

const AddClientPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = !!id && id !== "add";

  // A client search that finds no match (e.g. calendar's client search) can
  // hand off here with a name or phone already typed — prefill it instead of
  // making staff retype what they just searched for. Add-mode only.
  const prefill = (!isEdit && (location.state as any)) || {};

  const initialForm = {
    firstName: prefill.prefillName?.split(" ")[0] ?? "",
    lastName: prefill.prefillName?.split(" ").slice(1).join(" ") ?? "",
    email: "",
    phone: prefill.prefillPhone ?? "", phoneCountryCode: "+91",
    birthday: "", address: "", gender: "", clientSource: "walk_in",
    additionalEmail: "", additionalPhone: "", additionalPhoneCountryCode: "+91",
    referredByCode: "",
  };
  const [form, setForm] = useState(initialForm);

  // Once a client has a referrer it can't be changed (backend rejects a
  // second referral code), so edit mode shows this read-only instead of the
  // editable code input. Null in add mode, or in edit mode before the record
  // has loaded / if no referrer is set yet.
  const [referredBy, setReferredBy] = useState<{ full_name: string } | null>(null);

  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Snapshot of "nothing entered yet" — for add mode it's the prefilled
  // defaults above; for edit mode it's reset to the fetched record once
  // loaded (see the load() effect below). Close only asks to confirm when
  // the form has actually drifted from this baseline.
  const baselineRef = useRef({ form: initialForm, avatarUrl: "" });
  const isDirty = () =>
    JSON.stringify(form) !== JSON.stringify(baselineRef.current.form) ||
    avatarUrl !== baselineRef.current.avatarUrl;
  const handleCloseClick = () => {
    if (isDirty()) setShowUnsavedDialog(true);
    else navigate("/dashboard/clients/list");
  };

  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [duplicatePhoneMessage, setDuplicatePhoneMessage] = useState<string | null>(null);
  const [duplicateEmailMessage, setDuplicateEmailMessage] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);
  const { showSuccess, showError, overlay } = useStatusOverlay();

  // ── Load existing client (edit mode) ────────────────────────────────────────
  useEffect(() => {
    if (!isEdit) return;

    const load = async () => {
      try {
        setIsLoading(true);
        const res = await api.get(CLIENT.BY_ID(id!));
        const c = res.data?.data || res.data;

        const loaded = {
          firstName: c.first_name || "",
          lastName: c.last_name || "",
          email: c.email || "",
          phone: c.phone_number || "",
          phoneCountryCode: c.phone_country_code || "+91",
          birthday: c.birthday_day_month
            ? `${c.birthday_year || DOB_PLACEHOLDER_YEAR}-${c.birthday_day_month}`
            : "",
          address: c.address || "",
          gender: c.gender || "",
          clientSource: c.client_source || "walk_in",
          additionalEmail: c.additional_email || "",
          additionalPhone: c.additional_phone_number || "",
          additionalPhoneCountryCode: c.additional_phone_country_code || "+91",
          referredByCode: "",
        };
        setForm(loaded);
        setAvatarUrl(c.avatar_url || "");
        setReferredBy(c.referred_by || null);
        // Reset the "unsaved changes" baseline to what was actually loaded —
        // otherwise every edit page would immediately look dirty (compared
        // against the empty add-mode defaults it started with).
        baselineRef.current = { form: loaded, avatarUrl: c.avatar_url || "" };
      } catch (error) {
        console.error("Error fetching client:", error);
        showError("Failed to load client data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [id, isEdit]);

  // ── Field validation ─────────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);

  const isFirstNameInvalid = attemptedSubmit && form.firstName.trim() === "";

  // Optional — only validated for format when the staff actually types something.
  const emailFormatValid = form.email.trim() === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const isEmailInvalid =
    !!duplicateEmailMessage || (attemptedSubmit && form.email.trim() !== "" && !emailFormatValid);
  const emailErrorMessage = duplicateEmailMessage || "Enter a valid email address";

  const isBirthdayInvalid = attemptedSubmit && !!form.birthday && form.birthday > today;

  const isPhoneInvalid =
    !!duplicatePhoneMessage ||
    (attemptedSubmit && (form.phone.trim() === "" || !/^\d{10}$/.test(form.phone.trim())));
  const phoneErrorMessage =
    duplicatePhoneMessage || (form.phone.trim() === "" ? "Phone is required" : "Enter a valid 10-digit phone number");

  const isGenderInvalid = attemptedSubmit && form.gender.trim() === "";

  const isAdditionalEmailInvalid =
    attemptedSubmit && form.additionalEmail.trim() !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.additionalEmail.trim());
  const isAdditionalPhoneInvalid =
    attemptedSubmit && form.additionalPhone.trim() !== "" && !/^\d{10}$/.test(form.additionalPhone.trim());

  const setField = (key: keyof typeof form) => (val: string) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    if (key === "phone" && duplicatePhoneMessage) setDuplicatePhoneMessage(null);
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
      const res = await api.post(CLIENT.UPLOAD_AVATAR, formData, {
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
    setDuplicatePhoneMessage(null);
    setDuplicateEmailMessage(null);

    if (
      form.firstName.trim() === "" || !emailFormatValid ||
      form.phone.trim() === "" || !/^\d{10}$/.test(form.phone.trim()) || isBirthdayInvalid ||
      form.gender.trim() === "" || isAdditionalEmailInvalid || isAdditionalPhoneInvalid
    ) {
      showError("Please fix the highlighted fields");
      return;
    }

    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    try {
      setIsLoading(true);

      // Native date input gives "YYYY-MM-DD" — split into the "MM-DD" the
      // backend stores (birthday_day_month) plus the year separately, so a
      // year-less birthday can still be tracked precisely by day/month.
      let birthday_day_month: string | undefined;
      let birthday_year: number | undefined;
      if (form.birthday) {
        const [y, m, d] = form.birthday.split("-");
        birthday_day_month = `${m}-${d}`;
        birthday_year = Number(y);
      }

      const payload: Record<string, any> = {
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim() || null,
        email: form.email.trim() || null,
        phone_number: form.phone.trim(),
        phone_country_code: form.phoneCountryCode,
        birthday_day_month: birthday_day_month ?? null,
        birthday_year: birthday_year ?? null,
        address: form.address.trim() || null,
        gender: form.gender,
        client_source: form.clientSource || null,
        additional_email: form.additionalEmail.trim() || null,
        additional_phone_number: form.additionalPhone.trim() || null,
        additional_phone_country_code: form.additionalPhone.trim() ? form.additionalPhoneCountryCode : null,
        avatar_url: avatarUrl || null,
      };

      // A referral code can only be applied once — once a client already has
      // a referrer (referredBy set), the field becomes read-only and this is
      // skipped. Otherwise it can be set on create OR on a later edit (the
      // backend still allows it up until the client's first completed payment).
      if (!referredBy && form.referredByCode.trim()) {
        payload.referred_by_code = form.referredByCode.trim().toUpperCase();
      }

      if (isEdit) {
        await api.patch(CLIENT.BY_ID(id!), payload);
      } else {
        await api.post(CLIENT.BASE, payload);
      }

      showSuccess(isEdit ? "Client updated successfully" : "Client added successfully");
      navigate("/dashboard/clients/list");
    } catch (error: any) {
      console.error("Error saving client:", error);
      const status = error?.response?.status ?? error?.status;
      const code = error?.response?.data?.error?.code;
      const serverMessage =
        error?.response?.data?.error?.message || error?.response?.data?.message || error?.message;

      if (status === 409) {
        // code is DUPLICATE_PHONE / DUPLICATE_EMAIL when the service layer's
        // proactive checks catch it; DUPLICATE_ENTRY is the generic fallback
        // from a raw DB unique-constraint violation (error.middleware.ts),
        // where the message text itself says which field — fall back to
        // sniffing it so the right field still gets highlighted either way.
        const isEmailDup = code === "DUPLICATE_EMAIL" || (code === "DUPLICATE_ENTRY" && /email/i.test(serverMessage || ""));
        if (isEmailDup) {
          setDuplicateEmailMessage(serverMessage || "This email address is already registered. Please use a different email address.");
        } else {
          setDuplicatePhoneMessage(serverMessage || "A client with this phone number already exists.");
        }
      } else if (status === 401) {
        showError("Your session has expired. Please log in again.");
      } else {
        showError(serverMessage || "Failed to save client");
      }
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const displayInitials = form.firstName.trim() ? form.firstName.trim()[0].toUpperCase() : "?";

  return (
    <div className="add-client">
      {overlay}
      <div className="add-client__header">
        <h5 className="add-client__header-title">{isEdit ? "Edit Client" : "Add Client"}</h5>
        <div className="add-client__header-actions">
          <button className="btn add-client__btn-close" onClick={handleCloseClick}>
            Close
          </button>
          <button className="btn add-client__btn-add" onClick={handleSave} disabled={isLoading}>
            {isLoading && <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />}
            {isLoading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {showUnsavedDialog && (
        <div className="add-client__dialog-overlay">
          <div className="add-client__dialog">
            <button className="add-client__dialog-close" onClick={() => setShowUnsavedDialog(false)}>&times;</button>
            <h5 className="add-client__dialog-title">Unsaved changes</h5>
            <p className="add-client__dialog-desc">You have unsaved changes. Are you sure you want to leave?</p>
            <div className="add-client__dialog-actions">
              <button className="btn add-client__dialog-btn add-client__dialog-btn--cancel" onClick={() => setShowUnsavedDialog(false)}>
                Cancel
              </button>
              <button className="btn add-client__dialog-btn add-client__dialog-btn--discard" onClick={() => navigate("/dashboard/clients/list")}>
                Discard changes
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="cli-page">
        {/* ── Details + Profile Photo ── */}
        <div className="cli-top-row">
          <div className="cli-card cli-details-card">
            <h6 className="cli-card__title">Details</h6>
            <div className="cli-details-grid">
              <div className="cli-field">
                <input
                  className={`cli-input ${isFirstNameInvalid ? "cli-input--invalid" : ""}`}
                  placeholder="First name*"
                  value={form.firstName}
                  onChange={(e) => setField("firstName")(e.target.value)}
                />
                {isFirstNameInvalid && <span className="cli-field__error">First name is required</span>}
              </div>
              <div className="cli-field">
                <input
                  className="cli-input"
                  placeholder="Last name"
                  value={form.lastName}
                  onChange={(e) => setField("lastName")(e.target.value)}
                />
              </div>

              <div className="cli-field">
                <input
                  className={`cli-input ${isEmailInvalid ? "cli-input--invalid" : ""}`}
                  placeholder="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setField("email")(e.target.value)}
                />
                {isEmailInvalid && <span className="cli-field__error">{emailErrorMessage}</span>}
              </div>
              <div className="cli-field">
                <div className={`cli-phone-group ${isPhoneInvalid ? "cli-input--invalid" : ""}`}>
                  <select
                    className="cli-phone-code"
                    value={form.phoneCountryCode}
                    onChange={(e) => setField("phoneCountryCode")(e.target.value)}
                  >
                    {PHONE_CODES.map((c) => (
                      <option key={c.label} value={c.code}>{c.code}</option>
                    ))}
                  </select>
                  <input
                    className="cli-input cli-phone-input"
                    placeholder="Phone*"
                    value={form.phone}
                    onChange={(e) => setField("phone")(e.target.value.replace(/\D/g, ""))}
                    maxLength={10}
                  />
                </div>
                {isPhoneInvalid && <span className="cli-field__error">{phoneErrorMessage}</span>}
              </div>

              <div className="cli-field">
                <label className="cli-field__label">Gender</label>
                <select
                  className={`cli-input cli-select ${isGenderInvalid ? "cli-input--invalid" : ""}`}
                  value={form.gender}
                  onChange={(e) => setField("gender")(e.target.value)}
                >
                  <option value="">Select gender*</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
                {isGenderInvalid && <span className="cli-field__error">Gender is required</span>}
              </div>
              <div className="cli-field">
                <label className="cli-field__label">Address</label>
                <input
                  className="cli-input"
                  placeholder="Address"
                  value={form.address}
                  onChange={(e) => setField("address")(e.target.value)}
                />
              </div>

              <div className="cli-field">
                <label className="cli-field__label">Birthday</label>
                <input
                  className={`cli-input ${isBirthdayInvalid ? "cli-input--invalid" : ""}`}
                  type="date"
                  max={today}
                  value={form.birthday}
                  onChange={(e) => setField("birthday")(e.target.value)}
                />
                {isBirthdayInvalid && <span className="cli-field__error">Birthday cannot be in the future</span>}
              </div>

              <div className="cli-field">
                <label className="cli-field__label">Client source</label>
                <select
                  className="cli-input cli-select"
                  value={form.clientSource}
                  onChange={(e) => setField("clientSource")(e.target.value)}
                >
                  <option value="walk_in">Walk-in</option>
                  <option value="instagram">Instagram</option>
                  <option value="google">Google</option>
                </select>
              </div>
              <div className="cli-field">
                <label className="cli-field__label">Referred by</label>
                {referredBy ? (
                  <input className="cli-input" value={referredBy.full_name} disabled readOnly />
                ) : (
                  <input
                    className="cli-input text-uppercase"
                    placeholder="e.g. NIS1126"
                    value={form.referredByCode}
                    onChange={(e) => setField("referredByCode")(e.target.value.toUpperCase())}
                    maxLength={20}
                  />
                )}
              </div>

              <div className="cli-field">
                <input
                  className={`cli-input ${isAdditionalEmailInvalid ? "cli-input--invalid" : ""}`}
                  placeholder="Additional email"
                  type="email"
                  value={form.additionalEmail}
                  onChange={(e) => setField("additionalEmail")(e.target.value)}
                />
                {isAdditionalEmailInvalid && <span className="cli-field__error">Enter a valid email address</span>}
              </div>
              <div className="cli-field">
                <div className={`cli-phone-group ${isAdditionalPhoneInvalid ? "cli-input--invalid" : ""}`}>
                  <select
                    className="cli-phone-code"
                    value={form.additionalPhoneCountryCode}
                    onChange={(e) => setField("additionalPhoneCountryCode")(e.target.value)}
                  >
                    {PHONE_CODES.map((c) => (
                      <option key={c.label} value={c.code}>{c.code}</option>
                    ))}
                  </select>
                  <input
                    className="cli-input cli-phone-input"
                    placeholder="Additional phone"
                    value={form.additionalPhone}
                    onChange={(e) => setField("additionalPhone")(e.target.value.replace(/\D/g, ""))}
                    maxLength={10}
                  />
                </div>
                {isAdditionalPhoneInvalid && <span className="cli-field__error">Enter a valid 10-digit phone number</span>}
              </div>
            </div>
          </div>

          <div className="cli-card cli-photo-card">
            <h6 className="cli-card__title">Profile Photo</h6>
            <div className="cli-photo-box" onClick={handleAvatarPick}>
              {avatarPreview || avatarUrl ? (
                <img src={avatarPreview || avatarUrl} alt="Profile" className="cli-photo-preview" />
              ) : (
                <span className="cli-photo-placeholder">{displayInitials}</span>
              )}
              <div className="cli-photo-camera">
                <Camera size={16} />
              </div>
              {avatarUploading && <div className="cli-photo-uploading">Uploading...</div>}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif"
              className="cli-hidden-input"
              onChange={handleAvatarChange}
            />
            <p className="cli-photo-hint">Accepted formats: PNG, GIF or JPG. Maximum file size is 2.0MB.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddClientPage;
