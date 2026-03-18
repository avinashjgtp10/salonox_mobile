import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { XLg, PlusLg, Search, Check2, CreditCard2Front, ChevronDown } from "react-bootstrap-icons";
import "../styles/CreateMembershipPage.scss";

// ── Mock services data ────────────────────────────────────────────────────────
const MOCK_SERVICES = [
  { id: 1, category: "Hair & styling", name: "Haircut",    duration: "45min",     price: 40  },
  { id: 2, category: "Hair & styling", name: "Hair Color", duration: "1h 15min",  price: 57  },
  { id: 3, category: "Hair & styling", name: "Blow Dry",   duration: "35min",     price: 35  },
  { id: 4, category: "Hair & styling", name: "Balayage",   duration: "2h 30min",  price: 150 },
];

const COLOURS = ["#4A90D9", "#1a1a2e", "#16a34a", "#f59e0b", "#8b5cf6"];

const VALID_FOR_OPTIONS = ["1 month", "2 months", "3 months", "6 months", "1 year"];
const SESSION_OPTIONS   = ["Limited", "Unlimited"];
const TAX_OPTIONS       = ["No tax", "5%", "12%", "18%", "28%"];

const CreateMembershipPage: React.FC = () => {
  const navigate = useNavigate();

  // Basic info
  const [membershipName, setMembershipName]       = useState("");
  const [description, setDescription]             = useState("");

  // Services & sessions
  const [showServicesModal, setShowServicesModal] = useState(false);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [pendingIds, setPendingIds]               = useState<number[]>([]);
  const [serviceSearch, setServiceSearch]         = useState("");
  const [sessions, setSessions]                   = useState("Limited");
  const [numSessions, setNumSessions]             = useState(5);

  // Pricing
  const [validFor, setValidFor]                   = useState("1 month");
  const [price, setPrice]                         = useState("");

  // Tax
  const [taxRate, setTaxRate]                     = useState("No tax");

  // Colour
  const [selectedColour, setSelectedColour]       = useState(COLOURS[0]);

  // Online
  const [onlineSales, setOnlineSales]             = useState(false);
  const [onlineRedemption, setOnlineRedemption]   = useState(true);

  // T&C
  const [terms, setTerms]                         = useState("");

  // ── Modal helpers ────────────────────────────────────────────────────────────
  const openModal = () => {
    setPendingIds([...selectedServiceIds]);
    setServiceSearch("");
    setShowServicesModal(true);
  };

  const toggleAll = () => {
    if (pendingIds.length === MOCK_SERVICES.length) {
      setPendingIds([]);
    } else {
      setPendingIds(MOCK_SERVICES.map((s) => s.id));
    }
  };

  const toggleService = (id: number) => {
    setPendingIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const confirmSelection = () => {
    setSelectedServiceIds(pendingIds);
    setShowServicesModal(false);
  };

  const filteredServices = MOCK_SERVICES.filter((s) =>
    s.name.toLowerCase().includes(serviceSearch.toLowerCase())
  );

  const handleSubmit = () => {
    console.log({
      membershipName, description, selectedServiceIds,
      sessions, numSessions, validFor, price,
      taxRate, selectedColour, onlineSales, onlineRedemption, terms,
    });
    navigate("/dashboard/catalog/memberships");
  };

  return (
    <div className="cmp">
      {/* ── Top bar ── */}
      <div className="cmp__topbar d-flex align-items-center justify-content-between px-4 shadow-sm">
        <button className="cmp__close-btn" onClick={() => navigate(-1)}>
          <XLg size={20} />
        </button>
        <h5 className="cmp__topbar-title mb-0 fw-bold">Create a membership</h5>
        <button className="btn cmp__submit-btn" onClick={handleSubmit} disabled={!membershipName.trim()}>
          Create membership
        </button>
      </div>

      {/* ── Scrollable body ── */}
      <div className="cmp__body">
        <div className="container-narrow">
          {/* 1. Basic info */}
          <div className="cmp__section">
            <h6 className="cmp__section-title">Basic info</h6>

            <div className="mb-4">
              <label className="cmp__label">Membership name</label>
              <input
                type="text"
                className="cmp__input form-control"
                placeholder="Add membership name"
                value={membershipName}
                onChange={(e) => setMembershipName(e.target.value)}
              />
            </div>

            <div className="mb-1">
              <label className="cmp__label d-flex justify-content-between">
                <span>Membership description</span>
                <span className="cmp__char-count">{description.length}/360</span>
              </label>
              <textarea
                className="cmp__textarea form-control"
                placeholder="Add membership description"
                rows={4}
                maxLength={360}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* 2. Services & sessions */}
          <div className="cmp__section">
            <h6 className="cmp__section-title">Services and sessions</h6>
            <p className="cmp__section-sub">Add the services and sessions included in the membership.</p>

            <label className="cmp__label">Included services</label>
            <div className="cmp__services-row d-flex align-items-center justify-content-between mb-3 p-3 rounded-3 border">
              <span className="cmp__services-count fw-medium">
                {selectedServiceIds.length} service{selectedServiceIds.length !== 1 ? "s" : ""}
              </span>
              <button className="cmp__edit-link" onClick={openModal}>Edit</button>
            </div>

            <div className="row g-3">
              <div className="col-6">
                <label className="cmp__label">Sessions</label>
                <div className="position-relative">
                  <select
                    className="cmp__select form-select"
                    value={sessions}
                    onChange={(e) => setSessions(e.target.value)}
                  >
                    {SESSION_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              {sessions === "Limited" && (
                <div className="col-6">
                  <label className="cmp__label">Number of sessions</label>
                  <input
                    type="number"
                    className="cmp__input form-control"
                    min={1}
                    value={numSessions}
                    onChange={(e) => setNumSessions(Number(e.target.value))}
                  />
                </div>
              )}
            </div>
          </div>

          {/* 3. Pricing and payment */}
          <div className="cmp__section">
            <h6 className="cmp__section-title">Pricing and payment</h6>
            <p className="cmp__section-sub">Choose how you'd like your clients to pay.</p>

            <div className="row g-3">
              <div className="col-6">
                <label className="cmp__label">Valid for</label>
                <select
                  className="cmp__select form-select"
                  value={validFor}
                  onChange={(e) => setValidFor(e.target.value)}
                >
                  {VALID_FOR_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="col-6">
                <label className="cmp__label">Price</label>
                <div className="cmp__price-wrap position-relative">
                  <span className="cmp__currency">₹</span>
                  <input
                    type="number"
                    className="cmp__input cmp__input--price form-control ps-4"
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 4. Tax rate */}
          <div className="cmp__section">
            <h6 className="cmp__section-title">Tax rate</h6>
            <div className="col-6 col-md-4">
              <label className="cmp__label">Tax rate</label>
              <select
                className="cmp__select form-select"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
              >
                {TAX_OPTIONS.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>

          {/* 5. Colour customisation */}
          <div className="cmp__section">
            <h6 className="cmp__section-title">Colour customisation</h6>
            <p className="cmp__section-sub">Select a colour that matches your business.</p>
            <div className="d-flex gap-2">
              {COLOURS.map((c) => (
                <button
                  key={c}
                  className={`cmp__colour-swatch ${selectedColour === c ? "cmp__colour-swatch--active" : ""}`}
                  style={{ background: c }}
                  onClick={() => setSelectedColour(c)}
                />
              ))}
            </div>
          </div>

          {/* 6. Online sales & redemption */}
          <div className="cmp__section">
            <h6 className="cmp__section-title">Online sales and redemption</h6>

            <div className="cmp__toggle-row mb-4">
              <div className="d-flex align-items-center gap-3">
                <div
                  className={`cmp__toggle ${onlineSales ? "cmp__toggle--on" : ""}`}
                  onClick={() => setOnlineSales(!onlineSales)}
                />
                <div>
                  <div className={`small fw-bold ${!onlineSales ? "text-muted" : ""}`}>Enable online sales</div>
                  <div className="cmp__toggle-sub">Clients can purchase this membership online</div>
                </div>
              </div>
            </div>

            <div className="cmp__toggle-row mb-4">
              <div className="d-flex align-items-center gap-3">
                <div
                  className={`cmp__toggle ${onlineRedemption ? "cmp__toggle--on" : ""}`}
                  onClick={() => setOnlineRedemption(!onlineRedemption)}
                />
                <div>
                  <div className="small fw-bold">Enable online redemption</div>
                  <div className="cmp__toggle-sub">Clients can use this membership to book services online</div>
                </div>
              </div>
            </div>

            {/* Info banner */}
            <div className="cmp__info-banner d-flex align-items-center justify-content-between p-3 rounded-4">
              <p className="mb-0 small fw-medium">
                Online membership sales are coming soon to India with payments in Fresha
              </p>
              <CreditCard2Front size={28} className="text-primary opacity-50 ms-3" />
            </div>
          </div>

          {/* 7. Terms & Conditions */}
          <div className="cmp__section border-0">
            <h6 className="cmp__section-title">Terms &amp; Conditions</h6>
            <p className="cmp__section-sub">
              If there are any rules attached to your membership it's a good place to mention them.
            </p>

            <div className="mb-1">
              <label className="cmp__label d-flex justify-content-between">
                <span>Terms &amp; Conditions <span className="text-muted fw-normal">(Optional)</span></span>
                <span className="cmp__char-count">{terms.length}/3000</span>
              </label>
              <textarea
                className="cmp__textarea form-control"
                placeholder="Add Terms & Conditions"
                rows={4}
                maxLength={3000}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Select Services Modal ── */}
      {showServicesModal && (
        <div className="cmp__modal-overlay" onClick={() => setShowServicesModal(false)}>
          <div className="cmp__modal" onClick={(e) => e.stopPropagation()}>
            {/* Modal header */}
            <div className="cmp__modal-header d-flex align-items-center justify-content-between mb-4">
              <h6 className="mb-0 fw-bold fs-5">Select services</h6>
              <button className="cmp__modal-close" onClick={() => setShowServicesModal(false)}>
                <XLg size={20} />
              </button>
            </div>

            {/* Search */}
            <div className="cmp__modal-search position-relative mb-4">
              <Search className="cmp__modal-search-icon" />
              <input
                type="text"
                className="form-control cmp__modal-search-input"
                placeholder="Search services"
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
              />
            </div>

            {/* Select all */}
            <div
              className="cmp__modal-row cmp__modal-row--all d-flex align-items-center gap-3 mb-2"
              onClick={toggleAll}
            >
              <div className={`cmp__checkbox ${pendingIds.length === MOCK_SERVICES.length ? "cmp__checkbox--checked" : ""}`}>
                {pendingIds.length === MOCK_SERVICES.length && <Check2 size={12} className="text-white" />}
              </div>
              <span className="small fw-bold">All services</span>
              <span className="cmp__badge ms-1">{MOCK_SERVICES.length}</span>
            </div>

            <hr className="cmp__modal-divider my-3" />

            {/* Category header */}
            <div className="cmp__modal-category d-flex align-items-center gap-2 mb-3 px-1">
              <div className="cmp__checkbox cmp__checkbox--indeterminate" />
              <span className="small fw-bold">Hair &amp; styling</span>
              <span className="cmp__badge">{filteredServices.length}</span>
            </div>

            {/* Service list */}
            <div className="cmp__modal-list">
              {filteredServices.map((svc) => (
                <div
                  key={svc.id}
                  className="cmp__modal-row d-flex align-items-center justify-content-between mb-1"
                  onClick={() => toggleService(svc.id)}
                >
                  <div className="d-flex align-items-center gap-3">
                    <div className={`cmp__checkbox ${pendingIds.includes(svc.id) ? "cmp__checkbox--checked" : ""}`}>
                      {pendingIds.includes(svc.id) && <Check2 size={12} className="text-white" />}
                    </div>
                    <div>
                      <div className="small fw-bold">{svc.name}</div>
                      <div className="cmp__modal-duration text-muted extra-small">{svc.duration}</div>
                    </div>
                  </div>
                  <span className="small fw-bold">₹{svc.price}</span>
                </div>
              ))}
            </div>

            {/* Modal footer */}
            <div className="cmp__modal-footer d-flex align-items-center justify-content-end gap-3 mt-4 pt-4 border-top">
              <button
                className="btn btn-outline-dark rounded-pill px-4 fw-bold"
                onClick={() => setShowServicesModal(false)}
              >
                Close
              </button>
              <button
                className="btn btn-dark rounded-pill px-4 fw-bold"
                onClick={confirmSelection}
              >
                Select {pendingIds.length} service{pendingIds.length !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateMembershipPage;
