import React from "react";
import { PlusCircle, ChevronDown } from "react-bootstrap-icons";
import type { BasicDetailsData } from "../../types/catalog.types.ts";

interface Props {
    data: BasicDetailsData;
    onChange: (data: BasicDetailsData) => void;
    serviceType: "single" | "bundle";
    errors?: string[];
}

const BasicDetailsTab: React.FC<Props> = ({ data, onChange, errors = [] }) => {
    const update = (key: keyof BasicDetailsData, value: any) => onChange({ ...data, [key]: value });
    const hasError = (field: string) => errors.some(err => err.toLowerCase().includes(field.toLowerCase()));

    return (
        <div className="tab-content-panel">
            <h5 className="tab-content-panel__title">Basic details</h5>

            <div className="form-section mb-5">
                <div className="row g-3">
                    <div className="col-12">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <label className="form-label mb-0">Service name</label>
                            <span className="text-muted extra-small">{data.name.length}/255</span>
                        </div>
                        <input
                            type="text"
                            className={`form-control premium-input ${hasError("name") ? "border-danger" : ""}`}
                            placeholder="Add a service name, e.g. Men's Haircut"
                            value={data.name}
                            onChange={(e) => update("name", e.target.value)}
                        />
                        {hasError("name") && <div className="text-danger small mt-1">Service name is required</div>}
                    </div>

                    <div className="col-md-6">
                        <label className="form-label">Menu category</label>
                        <div className="custom-select-wrapper category-select">
                            <select className={`form-select ${hasError("category") ? "border-danger" : ""}`} value={data.categoryId} onChange={(e) => update("categoryId", e.target.value)}>
                                <option value="">Select category</option>
                                <option value="1">● Hair & styling</option>
                                <option value="2">● Skincare</option>
                            </select>
                            <ChevronDown className="select-icon" />
                        </div>
                        <div className="text-muted extra-small mt-2">The category displayed to you, and to clients online</div>
                        {hasError("category") && <div className="text-danger small mt-1">Category is required</div>}
                    </div>

                    <div className="col-md-6">
                        <label className="form-label">Treatment type</label>
                        <div className="custom-select-wrapper">
                            <select className="form-select">
                                <option value="">Select treatment type</option>
                            </select>
                            <ChevronDown className="select-icon" />
                        </div>
                        <div className="text-muted extra-small mt-2">Used to help clients find your service on the salonox marketplace</div>
                    </div>

                    <div className="col-12">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <label className="form-label mb-0">Description <span className="text-muted fw-normal">(Optional)</span></label>
                            <span className="text-muted extra-small">{data.description.length}/1000</span>
                        </div>
                        <textarea
                            className="form-control premium-input"
                            rows={3}
                            placeholder="Add a short description"
                            value={data.description}
                            onChange={(e) => update("description", e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="pricing-section pt-4 mt-2">
                <h5 className="tab-content-panel__title">Pricing and duration</h5>
                <div className="row g-3">
                    <div className="col-md-4">
                        <label className="form-label">Price type</label>
                        <div className="custom-select-wrapper">
                            <select className="form-select" defaultValue="Fixed">
                                <option value="Fixed">Fixed</option>
                                <option value="Variable">Variable</option>
                            </select>
                            <ChevronDown className="select-icon" />
                        </div>
                    </div>

                    <div className="col-md-4">
                        <label className="form-label">Price</label>
                        <div className={`input-group premium-group ${hasError("price") ? "border-danger" : ""}`} style={{ height: "40px" }}>
                            <span className="input-group-text bg-white border-0 pe-1 text-muted" style={{ fontSize: "14px" }}>₹</span>
                            <input
                                type="number"
                                className="form-control border-0 ps-2 shadow-none"
                                placeholder="0.00"
                                style={{ fontSize: "14.5px" }}
                                value={data.price}
                                onChange={(e) => update("price", parseFloat(e.target.value))}
                            />
                        </div>
                        {hasError("price") && <div className="text-danger small mt-1">Price is required</div>}
                    </div>

                    <div className="col-md-4">
                        <label className="form-label">Duration</label>
                        <div className="custom-select-wrapper">
                            <select className="form-select" value={data.duration} onChange={(e) => update("duration", Number(e.target.value))}>
                                <option value={30}>30min</option>
                                <option value={60}>1h</option>
                                <option value={90}>1h 30min</option>
                            </select>
                            <ChevronDown className="select-icon" />
                        </div>
                    </div>
                </div>

                <div className="action-row mt-4 pt-2 d-flex gap-2">
                    <button className="btn btn-outline-dark rounded-pill px-3 d-flex align-items-center gap-2">
                        <PlusCircle size={14} /> <span>Add extra time</span>
                    </button>
                    <div className="dropdown">
                        <button className="btn btn-outline-dark rounded-pill px-3 d-flex align-items-center gap-2">
                            <span>Options</span> <ChevronDown size={12} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BasicDetailsTab;
