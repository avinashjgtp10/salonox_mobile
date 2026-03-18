import React from "react";
import { ChevronDown, InfoCircle } from "react-bootstrap-icons";
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
            
            <div className="settings-section mb-5">
                <h6 className="fw-bold mb-3 small text-muted text-uppercase">Cancellation policy</h6>
                <div className="mb-4">
                    <label className="form-label small fw-medium mb-1">Cancellation notice</label>
                    <div className="custom-select-wrapper">
                        <select className="form-select premium-input" value={data.cancellationNoticeHours}
                            onChange={(e) => update("cancellationNoticeHours", Number(e.target.value))}>
                            <option value={0}>No notice required</option>
                            <option value={1}>1 hour</option>
                            <option value={4}>4 hours</option>
                            <option value={24}>24 hours</option>
                            <option value={48}>48 hours</option>
                            <option value={72}>72 hours</option>
                        </select>
                        <ChevronDown className="select-icon" />
                    </div>
                </div>

                <div className="form-check form-switch d-flex align-items-center gap-3 mb-4">
                    <input 
                        className="form-check-input" 
                        type="checkbox" 
                        id="chargeCancellationFee"
                        checked={data.chargeCancellationFee} 
                        onChange={(e) => update("chargeCancellationFee", e.target.checked)} 
                    />
                    <label className="form-check-label fw-bold" htmlFor="chargeCancellationFee">Charge cancellation fee</label>
                </div>

                {data.chargeCancellationFee && (
                    <div className="mb-4 animate-fade-in">
                        <label className="form-label small fw-medium mb-1">Fee amount</label>
                        <div className="input-group">
                            <span className="input-group-text bg-white border-end-0">$</span>
                            <input type="number" className="form-control premium-input border-start-0" min={0} step={0.01} value={data.cancellationFeeAmount}
                                onChange={(e) => update("cancellationFeeAmount", parseFloat(e.target.value))} />
                        </div>
                    </div>
                )}
            </div>

            <div className="settings-section mb-5">
                <h6 className="fw-bold mb-3 small text-muted text-uppercase">Visibility & Tax</h6>
                <div className="form-check form-switch d-flex align-items-center gap-3 mb-3">
                    <input 
                        className="form-check-input" 
                        type="checkbox" 
                        id="visibleToClients"
                        checked={data.visibleToClients} 
                        onChange={(e) => update("visibleToClients", e.target.checked)} 
                    />
                    <label className="form-check-label fw-bold" htmlFor="visibleToClients">Visible to clients</label>
                </div>
                <div className="form-check form-switch d-flex align-items-center gap-3">
                    <input 
                        className="form-check-input" 
                        type="checkbox" 
                        id="taxable"
                        checked={data.taxable} 
                        onChange={(e) => update("taxable", e.target.checked)} 
                    />
                    <label className="form-check-label fw-bold" htmlFor="taxable">Taxable</label>
                </div>
            </div>

            <div className="settings-section mb-5">
                <h6 className="fw-bold mb-3 small text-muted text-uppercase">Service color</h6>
                <p className="text-muted small mb-3">Select a color to help identify this service on your calendar</p>
                <div className="d-flex gap-2 flex-wrap p-3 rounded-4 bg-light">
                    {["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#8b5cf6", "#14b8a6", "#34495e"].map((color: string) => (
                        <button 
                            key={color} 
                            className={`color-swatch rounded-circle border-0 d-flex align-items-center justify-content-center ${data.colorLabel === color ? "active ring ring-offset-2" : ""}`}
                            style={{ 
                                backgroundColor: color, 
                                width: '32px', 
                                height: '32px', 
                                transition: 'all 0.2s',
                                boxShadow: data.colorLabel === color ? `0 0 0 2px white, 0 0 0 4px ${color}` : 'none'
                            }} 
                            onClick={() => update("colorLabel", color)} 
                        />
                    ))}
                </div>
            </div>

            <div className="mt-5 p-3 rounded-4 bg-light d-flex gap-3">
                <InfoCircle className="text-primary mt-1" size={18} />
                <p className="small text-muted mb-0">
                    Cancellation fees can be automatically charged when clients cancel appointments late or don't show up.
                    <a href="#" className="text-primary text-decoration-none ms-1">Manage payment settings</a>
                </p>
            </div>
        </div>
    );
};

export default SettingsTab;