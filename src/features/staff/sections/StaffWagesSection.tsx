import React, { useState } from "react";
import { InfoCircle } from "react-bootstrap-icons";
import "../styles/StaffWagesSection.scss";

const StaffWagesSection: React.FC = () => {
  const [wagesEnabled, setWagesEnabled] = useState(false);

  return (
    <div className="section wages-section mt-1">
      {/* Main Header / Switch */}
      <div className="custom-switch-container">
        <div className="switch-info">
          <div className="switch-title">
            Wages and timesheets
            {wagesEnabled ? (
              <span className="badge-status on">On</span>
            ) : (
              <span className="badge-status off">Off</span>
            )}
          </div>
          <div className="switch-desc">
            Set up how much this team member earns. <a href="#">Learn more</a>
          </div>
        </div>
        <div className="form-check form-switch custom-switch">
          <input
            className="form-check-input"
            type="checkbox"
            role="switch"
            checked={wagesEnabled}
            onChange={(e) => setWagesEnabled(e.target.checked)}
          />
        </div>
      </div>

      {/* Expanded Content */}
      {wagesEnabled && (
        <div className="wages-expanded-content fade-in mt-4">
          <div className="mb-4">
            <label className="control-label">Compensation type</label>
            <select className="form-select">
              <option>None</option>
              <option>Hourly</option>
              <option>Salary</option>
            </select>
          </div>

          <hr className="section__divider mt-5 mb-4" />

          {/* Timesheet Settings */}
          <h5 className="section__block-title">Timesheet settings</h5>
          <p className="section__block-subtitle">
            Configure timesheet settings for this team member.{" "}
            <a href="#">Learn more</a>
          </p>

          <h6 className="sub-header">Proximity controls</h6>
          <div className="mb-4 pb-2">
            <label className="control-label">Location restrictions</label>
            <select className="form-select">
              <option>Workspace default (Disabled)</option>
              <option>Enabled (50m)</option>
              <option>Enabled (100m)</option>
            </select>
            <div className="control-hint">
              Prevent manual timesheet entries when more than 50m away
            </div>
          </div>

          <h6 className="sub-header">Timesheet automation</h6>
          <div className="row g-3 mb-4">
            <div className="col-12 col-md-6">
              <label className="control-label">Auto clock in</label>
              <select className="form-select">
                <option>Workspace default (Disabled)</option>
                <option>Enabled</option>
              </select>
              <div className="control-hint">
                Automatically clock in at the beginning of shifts
              </div>
            </div>
            <div className="col-12 col-md-6">
              <label className="control-label">Auto clock out</label>
              <select className="form-select">
                <option>Workspace default (Disabled)</option>
                <option>Enabled</option>
              </select>
              <div className="control-hint">
                Automatically clock out at the end of shifts
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="control-label">Automated breaks</label>
            <select className="form-select">
              <option>Workspace default (Disabled)</option>
              <option>Enabled</option>
            </select>
            <div className="control-hint">
              Automatically start and stop scheduled breaks
            </div>
          </div>

          <div className="info-banner">
            <InfoCircle />
            <span>
              Workspace default settings can be adjusted <a href="#">here</a>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffWagesSection;
