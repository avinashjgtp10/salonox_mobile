import { useEffect, useMemo, useState } from "react";
import { Clock, Info, RotateCcw, Save, X } from "lucide-react";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import api from "../../../services/api/axios";
import { ATTENDANCE, STAFF } from "../../../services/api/endpoints";
import {
  DEFAULT_HALF_DAY_RULE_CONFIG,
  resolveAttendanceRuleConfig,
  saveAttendanceRuleConfig,
  type DeductionType,
  type HalfDayRuleConfig,
  type StaffRuleScope,
} from "../utils/halfDayRuleSettings";
import Dropdown from "../../../components/ui/Dropdown";
import "../styles/HalfDayRulePage.scss";

const MINUTE_OPTIONS = ["0", "15", "30", "45"];
const CLEARED_ATTENDANCE_RULE_CONFIG: HalfDayRuleConfig = {
  ...DEFAULT_HALF_DAY_RULE_CONFIG,
  active: false,
  threshold_hours: 0,
  late_rule_active: false,
  grace_period_hours: 0,
  late_deduction_type: "fixed",
  late_deduction_amount: 0,
  late_deduction_after_hours: 0,
  max_late_deduction: null,
  half_day_deduction_amount: 0,
  staff_scope: "all",
  selected_staff_ids: [],
};

interface StaffOption {
  id: string;
  name: string;
  role: string;
}

interface HalfDayRulePageProps {
  onClose?: () => void;
  onSaved?: (config: HalfDayRuleConfig) => void;
}

function unwrap(data: any) {
  return data?.data ?? data;
}

function durationToParts(hoursValue: number) {
  const totalMinutes = Math.max(0, Math.round(Number(hoursValue || 0) * 60));
  return {
    hours: String(Math.floor(totalMinutes / 60)),
    minutes: String(totalMinutes % 60),
  };
}

function partsToDuration(hoursRaw: string, minutesRaw: string) {
  const hours = Math.max(0, parseInt(hoursRaw, 10) || 0);
  const minutes = Math.min(59, Math.max(0, parseInt(minutesRaw, 10) || 0));
  return Number((hours + minutes / 60).toFixed(2));
}

function moneyInput(value: number | null | undefined) {
  if (value == null || value === 0) return "";
  return String(value);
}

function exampleTime(hoursValue: number) {
  const date = new Date(2000, 0, 1, 10, 0);
  date.setMinutes(date.getMinutes() + Math.round(Number(hoursValue || 0) * 60));
  return date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
}

function DurationField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  error?: boolean;
}) {
  const parts = durationToParts(value);

  const setHours = (raw: string) => {
    const digits = raw.replace(/^0+(?=\d)/, "").replace(/[^0-9]/g, "");
    onChange(partsToDuration(digits, parts.minutes));
  };

  const setMinutes = (raw: string) => {
    onChange(partsToDuration(parts.hours, raw));
  };

  return (
    <div className="hd-field">
      <label className="hd-field__label">{label}</label>
      <div className="hd-time-inputs">
        <div className={`hd-input-wrap${error ? " hd-input-wrap--error" : ""}`}>
          <input
            type="text"
            inputMode="numeric"
            value={parts.hours}
            onChange={(e) => setHours(e.target.value)}
            aria-label={`${label} hours`}
          />
          <span>hours</span>
        </div>
        <div className={`hd-input-wrap${error ? " hd-input-wrap--error" : ""}`}>
          <Dropdown
            value={parts.minutes}
            options={MINUTE_OPTIONS.map((minute) => ({ id: minute, name: minute }))}
            onChange={(id) => setMinutes(id)}
          />
          <span>min</span>
        </div>
      </div>
    </div>
  );
}

