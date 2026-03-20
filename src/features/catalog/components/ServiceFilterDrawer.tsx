import React, { useState } from "react";
import { X, ChevronDown } from "react-bootstrap-icons";
import "../styles/ServiceFilterDrawer.scss";

interface FilterState {
    status: string;
    type: string;
    teamMember: string;
    onlineBooking: string;
    commissions: string;
    resourceRequirements: string;
}

interface Props {
    onClose: () => void;
    onApply?: (filters: FilterState) => void;
}

const ServiceFilterDrawer: React.FC<Props> = ({ onClose, onApply }) => {
    const [filters, setFilters] = useState<FilterState>({
        status: "Active",
        type: "All types",
        teamMember: "Any team member",
        onlineBooking: "All status",
        commissions: "All status",
        resourceRequirements: "All status",
    });

    const handleApply = () => {
        onApply?.(filters);
        onClose();
    };

    return (
        <div className="service-filters-modal-overlay" onClick={onClose}>
            <div className="service-filters-modal shadow-lg" onClick={(e) => e.stopPropagation()}>
                <header className="service-filters-modal__header">
                    <h4 className="modal-title">Filters</h4>
                    <button className="close-icon-btn" onClick={onClose}>
                        <X size={28} />
                    </button>
                </header>

                <div className="service-filters-modal__body">
                    <div className="filter-group">
                        <label>Status</label>
                        <div className="select-wrapper">
                            <select
                                className="form-select-custom"
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            >
                                <option>Active</option>
                                <option>Inactive</option>
                                <option>All status</option>
                            </select>
                            <ChevronDown className="select-chevron" size={14} />
                        </div>
                    </div>

                    <div className="filter-group">
                        <label>Type</label>
                        <div className="select-wrapper">
                            <select
                                className="form-select-custom"
                                value={filters.type}
                                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                            >
                                <option>All types</option>
                                <option>Service</option>
                                <option>Product</option>
                            </select>
                            <ChevronDown className="select-chevron" size={14} />
                        </div>
                    </div>

                    <div className="filter-group">
                        <label>Team member</label>
                        <div className="select-wrapper">
                            <select
                                className="form-select-custom"
                                value={filters.teamMember}
                                onChange={(e) => setFilters({ ...filters, teamMember: e.target.value })}
                            >
                                <option>Any team member</option>
                                <option>John Doe</option>
                                <option>Jane Smith</option>
                            </select>
                            <ChevronDown className="select-chevron" size={14} />
                        </div>
                    </div>

                    <div className="filter-group">
                        <label>Online bookings</label>
                        <div className="select-wrapper">
                            <select
                                className="form-select-custom"
                                value={filters.onlineBooking}
                                onChange={(e) => setFilters({ ...filters, onlineBooking: e.target.value })}
                            >
                                <option>All status</option>
                                <option>Enabled</option>
                                <option>Disabled</option>
                            </select>
                            <ChevronDown className="select-chevron" size={14} />
                        </div>
                    </div>

                    <div className="filter-group">
                        <label>Commissions</label>
                        <div className="select-wrapper">
                            <select
                                className="form-select-custom"
                                value={filters.commissions}
                                onChange={(e) => setFilters({ ...filters, commissions: e.target.value })}
                            >
                                <option>All status</option>
                                <option>Enabled</option>
                                <option>Disabled</option>
                            </select>
                            <ChevronDown className="select-chevron" size={14} />
                        </div>
                    </div>

                    <div className="filter-group">
                        <label>Resource requirements</label>
                        <div className="select-wrapper">
                            <select
                                className="form-select-custom"
                                value={filters.resourceRequirements}
                                onChange={(e) => setFilters({ ...filters, resourceRequirements: e.target.value })}
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
                    <button className="btn-cancel-rounded" onClick={onClose}>Cancel</button>
                    <button className="btn-apply-rounded" onClick={handleApply}>Apply</button>
                </footer>
            </div>
        </div>
    );
};

export default ServiceFilterDrawer;
