import React from "react";
import type { OnlineBookingData } from "../../types/catalog.types.ts";

interface Props {
    data: OnlineBookingData;
    onChange: (data: OnlineBookingData) => void;
}

const OnlineBookingTab: React.FC<Props> = ({ data, onChange }) => {
    const update = (key: keyof OnlineBookingData, value: any) => onChange({ ...data, [key]: value });

    return (
        <div className="tab-content-panel">
            <h5 className="tab-content-panel__title">Online Booking</h5>
            <div className="mb-4">
                <div className="form-check form-switch">
                    <input className="form-check-input" type="checkbox" id="onlineBookingEnabled"
                        checked={data.enabled} onChange={(e) => update("enabled", e.target.checked)} />
                    <label className="form-check-label" htmlFor="onlineBookingEnabled">Enable online booking for this service</label>
                </div>
            </div>
            {data.enabled && (
                <>
                    <div className="mb-3">
                        <label className="form-label">Online Description</label>
                        <textarea className="form-control" rows={3} value={data.onlineDescription}
                            placeholder="Description shown to clients during online booking..."
                            onChange={(e) => update("onlineDescription", e.target.value)} />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Maximum Advance Booking (days)</label>
                        <input type="number" className="form-control" min={1} value={data.maxAdvanceDays}
                            onChange={(e) => update("maxAdvanceDays", Number(e.target.value))} />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Minimum Notice (hours)</label>
                        <input type="number" className="form-control" min={0} value={data.minNoticeHours}
                            onChange={(e) => update("minNoticeHours", Number(e.target.value))} />
                    </div>
                    <div className="mb-3">
                        <div className="form-check form-switch">
                            <input className="form-check-input" type="checkbox" id="requireDepositSwitch"
                                checked={data.requireDeposit} onChange={(e) => update("requireDeposit", e.target.checked)} />
                            <label className="form-check-label" htmlFor="requireDepositSwitch">Require deposit at booking</label>
                        </div>
                    </div>
                    {data.requireDeposit && (
                        <div className="mb-3">
                            <label className="form-label">Deposit Amount ($)</label>
                            <div className="input-group">
                                <span className="input-group-text">$</span>
                                <input type="number" className="form-control" min={0} step={0.01} value={data.depositAmount}
                                    onChange={(e) => update("depositAmount", parseFloat(e.target.value))} />
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default OnlineBookingTab;