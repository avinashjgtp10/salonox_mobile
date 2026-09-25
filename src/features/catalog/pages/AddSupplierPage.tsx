import React, { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Country, State, City } from "country-state-city";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { createSupplierThunk, updateSupplierThunk, fetchSupplierByIdThunk } from "../../../middleware/inventory/inventory.thunk";
import { SUPPLIER_MESSAGES } from "../../../constants/messages";
import Dropdown from "../../../components/ui/Dropdown";
import { toTitleCase } from "../../../utils/titleCase";
import type { Supplier, SupplierType } from "../../../types/inventory.types";
import "../styles/AddSupplierPage.scss";

const COUNTRIES = Country.getAllCountries().map((c) => ({
  code: c.isoCode,
  name: c.name,
  dial: c.phonecode.startsWith("+") ? c.phonecode : `+${c.phonecode}`,
  flag: c.flag ?? "",
}));

const INDIA = COUNTRIES.find((c) => c.code === "IN")!;

const getStates = (countryCode: string) =>
  State.getStatesOfCountry(countryCode);

const getCities = (countryCode: string, stateCode: string) =>
  City.getCitiesOfState(countryCode, stateCode);

const codeOf = (name: string) =>
  COUNTRIES.find((c) => c.name === name)?.code ?? "";

const SUPPLIER_TYPE_OPTIONS: { id: SupplierType; name: string }[] = [
  { id: "product", name: "Product" },
  { id: "consumable", name: "Consumable" },
  { id: "both", name: "Both" },
];

const PAYMENT_TERMS_OPTIONS = [
  { id: "0", name: "Immediate" },
  { id: "7", name: "7 Days" },
  { id: "15", name: "15 Days" },
  { id: "30", name: "30 Days" },
];

const GSTIN_RE = /^[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}[1-9A-Za-z]{1}Z[0-9A-Za-z]{1}$/;
const PAN_RE = /^[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}$/;
const IFSC_RE = /^[A-Za-z]{4}0[A-Za-z0-9]{6}$/;

interface AddSupplierPageProps {
  supplierId?: string;
  onClose?: () => void;
  // Passed the created/updated supplier, so a caller embedding this in a
  // popup (e.g. NewOrderPage's "+ Add Supplier") can auto-select it.
  onSaved?: (supplier: Supplier) => void;
  panelMode?: boolean;
}

