import React, { useState } from "react";
import { X, ChevronDown } from "react-bootstrap-icons";
import Button from "../../../components/ui/Button";
import "../styles/Membershipfilterdrawer.scss";

interface FilterState {
    sessions: string;
    payment: string;
    validFor: string;
    onlyAllServices: boolean;
}

interface Props {
    onClose: () => void;
    onApply?: (filters: FilterState) => void;
    initialFilters?: FilterState;
}

const MembershipFilterDrawer: React.FC<Props> = ({ onClose, onApply, initialFilters }) => {
    const [filters, setFilters] = useState<FilterState>(initialFilters || {
        sessions: "Any number of sessions",
        payment: "All",
        validFor: "Any period",
        onlyAllServices: false,
    });

    const handleApply = () => {
        onApply?.(filters);
        onClose();
    };

    const handleClear = () => {
        setFilters({
            sessions: "Any number of sessions",
            payment: "All",
            validFor: "Any period",
            onlyAllServices: false,
        });
    };

    return (
        <div className="membership-filters-overlay" onClick={onClose}>
            <div className="membership-filters-drawer shadow-lg" onClick={(e) => e.stopPropagation()}>
                <header className="membership-filters-drawer__header">
                    <h4 className="modal-title">Filters</h4>
                    <button className="close-icon-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </header>

                <div className="membership-filters-drawer__body">
                    <div className="filter-group">
                        <label>Sessions</label>
                        <div className="select-wrapper">
                            <select
                                className="form-select-custom"
                                value={filters.sessions}
                                onChange={(e) => setFilters({ ...filters, sessions: e.target.value })}
                            >
                                <option>Any number of sessions</option>
                                <option>1 session</option>
                                <option>5 sessions</option>
                                <option>10 sessions</option>
                            </select>
                            <ChevronDown className="select-chevron" size={14} />
                        </div>
                    </div>

                    <div className="filter-group">
                        <label>Payment</label>
                        <div className="select-wrapper">
                            <select
                                className="form-select-custom"
                                value={filters.payment}
                                onChange={(e) => setFilters({ ...filters, payment: e.target.value })}
                            >
                                <option>All</option>
                                <option>Upfront</option>
                                <option>Recurring</option>
                            </select>
                            <ChevronDown className="select-chevron" size={14} />
                        </div>
                    </div>

                    <div className="filter-group">
                        <label>Valid for</label>
                        <div className="select-wrapper">
                            <select
                                className="form-select-custom"
                                value={filters.validFor}
                                onChange={(e) => setFilters({ ...filters, validFor: e.target.value })}
                            >
                                <option>Any period</option>
                                <option>1 month</option>
                                <option>3 months</option>
                                <option>1 year</option>
                            </select>
                            <ChevronDown className="select-chevron" size={14} />
                        </div>
                    </div>

                    <div className="filter-group checkbox-group">
                        <label className="checkbox-container">
                            <input
                                type="checkbox"
                                checked={filters.onlyAllServices}
                                onChange={(e) => setFilters({ ...filters, onlyAllServices: e.target.checked })}
                            />
                            <span className="checkmark"></span>
                            Display only memberships which cover all services
                        </label>
                    </div>
                </div>

                <footer className="membership-filters-drawer__footer">
                    <Button variant="outline-dark" pill fullWidth onClick={handleClear}>Clear filters</Button>
                    <Button variant="dark" pill fullWidth onClick={handleApply}>Apply</Button>
                </footer>
            </div>
        </div>
    );
};

export default MembershipFilterDrawer;
