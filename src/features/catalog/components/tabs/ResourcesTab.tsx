import React from "react";
import type { ResourcesData, Resource } from "../../types/catalog.types.ts";

interface Props {
    data: ResourcesData;
    onChange: (data: ResourcesData) => void;
}

const ResourcesTab: React.FC<Props> = ({ data, onChange }) => (
    <div className="tab-content-panel">
        <h5 className="tab-content-panel__title">Resources</h5>
        <p className="text-muted mb-3">Assign rooms or equipment required for this service.</p>
        <div className="form-check form-switch mb-3">
            <input className="form-check-input" type="checkbox" id="requireResourceSwitch"
                checked={data.requireResource} onChange={(e) => onChange({ ...data, requireResource: e.target.checked })} />
            <label className="form-check-label" htmlFor="requireResourceSwitch">Requires a resource (room/equipment)</label>
        </div>
        {data.requireResource && (
            <div>
                <label className="form-label">Select Resource</label>
                <select className="form-select" value={data.selectedResourceId} onChange={(e) => onChange({ ...data, selectedResourceId: e.target.value })}>
                    <option value="">Choose a resource</option>
                    {data.availableResources.map((r: Resource) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
            </div>
        )}
    </div>
);

export default ResourcesTab;