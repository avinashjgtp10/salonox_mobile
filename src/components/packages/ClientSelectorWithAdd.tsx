// src/components/packages/ClientSelectorWithAdd.tsx
import React, { useState } from "react";
import { UserPlus, X } from "lucide-react";
import ClientSearchInput, { type ClientSearchResult } from "../../features/clients/components/ClientSearchInput";
import AddClientForm from "../../features/sales/components/AddClientForm";
import { INDIA, type CountryOption } from "../../features/sales/components/CountryDialPicker";
import api from "../../services/api/axios";
import "../../features/sales/styles/QuickSalePage.scss";

interface Props {
  onSelect: (client: ClientSearchResult) => void;
  placeholder?: string;
}

// ── helpers (mirrors quickSale.utils) ────────────────────────────────────────
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

const ClientSelectorWithAdd: React.FC<Props> = ({ onSelect, placeholder }) => {
  const [query,             setQuery]             = useState("");
  const [showForm,          setShowForm]          = useState(false);
  const [savedClient,       setSavedClient]       = useState<ClientSearchResult | null>(null);

  // add-client form fields
  const [firstName,         setFirstName]         = useState("");
  const [lastName,          setLastName]          = useState("");
  const [phone,             setPhone]             = useState("");
  const [gender,            setGender]            = useState<"" | "Female" | "Male" | "Other">("");
  const [country,           setCountry]           = useState<CountryOption>(INDIA);
  const [formErrors,        setFormErrors]        = useState<string[]>([]);
  const [phoneDuplicate,    setPhoneDuplicate]    = useState(false);
  const [phoneChecking,     setPhoneChecking]     = useState(false);
  const [saving,            setSaving]            = useState(false);
  const [savedOk,           setSavedOk]           = useState(false);
  const [saveError,         setSaveError]         = useState("");

  // ── phone duplicate check (same as QuickSale) ────────────────────────────
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

  // ── save new client (same as QuickSale's handleSaveNewClient) ────────────
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
      const cleaned    = phone.trim().replace(/\D/g, "");
      const dialDigits = country.dialCode.replace(/\D/g, "");
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
      setShowForm(false);
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
    setShowForm(false);
    setFirstName(""); setLastName(""); setPhone(""); setGender("");
    setFormErrors([]); setPhoneDuplicate(false); setSaveError("");
  }

  function clearClient() {
    setSavedClient(null);
    setQuery("");
    setSavedOk(false);
  }

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="qs-client-row">
        <div style={{ flex: 1 }}>
          <ClientSearchInput
            value={query}
            onChange={val => {
              setQuery(val);
              if (!val) setSavedClient(null);
              if (showForm) closeForm();

              // same as QuickSale: pre-fill phone when typing a number
              if (isPhoneSearch(val)) {
                const local = extractLocalPhone(val);
                if (local.length === 10) {
                  setPhone(local);
                  setPhoneDuplicate(false);
                  setFormErrors(prev => prev.filter(x => x !== "phone"));
                }
              } else {
                setFirstName("");
                setLastName("");
              }
            }}
            onSelect={client => {
              const name = `${client.first_name} ${client.last_name ?? ""}`.trim();
              setQuery(name);
              setSavedClient(client);
              setShowForm(false);
              setFormErrors([]);
              onSelect(client);
            }}
            onNoResults={term => {
              // same as QuickSale: auto-open form when a phone number yields no results
              const digits = term.replace(/\D/g, "");
              if (digits.length > 0 && digits === term.trim()) {
                const local = extractLocalPhone(term);
                setPhone(local);
                setPhoneDuplicate(false);
                setFormErrors(prev => prev.filter(x => x !== "phone"));
                openForm();
                if (local.length === 10) checkPhoneExists(local);
              }
            }}
            placeholder={placeholder ?? "Search client by name or phone…"}
            highlight
          />
        </div>

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
      </div>

      {/* selected client chip — same as QuickSale's client display */}
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

      {/* add client form */}
      {showForm && (
        <>
          {saveError && (
            <div className="qs-form-error" style={{ marginTop: 10, fontWeight: 500 }}>
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
      )}
    </div>
  );
};

export default ClientSelectorWithAdd;
