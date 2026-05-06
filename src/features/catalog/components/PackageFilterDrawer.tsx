import React, { useState } from "react";
import { X, ChevronDown } from "react-bootstrap-icons";
import Button from "../../../components/ui/Button";
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
              <select
                className="form-select-custom"
                value={filters.category}
                onChange={(e) =>
                  setFilters({ ...filters, category: e.target.value })
                }
              >
                <option>All categories</option>
                <option>Spa</option>
                <option>Hair</option>
                <option>Skin</option>
                <option>Nails</option>
                <option>Body</option>
              </select>
              <ChevronDown className="select-chevron" size={14} />
            </div>
          </div>

          {/* Status filter */}
          <div className="filter-group">
            <label>Status</label>
            <div className="select-wrapper">
              <select
                className="form-select-custom"
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
              >
                <option>All statuses</option>
                <option>Active</option>
                <option>Draft</option>
                <option>Inactive</option>
              </select>
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
