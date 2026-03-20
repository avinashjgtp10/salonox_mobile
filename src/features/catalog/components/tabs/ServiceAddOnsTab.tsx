import React from "react";
import type { ServiceAddOnsData } from "../../types/catalog.types.ts";

interface Props {
    data: ServiceAddOnsData;
    onChange: (data: ServiceAddOnsData) => void;
}

const ServiceAddOnsTab: React.FC<Props> = ({ data, onChange }) => {
    return (
        <div className="tab-content-panel">
            <h5 className="tab-content-panel__title">Service add-ons</h5>

            <div className="premium-empty-state d-flex flex-column align-items-center justify-content-center p-5 mt-4" style={{ minHeight: '320px' }}>
                <div className="addon-icon-wrapper mb-4">
                    <div className="abstract-icon d-flex align-items-center justify-content-center rounded-4 shadow-sm"
                        style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #e0e7ff, #fdf4ff)' }}>
                        <i className="bi bi-plus-square-dotted fs-3 text-primary-emphasis" />
                    </div>
                </div>
                <h6 className="fw-bold text-dark mb-2">Service add-ons</h6>
                <p className="text-muted small text-center px-4 mb-4">
                    Allow clients to add customizations and extras to their booking.
                    <a href="#" className="text-primary text-decoration-none ms-1">Learn more</a>
                </p>
                <button className="btn btn-outline-dark rounded-pill px-4 fw-bold small">Add group</button>
            </div>
        </div>
    );
};

export default ServiceAddOnsTab;
