import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { XLg, Search, Check2, CreditCard2Front } from "react-bootstrap-icons";

import type { AppDispatch } from "../../../store/store";
import { createMembershipThunk } from "../../../middleware/membership/membership.thunk";
import {
  selectMembershipsSubmitting,
  selectMembershipsError,
} from "../../../store/selectors/membership.selectors";
import { clearMembershipError } from "../../../store/membershipSlice";
import type { IncludedService } from "../../../services/api/endpoints/memberships.endpoints";
import { useServices } from "../hooks/useServices";
import "../styles/CreateMembershipPage.scss";

// ── Constants ─────────────────────────────────────────────────────────────────

const COLOURS           = ["#4A90D9", "#1a1a2e", "#16a34a", "#f59e0b", "#8b5cf6"];
const VALID_FOR_OPTIONS = ["1 month", "2 months", "3 months", "6 months", "1 year"];
const SESSION_OPTIONS   = ["Limited", "Unlimited"];
const TAX_OPTIONS       = ["No tax", "5", "12", "18", "28"];   // plain numbers, no %

// ── Component ─────────────────────────────────────────────────────────────────

const CreateMembershipPage: React.FC = () => {
  const navigate   = useNavigate();
  const dispatch   = useDispatch<AppDispatch>();
  const submitting = useSelector(selectMembershipsSubmitting);
  const apiError   = useSelector(selectMembershipsError);

  // Real services from catalog
  const { services: catalogServices, fetchServices } = useServices();

  // Fetch services on mount
  useEffect(() => { fetchServices(); }, [fetchServices]);

  // Basic info
  const [membershipName, setMembershipName] = useState("");
  const [description, setDescription]       = useState("");

  // Services & sessions
  const [showServicesModal, setShowServicesModal]   = useState(false);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [pendingIds, setPendingIds]                 = useState<string[]>([]);
  const [serviceSearch, setServiceSearch]           = useState("");
  const [sessions, setSessions]                     = useState("Limited");
  const [numSessions, setNumSessions]               = useState(5);

  // Pricing
  const [validFor, setValidFor] = useState("1 month");
  const [price, setPrice]       = useState("");
  const [taxRate, setTaxRate]   = useState("No tax");

  // Colour / online / T&C
  const [selectedColour, setSelectedColour]     = useState(COLOURS[0]);
  const [onlineSales, setOnlineSales]           = useState(false);
  const [onlineRedemption, setOnlineRedemption] = useState(true);
  const [terms, setTerms]                       = useState("");

  // Clear API errors on unmount
  useEffect(() => () => { dispatch(clearMembershipError()); }, [dispatch]);

  // ── Modal helpers ────────────────────────────────────────────────────────────

  const openModal = () => {
    setPendingIds([...selectedServiceIds]);
    setServiceSearch("");
    setShowServicesModal(true);
  };

  const toggleAll = () =>
    setPendingIds(
      pendingIds.length === catalogServices.length
        ? []
        : catalogServices.map((s) => String(s.id))
    );

  const toggleService = (id: string) =>
    setPendingIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const confirmSelection = () => {
    setSelectedServiceIds(pendingIds);
    setShowServicesModal(false);
  };

  const filteredServices = catalogServices.filter((s) =>
    s.name.toLowerCase().includes(serviceSearch.toLowerCase())
  );

  // ── Submit ───────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    const includedServices: IncludedService[] = selectedServiceIds.map((id) => {
      const svc = catalogServices.find((s) => String(s.id) === id)!;
      return { serviceId: String(svc.id), serviceName: svc.name };
    });

    // Parse tax rate: "No tax" → undefined, "18" → 18
    const taxRateNum: number | undefined =
      taxRate === "No tax" ? undefined : parseFloat(taxRate);

    const result = await dispatch(
      createMembershipThunk({
        name:                   membershipName.trim(),
        description:            description.trim() || undefined,
        includedServices,
        sessionType:            sessions.toLowerCase(),
        numberOfSessions:       sessions === "Limited" ? numSessions : undefined,
        validFor,
        price:                  parseFloat(price),
        taxRate:                taxRateNum,
        colour:                 selectedColour,
        enableOnlineSales:      onlineSales,
        enableOnlineRedemption: onlineRedemption,
        termsAndConditions:     terms.trim() || undefined,
      })
    );

    if (createMembershipThunk.fulfilled.match(result)) {
      navigate("/dashboard/catalog/memberships/list");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="cmp">
      {/* Top bar */}
      <div className="cmp__topbar d-flex align-items-center justify-content-between px-4 shadow-sm">
        <button className="cmp__close-btn" onClick={() => navigate(-1)}>
          <XLg size={20} />
        </button>
        <h5 className="cmp__topbar-title mb-0 fw-bold">Create a membership</h5>
        <button
          className="btn cmp__submit-btn"
          onClick={handleSubmit}
          disabled={!membershipName.trim() || submitting}
        >
          {submitting ? "Creating…" : "Create membership"}
        </button>
      </div>

      {/* API error banner */}
      {apiError && (
        <div className="alert alert-danger mx-4 mt-3 mb-0">{apiError}</div>
      )}

      {/* Scrollable body */}
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
                <span>Description</span>
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
            <p className="cmp__section-sub">
              Add the services and sessions included in the membership.
            </p>
            <label className="cmp__label">Included services</label>
            <div className="cmp__services-row d-flex align-items-center justify-content-between mb-3 p-3 rounded-3 border">
              <span className="cmp__services-count fw-medium">
                {selectedServiceIds.length} service
                {selectedServiceIds.length !== 1 ? "s" : ""}
              </span>
              <button className="cmp__edit-link" onClick={openModal}>
                Edit
              </button>
            </div>
            <div className="row g-3">
              <div className="col-6">
                <label className="cmp__label">Sessions</label>
                <select
                  className="cmp__select form-select"
                  value={sessions}
                  onChange={(e) => setSessions(e.target.value)}
                >
                  {SESSION_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                </select>
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
            <p className="cmp__section-sub">
              Choose how you'd like your clients to pay.
            </p>
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
                {TAX_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o === "No tax" ? "No tax" : `${o}%`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 5. Colour */}
          <div className="cmp__section">
            <h6 className="cmp__section-title">Colour customisation</h6>
            <p className="cmp__section-sub">
              Select a colour that matches your business.
            </p>
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

          {/* 6. Online sales */}
          <div className="cmp__section">
            <h6 className="cmp__section-title">Online sales and redemption</h6>
            <div className="cmp__toggle-row mb-4">
              <div className="d-flex align-items-center gap-3">
                <div
                  className={`cmp__toggle ${onlineSales ? "cmp__toggle--on" : ""}`}
                  onClick={() => setOnlineSales(!onlineSales)}
                />
                <div>
                  <div className={`small fw-bold ${!onlineSales ? "text-muted" : ""}`}>
                    Enable online sales
                  </div>
                  <div className="cmp__toggle-sub">
                    Clients can purchase this membership online
                  </div>
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
                  <div className="cmp__toggle-sub">
                    Clients can use this membership to book services online
                  </div>
                </div>
              </div>
            </div>
            <div className="cmp__info-banner d-flex align-items-center justify-content-between p-3 rounded-4">
              <p className="mb-0 small fw-medium">
                Online membership sales are coming soon to India with payments in salonox
              </p>
              <CreditCard2Front size={28} className="text-primary opacity-50 ms-3" />
            </div>
          </div>

          {/* 7. T&C */}
          <div className="cmp__section border-0">
            <h6 className="cmp__section-title">Terms &amp; Conditions</h6>
            <p className="cmp__section-sub">
              If there are any rules attached to your membership, mention them here.
            </p>
            <div className="mb-1">
              <label className="cmp__label d-flex justify-content-between">
                <span>
                  Terms &amp; Conditions{" "}
                  <span className="text-muted fw-normal">(Optional)</span>
                </span>
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

      {/* Select Services Modal */}
      {showServicesModal && (
        <div
          className="cmp__modal-overlay"
          onClick={() => setShowServicesModal(false)}
        >
          <div className="cmp__modal" onClick={(e) => e.stopPropagation()}>
            <div className="cmp__modal-header d-flex align-items-center justify-content-between mb-4">
              <h6 className="mb-0 fw-bold fs-5">Select services</h6>
              <button
                className="cmp__modal-close"
                onClick={() => setShowServicesModal(false)}
              >
                <XLg size={20} />
              </button>
            </div>
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
            <div
              className="cmp__modal-row cmp__modal-row--all d-flex align-items-center gap-3 mb-2"
              onClick={toggleAll}
            >
              <div
                className={`cmp__checkbox ${
                  pendingIds.length === catalogServices.length
                    ? "cmp__checkbox--checked"
                    : ""
                }`}
              >
                {pendingIds.length === catalogServices.length && (
                  <Check2 size={12} className="text-white" />
                )}
              </div>
              <span className="small fw-bold">All services</span>
              <span className="cmp__badge ms-1">{catalogServices.length}</span>
            </div>
            <hr className="cmp__modal-divider my-3" />
            <div className="cmp__modal-category d-flex align-items-center gap-2 mb-3 px-1">
              <span className="small fw-bold">All services</span>
              <span className="cmp__badge">{filteredServices.length}</span>
            </div>
            <div className="cmp__modal-list">
              {filteredServices.map((svc) => (
                <div
                  key={svc.id}
                  className="cmp__modal-row d-flex align-items-center justify-content-between mb-1"
                  onClick={() => toggleService(String(svc.id))}
                >
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className={`cmp__checkbox ${
                        pendingIds.includes(String(svc.id))
                          ? "cmp__checkbox--checked"
                          : ""
                      }`}
                    >
                      {pendingIds.includes(String(svc.id)) && (
                        <Check2 size={12} className="text-white" />
                      )}
                    </div>
                    <div>
                      <div className="small fw-bold">{svc.name}</div>
                      <div className="cmp__modal-duration text-muted extra-small">
                        {svc.duration ? `${svc.duration} min` : ""}
                      </div>
                    </div>
                  </div>
                  <span className="small fw-bold">₹{svc.price}</span>
                </div>
              ))}
            </div>
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
                Select {pendingIds.length} service
                {pendingIds.length !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateMembershipPage;