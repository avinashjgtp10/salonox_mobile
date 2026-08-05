import React, { useState } from "react";
import { X, ChevronDown } from "react-bootstrap-icons";
import { useServiceFilters } from "../hooks/useServiceFilters";
import { useServices } from "../hooks/useServices";
import type { ServiceFiltersState } from "../../../store/serviceFiltersSlice";
import "../styles/ServiceFilterDrawer.scss";

interface Props {
  onClose: () => void;
}

const ServiceFilterDrawer: React.FC<Props> = ({
  onClose,
}) => {
  const { filters: reduxFilters, apply, reset, activeCount } = useServiceFilters();
  const { categories } = useServices();

  // Local draft state — user edits here before pressing Apply
  const [draft, setDraft] = useState<ServiceFiltersState>(reduxFilters);

  const set = (key: keyof ServiceFiltersState, value: string) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const handleApply = () => {
    apply(draft);
    onClose();
  };

  const handleClear = () => {
    reset();
    onClose();
  };

  return (
    <div className="service-filters-modal-overlay" onClick={onClose}>
      <div
        className="service-filters-modal shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="service-filters-modal__header">
          <div className="d-flex align-items-center gap-2">
            <h4 className="modal-title mb-0">Filters</h4>
            {activeCount > 0 && (
              <span className="sfd-badge">{activeCount} active</span>
            )}
          </div>
          <button className="close-icon-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </header>

        <div className="service-filters-modal__body">
          {/* Categories */}
          <div className="filter-group">
            <label>Categories</label>
            <div className="select-wrapper">
              <select
                className="form-select-custom"
                value={draft.categoryId}
                onChange={(e) => set("categoryId", e.target.value)}
              >
                <option value="all">All categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={String(cat.id)}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="select-chevron" size={14} />
            </div>
          </div>

          {/* Duration */}
          <div className="filter-group">
            <label>Duration</label>
            <div className="select-wrapper">
              <select
                className="form-select-custom"
                value={draft.durationRange}
                onChange={(e) => set("durationRange", e.target.value)}
              >
                <option value="all">All durations</option>
                <option value="0-30">Under 30 min (0-30 min)</option>
                <option value="30-60">30-60 min</option>
                <option value="60-120">60-120 min (1-2 hours)</option>
                <option value="120+">120+ min (Over 2 hours)</option>
              </select>
              <ChevronDown className="select-chevron" size={14} />
            </div>
          </div>

          {/* Online bookings */}
          <div className="filter-group">
            <label>Online bookings</label>
            <div className="select-wrapper">
              <select
                className="form-select-custom"
                value={draft.onlineBooking}
                onChange={(e) => set("onlineBooking", e.target.value)}
              >
                <option>All status</option>
                <option>Enabled</option>
                <option>Disabled</option>
              </select>
              <ChevronDown className="select-chevron" size={14} />
            </div>
          </div>

          {/* Commissions */}
          <div className="filter-group">
            <label>Commissions</label>
            <div className="select-wrapper">
              <select
                className="form-select-custom"
                value={draft.commissions}
                onChange={(e) => set("commissions", e.target.value)}
              >
                <option>All status</option>
                <option>Enabled</option>
                <option>Disabled</option>
              </select>
              <ChevronDown className="select-chevron" size={14} />
            </div>
          </div>

          {/* Resource requirements */}
          <div className="filter-group">
            <label>Resource requirements</label>
            <div className="select-wrapper">
              <select
                className="form-select-custom"
                value={draft.resourceRequirements}
                onChange={(e) => set("resourceRequirements", e.target.value)}
              >
                <option>All status</option>
                <option>Required</option>
                <option>Not required</option>
              </select>
              <ChevronDown className="select-chevron" size={14} />
            </div>
          </div>
        </div>

        <footer className="service-filters-modal__footer">
          <button className="btn-clear-rounded" onClick={handleClear}>
            Clear filters
          </button>
          <button className="btn-apply-rounded" onClick={handleApply}>
            Apply
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ServiceFilterDrawer;
