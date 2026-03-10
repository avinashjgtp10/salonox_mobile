import React from "react";
import type { BasicDetailsData } from "../../types/catalog.types.ts";

interface Props {
    data: BasicDetailsData;
    onChange: (data: BasicDetailsData) => void;
    serviceType: "single" | "bundle";
}

const BasicDetailsTab: React.FC<Props> = ({ data, onChange, serviceType }) => {
    const update = (key: keyof BasicDetailsData, value: any) => onChange({ ...data, [key]: value });

    return (
        <div className="tab-content-panel">
            <h5 className="tab-content-panel__title">Basic Details</h5>
            <div className="row g-3">
                <div className="col-12">
                    <label className="form-label">Service Name</label>
                    <input type="text" className="form-control" placeholder={serviceType === "bundle" ? "Bundle name" : "e.g. Haircut & Style"}
                        value={data.name} onChange={(e) => update("name", e.target.value)} />
                </div>
                <div className="col-12">
                    <label className="form-label">Category</label>
                    <select className="form-select" value={data.categoryId} onChange={(e) => update("categoryId", e.target.value)}>
                        <option value="">Select category</option>
                    </select>
                </div>
                <div className="col-md-6">
                    <label className="form-label">Duration (minutes)</label>
                    <input type="number" className="form-control" min={1} value={data.duration} onChange={(e) => update("duration", Number(e.target.value))} />
                </div>
                <div className="col-md-6">
                    <label className="form-label">Price ($)</label>
                    <div className="input-group">
                        <span className="input-group-text">$</span>
                        <input type="number" className="form-control" min={0} step={0.01} value={data.price} onChange={(e) => update("price", parseFloat(e.target.value))} />
                    </div>
                </div>
                <div className="col-md-6">
                    <label className="form-label">Padding Before (minutes)</label>
                    <input type="number" className="form-control" min={0} value={data.paddingBefore} onChange={(e) => update("paddingBefore", Number(e.target.value))} />
                </div>
                <div className="col-md-6">
                    <label className="form-label">Padding After (minutes)</label>
                    <input type="number" className="form-control" min={0} value={data.paddingAfter} onChange={(e) => update("paddingAfter", Number(e.target.value))} />
                </div>
                <div className="col-12">
                    <label className="form-label">Description</label>
                    <textarea className="form-control" rows={3} placeholder="Describe the service..." value={data.description} onChange={(e) => update("description", e.target.value)} />
                </div>
                <div className="col-12">
                    <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" id="activeSwitch" checked={data.active} onChange={(e) => update("active", e.target.checked)} />
                        <label className="form-check-label" htmlFor="activeSwitch">Active</label>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BasicDetailsTab;