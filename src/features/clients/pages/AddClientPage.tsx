import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { Camera, InfoCircle } from "react-bootstrap-icons";
import { State } from "country-state-city";
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/AddClientPage.scss";
import api from "../../../services/api/axios";
import { CLIENT } from "../../../services/api/endpoints";
import CountryCodeSelect from "../components/CountryCodeSelect";
import Dropdown from "../../../components/ui/Dropdown";
import { DatePicker } from "../../../components/ui";
import Tabs from "../../../components/ui/Tabs";
import ClientSearchInput, { type ClientSearchResult } from "../components/ClientSearchInput";
import { toTitleCase } from "../../../utils/titleCase";

const DOB_PLACEHOLDER_YEAR = 2000;

// Some client records were stored with the country code baked into the phone
// number itself (e.g. "919876543210") instead of split out into its own
// country-code field. Strip it back off on load so the field — and whatever
// gets saved back — always holds just the plain 10-digit number.
function stripCountryCode(rawPhone: string, countryCode: string): string {
  const digitsOnly = rawPhone.replace(/\D/g, "");
  const codeDigits = countryCode.replace(/\D/g, "");
  if (codeDigits && digitsOnly.length > 10 && digitsOnly.startsWith(codeDigits)) {
    return digitsOnly.slice(codeDigits.length);
  }
  return digitsOnly.length > 10 ? digitsOnly.slice(-10) : digitsOnly;
}

const GENDER_OPTIONS = [
  { id: "Female", name: "Female" },
  { id: "Male", name: "Male" },
  { id: "Other", name: "Other" },
];

const CLIENT_SOURCE_OPTIONS = [
  { id: "walk_in", name: "Walk-in" },
  { id: "instagram", name: "Instagram" },
  { id: "google", name: "Google" },
];

// Distinct from Client Source above — Lead Source tracks how a prospective
// client first reached out (for lead-conversion tracking), separate from the
// walk-in/instagram/google channel Client Source already records.
const LEAD_SOURCE_OPTIONS = [
  { id: "referral", name: "Referral" },
  { id: "walk_in", name: "Walk-in" },
  { id: "instagram", name: "Instagram" },
  { id: "facebook", name: "Facebook" },
  { id: "google", name: "Google" },
  { id: "website", name: "Website" },
  { id: "phone_enquiry", name: "Phone Enquiry" },
  { id: "other", name: "Other" },
];

