import { useNavigate, useLocation } from "react-router-dom";
import { useRef, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/AddClientPage.scss";
import api from "../../../services/api/axios";
import { CLIENT } from "../../../services/api/endpoints";
import { Person, Pencil, X } from "react-bootstrap-icons";
import { Country } from "country-state-city";
import { Button } from "../../../components/ui";

import { useClientWizard } from "../context/ClientWizardContext";

const PHONE_CODES = Country.getAllCountries()
  .map((c) => ({
    code: c.phonecode.startsWith("+") ? c.phonecode : `+${c.phonecode}`,
    label: `${c.isoCode} (${c.phonecode.startsWith("+") ? c.phonecode : `+${c.phonecode}`})`,
  }))
  .filter((v, i, a) => a.findIndex((t) => t.label === v.label) === i)
  .sort((a, b) => a.label.localeCompare(b.label));

export default function AddClientPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { resetWizard } = useClientWizard();

  const prefill = (location.state as any) ?? {};

  // Individual states for form inputs
  const [firstName, setFirstName] = useState(prefill.prefillName?.split(" ")[0] ?? "");
  const [lastName, setLastName] = useState(prefill.prefillName?.split(" ").slice(1).join(" ") ?? "");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(prefill.prefillPhone ?? "");
  const [birthday, setBirthday] = useState("");
  const [year, setYear] = useState("");
  const [gender, setGender] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [occupation, setOccupation] = useState("");
  const [additionalEmail, setAdditionalEmail] = useState("");
  const [additionalPhone, setAdditionalPhone] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+91");
  const [additionalPhoneCountryCode, setAdditionalPhoneCountryCode] = useState("+91");
  const [clientSource, setClientSource] = useState("walk_in");
  const [preferredLanguage, setPreferredLanguage] = useState("en");
  const [country, setCountry] = useState("IN");

  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isFirstNameInvalid = attemptedSubmit && firstName.trim() === "";
  const isEmailInvalid =
    attemptedSubmit &&
    (email.trim() === "" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()));
  const isPhoneInvalid =
    attemptedSubmit &&
    (phone.trim() === "" || !/^\d{10}$/.test(phone.trim()));
  const isAdditionalEmailInvalid =
    attemptedSubmit &&
    additionalEmail.trim() !== "" &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(additionalEmail.trim());
  const isAdditionalPhoneInvalid =
    attemptedSubmit &&
    additionalPhone.trim() !== "" &&
    !/^\d{10}$/.test(additionalPhone.trim());

  const hasErrors =
    isFirstNameInvalid ||
    isEmailInvalid ||
    isPhoneInvalid ||
    isAdditionalEmailInvalid ||
    isAdditionalPhoneInvalid;

  const handleSave = async () => {
    if (saving) return;
    setServerError(null);
    setAttemptedSubmit(true);
    if (
      firstName.trim() === "" ||
      email.trim() === "" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      phone.trim() === "" ||
      !/^\d{10}$/.test(phone.trim()) ||
      (additionalEmail.trim() !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(additionalEmail.trim())) ||
      (additionalPhone.trim() !== "" && !/^\d{10}$/.test(additionalPhone.trim()))
    ) {
      return;
    }

    setSaving(true);
    const payload = {
      first_name: firstName,
      last_name: lastName || null,
      email: email || null,
      phone_number: phone || null,
      phone_country_code: phoneCountryCode || null,
      birthday_day_month: birthday || null,
      birthday_year: year ? Number(year) : null,
      gender: gender || null,
      pronouns: pronouns || null,
      occupation: occupation || null,
      additional_email: additionalEmail || null,
      additional_phone_number: additionalPhone || null,
      additional_phone_country_code: additionalPhoneCountryCode || null,
      client_source: clientSource || null,
      preferred_language: preferredLanguage || null,
      country: country || null,
      addresses: [],
      emergency_contacts: [],
    };

    try {
      await api.post(CLIENT.BASE, payload);
      resetWizard();
      navigate("/dashboard/clients/list");
    } catch (error: any) {
      const msg =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        "Failed to save client. Please try again.";
      setServerError(msg);
      setSaving(false);
    }
  };

  return (
    <div className="container-fluid p-4 bg-white position-relative">
      {/* ERROR TOAST */}
      {(hasErrors || serverError) && (
        <div
          className="position-fixed d-flex align-items-center justify-content-between rounded-pill shadow-sm"
          style={{
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#E20030",
            color: "white",
            zIndex: 1050,
            padding: "8px 16px",
            fontSize: "14px",
            fontWeight: "500",
            minWidth: "280px",
            maxWidth: "480px",
          }}
        >
          <span>
            {serverError || "Please fix the errors below before saving"}
          </span>
          <X
            size={20}
            className="ms-3"
            style={{ cursor: "pointer", flexShrink: 0 }}
            onClick={() => { setAttemptedSubmit(false); setServerError(null); }}
          />
        </div>
      )}

      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4 mt-3">
        <h2 className="fw-bold">Add a new client</h2>

        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-secondary"
            onClick={() => navigate("/dashboard/clients/list")}
          >
            Close
          </button>

          <Button
            variant="dark"
            onClick={handleSave}
            loading={saving}
          >
            Save
          </Button>
        </div>
      </div>

      <div className="row">
        {/* LEFT SIDEBAR */}
        <div className="col-md-3">
          <div className="card p-3">
            <h6 className="fw-bold mb-3">Personal</h6>

            <div className="list-group">
              <button className="list-group-item list-group-item-action active d-flex justify-content-between align-items-center">
                Profile
                {hasErrors && (
                  <span className="text-danger-dot">●</span>
                )}
              </button>

              <button
                className="list-group-item list-group-item-action"
                onClick={() => navigate("/dashboard/clients/addresses")}
              >
                Addresses
              </button>

              <button
                className="list-group-item list-group-item-action"
                onClick={() => navigate("/dashboard/clients/emergency")}
              >
                Emergency contacts
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT FORM */}
        <div className="col-md-9">
          {/* PROFILE SECTION */}
          <h5 className="fw-bold mb-3">Profile</h5>

          <p className="text-muted">Manage your client’s personal profile</p>

          <div className="d-flex align-items-center mb-4 mt-3">
            <div className="profile-image-upload position-relative d-inline-block">
              <input
                type="file"
                ref={fileInputRef}
                className="d-none"
                accept="image/*"
              />
              <div
                className="profile-placeholder rounded-circle d-flex justify-content-center align-items-center"
                style={{
                  width: "80px",
                  height: "80px",
                  backgroundColor: "#F0F0FE",
                }}
              >
                <Person style={{ color: "#7A5CFF" }} size={48} />
              </div>
              <button
                type="button"
                className="btn btn-white rounded-circle position-absolute d-flex justify-content-center align-items-center shadow-sm p-0 m-0"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: "28px",
                  height: "28px",
                  bottom: "0px",
                  right: "0px",
                  backgroundColor: "#FAFAFA",
                  border: "1px solid #EAEAEA",
                  padding: "0",
                }}
              >
                <Pencil size={12} style={{ color: "#888" }} />
              </button>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">First name <span className="text-danger">*</span></label>
              <input
                type="text"
                className={`form-control ${isFirstNameInvalid ? "is-invalid" : ""}`}
                placeholder="e.g. John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              {isFirstNameInvalid && (
                <div className="invalid-feedback">This field is required</div>
              )}
            </div>

            <div className="col-md-6">
              <label className="form-label">Last name</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Hancock"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">
                Email <span className="text-danger">*</span>
              </label>
              <input
                type="email"
                className={`form-control ${isEmailInvalid ? "is-invalid" : ""}`}
                placeholder="example@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {isEmailInvalid && (
                <div className="invalid-feedback">
                  {email.trim() === "" ? "Email is required" : "Enter a valid email address"}
                </div>
              )}
            </div>

            <div className="col-md-6">
              <label className="form-label">
                Phone <span className="text-danger">*</span>
              </label>
              <div className="ac-phone-group">
                <select
                  className="form-select ac-phone-code"
                  value={phoneCountryCode}
                  onChange={(e) => setPhoneCountryCode(e.target.value)}
                >
                  {PHONE_CODES.map((p) => (
                    <option key={p.label} value={p.code}>{p.label}</option>
                  ))}
                </select>
                <input
                  type="tel"
                  className={`form-control ${isPhoneInvalid ? "is-invalid" : ""}`}
                  placeholder="10-digit number"
                  value={phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    if (val.length <= 10) setPhone(val);
                  }}
                />
              </div>
              {isPhoneInvalid && (
                <div className="invalid-feedback" style={{ display: "block" }}>
                  {phone.trim() === "" ? "Phone is required" : "Phone must be 10 digits"}
                </div>
              )}
            </div>

            <div className="col-md-6">
              <label className="form-label">Birthday</label>
              <input
                type="date"
                className="form-control"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
              />
            </div>

           
            <div className="col-md-6">
              <label className="form-label">Gender</label>
              <select
                className="form-select"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="">Select an option</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Non-binary">Non-binary</option>
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label">Pronouns</label>
              <select
                className="form-select"
                value={pronouns}
                onChange={(e) => setPronouns(e.target.value)}
              >
                <option value="">Select an option</option>
                <option value="She/Her">She/Her</option>
                <option value="He/Him">He/Him</option>
                <option value="They/Them">They/Them</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
          </div>

          {/* ================= ADDITIONAL INFO ================= */}

          <div className="mt-5">
            <h5 className="fw-bold">Additional info</h5>

            <p className="text-muted">
              Edit additional information about the client
            </p>

            <div className="row g-3 mt-2">
              <div className="col-md-6">
                <label className="form-label">Client source</label>
                <select
                  className="form-select"
                  value={clientSource}
                  onChange={(e) => setClientSource(e.target.value)}
                >
                  <option value="walk_in">Walk-in</option>
                  <option value="instagram">Instagram</option>
                  <option value="google">Google</option>
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label">Referred by</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Select a client"
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Preferred language</label>
                <select
                  className="form-select"
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value)}
                >
                  <option value="en">English</option>
                  <option value="mr">Marathi</option>
                  <option value="hi">Hindi</option>
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label">Occupation</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter client job information"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Country</label>
                <select
                  className="form-select"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                >
                  <option value="IN">India</option>
                  <option value="US">United States</option>
                  <option value="UK">UK</option>
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label">Additional email</label>
                <input
                  type="email"
                  className={`form-control ${isAdditionalEmailInvalid ? "is-invalid" : ""}`}
                  placeholder="example@domain.com"
                  value={additionalEmail}
                  onChange={(e) => setAdditionalEmail(e.target.value)}
                />
                {isAdditionalEmailInvalid && (
                  <div className="invalid-feedback">Enter a valid email address</div>
                )}
              </div>

              <div className="col-md-6">
                <label className="form-label">Additional phone</label>
                <div className="ac-phone-group">
                  <select
                    className="form-select ac-phone-code"
                    value={additionalPhoneCountryCode}
                    onChange={(e) => setAdditionalPhoneCountryCode(e.target.value)}
                  >
                    {PHONE_CODES.map((p) => (
                      <option key={p.label} value={p.code}>{p.label}</option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    className={`form-control ${isAdditionalPhoneInvalid ? "is-invalid" : ""}`}
                    placeholder="10-digit number"
                    value={additionalPhone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      if (val.length <= 10) setAdditionalPhone(val);
                    }}
                  />
                </div>
                {isAdditionalPhoneInvalid && (
                  <div className="invalid-feedback" style={{ display: "block" }}>
                    Phone must be 10 digits
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
