import React, { useState } from "react";
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
        <div className="service-filters-modal-overlay">
            <div className="service-filters-modal" onClick={(e) => e.stopPropagation()}>
                <header className="service-filters-modal__header">
                    <h2>Filters</h2>
                    <button className="close-btn" onClick={onClose}>
                        <i className="bi bi-x-lg" />
                    </button>
                </header>

                <div className="service-filters-modal__body">
                    <div className="filter-field">
                        <label>Status</label>
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        >
                            <option>Active</option>
                            <option>Inactive</option>
                            <option>All status</option>
                        </select>
                    </div>

                    <div className="filter-field">
                        <label>Type</label>
                        <select
                            value={filters.type}
                            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                        >
                            <option>All types</option>
                            <option>Service</option>
                            <option>Product</option>
                        </select>
                    </div>

                    <div className="filter-field">
                        <label>Team member</label>
                        <select
                            value={filters.teamMember}
                            onChange={(e) => setFilters({ ...filters, teamMember: e.target.value })}
                        >
                            <option>Any team member</option>
                            <option>John Doe</option>
                            <option>Jane Smith</option>
                        </select>
                    </div>

                    <div className="filter-field">
                        <label>Online bookings</label>
                        <select
                            value={filters.onlineBooking}
                            onChange={(e) => setFilters({ ...filters, onlineBooking: e.target.value })}
                        >
                            <option>All status</option>
                            <option>Enabled</option>
                            <option>Disabled</option>
                        </select>
                    </div>

                    <div className="filter-field">
                        <label>Commissions</label>
                        <select
                            value={filters.commissions}
                            onChange={(e) => setFilters({ ...filters, commissions: e.target.value })}
                        >
                            <option>All status</option>
                            <option>Enabled</option>
                            <option>Disabled</option>
                        </select>
                    </div>

                    <div className="filter-field">
                        <label>Resource requirements</label>
                        <select
                            value={filters.resourceRequirements}
                            onChange={(e) => setFilters({ ...filters, resourceRequirements: e.target.value })}
                        >
                            <option>All status</option>
                            <option>Required</option>
                            <option>Not required</option>
                        </select>
                    </div>
                </div>

                <footer className="service-filters-modal__footer">
                    <button className="btn-cancel" onClick={onClose}>Cancel</button>
                    <button className="btn-apply" onClick={handleApply}>Apply</button>
                </footer>
            </div>
        </div>
    );
};

export default ServiceFilterDrawer;
