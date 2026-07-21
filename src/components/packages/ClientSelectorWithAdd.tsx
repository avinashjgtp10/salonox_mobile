// src/components/packages/ClientSelectorWithAdd.tsx
import React, { useState } from "react";
import { UserPlus, X } from "lucide-react";
import ClientSearchInput, { type ClientSearchResult } from "../../features/clients/components/ClientSearchInput";
import AddClientForm from "../shared/AddClientForm";
import { INDIA, type CountryOption } from "../shared/CountryDialPicker";
import api from "../../services/api/axios";
import "../shared/AddClientForm.scss";

interface Props {
  onSelect: (client: ClientSearchResult) => void;
  onClear?: () => void;
  placeholder?: string;
  hideAddButton?: boolean;
  /** When true, add-client form is pinned at the TOP and the toggle button is hidden */
  formAtTop?: boolean;
  /** Pre-fill with an already-selected client (e.g. restored from sessionStorage) */
  defaultClient?: ClientSearchResult | null;
}

// ── helpers ──────────────────────────────────────────────────────────────────
function extractLocalPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

function isPhoneSearch(val: string): boolean {
  const stripped = val.trim();
  if (!stripped) return false;
  const digits = stripped.replace(/\D/g, "");
  return /^\+?[\d\s\-().]+$/.test(stripped) && digits.length === 10;
}

const phoneValid = (p: string) => /^\d{10}$/.test(p.trim());

// ─────────────────────────────────────────────────────────────────────────────

