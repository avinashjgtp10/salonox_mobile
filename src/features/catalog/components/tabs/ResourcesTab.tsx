import React from "react";
import type { ResourcesData } from "../../types/catalog.types.ts";

interface Props {
    data: ResourcesData;
    onChange: (data: ResourcesData) => void;
}

const ResourcesTab: React.FC<Props> = () => (
    <div className="tab-content-panel">
        <h5 className="tab-content-panel__title">Resources</h5>

        <div className="premium-empty-state d-flex flex-column align-items-center justify-content-center p-5 border rounded-4 bg-white mt-4" style={{ minHeight: '320px' }}>
            <div className="resource-icons-strip mb-4 d-flex gap-2">
                {/* Mocked icon strip representing resources */}
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="resource-icon d-flex align-items-center justify-content-center rounded-3 bg-light"
                        style={{ width: '40px', height: '40px', opacity: 0.5 + (i * 0.05) }}>
                        <i className={`bi bi-${['house', 'door-open', 'lamp', 'box', 'cup-hot', 'archive', 'tools', 'display'][i % 8]}`} />
                    </div>
                ))}
            </div>
            <h6 className="fw-bold text-dark mb-2">No resources set up</h6>
            <p className="text-muted small text-center px-4 mb-4">
                Add resources to your services and set when they're available for booking.
                <a href="#" className="text-primary text-decoration-none ms-1">Manage your resources</a> to enable bookings without a team member and track usage and revenue.
            </p>
        </div>
    </div>
);

export default ResourcesTab;