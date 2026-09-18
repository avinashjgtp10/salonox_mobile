import { useEffect, useState } from "react";
import { InfoCircle } from "react-bootstrap-icons";
import SettingsSection from "../../settings/components/SettingsSection";

// Same situation as NotificationsSection: no backend endpoint exists for
// branch-owner personal preferences (the generic `settings` table is
// salon-scoped, branch_owner has no salon of their own), so this persists
// to localStorage — real and durable per-browser, just not synced
// server-side yet.
const STORAGE_KEY = "bo_preferences_v1";

interface StoredPrefs {
  defaultSalon: string;
  defaultRange: string;
  defaultPageSize: string;
  currency: string;
  timezone: string;
  language: string;
}

const DEFAULTS: StoredPrefs = {
  defaultSalon: "first", defaultRange: "this_week", defaultPageSize: "10",
  currency: "INR", timezone: "Asia/Kolkata", language: "en",
};

function loadStored(): StoredPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export default function BranchOwnerPreferencesSection() {
  const [prefs, setPrefs] = useState<StoredPrefs>(loadStored);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch { /* best-effort only */ }
  }, [prefs]);

  const set = <K extends keyof StoredPrefs>(key: K, value: StoredPrefs[K]) =>
    setPrefs((p) => ({ ...p, [key]: value }));

  return (
    <>
      <div className="settings-page-header">
        <h2 className="settings-page-title">Preferences</h2>
        <p className="settings-page-subtitle">Defaults for what you see, plus display and regional settings.</p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12.5, color: "#1e40af" }}>
        <InfoCircle size={14} />
        Saved to this browser only — server-side sync across devices isn't available yet.
      </div>

      <SettingsSection title="Branch Defaults" desc="What you see first when you log in.">
        <div className="settings-form-grid">
          <div className="settings-form-group">
            <label className="settings-label">Default salon</label>
            <select className="settings-select" value={prefs.defaultSalon} onChange={(e) => set("defaultSalon", e.target.value)}>
              <option value="first">First assigned salon</option>
              <option value="last_used">Last used salon</option>
              <option value="ask">Always ask</option>
            </select>
          </div>
          <div className="settings-form-group">
            <label className="settings-label">Default date range</label>
            <select className="settings-select" value={prefs.defaultRange} onChange={(e) => set("defaultRange", e.target.value)}>
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="this_year">This Year</option>
            </select>
          </div>
          <div className="settings-form-group">
            <label className="settings-label">Rows per page</label>
            <select className="settings-select" value={prefs.defaultPageSize} onChange={(e) => set("defaultPageSize", e.target.value)}>
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
            </select>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Display & Regional" desc="Currency, timezone, and language.">
        <div className="settings-form-grid">
          <div className="settings-form-group">
            <label className="settings-label">Currency</label>
            <select className="settings-select" value={prefs.currency} onChange={(e) => set("currency", e.target.value)}>
              <option value="INR">₹ INR — Indian Rupee</option>
              <option value="USD">$ USD — US Dollar</option>
              <option value="AED">AED — UAE Dirham</option>
            </select>
          </div>
          <div className="settings-form-group">
            <label className="settings-label">Timezone</label>
            <select className="settings-select" value={prefs.timezone} onChange={(e) => set("timezone", e.target.value)}>
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              <option value="Asia/Dubai">Asia/Dubai (GST)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
          <div className="settings-form-group">
            <label className="settings-label">Language</label>
            <select className="settings-select" value={prefs.language} onChange={(e) => set("language", e.target.value)}>
              <option value="en">English</option>
              <option value="hi">Hindi</option>
            </select>
          </div>
        </div>
      </SettingsSection>
    </>
  );
}
