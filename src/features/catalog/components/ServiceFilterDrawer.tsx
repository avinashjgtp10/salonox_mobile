import React, { useState } from "react";
import { X, ChevronDown } from "react-bootstrap-icons";
import { useServiceFilters } from "../hooks/useServiceFilters";
import type { ServiceFiltersState } from "../../../store/serviceFiltersSlice";
import "../styles/ServiceFilterDrawer.scss";

interface Props {
  onClose: () => void;
}

const ServiceFilterDrawer: React.FC<Props> = ({
  onClose,
}) => {
  const { filters: reduxFilters, apply, reset, activeCount } = useServiceFilters();

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
            <X size={28} />
          </button>
        </header>

        <div className="service-filters-modal__body">
          {/* Status */}
          <div className="filter-group">
            <label>Status</label>
            <div className="select-wrapper">
              <select
                className="form-select-custom"
                value={draft.status}
                onChange={(e) => set("status", e.target.value)}
              >
                <option>All status</option>
                <option>Active</option>
                <option>Inactive</option>
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
            Clear all
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