export default function HalfDayRulePage({ onClose, onSaved }: HalfDayRulePageProps) {
  const [config, setConfig] = useState<HalfDayRuleConfig>(DEFAULT_HALF_DAY_RULE_CONFIG);
  const [savedConfig, setSavedConfig] = useState<HalfDayRuleConfig>(DEFAULT_HALF_DAY_RULE_CONFIG);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const [saving, setSaving] = useState(false);
  const { showSuccess, showError, overlay } = useStatusOverlay();

  const selectedStaffSet = useMemo(() => new Set(config.selected_staff_ids.map(String)), [config.selected_staff_ids]);

  const patchConfig = (patch: Partial<HalfDayRuleConfig>) => {
    setError(undefined);
    setConfig((prev) => ({ ...prev, ...patch }));
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);

    const attemptSettings = (n: number): Promise<any> =>
      api.get(ATTENDANCE.SETTINGS).catch((e: any) => {
        if (n <= 0) throw e;
        return new Promise((resolve) => setTimeout(resolve, 600)).then(() => attemptSettings(n - 1));
      });

    Promise.all([
      attemptSettings(2),
      api.get(STAFF.BASE).catch(() => null),
    ])
      .then(([settingsRes, staffRes]) => {
        if (cancelled) return;
        const parsed = resolveAttendanceRuleConfig(unwrap(settingsRes.data));
        const staffItems = staffRes?.data?.data?.items || staffRes?.data?.data || [];
        setConfig(parsed);
        setSavedConfig(parsed);
        setStaffOptions(Array.isArray(staffItems)
          ? staffItems
              .filter((s: any) => s.is_active !== false)
              .map((s: any) => ({
                id: String(s.id),
                name: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.email || "Staff",
                role: s.designation || s.role || "Staff",
              }))
          : []);
      })
      .catch(() => { if (!cancelled) setLoadError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [retryTick]);

  function validate() {
    if (config.active && config.threshold_hours <= 0) return "Half Day time must be at least 1 minute";
    if (config.late_rule_active && config.late_deduction_after_hours <= 0) return "Late deduction time must be at least 1 minute";
    if (config.staff_scope === "selected" && config.selected_staff_ids.length === 0) return "Select at least one staff member";
    return undefined;
  }

  async function handleSave() {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setSaving(true);
    try {
      saveAttendanceRuleConfig(config);
      try {
        await api.put(ATTENDANCE.SETTINGS, config);
      } catch {
        try {
          await api.put(ATTENDANCE.SETTINGS, {
            active: config.active,
            threshold_hours: config.threshold_hours,
            half_day_deduction_amount: config.half_day_deduction_amount,
          });
        } catch {
          // Local persistence still keeps the expanded Attendance Rule available
          // to Attendance and Payroll when the backend only supports legacy fields.
        }
      }
      setSavedConfig(config);
      setConfig(config);
      onSaved?.(config);
      showSuccess("Attendance rules saved");
      onClose?.();
    } catch {
      showError("Failed to save attendance rules");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setConfig(savedConfig);
    setError(undefined);
    onClose?.();
  }

  function handleClear() {
    setConfig(CLEARED_ATTENDANCE_RULE_CONFIG);
    setError(undefined);
  }

  function toggleStaff(staffId: string) {
    const next = new Set(selectedStaffSet);
    if (next.has(staffId)) next.delete(staffId);
    else next.add(staffId);
    patchConfig({ selected_staff_ids: [...next] });
  }

  if (loading) {
    return (
      <div className="hd-page">
        <div className="hd-loading">
          <div className="hd-loading__spinner" />
          <p>Loading attendance rules...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="hd-page">
        <div className="hd-loading">
          <p>Couldn't load attendance rules - connection issue.</p>
          <button className="hd-btn hd-btn--primary" onClick={() => setRetryTick((t) => t + 1)}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="hd-page">
      {overlay}
      <div className="hd-header">
        <div className="hd-header__icon"><Clock size={24} /></div>
        <div className="hd-header__text">
          <h2 className="hd-header__title">Attendance Rules</h2>
          <p className="hd-header__desc">
            Configure grace time, late deductions, half-day marking, and staff scope for payroll.
          </p>
          <div className="hd-header__note">Clear only resets this form. Save Changes applies it to payroll.</div>
        </div>
      </div>

      <div className="hd-card">
        <div className="hd-section-title">Late Attendance Rule</div>
        <label className="hd-header__toggle hd-inline-toggle">
          <input
            type="checkbox"
            checked={config.late_rule_active}
            onChange={() => patchConfig({ late_rule_active: !config.late_rule_active })}
          />
          <span className="hd-header__toggle-track"><span className="hd-header__toggle-thumb" /></span>
          <span className="hd-header__toggle-label">{config.late_rule_active ? "Enabled" : "Disabled"}</span>
        </label>
        <DurationField
          label="Grace Period"
          value={config.grace_period_hours}
          onChange={(value) => patchConfig({ grace_period_hours: value })}
        />
        <div className="hd-preview">
          <Info size={14} />
          <span>With a 10:00 AM shift, check-in until <strong>{exampleTime(config.grace_period_hours)}</strong> has no late deduction.</span>
        </div>
      </div>

      <div className={`hd-card${!config.late_rule_active ? " hd-disabled" : ""}`}>
        <div className="hd-section-title">Late Deduction Rule</div>
        <div className="hd-field">
          <label className="hd-field__label">Deduction Type</label>
          <Dropdown
            className="hd-select"
            value={config.late_deduction_type}
            options={[
              { id: "fixed", name: "Fixed Amount" },
              { id: "salary_per_hour", name: "Salary Based / Per Hour" },
            ]}
            onChange={(id) => patchConfig({ late_deduction_type: id as DeductionType })}
          />
        </div>
        <div className="hd-field">
          <label className="hd-field__label">Deduction Amount</label>
          <div className="hd-input-wrap">
            <input
              type="number"
              min={0}
              step="0.01"
              placeholder="0"
              value={moneyInput(config.late_deduction_amount)}
              onChange={(e) => {
                const val = e.target.value;
                patchConfig({ late_deduction_amount: val === "" ? 0 : Math.max(0, parseFloat(val) || 0) });
              }}
            />
            <span>₹</span>
          </div>
        </div>
        <DurationField
          label="Deduction After"
          value={config.late_deduction_after_hours}
          onChange={(value) => patchConfig({ late_deduction_after_hours: value })}
        />
        <div className="hd-field">
          <label className="hd-field__label">Maximum Deduction</label>
          <div className="hd-input-wrap">
            <input
              type="number"
              min={0}
              step="0.01"
              placeholder="Optional"
              value={moneyInput(config.max_late_deduction)}
              onChange={(e) => {
                const val = e.target.value;
                patchConfig({ max_late_deduction: val.trim() === "" ? null : Math.max(0, parseFloat(val) || 0) });
              }}
            />
            <span>₹</span>
          </div>
        </div>
      </div>

      <div className="hd-card">
        <div className="hd-section-heading">
          <div className="hd-section-title">Half Day Rule</div>
          <label className="hd-header__toggle">
            <input
              type="checkbox"
              checked={config.active}
              onChange={() => patchConfig({ active: !config.active })}
            />
            <span className="hd-header__toggle-track"><span className="hd-header__toggle-thumb" /></span>
            <span className="hd-header__toggle-label">{config.active ? "Enabled" : "Disabled"}</span>
          </label>
        </div>
        <DurationField
          label="Mark as Half Day after"
          value={config.threshold_hours}
          onChange={(value) => patchConfig({ threshold_hours: value })}
          error={!!error && config.threshold_hours <= 0}
        />
        <div className="hd-field">
          <label className="hd-field__label">Half Day Deduction Amount</label>
          <div className="hd-input-wrap">
            <input
              type="number"
              min={0}
              step="0.01"
              placeholder="0"
              value={moneyInput(config.half_day_deduction_amount)}
              onChange={(e) => {
                const val = e.target.value;
                patchConfig({ half_day_deduction_amount: val === "" ? 0 : Math.max(0, parseFloat(val) || 0) });
              }}
            />
            <span>₹</span>
          </div>
        </div>
        <div className="hd-preview">
          <Info size={14} />
          <span>With a 10:00 AM shift, check-in at or after <strong>{exampleTime(config.threshold_hours)}</strong> is marked Half Day.</span>
        </div>
      </div>

      <div className="hd-card">
        <div className="hd-section-title">Staff-wise Application</div>
        <div className="hd-radio-row">
          {(["all", "selected"] as StaffRuleScope[]).map((scope) => (
            <label key={scope} className="hd-radio">
              <input
                type="radio"
                checked={config.staff_scope === scope}
                onChange={() => patchConfig({ staff_scope: scope })}
              />
              <span>{scope === "all" ? "Apply to All Staff" : "Apply to Selected Staff"}</span>
            </label>
          ))}
        </div>
        {config.staff_scope === "selected" && (
          <div className="hd-staff-list">
            {staffOptions.map((staff) => (
              <label key={staff.id} className="hd-staff-item">
                <input
                  type="checkbox"
                  checked={selectedStaffSet.has(staff.id)}
                  onChange={() => toggleStaff(staff.id)}
                />
                <span>{staff.name}</span>
                <small>{staff.role}</small>
              </label>
            ))}
          </div>
        )}
      </div>

      {error && <span className="hd-error">{error}</span>}

      <div className="hd-footer">
        <button className="hd-btn hd-btn--clear" onClick={handleClear} disabled={saving}>
          <RotateCcw size={14} /> Clear Form
        </button>
        <div className="hd-footer__actions">
          <button className="hd-btn" onClick={handleCancel} disabled={saving}>
            <X size={14} /> Cancel
          </button>
          <button className="hd-btn hd-btn--primary" onClick={handleSave} disabled={saving}>
            <Save size={14} /> {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
