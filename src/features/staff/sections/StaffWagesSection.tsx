import React, { useState, useEffect } from "react";
import { InfoCircle } from "react-bootstrap-icons";
import "../styles/StaffWagesSection.scss";
import api from "../../../services/api/axios";
import { STAFF } from "../../../services/api/endpoints";
import { toast } from "react-hot-toast";

interface WageSettings {
  wages_enabled: boolean;
  compensation_type: "none" | "hourly" | "salary" | "commission";
  hourly_rate: number | null;
  salary_amount: number | null;
  location_restriction: "workspace_default" | "enabled" | "disabled";
  auto_clock_in: "workspace_default" | "enabled" | "disabled";
  auto_clock_out: "workspace_default" | "enabled" | "disabled";
  automated_breaks: "workspace_default" | "enabled" | "disabled";
}

interface StaffWagesSectionProps {
  staffId?: string;
  salonId?: string;
  wages?: any;
  setWages?: (val: any) => void;
}

const StaffWagesSection: React.FC<StaffWagesSectionProps> = ({ staffId, salonId, wages, setWages }) => {
  // Use props if available, otherwise fallback to local state (for standalone usage if any)
  const [localSettings, setLocalSettings] = useState<WageSettings>({
    wages_enabled: false,
    compensation_type: "none",
    hourly_rate: null,
    salary_amount: null,
    location_restriction: "workspace_default",
    auto_clock_in: "workspace_default",
    auto_clock_out: "workspace_default",
    automated_breaks: "workspace_default",
  });

  const settings = wages || localSettings;
  const setSettings = setWages || setLocalSettings;

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (staffId && !wages && staffId !== "undefined") {
      const fetchWages = async () => {
        const headers: Record<string, string> = {};
        if (salonId) headers["x-salon-id"] = String(salonId);
        try {
          setIsLoading(true);
          const response = await api.get(STAFF.WAGES(staffId), { headers });
          if (response.data.data) {
            setSettings(response.data.data);
          }
        } catch (error) {
          console.error("Error fetching wages:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchWages();
    }
  }, [staffId, salonId, wages]);

  const handleSave = async () => {
    if (!staffId || staffId === "undefined") {
      toast("Please save the team member profile first");
      return;
    }
    const headers: Record<string, string> = {};
    if (salonId) headers["x-salon-id"] = String(salonId);
    try {
      setIsSaving(true);
      await api.put(STAFF.WAGES(staffId), settings, { headers });
      toast.success("Wage settings saved successfully");
    } catch (error: any) {
      console.error("Error saving wages:", error);
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to save wage settings";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-4 text-center">Loading wage settings...</div>;

  return (
    <div className="section wages-section mt-1">
      {/* Main Header / Switch */}
      <div className="custom-switch-container">
        <div className="switch-info">
          <div className="switch-title">
            Wages and timesheets
            {settings.wages_enabled ? (
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
            checked={settings.wages_enabled}
            onChange={(e) => setSettings({ ...settings, wages_enabled: e.target.checked })}
          />
        </div>
      </div>

      {/* Expanded Content */}
      <div className={`wages-expanded-content fade-in mt-4 ${!settings.wages_enabled ? "opacity-50 pointer-events-none" : ""}`}>
        <div className="mb-4">
          <label className="control-label">Compensation type</label>
          <select 
            className="form-select"
            value={settings.compensation_type}
            onChange={(e) => setSettings({ ...settings, compensation_type: e.target.value as any })}
            disabled={!settings.wages_enabled}
          >
            <option value="none">None</option>
            <option value="hourly">Hourly</option>
            <option value="salary">Salary</option>
            <option value="commission">Commission</option>
          </select>
        </div>

        {(settings.compensation_type === "hourly" || settings.compensation_type === "salary") && (
          <div className="mb-4">
            <label className="control-label">
              {settings.compensation_type === "hourly" ? "Hourly rate" : "Salary amount"}
            </label>
            <div className="input-group">
              <span className="input-group-text bg-white">₹</span>
              <input
                type="number"
                className="form-control"
                value={settings.compensation_type === "hourly" ? settings.hourly_rate || "" : settings.salary_amount || ""}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  if (settings.compensation_type === "hourly") {
                    setSettings({ ...settings, hourly_rate: val });
                  } else {
                    setSettings({ ...settings, salary_amount: val });
                  }
                }}
                disabled={!settings.wages_enabled}
              />
            </div>
          </div>
        )}

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
          <select 
            className="form-select"
            value={settings.location_restriction}
            onChange={(e) => setSettings({ ...settings, location_restriction: e.target.value as any })}
            disabled={!settings.wages_enabled}
          >
            <option value="workspace_default">Workspace default (Disabled)</option>
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
          </select>
          <div className="control-hint">
            Prevent manual timesheet entries when away from workspace
          </div>
        </div>

        <h6 className="sub-header">Timesheet automation</h6>
        <div className="row g-3 mb-4">
          <div className="col-12 col-md-6">
            <label className="control-label">Auto clock in</label>
            <select 
              className="form-select"
              value={settings.auto_clock_in}
              onChange={(e) => setSettings({ ...settings, auto_clock_in: e.target.value as any })}
              disabled={!settings.wages_enabled}
            >
              <option value="workspace_default">Workspace default (Disabled)</option>
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </select>
            <div className="control-hint">
              Automatically clock in at the beginning of shifts
            </div>
          </div>
          <div className="col-12 col-md-6">
            <label className="control-label">Auto clock out</label>
            <select 
              className="form-select"
              value={settings.auto_clock_out}
              onChange={(e) => setSettings({ ...settings, auto_clock_out: e.target.value as any })}
              disabled={!settings.wages_enabled}
            >
              <option value="workspace_default">Workspace default (Disabled)</option>
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </select>
            <div className="control-hint">
              Automatically clock out at the end of shifts
            </div>
          </div>
        </div>

        <div className="mb-4">
          <label className="control-label">Automated breaks</label>
          <select 
            className="form-select"
            value={settings.automated_breaks}
            onChange={(e) => setSettings({ ...settings, automated_breaks: e.target.value as any })}
            disabled={!settings.wages_enabled}
          >
            <option value="workspace_default">Workspace default (Disabled)</option>
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
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

        <div className="divider mt-4"></div>
        
        <div className="d-flex justify-content-end mt-4">
          <button 
            className="btn btn-primary px-4 py-2" 
            onClick={handleSave}
            disabled={isSaving || !settings.wages_enabled}
            style={{
              backgroundColor: "#6c3ce1",
              borderColor: "#6c3ce1",
              borderRadius: "8px",
              fontWeight: 500
            }}
          >
            {isSaving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StaffWagesSection;
