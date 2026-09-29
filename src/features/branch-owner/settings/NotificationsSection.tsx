import { useEffect, useState } from "react";
import { Bell, EnvelopeFill, Whatsapp, InfoCircle } from "react-bootstrap-icons";
import SettingsSection from "../../settings/components/SettingsSection";
import SettingsToggle from "../../settings/components/SettingsToggle";

interface NotifChannels { app: boolean; email: boolean; whatsapp: boolean }

const EVENTS = [
  { key: "payment_received", label: "New payment received", desc: "A salon you manage records a new payment" },
  { key: "salon_status", label: "Salon status changed", desc: "A salon is activated, deactivated, or deleted" },
  { key: "low_stock", label: "Low stock alert", desc: "Inventory falls below the reorder threshold at any salon" },
  { key: "commission_pending", label: "Staff commission pending", desc: "A commission settlement is awaiting payout" },
  { key: "salon_assigned", label: "Salon assigned or unassigned", desc: "Super admin changes which salons you manage" },
] as const;

// No backend endpoint exists yet for branch-owner notification preferences
// — the app's generic `settings` table is salon-scoped only (no user_id
// column) and its routes don't allow the branch_owner role. Persisted to
// localStorage instead of a fake no-op Save, so a preference genuinely
// sticks across reloads on this browser, with a visible note that it
// isn't synced server-side or across devices yet.
const STORAGE_KEY = "bo_notification_prefs_v1";

interface StoredPrefs {
  channels: Record<string, NotifChannels>;
  digest: "instant" | "daily";
}

function loadStored(): StoredPrefs | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function defaultPrefs(): StoredPrefs {
  return {
    channels: Object.fromEntries(EVENTS.map((e) => [e.key, { app: true, email: e.key !== "low_stock", whatsapp: false }])),
    digest: "instant",
  };
}

export default function BranchOwnerNotificationsSection() {
  const [prefs, setPrefs] = useState<StoredPrefs>(() => loadStored() ?? defaultPrefs());

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch { /* best-effort only */ }
  }, [prefs]);

  const toggle = (eventKey: string, channel: keyof NotifChannels) => {
    setPrefs((prev) => ({
      ...prev,
      channels: { ...prev.channels, [eventKey]: { ...prev.channels[eventKey], [channel]: !prev.channels[eventKey][channel] } },
    }));
  };

  return (
    <>
      <div className="settings-page-header">
        <h2 className="settings-page-title">Notifications</h2>
        <p className="settings-page-subtitle">Choose what you're notified about and how.</p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12.5, color: "#1e40af" }}>
        <InfoCircle size={14} />
        Saved to this browser only — server-side sync across devices isn't available yet.
      </div>

      <SettingsSection title="Event Notifications" desc="Fine-tune which events trigger notifications on each channel." noPadding>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", alignItems: "center", gap: "0 20px", padding: "14px 22px 8px" }}>
          <span />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>App</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>Email</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>WhatsApp</span>
        </div>
        {EVENTS.map((e) => (
          <div key={e.key} style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", alignItems: "center", gap: "0 20px", padding: "12px 22px", borderTop: "1px solid #f3f4f6" }}>
            <div>
              <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: "#111827" }}>{e.label}</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6b7280" }}>{e.desc}</p>
            </div>
            <SettingsToggle checked={prefs.channels[e.key].app} onChange={() => toggle(e.key, "app")} />
            <SettingsToggle checked={prefs.channels[e.key].email} onChange={() => toggle(e.key, "email")} />
            <SettingsToggle checked={prefs.channels[e.key].whatsapp} onChange={() => toggle(e.key, "whatsapp")} />
          </div>
        ))}
      </SettingsSection>

      <SettingsSection title="Digest Frequency" desc="How often email/WhatsApp notifications are bundled and sent.">
        <div className="settings-toggle-row">
          <div className="settings-security-icon" style={{ background: "#eff6ff", color: "#2563eb" }}><Bell size={18} /></div>
          <div className="settings-toggle-info">
            <p className="settings-toggle-title">Instant</p>
            <p className="settings-toggle-desc">Get notified the moment something happens</p>
          </div>
          <SettingsToggle checked={prefs.digest === "instant"} onChange={() => setPrefs((p) => ({ ...p, digest: "instant" }))} />
        </div>
        <div className="settings-toggle-row">
          <div className="settings-security-icon" style={{ background: "#f0fdf4", color: "#16a34a" }}><EnvelopeFill size={18} /></div>
          <div className="settings-toggle-info">
            <p className="settings-toggle-title">Daily digest</p>
            <p className="settings-toggle-desc">One bundled summary per day instead of individual alerts</p>
          </div>
          <SettingsToggle checked={prefs.digest === "daily"} onChange={() => setPrefs((p) => ({ ...p, digest: "daily" }))} />
        </div>
      </SettingsSection>

      <SettingsSection title="WhatsApp" desc="Preview of the channel used for WhatsApp alerts.">
        <div className="settings-security-item">
          <div className="settings-security-icon" style={{ background: "#f0fdf4", color: "#16a34a" }}><Whatsapp size={18} /></div>
          <div className="settings-security-info">
            <p className="settings-security-name">WhatsApp number</p>
            <p className="settings-security-desc">Not connected</p>
          </div>
        </div>
      </SettingsSection>
    </>
  );
}
