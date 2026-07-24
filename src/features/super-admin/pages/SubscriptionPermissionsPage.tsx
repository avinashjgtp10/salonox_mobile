import { useState, useRef, useEffect } from "react";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import {
  searchSalonsForSubscriptionPermissionsThunk,
  fetchSubscriptionPermissionsByIdThunk,
  updateSubscriptionPermissionsThunk,
  fetchSubscriptionPermissionAuditLogThunk,
  grantSubscriptionDaysThunk,
} from "../../../middleware/superAdmin/superAdmin.thunk";

// The 7 subscription actions a super admin can grant/revoke per account —
// keys must match SUBSCRIPTION_PERMISSION_KEYS in
// subscriptionPermission.middleware.ts on the backend exactly.
const SUBSCRIPTION_PERMISSIONS: { key: string; label: string; desc: string }[] = [
  { key: "view_subscription",     label: "View Subscription",      desc: "See current plan, status and renewal date" },
  { key: "renew_subscription",    label: "Renew Subscription",     desc: "Renew the current plan before/after expiry" },
  { key: "upgrade_subscription",  label: "Upgrade Subscription",   desc: "Move to a higher-tier plan" },
  { key: "downgrade_subscription", label: "Downgrade Subscription", desc: "Move to a lower-tier plan" },
  { key: "cancel_subscription",   label: "Cancel Subscription",    desc: "Cancel the active subscription" },
  { key: "view_billing_history",  label: "View Billing History",   desc: "See and download past invoices" },
  { key: "manage_payment_methods", label: "Manage Payment Methods", desc: "Add, remove or change saved payment methods" },
];

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      width: 48, height: 26, borderRadius: 13, border: "none",
      position: "relative", cursor: "pointer", flexShrink: 0, outline: "none",
      background: on ? "linear-gradient(135deg, #6366f1, #6366f1cc)" : "#e2e8f0",
      boxShadow: on ? "0 0 0 3px #6366f122, 0 2px 6px #6366f144" : "inset 0 1px 3px rgba(0,0,0,0.08)",
      transition: "background 0.22s cubic-bezier(.4,0,.2,1), box-shadow 0.22s",
      padding: 0,
    }} role="switch" aria-checked={on}>
      <span style={{
        position: "absolute", top: "50%", transform: "translateY(-50%)",
        left: on ? 7 : "auto", right: on ? "auto" : 7,
        fontSize: 7, fontWeight: 800, letterSpacing: "0.05em",
        color: on ? "#fff" : "#94a3b8", userSelect: "none", pointerEvents: "none",
      }}>{on ? "ON" : "OFF"}</span>
      <div style={{
        position: "absolute", top: 3,
        left: on ? "calc(100% - 23px)" : 3,
        width: 20, height: 20, borderRadius: "50%",
        background: "#fff",
        boxShadow: on ? "0 2px 6px rgba(0,0,0,0.2), 0 0 0 1px #6366f133" : "0 1px 4px rgba(0,0,0,0.15)",
        transition: "left 0.22s cubic-bezier(.4,0,.2,1)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {on && <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 6 5 9 10 3"/></svg>}
      </div>
    </button>
  );
}

const Spinner = ({ color = "#6366f1" }: { color?: string }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ animation: "sxp-spin 0.8s linear infinite", flexShrink: 0 }}>
    <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
    <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
  </svg>
);

