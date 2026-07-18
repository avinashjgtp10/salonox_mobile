import { useState, useEffect } from "react";
import { Clock, Save, X, Info } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../../services/api/axios";
import { ATTENDANCE } from "../../../services/api/endpoints";
import {
  DEFAULT_HALF_DAY_RULE_CONFIG,
  parseHalfDayRuleValue,
  type HalfDayRuleConfig,
} from "../utils/halfDayRuleSettings";
import "../styles/HalfDayRulePage.scss";

function unwrap(data: any) {
  return data?.data ?? data;
}

interface HalfDayRulePageProps {
  onClose?: () => void;
}

export default function HalfDayRulePage({ onClose }: HalfDayRulePageProps) {
  const [config, setConfig] = useState<HalfDayRuleConfig>(DEFAULT_HALF_DAY_RULE_CONFIG);
  const [input, setInput] = useState(String(DEFAULT_HALF_DAY_RULE_CONFIG.threshold_hours));
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);

    // Auto-retry twice — a failed fetch here previously fell back to silently
    // showing DEFAULT values indistinguishable from "no rule saved yet", which
    // risked overwriting a real saved rule with defaults on the next Save.
    const attempt = (n: number): Promise<any> =>
      api.get(ATTENDANCE.SETTINGS).catch((e: any) => {
        if (n <= 0) throw e;
        return new Promise((resolve) => setTimeout(resolve, 600)).then(() => attempt(n - 1));
      });

    attempt(2)
      .then((res) => {
        if (cancelled) return;
        const parsed = parseHalfDayRuleValue(unwrap(res.data));
        setConfig(parsed);
        setInput(String(parsed.threshold_hours));
      })
      .catch(() => { if (!cancelled) setLoadError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [retryTick]);

  function handleInputChange(raw: string) {
    const digits = raw.replace(/[^0-9]/g, "");
    setInput(digits);
    if (error) setError(undefined);
    setConfig((c) => ({ ...c, threshold_hours: Math.max(0, parseInt(digits, 10) || 0) }));
  }

  function handleInputBlur() {
    const parsed = Math.max(0, parseInt(input, 10) || 0);
    setConfig((c) => ({ ...c, threshold_hours: parsed }));
    setInput(String(parsed));
    if (parsed < 1) setError("Must be at least 1 hour");
  }

  async function handleSave() {
    if (config.threshold_hours < 1) { setError("Must be at least 1 hour"); return; }
    setSaving(true);
    try {
      await api.put(ATTENDANCE.SETTINGS, config);
      toast.success("Half day rule saved");
      onClose?.();
    } catch {
      toast.error("Failed to save half day rule");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    onClose?.();
  }

  if (loading) {
    return (
      <div className="hd-page">
        <div className="hd-loading">
          <div className="hd-loading__spinner" />
          <p>Loading half day rule…</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="hd-page">
        <div className="hd-loading">
          <p>Couldn't load half day rule — connection issue.</p>
          <button className="hd-btn hd-btn--primary" onClick={() => setRetryTick((t) => t + 1)}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="hd-page">
      <div className="hd-header">
        <div className="hd-header__icon"><Clock size={24} /></div>
        <div className="hd-header__text">
          <h2 className="hd-header__title">Half Day Rule</h2>
          <p className="hd-header__desc">
            Automatically mark a staff member's attendance as Half Day when they check in too late
            after their shift start time.
          </p>
        </div>
        <label className="hd-header__toggle">
          <input
            type="checkbox"
            checked={config.active}
            onChange={() => setConfig((c) => ({ ...c, active: !c.active }))}
          />
          <span className="hd-header__toggle-track"><span className="hd-header__toggle-thumb" /></span>
          <span className="hd-header__toggle-label">{config.active ? "Enabled" : "Disabled"}</span>
        </label>
      </div>

      <div className={`hd-card${!config.active ? " hd-disabled" : ""}`}>
        <div className="hd-field">
          <label className="hd-field__label">Mark as Half Day if late by more than</label>
          <div className={`hd-input-wrap${error ? " hd-input-wrap--error" : ""}`}>
            <input
              type="text"
              inputMode="numeric"
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              onBlur={handleInputBlur}
            />
            <span>hours</span>
          </div>
          {error && <span className="hd-error">{error}</span>}
        </div>

        <div className="hd-preview">
          <Info size={14} />
          <span>
            Example: if a shift starts at <strong>10:00 AM</strong>, checking in after{" "}
            <strong>
              {new Date(2000, 0, 1, 10 + (config.threshold_hours || 0)).toLocaleTimeString("en-IN", {
                hour: "numeric", minute: "2-digit", hour12: true,
              })}
            </strong>{" "}
            will be marked as <strong>Half Day</strong>. Otherwise it counts as a full day.
          </span>
        </div>
      </div>

      <div className="hd-footer">
        <button className="hd-btn" onClick={handleCancel} disabled={saving}>
          <X size={14} /> Cancel
        </button>
        <button className="hd-btn hd-btn--primary" onClick={handleSave} disabled={saving}>
          <Save size={14} /> {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
