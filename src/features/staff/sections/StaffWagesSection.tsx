import React, { useState } from "react";

const StaffWagesSection: React.FC = () => {
  const [payType, setPayType] = useState("hourly");

  return (
    <div className="section staff-form">
      <h4 className="section__title">Wages and timesheets</h4>
      <p className="section__subtitle">Set pay rates and manage timesheet tracking</p>

      <div className="mb-4">
        <label className="form-label">Pay type</label>
        <div className="d-flex gap-2">
          {["hourly", "salary", "none"].map((type) => (
            <button key={type} type="button" className="btn btn-sm"
              style={{
                borderRadius: 20, padding: "6px 18px", fontSize: 13, border: "none",
                fontWeight: payType === type ? 600 : 400,
                background: payType === type ? "#1a1a1a" : "#f3f4f6",
                color: payType === type ? "#fff" : "#374151",
              }}
              onClick={() => setPayType(type)}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {payType === "hourly" && (
        <div className="row g-3 mb-3">
          <div className="col-6">
            <label className="form-label">Hourly rate</label>
            <div className="input-group">
              <span className="input-group-text">₹</span>
              <input type="number" className="form-control" placeholder="0.00" min={0} step={0.5} />
            </div>
          </div>
          <div className="col-6">
            <label className="form-label">Overtime rate</label>
            <div className="input-group">
              <span className="input-group-text">₹</span>
              <input type="number" className="form-control" placeholder="0.00" min={0} step={0.5} />
            </div>
          </div>
        </div>
      )}

      {payType === "salary" && (
        <div className="mb-3">
          <label className="form-label">Annual salary</label>
          <div className="input-group">
            <span className="input-group-text">₹</span>
            <input type="number" className="form-control" placeholder="0.00" min={0} />
          </div>
        </div>
      )}

      <hr className="section__divider" />

      <h5 className="section__block-title">Timesheets</h5>
      <p className="section__block-subtitle">Configure how this team member tracks their hours</p>

      <div className="staff-toggle">
        <div className="staff-toggle__info">
          <div className="staff-toggle__label">Enable timesheets</div>
          <div className="staff-toggle__hint">Track clock-in and clock-out times</div>
        </div>
        <div className="form-check form-switch ms-3">
          <input className="form-check-input" type="checkbox" role="switch" defaultChecked />
        </div>
      </div>

      <div className="staff-toggle">
        <div className="staff-toggle__info">
          <div className="staff-toggle__label">Require manager approval</div>
          <div className="staff-toggle__hint">Timesheets must be approved by a manager before processing</div>
        </div>
        <div className="form-check form-switch ms-3">
          <input className="form-check-input" type="checkbox" role="switch" />
        </div>
      </div>
    </div>
  );
};

export default StaffWagesSection;