export default function SubscriptionPermissionsPage() {
  const dispatch = useAppDispatch();

  const [query, setQuery]               = useState("");
  const [results, setResults]           = useState<any[]>([]);
  const [searching, setSearching]       = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropRef                         = useRef<HTMLDivElement>(null);

  const [salon, setSalon]     = useState<any>(null);
  const [perms, setPerms]     = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const [auditLog, setAuditLog]         = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [showAudit, setShowAudit]       = useState(false);

  const [grantDays, setGrantDays]       = useState("");
  const [granting, setGranting]         = useState(false);
  const [grantMsg, setGrantMsg]         = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowDropdown(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); setShowDropdown(false); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const res = await dispatch(searchSalonsForSubscriptionPermissionsThunk(query.trim()));
      setSearching(false);
      if (searchSalonsForSubscriptionPermissionsThunk.fulfilled.match(res)) {
        setResults(res.payload); setShowDropdown(true);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  async function selectSalon(row: any) {
    setShowDropdown(false); setQuery(row.name);
    setSalon(null); setPerms({}); setSaveMsg(""); setLoading(true);
    setShowAudit(false); setAuditLog([]);
    setGrantDays(""); setGrantMsg(null);
    const res = await dispatch(fetchSubscriptionPermissionsByIdThunk(row.id));
    setLoading(false);
    if (fetchSubscriptionPermissionsByIdThunk.fulfilled.match(res)) {
      const data = res.payload as any;
      setSalon(data.salon);
      const fetched = data.permissions ?? {};
      const seeded: Record<string, boolean> = {};
      for (const p of SUBSCRIPTION_PERMISSIONS) {
        // Nothing configured yet = allowed (matches the backend default —
        // existing salons aren't suddenly locked out of subscription actions).
        seeded[p.key] = fetched[p.key] ?? true;
      }
      setPerms(seeded);
    }
  }

  function toggle(key: string) {
    setPerms(prev => ({ ...prev, [key]: !prev[key] }));
    setSaveMsg("");
  }

  function setAll(value: boolean) {
    const next: Record<string, boolean> = {};
    for (const p of SUBSCRIPTION_PERMISSIONS) next[p.key] = value;
    setPerms(next);
    setSaveMsg("");
  }

  async function handleSave() {
    if (!salon) return;
    setSaving(true); setSaveMsg("");
    const res = await dispatch(updateSubscriptionPermissionsThunk({ salonId: salon.id, permissions: perms }));
    setSaving(false);
    setSaveMsg(updateSubscriptionPermissionsThunk.fulfilled.match(res) ? "saved" : "error");
    if (updateSubscriptionPermissionsThunk.fulfilled.match(res)) {
      setTimeout(() => setSaveMsg(""), 3000);
      if (showAudit) loadAuditLog();
    }
  }

  async function loadAuditLog() {
    if (!salon) return;
    setAuditLoading(true);
    const res = await dispatch(fetchSubscriptionPermissionAuditLogThunk(salon.id));
    setAuditLoading(false);
    if (fetchSubscriptionPermissionAuditLogThunk.fulfilled.match(res)) setAuditLog(res.payload);
  }

  function toggleAudit() {
    const next = !showAudit;
    setShowAudit(next);
    if (next && auditLog.length === 0) loadAuditLog();
  }

  const totalPerms   = SUBSCRIPTION_PERMISSIONS.length;
  const enabledCount = Object.values(perms).filter(Boolean).length;

  async function handleGrantDays() {
    if (!salon) return;
    const days = Number(grantDays);
    if (!Number.isFinite(days) || days <= 0) {
      setGrantMsg({ ok: false, text: "Enter a valid positive number of days" });
      return;
    }
    setGranting(true); setGrantMsg(null);
    const res = await dispatch(grantSubscriptionDaysThunk({ salonId: salon.id, days }));
    setGranting(false);
    if (grantSubscriptionDaysThunk.fulfilled.match(res)) {
      const newEnd = res.payload?.subscription?.current_period_end;
      const endLabel = newEnd
        ? new Date(newEnd).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
        : null;
      setGrantMsg({ ok: true, text: endLabel ? `Extended — active until ${endLabel}` : "Subscription extended" });
      setGrantDays("");
      if (showAudit) loadAuditLog();
    } else {
      setGrantMsg({ ok: false, text: (res.payload as string) || "Failed to grant days" });
    }
  }

  // Audit entries come in two shapes: permission-toggle saves (new_value is a
  // { key: boolean } map) and grant-days actions (new_value is
  // { action: 'grant_days', days, new_current_period_end }) — both share the
  // same subscription_permission_audit_log table, distinguished by shape.
  function describeAuditEntry(entry: any): string[] {
    let parsed: any = null;
    try { parsed = JSON.parse(entry.new_value); } catch { return ["Unrecognized change"]; }

    if (parsed?.action === "grant_days") {
      const endLabel = parsed.new_current_period_end
        ? new Date(parsed.new_current_period_end).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
        : "unknown date";
      return [`Granted ${parsed.days} day${parsed.days !== 1 ? "s" : ""} — active until ${endLabel}`];
    }

    const prev: Record<string, boolean> | null = entry.previous_value ? JSON.parse(entry.previous_value) : null;
    const changes: string[] = [];
    for (const p of SUBSCRIPTION_PERMISSIONS) {
      const before = prev?.[p.key] ?? true;
      const after  = parsed[p.key] ?? true;
      if (before !== after) changes.push(`${p.label}: ${before ? "ON" : "OFF"} → ${after ? "ON" : "OFF"}`);
    }
    return changes.length > 0 ? changes : ["No effective change"];
  }

  return (
    <div style={{ padding: "24px 24px 60px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", background: "#f8fafc", minHeight: "100vh" }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 22, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(99,102,241,0.35)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
          </svg>
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>Subscription Permissions</h1>
          <p style={{ margin: 0, color: "#94a3b8", fontSize: 12 }}>Search an account to control which subscription actions it can perform</p>
        </div>
      </div>

      {/* ── Card ── */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "visible", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>

        {/* Card header */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", background: "linear-gradient(135deg,#f8fafc,#eef2ff22)", borderRadius: "16px 16px 0 0", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 3px 10px rgba(99,102,241,0.3)", flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Per-Account Subscription Actions</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>Changes apply immediately — no logout required for the account</div>
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: "16px 20px", borderBottom: salon ? "1px solid #f1f5f9" : "none", position: "relative" }} ref={dropRef}>
          <div style={{ position: "relative", maxWidth: 480 }}>
            <div style={{ display: "flex", alignItems: "center", border: `1.5px solid ${showDropdown ? "#6366f1" : "#e2e8f0"}`, borderRadius: 10, background: "#fff", overflow: "hidden", boxShadow: showDropdown ? "0 0 0 3px rgba(99,102,241,0.12)" : "0 1px 4px rgba(0,0,0,0.04)", transition: "all 0.2s" }}>
              <div style={{ padding: "0 12px", color: "#94a3b8" }}>
                {searching ? <Spinner /> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>}
              </div>
              <input type="text" placeholder="Search by salon name or owner email…" value={query}
                onChange={e => { setQuery(e.target.value); setSalon(null); setSaveMsg(""); }}
                onFocus={() => results.length > 0 && setShowDropdown(true)}
                style={{ flex: 1, border: "none", outline: "none", fontSize: 13, color: "#0f172a", padding: "10px 0", fontFamily: "inherit", background: "transparent" }} />
              {query && <button onClick={() => { setQuery(""); setResults([]); setSalon(null); setShowDropdown(false); }} style={{ padding: "0 14px", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 17, lineHeight: 1 }}>×</button>}
            </div>

            {showDropdown && results.length > 0 && (
              <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 12, boxShadow: "0 12px 32px rgba(0,0,0,0.14)", zIndex: 100, maxHeight: 260, overflowY: "auto" }}>
                {results.map((row, i) => (
                  <div key={row.id} onClick={() => selectSalon(row)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", borderBottom: i < results.length - 1 ? "1px solid #f1f5f9" : "none", transition: "background 0.12s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
                    onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
                      {row.name?.[0]?.toUpperCase() ?? "S"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.name}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.owner_email}</div>
                    </div>
                    {row.plan_name && <span style={{ fontSize: 10, fontWeight: 700, color: "#6366f1", background: "#eef2ff", padding: "2px 7px", borderRadius: 20 }}>{row.plan_name}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
          {loading && <div style={{ marginTop: 10, color: "#6366f1", fontSize: 12, display: "flex", alignItems: "center", gap: 7 }}><Spinner />Loading permissions…</div>}
        </div>

        {/* ── Selected salon ── */}
        {salon && !loading && (
          <>
            {/* Salon banner */}
            <div style={{ padding: "12px 20px", borderBottom: "1px solid #f1f5f9", background: "linear-gradient(135deg,#f8fafc,#eef2ff11)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16, fontWeight: 800, flexShrink: 0, boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }}>
                  {salon.name?.[0]?.toUpperCase() ?? "S"}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{salon.name}</div>
                  <div style={{ fontSize: 11.5, color: "#64748b" }}>{salon.owner_name} · {salon.owner_email}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                {salon.plan_name && <span style={{ background: "#eef2ff", color: "#6366f1", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, border: "1px solid #c7d2fe" }}>{salon.plan_name}</span>}
                <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, border: `1px solid ${salon.is_active ? "#bbf7d0" : "#e2e8f0"}`, background: salon.is_active ? "#f0fdf4" : "#f8fafc", color: salon.is_active ? "#16a34a" : "#94a3b8" }}>
                  {salon.is_active ? "● Active" : "● Inactive"}
                </span>
                <span style={{ fontSize: 10.5, fontWeight: 600, color: "#6366f1", background: "#eef2ff", padding: "3px 10px", borderRadius: 20, border: "1px solid #c7d2fe" }}>
                  {enabledCount}/{totalPerms} enabled
                </span>
              </div>
            </div>

            {/* Grant subscription days */}
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", background: "#fafbff" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a", marginBottom: 2 }}>Grant Subscription Days</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10 }}>
                Extends this account's active subscription by the given number of days from today (or from its current expiry, whichever is later) — takes effect immediately.
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <input
                  type="number" min={1} placeholder="e.g. 30" value={grantDays}
                  onChange={e => { setGrantDays(e.target.value); setGrantMsg(null); }}
                  onKeyDown={e => e.key === "Enter" && handleGrantDays()}
                  style={{ width: 100, padding: "8px 10px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, color: "#0f172a", outline: "none" }}
                />
                <span style={{ fontSize: 12, color: "#94a3b8" }}>days</span>
                <button onClick={handleGrantDays} disabled={granting} style={{
                  padding: "8px 18px", background: granting ? "#a5b4fc" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                  color: "#fff", border: "none", borderRadius: 8, fontSize: 12.5, fontWeight: 700,
                  cursor: granting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6,
                }}>
                  {granting ? <><Spinner color="#fff" />Granting…</> : "Grant Days"}
                </button>
                {grantMsg && (
                  <span style={{
                    fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 7,
                    color: grantMsg.ok ? "#16a34a" : "#dc2626",
                    background: grantMsg.ok ? "#f0fdf4" : "#fef2f2",
                    border: `1px solid ${grantMsg.ok ? "#bbf7d0" : "#fecaca"}`,
                  }}>
                    {grantMsg.text}
                  </span>
                )}
              </div>
            </div>

            {/* Bulk actions */}
            <div style={{ display: "flex", gap: 8, padding: "10px 20px", borderBottom: "1px solid #f1f5f9" }}>
              <button onClick={() => setAll(true)} style={{ fontSize: 11, fontWeight: 700, color: "#6366f1", background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 6, padding: "5px 12px", cursor: "pointer" }}>Enable all</button>
              <button onClick={() => setAll(false)} style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "5px 12px", cursor: "pointer" }}>Disable all</button>
            </div>

            {/* Permission rows */}
            <div>
              {SUBSCRIPTION_PERMISSIONS.map((perm, idx) => {
                const on = perms[perm.key] ?? true;
                return (
                  <div key={perm.key} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 20px",
                    background: idx % 2 === 0 ? "#fff" : "#fafbff",
                    borderBottom: idx < SUBSCRIPTION_PERMISSIONS.length - 1 ? "1px solid #f1f5f9" : "none",
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: on ? 600 : 400, color: on ? "#0f172a" : "#64748b" }}>{perm.label}</div>
                      <div style={{ fontSize: 11, color: "#b0bec5", marginTop: 1 }}>{perm.desc}</div>
                    </div>
                    <Toggle on={on} onChange={() => toggle(perm.key)} />
                  </div>
                );
              })}
            </div>

            {/* Save bar */}
            <div style={{ margin: "16px 20px", padding: "12px 18px", background: "linear-gradient(135deg,#f8fafc,#eef2ff22)", borderRadius: 12, border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <button onClick={handleSave} disabled={saving} style={{ padding: "9px 24px", background: saving ? "#a5b4fc" : "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 7, boxShadow: saving ? "none" : "0 4px 14px rgba(99,102,241,0.4)", transition: "all 0.2s" }}>
                {saving
                  ? <><Spinner color="#fff" />Saving…</>
                  : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>Save Permissions</>}
              </button>
              {saveMsg === "saved" && (
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 600, color: "#16a34a", background: "#f0fdf4", padding: "5px 12px", borderRadius: 7, border: "1px solid #bbf7d0" }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Permissions saved!
                </span>
              )}
              {saveMsg === "error" && <span style={{ fontSize: 12.5, fontWeight: 600, color: "#dc2626", background: "#fef2f2", padding: "5px 12px", borderRadius: 7, border: "1px solid #fecaca" }}>Failed to save. Try again.</span>}
              <span style={{ marginLeft: "auto", fontSize: 11, color: "#94a3b8" }}>Applies immediately — the account does not need to log out</span>
            </div>

            {/* Audit log */}
            <div style={{ margin: "0 20px 20px" }}>
              <button onClick={toggleAudit} style={{
                display: "flex", alignItems: "center", gap: 6, width: "100%",
                padding: "10px 14px", background: "#f8fafc", border: "1px solid #e2e8f0",
                borderRadius: 10, cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: "#374151",
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: showAudit ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s" }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
                Permission Change History
              </button>

              {showAudit && (
                <div style={{ border: "1px solid #e2e8f0", borderTop: "none", borderRadius: "0 0 10px 10px", background: "#fff" }}>
                  {auditLoading ? (
                    <div style={{ padding: 20, color: "#6366f1", fontSize: 12.5, display: "flex", alignItems: "center", gap: 7 }}><Spinner />Loading history…</div>
                  ) : auditLog.length === 0 ? (
                    <div style={{ padding: 20, color: "#94a3b8", fontSize: 12.5, textAlign: "center" }}>No permission changes recorded yet</div>
                  ) : (
                    auditLog.map((entry, i) => {
                      const changes = describeAuditEntry(entry);
                      return (
                        <div key={entry.id} style={{ padding: "12px 16px", borderBottom: i < auditLog.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a" }}>{entry.changed_by_name || entry.changed_by_email}</span>
                            <span style={{ fontSize: 11, color: "#94a3b8" }}>
                              {new Date(entry.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <ul style={{ margin: "6px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 3 }}>
                            {changes.map((c: string, ci: number) => (
                              <li key={ci} style={{ fontSize: 12, color: "#64748b" }}>{c}</li>
                            ))}
                          </ul>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Empty state */}
        {!salon && !loading && (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg,#f1f5f9,#e2e8f0)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>
            <div style={{ color: "#374151", fontSize: 14, fontWeight: 700 }}>Search for an account</div>
            <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 5 }}>Type a salon name or owner email to configure its subscription permissions</div>
          </div>
        )}
      </div>

      <style>{`@keyframes sxp-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
