import React, { useState } from "react";
import { X, ChevronDown } from "react-bootstrap-icons";
import Button from "../../../components/ui/Button";
import Dropdown from "../../../components/ui/Dropdown";
import "../styles/PackageFilterDrawer.scss";

export interface PackageFilterState {
  category: string;
  status:   string;
}

interface Props {
  onClose:         () => void;
  onApply?:        (filters: PackageFilterState) => void;
  initialFilters?: PackageFilterState;
}

const DEFAULT_FILTERS: PackageFilterState = {
  category: "All categories",
  status:   "All statuses",
};

const PackageFilterDrawer: React.FC<Props> = ({
  onClose, onApply, initialFilters,
}) => {
  const [filters, setFilters] = useState<PackageFilterState>(initialFilters ?? DEFAULT_FILTERS);

  const handleApply = () => {
    onApply?.(filters);
    onClose();
  };

  const handleClear = () => setFilters(DEFAULT_FILTERS);

  const activeCount = [
    filters.category !== "All categories",
    filters.status   !== "All statuses",
  ].filter(Boolean).length;

  return (
    <div className="pkg-filters-overlay" onClick={onClose}>
      <div
        className="pkg-filters-drawer shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="pkg-filters-drawer__header">
          <h4 className="modal-title">
            Filters {activeCount > 0 && (
              <span className="filter-count-badge">{activeCount}</span>
            )}
          </h4>
          <button className="close-icon-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </header>

        <div className="pkg-filters-drawer__body">

          {/* Category filter */}
          <div className="filter-group">
            <label>Category</label>
            <div className="select-wrapper">
              <Dropdown
                className="form-select-custom"
                searchable={false}
                value={filters.category}
                options={["All categories", "Spa", "Hair", "Skin", "Nails", "Body"].map((s) => ({ id: s, name: s }))}
                onChange={(id) => setFilters({ ...filters, category: id })}
              />
              <ChevronDown className="select-chevron" size={14} />
            </div>
          </div>

          {/* Status filter */}
          <div className="filter-group">
            <label>Status</label>
            <div className="select-wrapper">
              <Dropdown
                className="form-select-custom"
                searchable={false}
                value={filters.status}
                options={["All statuses", "Active", "Draft", "Inactive"].map((s) => ({ id: s, name: s }))}
                onChange={(id) => setFilters({ ...filters, status: id })}
              />
              <ChevronDown className="select-chevron" size={14} />
            </div>
          </div>

        </div>

        <footer className="pkg-filters-drawer__footer">
          <Button variant="outline-dark" pill fullWidth onClick={handleClear}>
            Clear filters
          </Button>
          <Button variant="dark" pill fullWidth onClick={handleApply}>
            Apply
          </Button>
        </footer>
      </div>
    </div>
  );
};

export default PackageFilterDrawer;
