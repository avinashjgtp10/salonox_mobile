import React, { useState } from "react";
import { X, ChevronDown } from "react-bootstrap-icons";
import Button from "../../../components/ui/Button";
import "../styles/Membershipfilterdrawer.scss";

interface FilterState {
  validFor: string;
}

interface Props {
  onClose:         () => void;
  onApply?:        (filters: FilterState) => void;
  initialFilters?: FilterState;
}

const DEFAULT: FilterState = {
  validFor: "Any period",
};

const MembershipFilterDrawer: React.FC<Props> = ({
  onClose, onApply, initialFilters,
}) => {
  const [filters, setFilters] = useState<FilterState>(initialFilters ?? DEFAULT);

  const handleApply = () => {
    onApply?.(filters);
    onClose();
  };

  const handleClear = () => {
    setFilters(DEFAULT);
    onApply?.(DEFAULT);
    onClose();
  };

  const activeCount = filters.validFor !== "Any period" ? 1 : 0;

  return (
    <div className="membership-filters-overlay" onClick={onClose}>
      <div
        className="membership-filters-drawer shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="membership-filters-drawer__header">
          <h4 className="modal-title">
            Filters {activeCount > 0 && (
              <span className="filter-count-badge">{activeCount}</span>
            )}
          </h4>
          <button className="close-icon-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </header>

        <div className="membership-filters-drawer__body">
          {/* Valid for filter — maps directly to backend validFor field */}
          <div className="filter-group">
            <label>Valid for</label>
            <div className="select-wrapper">
              <select
                className="form-select-custom"
                value={filters.validFor}
                onChange={(e) =>
                  setFilters({ ...filters, validFor: e.target.value })
                }
              >
                <option>Any period</option>
                <option value="1 month">1 month</option>
                <option value="2 months">2 months</option>
                <option value="3 months">3 months</option>
                <option value="6 months">6 months</option>
                <option value="1 year">1 year</option>
              </select>
              <ChevronDown className="select-chevron" size={14} />
            </div>
          </div>
        </div>

        <footer className="membership-filters-drawer__footer">
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

export default MembershipFilterDrawer;
