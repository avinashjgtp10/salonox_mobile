import React from "react";

const StaffPayRunsSection: React.FC = () => (
  <div className="section staff-form">
    <h4 className="section__title">Pay runs</h4>
    <p className="section__subtitle">Configure pay run settings for this team member</p>

    <div className="mb-4">
      <label className="form-label">Pay frequency</label>
      <select className="form-select">
        <option value="">Select frequency</option>
        <option>Weekly</option><option>Fortnightly</option>
        <option>Monthly</option><option>Custom</option>
      </select>
    </div>

    <div className="mb-4">
      <label className="form-label">Pay period start day</label>
      <select className="form-select">
        <option>Monday</option><option>Tuesday</option><option>Wednesday</option>
        <option>Thursday</option><option>Friday</option><option>Saturday</option><option>Sunday</option>
      </select>
    </div>

    <hr className="section__divider" />

    <h5 className="section__block-title">Bank details</h5>
    <p className="section__block-subtitle">Enter banking information for direct deposit</p>

    <div className="mb-3">
      <label className="form-label">Account holder name</label>
      <input type="text" className="form-control" />
    </div>

    <div className="row g-3 mb-3">
      <div className="col-6">
        <label className="form-label">Bank name</label>
        <input type="text" className="form-control" />
      </div>
      <div className="col-6">
        <label className="form-label">Account number</label>
        <input type="text" className="form-control" />
      </div>
    </div>

    <div className="row g-3 mb-3">
      <div className="col-6">
        <label className="form-label">IFSC / Routing code</label>
        <input type="text" className="form-control" />
      </div>
      <div className="col-6">
        <label className="form-label">Branch</label>
        <input type="text" className="form-control" />
      </div>
    </div>

    <hr className="section__divider" />

    <h5 className="section__block-title">Tax information</h5>
    <p className="section__block-subtitle">For payroll and compliance reporting</p>

    <div className="row g-3 mb-3">
      <div className="col-6">
        <label className="form-label">PAN / Tax ID</label>
        <input type="text" className="form-control" placeholder="ABCDE1234F" />
      </div>
      <div className="col-6">
        <label className="form-label">Tax filing status</label>
        <select className="form-select">
          <option value="">Select</option>
          <option>Individual</option><option>Joint</option><option>Head of Household</option>
        </select>
      </div>
    </div>

    <div className="staff-toggle">
      <div className="staff-toggle__info">
        <div className="staff-toggle__label">Include in automated pay runs</div>
        <div className="staff-toggle__hint">Process this team member in scheduled payroll batches</div>
      </div>
      <div className="form-check form-switch ms-3">
        <input className="form-check-input" type="checkbox" role="switch" defaultChecked />
      </div>
    </div>
  </div>
);

export default StaffPayRunsSection;