import React, { useState, useRef, useEffect } from "react";
import { PlusCircle, ChevronDown, DashCircle, Eye, EyeSlash } from "react-bootstrap-icons";
import type { BasicDetailsData } from "../../types/catalog.types.ts";

interface CategoryOption {
  id: string | number;
  name: string;
}

interface Props {
  data: BasicDetailsData;
  onChange: (data: BasicDetailsData) => void;
  serviceType: "single" | "bundle";
  errors?: string[];
  categories?: CategoryOption[];
}

const PADDING_OPTIONS = [5, 10, 15, 20, 30, 45, 60];

const BasicDetailsTab: React.FC<Props> = ({ data, onChange, errors = [], categories = [] }) => {
  const [showExtraTime, setShowExtraTime] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const optionsRef = useRef<HTMLDivElement>(null);

  const update = (key: keyof BasicDetailsData, value: any) =>
    onChange({ ...data, [key]: value });

  const hasError = (field: string) =>
    errors.some((err) => err.toLowerCase().includes(field.toLowerCase()));

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target as Node)) {
        setShowOptionsMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRemoveExtraTime = () => {
    update("paddingBefore", 0);
    update("paddingAfter", 0);
    setShowExtraTime(false);
  };

  return (
    <div className="tab-content-panel">
      <h5 className="tab-content-panel__title">Basic details</h5>

      <div className="form-section mb-5">
        <div className="row g-3">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <label className="form-label mb-0">Service name</label>
              <span className="text-muted extra-small">
                {data.name.length}/255
              </span>
            </div>
            <input
              type="text"
              className={`form-control premium-input ${hasError("name") ? "border-danger" : ""}`}
              placeholder="Add a service name, e.g. Men's Haircut"
              value={data.name}
              onChange={(e) => update("name", e.target.value)}
            />
            {hasError("name") && (
              <div className="text-danger small mt-1">
                Service name is required
              </div>
            )}
          </div>

          <div className="col-md-6">
            <label className="form-label">Menu category</label>
            <div className="custom-select-wrapper category-select">
              <select
                className={`form-select ${hasError("category") ? "border-danger" : ""}`}
                value={data.categoryId}
                onChange={(e) => update("categoryId", e.target.value)}
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={String(cat.id)}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="select-icon" />
            </div>
            <div className="text-muted extra-small mt-2">
              The category displayed to you, and to clients online
            </div>
            {hasError("category") && (
              <div className="text-danger small mt-1">Category is required</div>
            )}
          </div>

          <div className="col-md-6">
            <label className="form-label">Treatment type</label>
            <div className="custom-select-wrapper">
              <select
                className="form-select"
                value={data.treatmentType ?? ""}
                onChange={(e) => update("treatmentType" as any, e.target.value)}
              >
                <option value="">Select treatment type</option>
                <optgroup label="Hair">
                  <option value="haircut">Haircut</option>
                  <option value="hair_color">Hair Color</option>
                  <option value="hair_treatment">Hair Treatment</option>
                  <option value="blowdry">Blow Dry &amp; Styling</option>
                  <option value="hair_extensions">Hair Extensions</option>
                </optgroup>
                <optgroup label="Skin &amp; Face">
                  <option value="facial">Facial</option>
                  <option value="skin_treatment">Skin Treatment</option>
                  <option value="microdermabrasion">Microdermabrasion</option>
                  <option value="threading">Threading</option>
                  <option value="waxing_face">Waxing – Face</option>
                </optgroup>
                <optgroup label="Body">
                  <option value="massage">Massage</option>
                  <option value="waxing_body">Waxing – Body</option>
                  <option value="body_wrap">Body Wrap</option>
                  <option value="scrub">Body Scrub</option>
                </optgroup>
                <optgroup label="Nails">
                  <option value="manicure">Manicure</option>
                  <option value="pedicure">Pedicure</option>
                  <option value="nail_art">Nail Art</option>
                  <option value="gel_nails">Gel Nails</option>
                </optgroup>
                <optgroup label="Other">
                  <option value="makeup">Makeup</option>
                  <option value="eyelash">Eyelash</option>
                  <option value="eyebrow">Eyebrow</option>
                  <option value="other">Other</option>
                </optgroup>
              </select>
              <ChevronDown className="select-icon" />
            </div>
            <div className="text-muted extra-small mt-2">
              Used to help clients find your service on the salonox marketplace
            </div>
          </div>

          <div className="col-md-6">
            <label className="form-label">Gender preference (Optional)</label>
            <div className="custom-select-wrapper">
              <select
                className="form-select"
                value={data.genderPreference ?? ""}
                onChange={(e) => update("genderPreference" as any, e.target.value || null)}
              >
                <option value="">No preference</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="any">Any</option>
              </select>
              <ChevronDown className="select-icon" />
            </div>
            <div className="text-muted extra-small mt-2">
              Service availability preference for clients
            </div>
          </div>

          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <label className="form-label mb-0">
                Description{" "}
                <span className="text-muted fw-normal">(Optional)</span>
              </label>
              <span className="text-muted extra-small">
                {data.description.length}/1000
              </span>
            </div>
            <textarea
              className="form-control premium-input"
              rows={3}
              placeholder="Add a short description"
              value={data.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="pricing-section pt-4 mt-2">
        <h5 className="tab-content-panel__title">Pricing and duration</h5>
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label">Price type</label>
            <div className="custom-select-wrapper">
              <select className="form-select" defaultValue="Fixed">
                <option value="Fixed">Fixed</option>
                <option value="Variable">Variable</option>
              </select>
              <ChevronDown className="select-icon" />
            </div>
          </div>

          <div className="col-md-4">
            <label className="form-label">Price</label>
            <div
              className={`input-group premium-group ${hasError("price") ? "border-danger" : ""}`}
              style={{ height: "40px" }}
            >
              <span
                className="input-group-text bg-white border-0 pe-1 text-muted"
                style={{ fontSize: "14px" }}
              >
                ₹
              </span>
              <input
                type="number"
                className="form-control border-0 ps-2 shadow-none"
                placeholder="0.00"
                style={{ fontSize: "14.5px" }}
                value={Number.isFinite(data.price) ? data.price : ""}
                onChange={(e) => {
                  const parsed = parseFloat(e.target.value);
                  update("price", Number.isFinite(parsed) ? parsed : 0);
                }}
              />
            </div>
            {hasError("price") && (
              <div className="text-danger small mt-1">Price is required</div>
            )}
          </div>

          <div className="col-md-4">
            <label className="form-label">Discounted Price (Optional)</label>
            <div
              className="input-group premium-group"
              style={{ height: "40px" }}
            >
              <span
                className="input-group-text bg-white border-0 pe-1 text-muted"
                style={{ fontSize: "14px" }}
              >
                ₹
              </span>
              <input
                type="number"
                className="form-control border-0 ps-2 shadow-none"
                placeholder="0.00"
                style={{ fontSize: "14.5px" }}
                value={Number.isFinite(data.discountedPrice) && data.discountedPrice ? data.discountedPrice : ""}
                onChange={(e) => {
                  const parsed = parseFloat(e.target.value);
                  update("discountedPrice" as any, Number.isFinite(parsed) ? parsed : null);
                }}
              />
            </div>
            <div className="text-muted extra-small mt-2">
              Leave empty if no discount
            </div>
          </div>

          <div className="col-md-4">
            <label className="form-label">Duration</label>
            <div className="custom-select-wrapper">
              <select
                className="form-select"
                value={data.duration}
                onChange={(e) => update("duration", Number(e.target.value))}
              >
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>1 h</option>
                <option value={90}>1 h 30 min</option>
                <option value={120}>2 h</option>
                <option value={150}>2 h 30 min</option>
                <option value={180}>3 h</option>
              </select>
              <ChevronDown className="select-icon" />
            </div>
          </div>
        </div>

        {/* ── Extra time panel ── */}
        {showExtraTime && (
          <div className="extra-time-panel mt-3 p-3 rounded-3 border bg-light">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <span className="fw-semibold" style={{ fontSize: "14px" }}>
                Extra processing time
              </span>
              <button
                type="button"
                className="btn btn-sm btn-link text-danger p-0 d-flex align-items-center gap-1"
                onClick={handleRemoveExtraTime}
              >
                <DashCircle size={13} /> Remove
              </button>
            </div>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label" style={{ fontSize: "13px" }}>
                  Processing time before
                </label>
                <div className="custom-select-wrapper">
                  <select
                    className="form-select"
                    value={data.paddingBefore}
                    onChange={(e) => update("paddingBefore", Number(e.target.value))}
                  >
                    <option value={0}>None</option>
                    {PADDING_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m} min
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="select-icon" />
                </div>
                <div className="text-muted extra-small mt-1">
                  Buffer time needed before the service starts
                </div>
              </div>

              <div className="col-md-6">
                <label className="form-label" style={{ fontSize: "13px" }}>
                  Processing time after
                </label>
                <div className="custom-select-wrapper">
                  <select
                    className="form-select"
                    value={data.paddingAfter}
                    onChange={(e) => update("paddingAfter", Number(e.target.value))}
                  >
                    <option value={0}>None</option>
                    {PADDING_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m} min
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="select-icon" />
                </div>
                <div className="text-muted extra-small mt-1">
                  Cleanup or reset time after the service ends
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="action-row mt-4 pt-2 d-flex gap-2 position-relative">
          {/* Add extra time button */}
          <button
            type="button"
            className="btn btn-outline-dark rounded-pill px-3 d-flex align-items-center gap-2"
            onClick={() => setShowExtraTime((v) => !v)}
          >
            <PlusCircle size={14} />
            <span>{showExtraTime ? "Hide extra time" : "Add extra time"}</span>
          </button>

          {/* Options dropdown */}
          <div className="dropdown" ref={optionsRef}>
            <button
              type="button"
              className="btn btn-outline-dark rounded-pill px-3 d-flex align-items-center gap-2"
              onClick={() => setShowOptionsMenu((v) => !v)}
            >
              <span>Options</span> <ChevronDown size={12} />
            </button>

            {showOptionsMenu && (
              <div
                className="dropdown-menu show shadow-sm rounded-3 border-0 p-1"
                style={{ minWidth: "220px", top: "calc(100% + 6px)", left: 0 }}
              >
                {/* Active / Inactive toggle */}
                <button
                  type="button"
                  className="dropdown-item rounded-2 d-flex align-items-center gap-2 py-2"
                  onClick={() => {
                    update("active", !data.active);
                    setShowOptionsMenu(false);
                  }}
                >
                  {data.active ? (
                    <>
                      <EyeSlash size={15} className="text-muted" />
                      <span>Mark as inactive</span>
                    </>
                  ) : (
                    <>
                      <Eye size={15} className="text-success" />
                      <span>Mark as active</span>
                    </>
                  )}
                </button>

                <hr className="dropdown-divider my-1" />

                {/* Color label picker */}
                <div className="dropdown-item rounded-2 d-flex align-items-center justify-content-between py-2">
                  <span>Color label</span>
                  <input
                    type="color"
                    className="form-control form-control-color border-0 p-0"
                    style={{ width: "28px", height: "28px", cursor: "pointer" }}
                    value={data.colorLabel ?? "#6366f1"}
                    onChange={(e) => update("colorLabel" as any, e.target.value)}
                    title="Pick a color label"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Active status badge */}
          {!data.active && (
            <span className="badge bg-secondary align-self-center ms-1">
              Inactive
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default BasicDetailsTab;