const ClientSelectorWithAdd: React.FC<Props> = ({
  onSelect, onClear, placeholder, hideAddButton = false, formAtTop = false, defaultClient = null,
}) => {
  const [query,          setQuery]          = useState(() =>
    defaultClient ? `${defaultClient.first_name} ${defaultClient.last_name ?? ""}`.trim() : ""
  );
  // formAtTop: form is always open; default: toggled
  const [showForm,       setShowForm]       = useState(formAtTop);
  const [savedClient,    setSavedClient]    = useState<ClientSearchResult | null>(defaultClient);

  // add-client form fields
  const [firstName,      setFirstName]      = useState("");
  const [lastName,       setLastName]       = useState("");
  const [phone,          setPhone]          = useState("");
  const [gender,         setGender]         = useState<"" | "Female" | "Male" | "Other">("");
  const [country,        setCountry]        = useState<CountryOption>(INDIA);
  const [formErrors,     setFormErrors]     = useState<string[]>([]);
  const [phoneDuplicate, setPhoneDuplicate] = useState(false);
  const [phoneChecking,  setPhoneChecking]  = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [savedOk,        setSavedOk]        = useState(false);
  const [saveError,      setSaveError]      = useState("");

  // ── phone duplicate check ────────────────────────────────────────────────
  async function checkPhoneExists(p: string) {
    const digits = p.replace(/\D/g, "");
    if (digits.length !== 10) return;
    setPhoneChecking(true);
    try {
      const res = await api.get(`/api/v1/clients/search?q=${encodeURIComponent(p)}`);
      const raw = res.data?.data ?? res.data ?? [];
      setPhoneDuplicate(Array.isArray(raw) && raw.length > 0);
    } catch { /* silent */ } finally { setPhoneChecking(false); }
  }

  // ── save new client ──────────────────────────────────────────────────────
  async function handleSave() {
    if (phoneDuplicate || phoneChecking || saving) return;
    const errs: string[] = [];
    const firstTrim = firstName.trim();
    if (!firstTrim)               errs.push("first_name_required");
    else if (firstTrim.length < 3) errs.push("first_name_length");
    const lastTrim = lastName.trim();
    if (lastTrim && lastTrim.length < 3) errs.push("last_name_length");
    if (!phoneValid(phone))        errs.push("phone");
    if (!gender)                   errs.push("gender");
    if (errs.length) { setFormErrors(errs); return; }

    setSaving(true);
    setSaveError("");
    try {
      const cleaned     = phone.trim().replace(/\D/g, "");
      const dialDigits  = country.dialCode.replace(/\D/g, "");
      const phoneDigits = cleaned.startsWith(dialDigits) ? cleaned : `${dialDigits}${cleaned}`;
      const fullPhone   = `+${phoneDigits}`;

      const res = await api.post("/api/v1/clients", {
        first_name:   firstTrim,
        last_name:    lastTrim,
        phone_number: fullPhone,
        gender,
      });
      const saved = res.data?.data ?? res.data;

      const newClient: ClientSearchResult = {
        id:           saved?.id ?? Date.now(),
        first_name:   firstTrim,
        last_name:    lastTrim || undefined,
        phone_number: fullPhone,
        email:        saved?.email,
      };

      setSavedOk(true);
      setSavedClient(newClient);
      if (!formAtTop) setShowForm(false);
      setQuery(`${firstTrim} ${lastTrim}`.trim());
      onSelect(newClient);

      // reset form fields
      setFirstName(""); setLastName(""); setPhone(""); setGender("");
      setFormErrors([]); setPhoneDuplicate(false);
    } catch (err: any) {
      setSaveError(err?.response?.data?.message ?? "Failed to save client. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // ── open / close form ────────────────────────────────────────────────────
  function openForm() {
    setShowForm(true);
    setSavedOk(false);
    setSaveError("");
    setFormErrors([]);
    setPhoneDuplicate(false);
  }

  function closeForm() {
    if (formAtTop) {
      // in formAtTop mode, "cancel" just clears the fields
      setFirstName(""); setLastName(""); setPhone(""); setGender("");
      setFormErrors([]); setPhoneDuplicate(false); setSaveError("");
    } else {
      setShowForm(false);
      setFirstName(""); setLastName(""); setPhone(""); setGender("");
      setFormErrors([]); setPhoneDuplicate(false); setSaveError("");
    }
  }

  function clearClient() {
    setSavedClient(null);
    setQuery("");
    setSavedOk(false);
    onClear?.();
  }

  const formNode = (
    <>
      {saveError && (
        <div style={{
          marginTop: 10, padding: "8px 14px", background: "#fff1f2",
          border: "1px solid #fecdd3", borderRadius: 8,
          fontSize: 13, color: "#dc2626", fontWeight: 500,
        }}>
          {saveError}
        </div>
      )}
      <AddClientForm
        newClientFirstName={firstName}
        newClientLastName={lastName}
        newClientPhone={phone}
        newClientGender={gender}
        selectedCountry={country}
        isClientSaved={savedOk}
        phoneDuplicate={phoneDuplicate}
        phoneCheckLoading={phoneChecking}
        isSavingClient={saving}
        formErrors={formErrors}
        onFirstNameChange={v => {
          setFirstName(v.replace(/[^a-zA-Z\s]/g, ""));
          setFormErrors(prev => prev.filter(x => x !== "first_name_required" && x !== "first_name_length"));
        }}
        onLastNameChange={v => {
          setLastName(v.replace(/[^a-zA-Z\s]/g, ""));
          setFormErrors(prev => prev.filter(x => x !== "last_name_length"));
        }}
        onPhoneChange={v => {
          const digits = v.replace(/\D/g, "").slice(0, 10);
          setPhone(digits);
          if (phoneDuplicate) setPhoneDuplicate(false);
          setFormErrors(prev => prev.filter(x => x !== "phone"));
          if (phoneValid(digits)) checkPhoneExists(digits);
        }}
        onGenderChange={v => {
          setGender(v);
          setFormErrors(prev => prev.filter(x => x !== "gender"));
        }}
        onCountryChange={setCountry}
        onPhoneBlur={() => { if (phoneValid(phone)) checkPhoneExists(phone); }}
        onSave={handleSave}
      />
    </>
  );

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Form at top (formAtTop mode) */}
      {formAtTop && formNode}

      {/* Divider between form and search when formAtTop */}
      {formAtTop && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          margin: "14px 0 10px",
        }}>
          <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            or search existing client
          </span>
          <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
        </div>
      )}

      {/* Search row */}
      <div className="qs-client-row">
        <div style={{ flex: 1 }}>
          <ClientSearchInput
            value={query}
            onChange={val => {
              setQuery(val);
              if (!val) setSavedClient(null);
              if (!formAtTop && showForm) closeForm();

              if (isPhoneSearch(val)) {
                const local = extractLocalPhone(val);
                if (local.length === 10) {
                  setPhone(local);
                  setPhoneDuplicate(false);
                  setFormErrors(prev => prev.filter(x => x !== "phone"));
                }
              } else if (!formAtTop) {
                // Mirror the typed name into the add-client form fields, same
                // as a phone-looking query auto-fills the Mobile field above.
                const cleaned = val.replace(/[^a-zA-Z\s]/g, "");
                const [first, ...rest] = cleaned.trim().split(/\s+/).filter(Boolean);
                setFirstName(first ?? "");
                setLastName(rest.join(" "));
                setFormErrors(prev => prev.filter(x => x !== "first_name_required" && x !== "first_name_length"));
              }
            }}
            onSelect={client => {
              const name = `${client.first_name} ${client.last_name ?? ""}`.trim();
              setQuery(name);
              setSavedClient(client);
              if (!formAtTop) setShowForm(false);
              setFormErrors([]);
              onSelect(client);
            }}
            onNoResults={term => {
              if (formAtTop || !term.trim()) return;
              const digits = term.replace(/\D/g, "");
              if (digits.length > 0 && digits === term.trim()) {
                const local = extractLocalPhone(term);
                setPhone(local);
                setPhoneDuplicate(false);
                setFormErrors(prev => prev.filter(x => x !== "phone"));
                openForm();
                if (local.length === 10) checkPhoneExists(local);
              } else {
                // Name search came up empty — open the add-client form with
                // the typed name already carried over (set by onChange above).
                openForm();
              }
            }}
            placeholder={placeholder ?? "Search client by name or phone…"}
            highlight
          />
        </div>

        {/* Toggle button (hidden in formAtTop mode or when hideAddButton) */}
        {!formAtTop && !hideAddButton && (
          <button
            onClick={() => (showForm ? closeForm() : openForm())}
            className={`qs-pill-btn${!showForm ? " qs-pill-btn--primary" : ""}`}
            type="button"
          >
            {showForm
              ? <><X size={13} /> Cancel</>
              : <><UserPlus size={13} /> Add Client</>
            }
          </button>
        )}
      </div>

      {/* Selected client chip */}
      {savedClient && (
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <div className="qs-client-display">
            <div className="qs-client-display__avatar">
              {savedClient.first_name[0]}{(savedClient.last_name ?? "")[0] ?? ""}
            </div>
            <span className="qs-client-display__name">
              {`${savedClient.first_name} ${savedClient.last_name ?? ""}`.trim()}
            </span>
          </div>
          <button
            className="qs-pill-btn qs-pill-btn--sm"
            style={{ color: "#ef4444", borderColor: "#fecaca" }}
            onClick={clearClient}
            type="button"
          >✕</button>
        </div>
      )}

      {/* Form at bottom (default / toggle mode) */}
      {!formAtTop && showForm && formNode}
    </div>
  );
};

export default ClientSelectorWithAdd;
