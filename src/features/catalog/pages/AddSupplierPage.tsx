import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Country, State, City } from "country-state-city";
import "./AddSupplierPage.scss";

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

const AddSupplierPage: React.FC = () => {
  const navigate = useNavigate();

  const [mobileDialCode, setMobileDialCode] = useState(INDIA.dial);
  const [mobileSearch, setMobileSearch] = useState("");
  const [mobileDropOpen, setMobileDropOpen] = useState(false);

  const [telDialCode, setTelDialCode] = useState(INDIA.dial);
  const [telSearch, setTelSearch] = useState("");
  const [telDropOpen, setTelDropOpen] = useState(false);

  const [physCountry, setPhysCountry] = useState("India");
  const [physState, setPhysState] = useState("");
  const [physCity, setPhysCity] = useState("");

  const [postalCountry, setPostalCountry] = useState("India");
  const [postalState, setPostalState] = useState("");
  const [postalCity, setPostalCity] = useState("");

  const [sameAsPostal, setSameAsPostal] = useState(true);

  const filteredMobile = useMemo(
    () =>
      COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(mobileSearch.toLowerCase()) ||
          c.dial.includes(mobileSearch),
      ),
    [mobileSearch],
  );

  const filteredTel = useMemo(
    () =>
      COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(telSearch.toLowerCase()) ||
          c.dial.includes(telSearch),
      ),
    [telSearch],
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

  const handlePhysCountry = (name: string) => {
    setPhysCountry(name);
    setPhysState("");
    setPhysCity("");
  };

  const handlePhysState = (code: string) => {
    setPhysState(code);
    setPhysCity("");
  };

  const handlePostalCountry = (name: string) => {
    setPostalCountry(name);
    setPostalState("");
    setPostalCity("");
  };

  const handlePostalState = (code: string) => {
    setPostalState(code);
    setPostalCity("");
  };

  return (
    <div className="add-supplier-page">
      <div className="add-supplier-page__topbar">
        <h2>Add a new supplier</h2>
        <div className="topbar-actions">
          <button className="btn-close-top" onClick={() => navigate(-1)}>
            Close
          </button>
          <button className="btn-save">Save</button>
        </div>
      </div>

      <div className="add-supplier-page__body">
        <section className="form-section">
          <h3>Supplier details</h3>

          <div className="field-group">
            <label>Supplier name</label>
            <input type="text" placeholder="e.g. L'Oréal" />
          </div>

          <div className="field-group">
            <label>Supplier description</label>
            <textarea
              placeholder="e.g. Local provider of hair products"
              rows={4}
            />
          </div>
        </section>

        <div className="section-divider" />

        <section className="form-section">
          <h3>Contact info</h3>

          <div className="field-row-2">
            <div className="field-group">
              <label>First name</label>
              <input type="text" placeholder="e.g. John" />
            </div>
            <div className="field-group">
              <label>Last name</label>
              <input type="text" placeholder="e.g. Doe" />
            </div>
          </div>

          <div className="field-group">
            <label>Mobile number</label>
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
              <input type="tel" placeholder="Mobile number" />
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
          </div>

          <div className="field-group">
            <label>Telephone</label>
            <div className="phone-field">
              <div
                className="dial-selector"
                onClick={() => {
                  setTelDropOpen((o) => !o);
                  setTelSearch("");
                }}
              >
                <span>{telDialCode}</span>
                <span className="chevron">▾</span>
              </div>
              <input type="tel" placeholder="Telephone number" />
              {telDropOpen && (
                <div
                  className="dial-dropdown"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <input
                    className="dial-search"
                    type="text"
                    placeholder="Search country or code..."
                    value={telSearch}
                    onChange={(e) => setTelSearch(e.target.value)}
                    autoFocus
                  />
                  <ul>
                    {filteredTel.map((c) => (
                      <li
                        key={c.code}
                        onClick={() => {
                          setTelDialCode(c.dial);
                          setTelDropOpen(false);
                        }}
                      >
                        <span className="flag">{c.flag}</span>
                        <span className="cname">{c.name}</span>
                        <span className="cdial">{c.dial}</span>
                      </li>
                    ))}
                    {filteredTel.length === 0 && (
                      <li className="no-result">No results</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="field-group">
            <label>Email</label>
            <input type="email" placeholder="mail@example.com" />
          </div>

          <div className="field-group">
            <label>Website</label>
            <input type="url" placeholder="www.google.com" />
          </div>
        </section>

        <div className="section-divider" />

        <section className="form-section">
          <h3>Physical address</h3>

          <div className="field-group">
            <label>Street</label>
            <input type="text" placeholder="e.g. 12 Main Street" />
          </div>

          <div className="field-group">
            <label>Suburb</label>
            <input type="text" />
          </div>

          <div className="field-group">
            <label>Country</label>
            <select
              value={physCountry}
              onChange={(e) => handlePhysCountry(e.target.value)}
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.name}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field-row-2">
            <div className="field-group">
              <label>State</label>
              {physStates.length > 0 ? (
                <select
                  value={physState}
                  onChange={(e) => handlePhysState(e.target.value)}
                >
                  <option value="">— Select state —</option>
                  {physStates.map((s) => (
                    <option key={s.isoCode} value={s.isoCode}>
                      {s.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input type="text" placeholder="State / Province" />
              )}
            </div>

            <div className="field-group">
              <label>City</label>
              {physCities.length > 0 ? (
                <select
                  value={physCity}
                  onChange={(e) => setPhysCity(e.target.value)}
                >
                  <option value="">— Select city —</option>
                  {physCities.map((city) => (
                    <option key={city.name} value={city.name}>
                      {city.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input type="text" placeholder="City" />
              )}
            </div>
          </div>

          <div className="field-group" style={{ maxWidth: 260 }}>
            <label>Zip / Postal Code</label>
            <input type="text" />
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

        <div className="section-divider" />

        {!sameAsPostal && (
          <section className="form-section">
            <h3>Postal address</h3>

            <div className="field-group">
              <label>Street</label>
              <input type="text" placeholder="e.g. 12 Main Street" />
            </div>

            <div className="field-group">
              <label>Suburb</label>
              <input type="text" />
            </div>

            <div className="field-group">
              <label>Country</label>
              <select
                value={postalCountry}
                onChange={(e) => handlePostalCountry(e.target.value)}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.name}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-row-2">
              <div className="field-group">
                <label>State</label>
                {postalStates.length > 0 ? (
                  <select
                    value={postalState}
                    onChange={(e) => handlePostalState(e.target.value)}
                  >
                    <option value="">— Select state —</option>
                    {postalStates.map((s) => (
                      <option key={s.isoCode} value={s.isoCode}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input type="text" placeholder="State / Province" />
                )}
              </div>

              <div className="field-group">
                <label>City</label>
                {postalCities.length > 0 ? (
                  <select
                    value={postalCity}
                    onChange={(e) => setPostalCity(e.target.value)}
                  >
                    <option value="">— Select city —</option>
                    {postalCities.map((city) => (
                      <option key={city.name} value={city.name}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input type="text" placeholder="City" />
                )}
              </div>
            </div>

            <div className="field-group" style={{ maxWidth: 260 }}>
              <label>Zip / Postal Code</label>
              <input type="text" />
            </div>

            <div className="section-divider" />
          </section>
        )}

        <div className="form-actions">
          <button className="btn-cancel" onClick={() => navigate(-1)}>
            Close
          </button>
          <button className="btn-save-bottom">Save</button>
        </div>
      </div>
    </div>
  );
};

export default AddSupplierPage;