const AddSupplierPage: React.FC<AddSupplierPageProps> = ({
  supplierId,
  onClose,
  onSaved,
  panelMode = false,
}) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const effectiveId = supplierId ?? id;
  const isEdit = !!effectiveId;
  const dispatch = useAppDispatch();

  // 1. Basic Information
  const [name, setName] = useState("");
  const [supplierCode, setSupplierCode] = useState<string | null>(null);
  const [supplierType, setSupplierType] = useState<SupplierType>("product");
  const [contactPerson, setContactPerson] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");

  // Dial code (part of Mobile Number)
  const [mobileDialCode, setMobileDialCode] = useState(INDIA.dial);
  const [mobileSearch, setMobileSearch] = useState("");
  const [mobileDropOpen, setMobileDropOpen] = useState(false);

  // 2. Address
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("India");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [zipCode, setZipCode] = useState("");

  // 3. Business & Tax
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");
  const [businessRegNumber, setBusinessRegNumber] = useState("");
  const [paymentTermsDays, setPaymentTermsDays] = useState("0");
  const [creditLimit, setCreditLimit] = useState("");

  // 4. Bank Details (optional)
  const [bankAccountHolderName, setBankAccountHolderName] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankIfscCode, setBankIfscCode] = useState("");

  // 5. Additional
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);

  // UI state
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [mobileTouched, setMobileTouched] = useState(false);
  const [gstinTouched, setGstinTouched] = useState(false);
  const [panTouched, setPanTouched] = useState(false);
  const [ifscTouched, setIfscTouched] = useState(false);

  const emailError = !email.trim()
    ? SUPPLIER_MESSAGES.EMAIL_REQUIRED
    : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      ? SUPPLIER_MESSAGES.EMAIL_INVALID
      : "";
  const mobileError = !mobileNumber.trim()
    ? SUPPLIER_MESSAGES.MOBILE_REQUIRED
    : mobileNumber.trim().length !== 10
      ? SUPPLIER_MESSAGES.MOBILE_INVALID
      : "";
  const gstinError = gstin.trim() && !GSTIN_RE.test(gstin.trim()) ? SUPPLIER_MESSAGES.GSTIN_INVALID : "";
  const panError = pan.trim() && !PAN_RE.test(pan.trim()) ? SUPPLIER_MESSAGES.PAN_INVALID : "";
  const ifscError = bankIfscCode.trim() && !IFSC_RE.test(bankIfscCode.trim()) ? SUPPLIER_MESSAGES.IFSC_INVALID : "";

  const filteredMobile = useMemo(
    () =>
      COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(mobileSearch.toLowerCase()) ||
          c.dial.includes(mobileSearch),
      ),
    [mobileSearch],
  );

  const states = useMemo(() => getStates(codeOf(country)), [country]);
  const cities = useMemo(() => getCities(codeOf(country), state), [country, state]);

  const handleCountry = (val: string) => {
    setCountry(val);
    setState("");
    setCity("");
  };

  const handleState = (code: string) => {
    setState(code);
    setCity("");
  };

  // Fetches the specific supplier being edited directly by id, rather than
  // depending on it already being loaded — the Suppliers list is now
  // server-paginated (fetchSuppliersThunk only ever holds one page), so the
  // supplier being edited is no longer guaranteed to be in the store just
  // because the list happened to load first.
  React.useEffect(() => {
    if (!isEdit || !effectiveId) return;
    let cancelled = false;
    dispatch(fetchSupplierByIdThunk(effectiveId)).unwrap().then((s) => {
      if (cancelled) return;
      setName(s.name);
      setSupplierCode(s.supplier_code);
      setSupplierType(s.supplier_type || "product");
      setContactPerson(s.contact_person || "");
      setMobileDialCode(s.mobile_country_code || INDIA.dial);
      setMobileNumber(s.mobile_number || "");
      setEmail(s.email || "");
      setWebsite(s.website || "");
      setAddress(s.address || "");
      setCountry(s.country || "India");
      setState(s.state || "");
      setCity(s.city || "");
      setZipCode(s.zip_code || "");
      setGstin(s.gstin || "");
      setPan(s.pan || "");
      setBusinessRegNumber(s.business_registration_number || "");
      setPaymentTermsDays(String(s.payment_terms_days ?? 0));
      setCreditLimit(s.credit_limit ? String(s.credit_limit) : "");
      setBankAccountHolderName(s.bank_account_holder_name || "");
      setBankName(s.bank_name || "");
      setBankAccountNumber(s.bank_account_number || "");
      setBankIfscCode(s.bank_ifsc_code || "");
      setNotes(s.notes || "");
      setIsActive(s.is_active ?? true);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [isEdit, effectiveId, dispatch]);

  const handleSave = async () => {
    setEmailTouched(true);
    setMobileTouched(true);
    setGstinTouched(true);
    setPanTouched(true);
    setIfscTouched(true);
    if (!name.trim()) {
      setNameError(true);
      return;
    }
    setNameError(false);
    if (emailError || mobileError || gstinError || panError || ifscError) return;

    const payload = {
      name: toTitleCase(name.trim()),
      supplier_type: supplierType,
      contact_person: contactPerson.trim() ? toTitleCase(contactPerson.trim()) : undefined,
      mobile_country_code: mobileDialCode || undefined,
      mobile_number: mobileNumber.trim() || undefined,
      email: email.trim() || undefined,
      website: website.trim() || undefined,
      address: address.trim() || undefined,
      city: city || undefined,
      state: state || undefined,
      zip_code: zipCode.trim() || undefined,
      country: country || undefined,
      gstin: gstin.trim() ? gstin.trim().toUpperCase() : undefined,
      pan: pan.trim() ? pan.trim().toUpperCase() : undefined,
      business_registration_number: businessRegNumber.trim() || undefined,
      payment_terms_days: Number(paymentTermsDays),
      credit_limit: creditLimit.trim() ? Number(creditLimit) : undefined,
      bank_account_holder_name: bankAccountHolderName.trim() ? toTitleCase(bankAccountHolderName.trim()) : undefined,
      bank_name: bankName.trim() || undefined,
      bank_account_number: bankAccountNumber.trim() || undefined,
      bank_ifsc_code: bankIfscCode.trim() ? bankIfscCode.trim().toUpperCase() : undefined,
      notes: notes.trim() || undefined,
      is_active: isActive,
    };

    try {
      setSaving(true);
      const saved = isEdit && effectiveId
        ? await dispatch(updateSupplierThunk({ id: effectiveId, data: payload })).unwrap()
        : await dispatch(createSupplierThunk(payload)).unwrap();
      onSaved?.(saved);
      if (onClose) {
        onClose();
      } else {
        // Explicit path + refresh flag (not navigate(-1)) — Add/Edit are only
        // ever entered from the Suppliers list, so this always lands back
        // there, and the flag is what tells SuppliersListPage's mount effect
        // to actually re-fetch (a plain Close navigates with no state at
        // all, and reuses what's already loaded instead of calling the API
        // again — see the effect in SuppliersListPage.tsx).
        navigate("/dashboard/inventory/suppliers", { state: { refresh: true } });
      }
    } catch (err) {
      console.error("Failed to save supplier:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`add-supplier-page${panelMode ? " add-supplier-page--panel" : ""}`}>
      <div className="add-supplier-page__topbar">
        <h2>{isEdit ? "Edit supplier" : "Add a new supplier"}</h2>
        <div className="topbar-actions">
          <button className="btn-close-top" onClick={onClose ?? (() => navigate(-1))}>
            Close
          </button>
          <button className="btn-save" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="add-supplier-page__body">
        <section className="form-section">
          <h3>Basic Information</h3>

          <div className="field-row-3">
            <div className={`field-group${nameError ? " field-group--error" : ""}`}>
              <label>
                Supplier name <span style={{ color: "red" }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. L'Oréal"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (e.target.value.trim()) setNameError(false);
                }}
              />
              {nameError && (
                <span className="field-error">Supplier name is required</span>
              )}
            </div>

            <div className="field-group">
              <label>Supplier code</label>
              <input
                type="text"
                value={supplierCode ?? ""}
                placeholder="Auto-generated on save"
                disabled
              />
            </div>

            <div className="field-group">
              <label>Supplier type</label>
              <Dropdown
                searchable={false}
                value={supplierType}
                options={SUPPLIER_TYPE_OPTIONS}
                onChange={(id) => setSupplierType(id as SupplierType)}
              />
            </div>
          </div>

          <div className="field-row-3">
            <div className="field-group">
              <label>Contact person</label>
              <input
                type="text"
                placeholder="e.g. John Doe"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
              />
            </div>

            <div className={`field-group${mobileTouched && mobileError ? " field-group--error" : ""}`}>
              <label>
                Mobile number <span style={{ color: "red" }}>*</span>
              </label>
              <div className="phone-field">
                <div
                  className="dial-selector"
                  onClick={() => {
                    setMobileDropOpen((o) => !o);
                    setMobileSearch("");
                  }}
                >
                  <span>{mobileDialCode}</span>
                  <span className="chevron">▾</span>
                </div>
                <input
                  type="tel"
                  placeholder="Mobile number"
                  value={mobileNumber}
                  maxLength={10}
                  onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  onBlur={() => setMobileTouched(true)}
                />
                {mobileDropOpen && (
                  <div
                    className="dial-dropdown"
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    <input
                      className="dial-search"
                      type="text"
                      placeholder="Search country or code..."
                      value={mobileSearch}
                      onChange={(e) => setMobileSearch(e.target.value)}
                      autoFocus
                    />
                    <ul>
                      {filteredMobile.map((c) => (
                        <li
                          key={c.code}
                          className={mobileDialCode === c.dial ? "active" : ""}
                          onClick={() => {
                            setMobileDialCode(c.dial);
                            setMobileDropOpen(false);
                          }}
                        >
                          <span className="flag">{c.flag}</span>
                          <span className="cname">{c.name}</span>
                          <span className="cdial">{c.dial}</span>
                        </li>
                      ))}
                      {filteredMobile.length === 0 && (
                        <li className="no-result">No results</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
              {mobileTouched && mobileError && (
                <span className="field-error">{mobileError}</span>
              )}
            </div>

            <div className={`field-group${emailTouched && emailError ? " field-group--error" : ""}`}>
              <label>
                Email <span style={{ color: "red" }}>*</span>
              </label>
              <input
                type="email"
                placeholder="mail@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmailTouched(true)}
              />
              {emailTouched && emailError && (
                <span className="field-error">{emailError}</span>
              )}
            </div>
          </div>

          <div className="field-group">
            <label>Website</label>
            <input
              type="url"
              placeholder="www.example.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>
        </section>

        <section className="form-section">
          <h3>Address</h3>

          <div className="field-group">
            <label>Address</label>
            <textarea
              placeholder="e.g. 12 Main Street"
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="field-row-3">
            <div className="field-group">
              <label>Country</label>
              <Dropdown
                value={country}
                options={COUNTRIES.map((c) => ({ id: c.name, name: `${c.flag} ${c.name}` }))}
                onChange={handleCountry}
              />
            </div>

            <div className="field-group">
              <label>State</label>
              {states.length > 0 ? (
                <Dropdown
                  placeholder="— Select state —"
                  value={state}
                  options={states.map((s) => ({ id: s.isoCode, name: s.name }))}
                  onChange={handleState}
                />
              ) : (
                <input
                  type="text"
                  placeholder="State / Province"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                />
              )}
            </div>

            <div className="field-group">
              <label>City</label>
              {cities.length > 0 ? (
                <Dropdown
                  placeholder="— Select city —"
                  value={city}
                  options={cities.map((c) => ({ id: c.name, name: c.name }))}
                  onChange={setCity}
                />
              ) : (
                <input
                  type="text"
                  placeholder="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              )}
            </div>
          </div>

          <div className="field-row-3">
            <div className="field-group">
              <label>PIN code</label>
              <input
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="form-section">
          <h3>Business &amp; Tax</h3>

          <div className="field-row-3">
            <div className={`field-group${gstinTouched && gstinError ? " field-group--error" : ""}`}>
              <label>GSTIN</label>
              <input
                type="text"
                placeholder="e.g. 22AAAAA0000A1Z5"
                maxLength={15}
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                onBlur={() => setGstinTouched(true)}
              />
              {gstinTouched && gstinError && (
                <span className="field-error">{gstinError}</span>
              )}
            </div>

            <div className={`field-group${panTouched && panError ? " field-group--error" : ""}`}>
              <label>PAN</label>
              <input
                type="text"
                placeholder="e.g. AAAAA0000A"
                maxLength={10}
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                onBlur={() => setPanTouched(true)}
              />
              {panTouched && panError && (
                <span className="field-error">{panError}</span>
              )}
            </div>

            <div className="field-group">
              <label>Business registration number</label>
              <input
                type="text"
                value={businessRegNumber}
                onChange={(e) => setBusinessRegNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="field-row-3">
            <div className="field-group">
              <label>Payment terms</label>
              <Dropdown
                searchable={false}
                value={paymentTermsDays}
                options={PAYMENT_TERMS_OPTIONS}
                onChange={setPaymentTermsDays}
              />
            </div>

            <div className="field-group">
              <label>Credit limit</label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="form-section">
          <h3>Bank Details <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span></h3>

          <div className="field-row-3">
            <div className="field-group">
              <label>Account holder name</label>
              <input
                type="text"
                value={bankAccountHolderName}
                onChange={(e) => setBankAccountHolderName(e.target.value)}
              />
            </div>

            <div className="field-group">
              <label>Bank name</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
              />
            </div>

            <div className="field-group">
              <label>Account number</label>
              <input
                type="text"
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value.replace(/\D/g, ""))}
              />
            </div>
          </div>

          <div className="field-row-3">
            <div className={`field-group${ifscTouched && ifscError ? " field-group--error" : ""}`}>
              <label>IFSC code</label>
              <input
                type="text"
                placeholder="e.g. HDFC0001234"
                maxLength={11}
                value={bankIfscCode}
                onChange={(e) => setBankIfscCode(e.target.value.toUpperCase())}
                onBlur={() => setIfscTouched(true)}
              />
              {ifscTouched && ifscError && (
                <span className="field-error">{ifscError}</span>
              )}
            </div>
          </div>
        </section>

        <section className="form-section">
          <h3>Additional</h3>

          <div className="field-group">
            <label>Notes</label>
            <textarea
              placeholder="e.g. Preferred supplier for hair products"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Active
          </label>
        </section>
      </div>
    </div>
  );
};

export default AddSupplierPage;
