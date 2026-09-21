import React, { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Country, State, City } from "country-state-city";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { createSupplierThunk, updateSupplierThunk, fetchSupplierByIdThunk } from "../../../middleware/inventory/inventory.thunk";
import { SUPPLIER_MESSAGES } from "../../../constants/messages";
import Dropdown from "../../../components/ui/Dropdown";
import { toTitleCase } from "../../../utils/titleCase";
import type { Supplier } from "../../../types/inventory.types";
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

  // Supplier details
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Contact info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");

  // Physical address
  const [physStreet, setPhysStreet] = useState("");
  const [physSuburb, setPhysSuburb] = useState("");
  const [physZip, setPhysZip] = useState("");

  // Postal address
  const [postalStreet, setPostalStreet] = useState("");
  const [postalSuburb, setPostalSuburb] = useState("");
  const [postalZip, setPostalZip] = useState("");

  // Dial codes
  const [mobileDialCode, setMobileDialCode] = useState(INDIA.dial);
  const [mobileSearch, setMobileSearch] = useState("");
  const [mobileDropOpen, setMobileDropOpen] = useState(false);

  // Location dropdowns
  const [physCountry, setPhysCountry] = useState("India");
  const [physState, setPhysState] = useState("");
  const [physCity, setPhysCity] = useState("");

  const [postalCountry, setPostalCountry] = useState("India");
  const [postalState, setPostalState] = useState("");
  const [postalCity, setPostalCity] = useState("");

  const [sameAsPostal, setSameAsPostal] = useState(true);
  const [isActive, setIsActive] = useState(true);

  // UI state
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [mobileTouched, setMobileTouched] = useState(false);

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

  const filteredMobile = useMemo(
    () =>
      COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(mobileSearch.toLowerCase()) ||
          c.dial.includes(mobileSearch),
      ),
    [mobileSearch],
  );

  const physStates = useMemo(
    () => getStates(codeOf(physCountry)),
    [physCountry],
  );
  const physCities = useMemo(
    () => getCities(codeOf(physCountry), physState),
    [physCountry, physState],
  );

  const postalStates = useMemo(
    () => getStates(codeOf(postalCountry)),
    [postalCountry],
  );
  const postalCities = useMemo(
    () => getCities(codeOf(postalCountry), postalState),
    [postalCountry, postalState],
  );

  const handlePhysCountry = (val: string) => {
    setPhysCountry(val);
    setPhysState("");
    setPhysCity("");
  };

  const handlePhysState = (code: string) => {
    setPhysState(code);
    setPhysCity("");
  };

  const handlePostalCountry = (val: string) => {
    setPostalCountry(val);
    setPostalState("");
    setPostalCity("");
  };

  const handlePostalState = (code: string) => {
    setPostalState(code);
    setPostalCity("");
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
      setDescription(s.description || "");
      setFirstName(s.first_name || "");
      setLastName(s.last_name || "");
      setMobileDialCode(s.mobile_country_code || INDIA.dial);
      setMobileNumber(s.mobile_number || "");
      setEmail(s.email || "");
      setWebsite(s.website || "");
      setPhysStreet(s.street || "");
      setPhysSuburb(s.suburb || "");
      setPhysCountry(s.country || "India");
      setPhysState(s.state || "");
      setPhysCity(s.city || "");
      setPhysZip(s.zip_code || "");
      setSameAsPostal(s.same_as_physical);
      setIsActive(s.is_active ?? true);
      if (!s.same_as_physical) {
        setPostalStreet(s.postal_street || "");
        setPostalSuburb(s.postal_suburb || "");
        setPostalCountry(s.postal_country || "India");
        setPostalState(s.postal_state || "");
        setPostalCity(s.postal_city || "");
        setPostalZip(s.postal_zip_code || "");
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [isEdit, effectiveId, dispatch]);

  const handleSave = async () => {
    setEmailTouched(true);
    setMobileTouched(true);
    if (!name.trim()) {
      setNameError(true);
      return;
    }
    setNameError(false);
    if (emailError || mobileError) return;

    const payload = {
      name: toTitleCase(name.trim()),
      description: description.trim() || undefined,
      first_name: firstName.trim() ? toTitleCase(firstName.trim()) : undefined,
      last_name: lastName.trim() ? toTitleCase(lastName.trim()) : undefined,
      mobile_country_code: mobileDialCode || undefined,
      mobile_number: mobileNumber.trim() || undefined,
      email: email.trim() || undefined,
      website: website.trim() || undefined,
      street: physStreet.trim() || undefined,
      suburb: physSuburb.trim() || undefined,
      city: physCity || undefined,
      state: physState || undefined,
      zip_code: physZip.trim() || undefined,
      country: physCountry || undefined,
      same_as_physical: sameAsPostal,
      is_active: isActive,
      postal_street: sameAsPostal ? null : postalStreet.trim() || null,
      postal_suburb: sameAsPostal ? null : postalSuburb.trim() || null,
      postal_city: sameAsPostal ? null : postalCity || null,
      postal_state: sameAsPostal ? null : postalState || null,
      postal_zip_code: sameAsPostal ? null : postalZip.trim() || null,
      postal_country: sameAsPostal ? null : postalCountry || null,
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
          <h3>Basic Details</h3>

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
            <label>Supplier description</label>
            <textarea
              placeholder="e.g. Local provider of hair products"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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

        <section className="form-section">
          <h3>Contact Details</h3>

          <div className="field-row-3">
            <div className="field-group">
              <label>First name</label>
              <input
                type="text"
                placeholder="e.g. John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="field-group">
              <label>Last name</label>
              <input
                type="text"
                placeholder="e.g. Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            <div className="field-group">
              <label>Website</label>
              <input
                type="url"
                placeholder="www.google.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>
          </div>

          <div className="field-row-2">
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
        </section>

        <section className="form-section">
          <h3>Physical Address</h3>

          <div className="field-row-3">
            <div className="field-group">
              <label>Street</label>
              <input
                type="text"
                placeholder="e.g. 12 Main Street"
                value={physStreet}
                onChange={(e) => setPhysStreet(e.target.value)}
              />
            </div>

            <div className="field-group">
              <label>Locality</label>
              <input
                type="text"
                value={physSuburb}
                onChange={(e) => setPhysSuburb(e.target.value)}
              />
            </div>

            <div className="field-group">
              <label>Country</label>
              <Dropdown
                value={physCountry}
                options={COUNTRIES.map((c) => ({ id: c.name, name: `${c.flag} ${c.name}` }))}
                onChange={handlePhysCountry}
              />
            </div>
          </div>

          <div className="field-row-3">
            <div className="field-group">
              <label>State</label>
              {physStates.length > 0 ? (
                <Dropdown
                  placeholder="— Select state —"
                  value={physState}
                  options={physStates.map((s) => ({ id: s.isoCode, name: s.name }))}
                  onChange={handlePhysState}
                />
              ) : (
                <input
                  type="text"
                  placeholder="State / Province"
                  value={physState}
                  onChange={(e) => setPhysState(e.target.value)}
                />
              )}
            </div>

            <div className="field-group">
              <label>City</label>
              {physCities.length > 0 ? (
                <Dropdown
                  placeholder="— Select city —"
                  value={physCity}
                  options={physCities.map((city) => ({ id: city.name, name: city.name }))}
                  onChange={setPhysCity}
                />
              ) : (
                <input
                  type="text"
                  placeholder="City"
                  value={physCity}
                  onChange={(e) => setPhysCity(e.target.value)}
                />
              )}
            </div>

            <div className="field-group">
              <label>Zip / Postal Code</label>
              <input
                type="text"
                value={physZip}
                onChange={(e) => setPhysZip(e.target.value)}
              />
            </div>
          </div>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={sameAsPostal}
              onChange={(e) => setSameAsPostal(e.target.checked)}
            />
            Same as postal address
          </label>
        </section>

        {!sameAsPostal && (
          <section className="form-section">
            <h3>Postal Address</h3>

            <div className="field-row-3">
              <div className="field-group">
                <label>Street</label>
                <input
                  type="text"
                  placeholder="e.g. 12 Main Street"
                  value={postalStreet}
                  onChange={(e) => setPostalStreet(e.target.value)}
                />
              </div>

              <div className="field-group">
                <label>Locality</label>
                <input
                  type="text"
                  value={postalSuburb}
                  onChange={(e) => setPostalSuburb(e.target.value)}
                />
              </div>

              <div className="field-group">
                <label>Country</label>
                <Dropdown
                  value={postalCountry}
                  options={COUNTRIES.map((c) => ({ id: c.name, name: `${c.flag} ${c.name}` }))}
                  onChange={handlePostalCountry}
                />
              </div>
            </div>

            <div className="field-row-3">
              <div className="field-group">
                <label>State</label>
                {postalStates.length > 0 ? (
                  <Dropdown
                    placeholder="— Select state —"
                    value={postalState}
                    options={postalStates.map((s) => ({ id: s.isoCode, name: s.name }))}
                    onChange={handlePostalState}
                  />
                ) : (
                  <input
                    type="text"
                    placeholder="State / Province"
                    value={postalState}
                    onChange={(e) => setPostalState(e.target.value)}
                  />
                )}
              </div>

              <div className="field-group">
                <label>City</label>
                {postalCities.length > 0 ? (
                  <Dropdown
                    placeholder="— Select city —"
                    value={postalCity}
                    options={postalCities.map((city) => ({ id: city.name, name: city.name }))}
                    onChange={setPostalCity}
                  />
                ) : (
                  <input
                    type="text"
                    placeholder="City"
                    value={postalCity}
                    onChange={(e) => setPostalCity(e.target.value)}
                  />
                )}
              </div>

              <div className="field-group">
                <label>Zip / Postal Code</label>
                <input
                  type="text"
                  value={postalZip}
                  onChange={(e) => setPostalZip(e.target.value)}
                />
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default AddSupplierPage;