const INDIA_STATE_OPTIONS = State.getStatesOfCountry("IN").map((s) => ({ id: s.isoCode, name: s.name }));

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
    phone: prefill.prefillPhone ?? "", phoneCountryCode: "+91", hasWhatsapp: true,
    birthday: "", anniversary: "", address: "", gender: "", clientSource: "walk_in",
    additionalPhone: "", additionalPhoneCountryCode: "+91",
    referredByCode: "",
    // Business / identification
    gstNumber: "", state: "", zipCode: "", clientCode: "", identificationNumber: "",
    // Communication preferences — Promotion defaults all-on (matches the
    // DINGG reference); Transaction mirrors the DB columns' own defaults.
    smsMarketing: true, emailMarketing: true, whatsappMarketing: true,
    smsNotifications: true, emailNotifications: true, whatsappNotifications: false,
    // Lead / referral
    leadSource: "", sourceDescription: "",
    // Credit
    creditLimit: "", creditDuration: "",
  };
  const [form, setForm] = useState(initialForm);

  // Once a client has a referrer it can't be changed (backend rejects a
  // second referral code), so edit mode shows this read-only instead of the
  // editable code input. Null in add mode, or in edit mode before the record
  // has loaded / if no referrer is set yet.
  const [referredBy, setReferredBy] = useState<{ full_name: string } | null>(null);

  // Live resolution of the typed referral code → whose code it is, shown in
  // green under the field so staff can confirm the referrer before saving.
  const [referralLookup, setReferralLookup] = useState<{
    status: "idle" | "loading" | "found" | "notfound";
    name?: string;
  }>({ status: "idle" });

  // ── Customer Referral toggle + Referral Code / Search-by-Name-Mobile tabs ──
  // Both tabs converge on the same form.referredByCode field the existing
  // debounced lookup effect above already watches — search just resolves a
  // picked client's own referral_code and writes it there, so handleSave()'s
  // payload logic needs no changes at all for the new tab.
  const [referralEnabled, setReferralEnabled] = useState(false);
  const [referralTab, setReferralTab] = useState<"code" | "search">("code");
  const [referralSearchQuery, setReferralSearchQuery] = useState("");
  const [referralSearchSelected, setReferralSearchSelected] = useState<{ id: string; name: string } | null>(null);
  const [referralSearchLoading, setReferralSearchLoading] = useState(false);

  const handleReferralSearchPick = async (picked: ClientSearchResult) => {
    setReferralSearchLoading(true);
    try {
      const res = await api.get(CLIENT.BY_ID(String(picked.id)));
      const full = res.data?.data ?? res.data;
      const name = `${picked.first_name} ${picked.last_name ?? ""}`.trim();
      if (full?.referral_code) {
        setField("referredByCode")(String(full.referral_code).toUpperCase());
        setReferralSearchSelected({ id: String(picked.id), name });
      } else {
        showError(`${name} doesn't have a referral code yet.`);
      }
    } catch {
      showError("Couldn't load that client's referral details.");
    } finally {
      setReferralSearchLoading(false);
    }
  };

  const clearReferralSearchSelection = () => {
    setReferralSearchSelected(null);
    setReferralSearchQuery("");
    setField("referredByCode")("");
  };

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

        const phoneCountryCode = c.phone_country_code || "+91";
        const additionalPhoneCountryCode = c.additional_phone_country_code || "+91";
        const loaded = {
          firstName: c.first_name || "",
          lastName: c.last_name || "",
          email: c.email || "",
          phone: stripCountryCode(c.phone_number || "", phoneCountryCode),
          phoneCountryCode,
          hasWhatsapp: c.has_whatsapp ?? true,
          birthday: c.birthday_day_month
            ? `${c.birthday_year || DOB_PLACEHOLDER_YEAR}-${c.birthday_day_month}`
            : "",
          anniversary: c.anniversary ? String(c.anniversary).slice(0, 10) : "",
          address: c.address || "",
          gender: c.gender || "",
          clientSource: c.client_source || "walk_in",
          additionalPhone: stripCountryCode(c.additional_phone_number || "", additionalPhoneCountryCode),
          additionalPhoneCountryCode,
          referredByCode: "",
          gstNumber: c.gst_number || "",
          state: c.state || "",
          zipCode: c.pincode || "",
          clientCode: c.client_code || "",
          identificationNumber: c.identification_number || "",
          smsMarketing: c.sms_marketing ?? true,
          emailMarketing: c.email_marketing ?? true,
          whatsappMarketing: c.whatsapp_marketing ?? true,
          smsNotifications: c.sms_notifications ?? true,
          emailNotifications: c.email_notifications ?? true,
          whatsappNotifications: c.whatsapp_notifications ?? false,
          leadSource: c.lead_source || "",
          sourceDescription: c.source_description || "",
          creditLimit: c.credit_limit != null ? String(c.credit_limit) : "",
          creditDuration: c.credit_duration_days != null ? String(c.credit_duration_days) : "",
        };
        setForm(loaded);
        setAvatarUrl(c.avatar_url || "");
        setReferredBy(c.referred_by || null);
        setReferralEnabled(!!c.referred_by);
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

  // ── Live "Referred by" resolution ────────────────────────────────────────────
  // Debounced lookup of the typed code → the referrer's name. Skipped once a
  // referrer is already locked in (edit mode), since the code can't change then.
  useEffect(() => {
    if (referredBy) return;
    const code = form.referredByCode.trim();
    if (!code) { setReferralLookup({ status: "idle" }); return; }
    setReferralLookup({ status: "loading" });
    const t = setTimeout(async () => {
      try {
        const res = await api.get(CLIENT.REFERRAL_LOOKUP(code));
        const data = res.data?.data ?? res.data;
        setReferralLookup(data?.full_name
          ? { status: "found", name: data.full_name }
          : { status: "notfound" });
      } catch {
        setReferralLookup({ status: "notfound" });
      }
    }, 400);
    return () => clearTimeout(t);
  }, [form.referredByCode, referredBy]);

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
    duplicatePhoneMessage || (form.phone.trim() === "" ? "Phone number is required" : "Enter a valid 10-digit phone number");

  const isGenderInvalid = attemptedSubmit && form.gender.trim() === "";

  // Optional — same GSTIN format the backend enforces, validated inline only
  // once something's been typed (empty is always valid/unrestricted).
  const GSTIN_FORMAT_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
  const gstFormatValid = form.gstNumber.trim() === "" || GSTIN_FORMAT_RE.test(form.gstNumber.trim().toUpperCase());
  const isGstInvalid = attemptedSubmit && form.gstNumber.trim() !== "" && !gstFormatValid;

  // The additional mobile can't duplicate the primary one (SCRUM-1087) —
  // compared with country code so the same digits under different codes aren't
  // wrongly flagged. Shown inline as soon as they match, not only on submit.
  const isAdditionalPhoneDuplicate =
    form.additionalPhone.trim() !== "" &&
    `${form.phoneCountryCode}${form.phone.trim()}` ===
      `${form.additionalPhoneCountryCode}${form.additionalPhone.trim()}`;
  const isAdditionalPhoneInvalid =
    (attemptedSubmit && form.additionalPhone.trim() !== "" && !/^\d{10}$/.test(form.additionalPhone.trim())) ||
    isAdditionalPhoneDuplicate;
  const additionalPhoneErrorMessage = isAdditionalPhoneDuplicate
    ? "Additional mobile must be different from the primary mobile"
    : "Enter a valid 10-digit phone number";

  const setField = <K extends keyof typeof initialForm>(key: K) => (val: (typeof initialForm)[K]) => {
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
      form.phone.trim() === "" || !/^\d{10}$/.test(form.phone.trim()) ||
      (!!form.birthday && form.birthday > today) ||
      form.gender.trim() === "" ||
      (form.additionalPhone.trim() !== "" && !/^\d{10}$/.test(form.additionalPhone.trim())) ||
      isAdditionalPhoneDuplicate ||
      !gstFormatValid
    ) {
      // No error overlay/modal — attemptedSubmit is set above, so the invalid
      // fields highlight inline with their own messages (SCRUM-1083).
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
        first_name: toTitleCase(form.firstName.trim()),
        last_name: form.lastName.trim() ? toTitleCase(form.lastName.trim()) : null,
        email: form.email.trim() || null,
        phone_number: form.phone.trim(),
        phone_country_code: form.phoneCountryCode,
        birthday_day_month: birthday_day_month ?? null,
        birthday_year: birthday_year ?? null,
        anniversary: form.anniversary || null,
        address: form.address.trim() || null,
        gender: form.gender,
        client_source: form.clientSource || null,
        additional_phone_number: form.additionalPhone.trim() || null,
        additional_phone_country_code: form.additionalPhone.trim() ? form.additionalPhoneCountryCode : null,
        avatar_url: avatarUrl || null,
        has_whatsapp: form.hasWhatsapp,
        gst_number: form.gstNumber.trim() ? form.gstNumber.trim().toUpperCase() : null,
        state: form.state || null,
        pincode: form.zipCode.trim() || null,
        client_code: form.clientCode.trim() || null,
        identification_number: form.identificationNumber.trim() || null,
        sms_marketing: form.smsMarketing,
        email_marketing: form.emailMarketing,
        whatsapp_marketing: form.whatsappMarketing,
        sms_notifications: form.smsNotifications,
        email_notifications: form.emailNotifications,
        whatsapp_notifications: form.whatsappNotifications,
        lead_source: form.leadSource || null,
        source_description: form.sourceDescription.trim() || null,
        credit_limit: form.creditLimit.trim() ? Number(form.creditLimit) : 0,
        credit_duration_days: form.creditDuration.trim() ? Number(form.creditDuration) : 0,
      };

      // A referral code can only be applied once — once a client already has
      // a referrer (referredBy set), the field becomes read-only and this is
      // skipped. Otherwise it can be set on create OR on a later edit (the
      // backend still allows it up until the client's first completed payment).
      // Only sent while the toggle is actually on — switching Customer
      // Referral off (with nothing picked) must never submit a stale code.
      if (!referredBy && referralEnabled && form.referredByCode.trim()) {
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
      // api.ts's response interceptor already unwraps every non-2xx response
      // into a plain ApiError { status, message, code } — it never reaches
      // this catch as a raw Axios error with a `.response` property. Reading
      // error.response.* here always resolved to undefined, so `code` could
      // never be DUPLICATE_EMAIL/DUPLICATE_PHONE — every 409 silently fell
      // through to the phone branch regardless of which field actually
      // collided, mislabeling the field and showing the wrong inline error.
      const status = error?.status;
      const code = error?.code;
      const serverMessage = error?.message;

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
                <label className="cli-field__label">
                  First name <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  className={`cli-input ${isFirstNameInvalid ? "cli-input--invalid" : ""}`}
                  placeholder="First name"
                  value={form.firstName}
                  onChange={(e) => setField("firstName")(e.target.value)}
                />
                {isFirstNameInvalid && <span className="cli-field__error">First name is required</span>}
              </div>
              <div className="cli-field">
                <label className="cli-field__label">Last name</label>
                <input
                  className="cli-input"
                  placeholder="Last name"
                  value={form.lastName}
                  onChange={(e) => setField("lastName")(e.target.value)}
                />
              </div>

              <div className="cli-field">
                <label className="cli-field__label">Email</label>
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
                <label className="cli-field__label">
                  Phone <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <div className={`cli-phone-group ${isPhoneInvalid ? "cli-input--invalid" : ""}`}>
                  <CountryCodeSelect
                    value={form.phoneCountryCode}
                    onChange={(code) => setField("phoneCountryCode")(code)}
                  />
                  <input
                    className="cli-input cli-phone-input"
                    placeholder="Phone"
                    value={form.phone}
                    onChange={(e) => setField("phone")(e.target.value.replace(/\D/g, ""))}
                    maxLength={10}
                  />
                </div>
                {isPhoneInvalid && <span className="cli-field__error">{phoneErrorMessage}</span>}
                <label className="cli-toggle-row cli-toggle-row--compact">
                  <div className="cli-toggle-content">
                    <span className="cli-toggle-label">Available on WhatsApp</span>
                  </div>
                  <div className="cli-toggle-switch">
                    <input
                      type="checkbox"
                      checked={form.hasWhatsapp}
                      onChange={(e) => setField("hasWhatsapp")(e.target.checked)}
                    />
                    <span className="cli-slider" />
                  </div>
                </label>
              </div>

              <div className="cli-field">
                <label className="cli-field__label">
                  Gender <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <Dropdown
                  value={form.gender}
                  onChange={(val) => setField("gender")(val)}
                  options={GENDER_OPTIONS}
                  placeholder="Select gender"
                  className={`cli-input ${isGenderInvalid ? "cli-input--invalid" : ""}`}
                />
                {isGenderInvalid && <span className="cli-field__error">Gender is required</span>}
              </div>
              <div className="cli-field">
                <label className="cli-field__label">Client source</label>
                <Dropdown
                  value={form.clientSource}
                  onChange={(val) => setField("clientSource")(val)}
                  options={CLIENT_SOURCE_OPTIONS}
                  placeholder="Select source"
                  className="cli-input"
                />
              </div>

              <div className="cli-section-divider cli-field--full">Personal Dates</div>

              <div className="cli-field">
                <label className="cli-field__label">Birthday</label>
                <DatePicker
                  max={today}
                  value={form.birthday}
                  onChange={setField("birthday")}
                />
                {isBirthdayInvalid && <span className="cli-field__error">Birthday cannot be in the future</span>}
              </div>

              <div className="cli-field">
                <label className="cli-field__label">Anniversary</label>
                <DatePicker
                  value={form.anniversary}
                  onChange={setField("anniversary")}
                />
              </div>

              <div className="cli-section-divider cli-field--full">Business / Identification Details</div>

              <div className="cli-field">
                <label className="cli-field__label">GST Number</label>
                <input
                  className={`cli-input ${isGstInvalid ? "cli-input--invalid" : ""}`}
                  placeholder="GST Number"
                  value={form.gstNumber}
                  onChange={(e) => setField("gstNumber")(e.target.value.toUpperCase())}
                  maxLength={15}
                />
                {isGstInvalid && <span className="cli-field__error">Enter a valid 15-character GSTIN</span>}
              </div>
              <div className="cli-field">
                <label className="cli-field__label">State</label>
                <Dropdown
                  value={form.state}
                  onChange={(val) => setField("state")(val)}
                  options={INDIA_STATE_OPTIONS}
                  placeholder="Select state"
                  className="cli-input"
                />
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
                <label className="cli-field__label">Zip Code</label>
                <input
                  className="cli-input"
                  placeholder="Enter Zip Code"
                  value={form.zipCode}
                  onChange={(e) => setField("zipCode")(e.target.value.replace(/\D/g, ""))}
                  maxLength={10}
                />
              </div>

              <div className="cli-field">
                <label className="cli-field__label">Client Code</label>
                <input
                  className="cli-input"
                  placeholder="Client Code"
                  value={form.clientCode}
                  onChange={(e) => setField("clientCode")(e.target.value)}
                />
              </div>
              <div className="cli-field">
                <label className="cli-field__label">Identification No.</label>
                <input
                  className="cli-input"
                  placeholder="Resident No. or Any ID"
                  value={form.identificationNumber}
                  onChange={(e) => setField("identificationNumber")(e.target.value)}
                />
              </div>

              <div className="cli-section-divider cli-field--full">Communication Preferences</div>

              <div className="cli-field--full cli-checkbox-groups">
                {(
                  [
                    { title: "Promotion", keys: { sms: "smsMarketing", email: "emailMarketing", whatsapp: "whatsappMarketing" } as const },
                    { title: "Transaction", keys: { sms: "smsNotifications", email: "emailNotifications", whatsapp: "whatsappNotifications" } as const },
                  ] as const
                ).map((group) => (
                  <div className="cli-checkbox-group" key={group.title}>
                    <span className="cli-checkbox-group__title">{group.title}</span>
                    {(
                      [
                        { channel: "sms" as const, label: "SMS" },
                        { channel: "email" as const, label: "Email" },
                        { channel: "whatsapp" as const, label: "Whatsapp" },
                      ]
                    ).map(({ channel, label }) => {
                      const key = group.keys[channel];
                      return (
                        <label className="cli-checkbox" key={channel}>
                          <input
                            type="checkbox"
                            checked={form[key]}
                            onChange={(e) => setField(key)(e.target.checked)}
                          />
                          {label}
                        </label>
                      );
                    })}
                  </div>
                ))}
              </div>

              <div className="cli-section-divider cli-field--full">Lead / Referral</div>

              <div className="cli-field">
                <label className="cli-field__label">Lead Source</label>
                <Dropdown
                  value={form.leadSource}
                  onChange={(val) => setField("leadSource")(val)}
                  options={LEAD_SOURCE_OPTIONS}
                  placeholder="Select"
                  className="cli-input"
                />
              </div>
              <div className="cli-field">
                <label className="cli-field__label">Source Desc</label>
                <textarea
                  className="cli-input cli-textarea"
                  placeholder="Source Description"
                  value={form.sourceDescription}
                  onChange={(e) => setField("sourceDescription")(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="cli-field--full">
                <label className="cli-toggle-row">
                  <div className="cli-toggle-content">
                    <span className="cli-toggle-label">Customer Referral</span>
                    <span className="cli-toggle-hint">This client was referred by an existing customer</span>
                  </div>
                  <div className="cli-toggle-switch">
                    <input
                      type="checkbox"
                      checked={referralEnabled}
                      disabled={!!referredBy}
                      onChange={(e) => {
                        setReferralEnabled(e.target.checked);
                        if (!e.target.checked) {
                          setReferralTab("code");
                          setField("referredByCode")("");
                          clearReferralSearchSelection();
                        }
                      }}
                    />
                    <span className="cli-slider" />
                  </div>
                </label>

                {referralEnabled && (
                  referredBy ? (
                    <input className="cli-input" value={referredBy.full_name} disabled readOnly />
                  ) : (
                    <div className="cli-referral-panel">
                      <Tabs
                        tabs={[
                          { key: "code", label: "Referral Code" },
                          { key: "search", label: "Search by Name/Mobile" },
                        ]}
                        activeKey={referralTab}
                        onChange={(k) => setReferralTab(k as "code" | "search")}
                        variant="pill"
                      />

                      {referralTab === "code" ? (
                        <div className="cli-referral-panel__body">
                          <input
                            className="cli-input text-uppercase"
                            placeholder="e.g. REF-A7XM3X9P"
                            value={form.referredByCode}
                            onChange={(e) => {
                              // Typing a code directly overrides whatever the
                              // Search tab may have resolved earlier — clear
                              // its stale "selected" chip so switching back
                              // to that tab doesn't show a mismatched name.
                              if (referralSearchSelected) setReferralSearchSelected(null);
                              setField("referredByCode")(e.target.value.toUpperCase());
                            }}
                            maxLength={20}
                          />
                          {referralLookup.status === "found" && (
                            <span className="cli-field__hint" style={{ color: "#16a34a", fontWeight: 600 }}>
                              Referred by {referralLookup.name}
                            </span>
                          )}
                          {referralLookup.status === "notfound" && form.referredByCode.trim() !== "" && (
                            <span className="cli-field__error">No client found for this referral code</span>
                          )}
                        </div>
                      ) : (
                        <div className="cli-referral-panel__body">
                          {referralSearchSelected ? (
                            <div className="cli-referral-selected">
                              <span className="cli-referral-selected__avatar">
                                {referralSearchSelected.name[0]?.toUpperCase() ?? "?"}
                              </span>
                              <span className="cli-referral-selected__name">{referralSearchSelected.name}</span>
                              <button type="button" onClick={clearReferralSearchSelection} aria-label="Clear selection">
                                &times;
                              </button>
                            </div>
                          ) : (
                            <ClientSearchInput
                              value={referralSearchQuery}
                              onChange={setReferralSearchQuery}
                              placeholder="Search by name or mobile number"
                              onSelect={handleReferralSearchPick}
                            />
                          )}
                          {referralSearchLoading && <span className="cli-field__hint">Loading referrer…</span>}
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>

              <div className="cli-section-divider cli-field--full">Credit</div>

              <div className="cli-field">
                <label className="cli-field__label">
                  Credit Limit
                  <span title="Maximum unpaid balance this client can carry"><InfoCircle size={12} /></span>
                </label>
                <input
                  className="cli-input"
                  placeholder="Credit Limit"
                  type="number"
                  min="0"
                  value={form.creditLimit}
                  onChange={(e) => setField("creditLimit")(e.target.value)}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                />
              </div>
              <div className="cli-field">
                <label className="cli-field__label">
                  Credit Duration
                  <span title="Number of days this client has to clear a due balance"><InfoCircle size={12} /></span>
                </label>
                <input
                  className="cli-input"
                  placeholder="Credit Duration"
                  type="number"
                  min="0"
                  value={form.creditDuration}
                  onChange={(e) => setField("creditDuration")(e.target.value)}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                />
              </div>

              <div className="cli-field">
                <label className="cli-field__label">Additional mobile</label>
                <div className={`cli-phone-group ${isAdditionalPhoneInvalid ? "cli-input--invalid" : ""}`}>
                  <CountryCodeSelect
                    value={form.additionalPhoneCountryCode}
                    onChange={(code) => setField("additionalPhoneCountryCode")(code)}
                  />
                  <input
                    className="cli-input cli-phone-input"
                    placeholder="Additional phone"
                    value={form.additionalPhone}
                    onChange={(e) => setField("additionalPhone")(e.target.value.replace(/\D/g, ""))}
                    maxLength={10}
                  />
                </div>
                {isAdditionalPhoneInvalid && <span className="cli-field__error">{additionalPhoneErrorMessage}</span>}
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
