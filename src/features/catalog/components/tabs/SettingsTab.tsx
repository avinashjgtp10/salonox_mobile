import React from "react";
import type { SettingsData } from "../../types/catalog.types.ts";

interface Props {
    data: SettingsData;
    onChange: (data: SettingsData) => void;
}

const SettingsTab: React.FC<Props> = ({ data, onChange }) => {
    const update = (key: keyof SettingsData, value: any) => onChange({ ...data, [key]: value });

    return (
        <div className="tab-content-panel">
            <h5 className="tab-content-panel__title">Settings</h5>
            <div className="row g-4">
                <div className="col-12">
                    <div className="card">
                        <div className="card-body">
                            <h6 className="card-title">Cancellation Policy</h6>
                            <div className="mb-3">
                                <label className="form-label">Cancellation Notice (hours)</label>
                                <input type="number" className="form-control" min={0} value={data.cancellationNoticeHours}
                                    onChange={(e) => update("cancellationNoticeHours", Number(e.target.value))} />
                            </div>
                            <div className="form-check form-switch mb-3">
                                <input className="form-check-input" type="checkbox" id="chargeCancellationFee"
                                    checked={data.chargeCancellationFee} onChange={(e) => update("chargeCancellationFee", e.target.checked)} />
                                <label className="form-check-label" htmlFor="chargeCancellationFee">Charge cancellation fee</label>
                            </div>
                            {data.chargeCancellationFee && (
                                <div className="mb-3">
                                    <label className="form-label">Fee Amount ($)</label>
                                    <div className="input-group">
                                        <span className="input-group-text">$</span>
                                        <input type="number" className="form-control" min={0} step={0.01} value={data.cancellationFeeAmount}
                                            onChange={(e) => update("cancellationFeeAmount", parseFloat(e.target.value))} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="col-12">
                    <div className="card">
                        <div className="card-body">
                            <h6 className="card-title">Visibility</h6>
                            <div className="form-check form-switch mb-2">
                                <input className="form-check-input" type="checkbox" id="visibleToClients"
                                    checked={data.visibleToClients} onChange={(e) => update("visibleToClients", e.target.checked)} />
                                <label className="form-check-label" htmlFor="visibleToClients">Visible to clients</label>
                            </div>
                            <div className="form-check form-switch">
                                <input className="form-check-input" type="checkbox" id="taxable"
                                    checked={data.taxable} onChange={(e) => update("taxable", e.target.checked)} />
                                <label className="form-check-label" htmlFor="taxable">Taxable</label>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-12">
                    <div className="card">
                        <div className="card-body">
                            <h6 className="card-title">Color Label</h6>
                            <div className="d-flex gap-2 flex-wrap">
                                {["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#8b5cf6"].map((color: string) => (
                                    <button key={color} className={`color-swatch ${data.colorLabel === color ? "selected" : ""}`}
                                        style={{ backgroundColor: color }} onClick={() => update("colorLabel", color)} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsTab;