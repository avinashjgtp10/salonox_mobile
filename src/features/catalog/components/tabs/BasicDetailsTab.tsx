import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "react-bootstrap-icons";
import Input from "../../../../components/ui/Input";
import type { BasicDetailsData } from "../../types/catalog.types.ts";
import { useCurrency } from "../../../../hooks/useCurrency";

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

const BasicDetailsTab: React.FC<Props> = ({ data, onChange, errors = [], categories = [] }) => {
  const { currencySymbol } = useCurrency();
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);

  const update = (key: keyof BasicDetailsData, value: any) =>
    onChange({ ...data, [key]: value });

  const hasError = (field: string) =>
    errors.some((err) => err.toLowerCase().includes(field.toLowerCase()));

  const selectedCategory = categories.find((cat) => String(cat.id) === String(data.categoryId));

  // Close the category dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setShowCategoryMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="tab-content-panel">
      <h5 className="tab-content-panel__title">Basic details</h5>

      <div className="form-section mb-5">
        <div className="row g-3">
          <div className="col-12">
            <Input
              label={<>Service name <span className="text-danger">*</span></>}
              containerClass=""
              className="premium-input"
              type="text"
              placeholder="Add a service name, e.g. Men's Haircut"
              value={data.name}
              onChange={(e) => update("name", e.target.value)}
              maxLength={255}
              showCharCount
              error={hasError("name") ? "Service name is required" : undefined}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label">Menu category <span className="text-danger">*</span></label>
            <div className="custom-select-wrapper category-select" ref={categoryRef}>
              <button
                type="button"
                className={`form-select text-start ${hasError("category") ? "border-danger" : ""}`}
                onClick={() => setShowCategoryMenu((v) => !v)}
              >
                {selectedCategory ? selectedCategory.name : "Select category"}
              </button>
              <ChevronDown className="select-icon" />

              {showCategoryMenu && (
                <div className="category-dropdown-menu shadow-sm rounded-3 border-0 p-1">
                  <button
                    type="button"
                    className="dropdown-item rounded-2 py-2"
                    onClick={() => { update("categoryId", ""); setShowCategoryMenu(false); }}
                  >
                    Select category
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      className={`dropdown-item rounded-2 py-2 ${String(cat.id) === String(data.categoryId) ? "active" : ""}`}
                      onClick={() => { update("categoryId", String(cat.id)); setShowCategoryMenu(false); }}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {hasError("category") && (
              <div className="text-danger small mt-1">Category is required</div>
            )}
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
            <Input
              label={<>Description <span className="text-muted fw-normal">(Optional)</span></>}
              containerClass=""
              className="premium-input"
              multiline
              rows={3}
              maxLength={1000}
              showCharCount
              placeholder="Add a short description"
              value={data.description}
              onChange={(e) => update("description", e.target.value.slice(0, 1000))}
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
            <label className="form-label">Price <span className="text-danger">*</span></label>
            <div
              className={`input-group premium-group ${hasError("price") ? "border-danger" : ""}`}
              style={{ height: "40px" }}
            >
              <span
                className="input-group-text bg-white border-0 pe-1 text-muted"
                style={{ fontSize: "14px" }}
              >
                {currencySymbol}
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-control border-0 ps-2 shadow-none"
                placeholder="0.00"
                style={{ fontSize: "14.5px" }}
                value={data.price || ""}
                onChange={(e) => {
                  const parsed = parseFloat(e.target.value);
                  update("price", Number.isFinite(parsed) ? Math.max(0, parsed) : 0);
                }}
                onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                onKeyDown={(e) => {
                  if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "-" || e.key === "e" || e.key === "E") e.preventDefault();
                }}
              />
            </div>
            {hasError("price") && (
              <div className="text-danger small mt-1">Price is required</div>
            )}
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
      </div>
    </div>
  );
};

export default BasicDetailsTab;
