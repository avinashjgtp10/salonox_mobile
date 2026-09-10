import { useState, useEffect } from "react";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import {
  searchSalonsForSubscriptionPermissionsThunk,
  fetchSubscriptionPermissionsByIdThunk,
  updateSubscriptionPermissionsThunk,
  fetchSubscriptionPermissionAuditLogThunk,
  grantSubscriptionDaysThunk,
  applySubscriptionThunk,
  removeSubscriptionThunk,
} from "../../../middleware/superAdmin/superAdmin.thunk";
import Pagination from "../components/Pagination";
import DatePicker from "../../../components/ui/DatePicker";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";

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

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

function daysRemaining(endDate?: string | null): number | null {
  if (!endDate) return null;
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - today.getTime()) / 86400000);
}

// Single source of truth for the day-count → bucket mapping, shared by the
// row badge and the "Days Remaining" filter so they can never drift apart.
type DaysBucket = "active" | "expiring_soon" | "expiring_very_soon" | "expires_today" | "expired" | "unknown";

function daysRemainingBucket(endDate?: string | null): DaysBucket {
  const days = daysRemaining(endDate);
  if (days === null) return "unknown";
  if (days < 0)  return "expired";
  if (days === 0) return "expires_today";
  if (days <= 7)  return "expiring_very_soon";
  if (days <= 30) return "expiring_soon";
  return "active";
}

const DAYS_BUCKET_OPTIONS: { value: DaysBucket; label: string }[] = [
  { value: "active",              label: "30+ days — Active" },
  { value: "expiring_soon",       label: "8–30 days — Expiring Soon" },
  { value: "expiring_very_soon",  label: "1–7 days — Expiring Very Soon" },
  { value: "expires_today",       label: "0 days — Expires Today" },
  { value: "expired",             label: "Expired" },
];

function daysRemainingBadge(endDate?: string | null) {
  const days = daysRemaining(endDate);
  const bucket = daysRemainingBucket(endDate);
  const labels: Record<DaysBucket, string> = {
    unknown: "—",
    expired: "Expired",
    expires_today: "Expires Today",
    expiring_very_soon: `${days}d — Very Soon`,
    expiring_soon: `${days}d — Soon`,
    active: `${days}d — Active`,
  };
  const styles: Record<DaysBucket, { bg: string; text: string }> = {
    unknown:             { bg: "#f8fafc", text: "#94a3b8" },
    expired:              { bg: "#fef2f2", text: "#dc2626" },
    expires_today:        { bg: "#fef2f2", text: "#dc2626" },
    expiring_very_soon:   { bg: "#fff7ed", text: "#ea580c" },
    expiring_soon:        { bg: "#fffbeb", text: "#d97706" },
    active:                { bg: "#f0fdf4", text: "#16a34a" },
  };
  return { label: labels[bucket], ...styles[bucket] };
}

function autoRenewalBadge(row: any) {
  if (!row.subscription_status) return { label: "—", bg: "#f8fafc", text: "#94a3b8" };
  if (row.subscription_cancelled_at || row.subscription_cancel_at_period_end) {
    return { label: "Will Not Renew", bg: "#fef2f2", text: "#dc2626" };
  }
  if (row.subscription_status === "active") {
    return { label: "Auto-Renews", bg: "#f0fdf4", text: "#16a34a" };
  }
  return { label: "—", bg: "#f8fafc", text: "#94a3b8" };
}

function subscriptionStatusBadge(row: any) {
  if (!row.subscription_status) return { label: "—", bg: "#f8fafc", text: "#94a3b8" };
  if (row.subscription_is_trial) return { label: "Trialing", bg: "#eef2ff", text: "#6366f1" };
  const styles: Record<string, { bg: string; text: string }> = {
    active:        { bg: "#f0fdf4", text: "#16a34a" },
    paused:        { bg: "#fffbeb", text: "#d97706" },
    cancelled:     { bg: "#fef2f2", text: "#dc2626" },
    expired:       { bg: "#fef2f2", text: "#dc2626" },
    completed:     { bg: "#f8fafc", text: "#64748b" },
    created:       { bg: "#f8fafc", text: "#64748b" },
    authenticated: { bg: "#f8fafc", text: "#64748b" },
  };
  const c = styles[row.subscription_status] ?? { bg: "#f8fafc", text: "#64748b" };
  return { label: row.subscription_status, ...c };
}

function permissionsCount(row: any): { enabled: number; total: number } {
  let parsed: Record<string, boolean> = {};
  try { parsed = row.subscription_permissions ? JSON.parse(row.subscription_permissions) : {}; } catch { /* ignore */ }
  const enabled = SUBSCRIPTION_PERMISSIONS.filter(p => parsed[p.key] ?? true).length;
  return { enabled, total: SUBSCRIPTION_PERMISSIONS.length };
}

export default function SubscriptionPermissionsPage() {
  const dispatch = useAppDispatch();

  const [query, setQuery]     = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [daysFilter, setDaysFilter]     = useState<DaysBucket | "">("");
  const [page, setPage]       = useState(1);
  const [perPage, setPerPage] = useState(10);

  const filteredResults = results.filter((row: any) => {
    if (statusFilter === "trialing" && !row.subscription_is_trial) return false;
    if (statusFilter && statusFilter !== "trialing" && (row.subscription_status ?? "") !== statusFilter) return false;
    if (daysFilter && daysRemainingBucket(row.subscription_end_date) !== daysFilter) return false;
    return true;
  });

  const [modalOpen, setModalOpen] = useState(false);
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

  const [applyStart, setApplyStart]     = useState("");
  const [applyEnd, setApplyEnd]         = useState("");
  const [applying, setApplying]         = useState(false);
  const [applyMsg, setApplyMsg]         = useState<{ ok: boolean; text: string } | null>(null);

  const [removing, setRemoving]         = useState(false);
  const [removeMsg, setRemoveMsg]       = useState<{ ok: boolean; text: string } | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      setSearching(true);
      const res = await dispatch(searchSalonsForSubscriptionPermissionsThunk(query.trim()));
      setSearching(false);
      if (searchSalonsForSubscriptionPermissionsThunk.fulfilled.match(res)) {
        setResults(res.payload);
        setPage(1);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  async function selectSalon(row: any) {
    setModalOpen(true);
    setSalon(null); setPerms({}); setSaveMsg(""); setLoading(true);
    setShowAudit(false); setAuditLog([]);
    setGrantDays(""); setGrantMsg(null);
    setApplyStart(""); setApplyEnd(""); setApplyMsg(null);
    setRemoveMsg(null); setShowRemoveConfirm(false);
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

  function closeModal() {
    setModalOpen(false);
    setSalon(null); setPerms({}); setSaveMsg("");
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

  const applyDurationDays = (() => {
    if (!applyStart || !applyEnd) return null;
    const start = new Date(`${applyStart}T00:00:00`);
    const end = new Date(`${applyEnd}T00:00:00`);
    const diff = Math.round((end.getTime() - start.getTime()) / 86400000);
    return diff > 0 ? diff : null;
  })();

  async function handleApplySubscription() {
    if (!salon) return;
    if (!applyStart || !applyEnd) {
      setApplyMsg({ ok: false, text: "Select both a start date and an end date" });
      return;
    }
    if (applyEnd <= applyStart) {
      setApplyMsg({ ok: false, text: "End date must be after start date" });
      return;
    }
    setApplying(true); setApplyMsg(null);
    const res = await dispatch(applySubscriptionThunk({ salonId: salon.id, startDate: applyStart, endDate: applyEnd }));
    setApplying(false);
    if (applySubscriptionThunk.fulfilled.match(res)) {
      const sub = res.payload?.subscription;
      setSalon((prev: any) => prev ? {
        ...prev,
        subscription_status: sub?.status ?? "active",
        subscription_start_date: sub?.current_period_start ?? applyStart,
        subscription_end_date: sub?.current_period_end ?? applyEnd,
        subscription_cancel_at_period_end: false,
        subscription_cancelled_at: null,
      } : prev);
      setApplyMsg({ ok: true, text: `Subscription applied — active ${fmtDate(applyStart)} to ${fmtDate(applyEnd)}` });
      if (showAudit) loadAuditLog();
    } else {
      setApplyMsg({ ok: false, text: (res.payload as string) || "Failed to apply subscription" });
    }
  }

  async function handleRemoveSubscription() {
    if (!salon) return;
    setShowRemoveConfirm(false);
    setRemoving(true); setRemoveMsg(null);
    const res = await dispatch(removeSubscriptionThunk(salon.id));
    setRemoving(false);
    if (removeSubscriptionThunk.fulfilled.match(res)) {
      const sub = res.payload?.subscription;
      setSalon((prev: any) => prev ? {
        ...prev,
        subscription_status: sub?.status ?? "cancelled",
        subscription_end_date: sub?.current_period_end ?? null,
        subscription_cancelled_at: sub?.cancelled_at ?? new Date().toISOString(),
      } : prev);
      setRemoveMsg({ ok: true, text: "Subscription removed — account deactivated" });
      if (showAudit) loadAuditLog();
    } else {
      setRemoveMsg({ ok: false, text: (res.payload as string) || "Failed to remove subscription" });
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
          <p style={{ margin: 0, color: "#94a3b8", fontSize: 12 }}>Click an account to control which subscription actions it can perform</p>
        </div>
      </div>

      {/* ── Search + filters ── */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ position: "relative", flex: "1 1 320px", maxWidth: 420 }}>
          <div style={{ padding: "0 12px", color: "#94a3b8", position: "absolute", left: 0, top: 0, bottom: 0, display: "flex", alignItems: "center" }}>
            {searching ? <Spinner /> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>}
          </div>
          <input type="text" placeholder="Search by salon name or owner email…" value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ width: "100%", boxSizing: "border-box", border: "1.5px solid #e2e8f0", borderRadius: 10, background: "#fff", fontSize: 13, color: "#0f172a", padding: "10px 14px 10px 36px", fontFamily: "inherit", outline: "none", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }} />
        </div>

        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ padding: "9px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", color: "#374151", fontSize: 13, outline: "none", appearance: "none", cursor: "pointer" }}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="trialing">Trialing</option>
          <option value="paused">Paused</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
        </select>

        <select value={daysFilter} onChange={e => { setDaysFilter(e.target.value as DaysBucket | ""); setPage(1); }}
          style={{ padding: "9px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", color: "#374151", fontSize: 13, outline: "none", appearance: "none", cursor: "pointer" }}>
          <option value="">All Days Remaining</option>
          {DAYS_BUCKET_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {(statusFilter || daysFilter) && (
          <button onClick={() => { setStatusFilter(""); setDaysFilter(""); setPage(1); }}
            style={{ padding: "9px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
            Clear filters
          </button>
        )}
      </div>

      {/* ── Account table ── */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "auto", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 1380 }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              {["Salon Name", "Owner", "Plan", "Subscription Status", "Start Date", "Expiry Date", "Days Remaining", "Auto-Renewal", "Permissions", ""].map(h => (
                <th key={h} style={{ padding: "11px 16px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredResults.length === 0 ? (
              <tr><td colSpan={10} style={{ padding: "48px 0", textAlign: "center", color: "#94a3b8", fontSize: 13.5 }}>No accounts found</td></tr>
            ) : (
              filteredResults.slice((page - 1) * perPage, page * perPage).map((row: any) => {
                const daysBadge  = daysRemainingBadge(row.subscription_end_date);
                const renewBadge = autoRenewalBadge(row);
                const permCount  = permissionsCount(row);
                return (
                  <tr key={row.id} onClick={() => selectSalon(row)}
                    style={{ borderTop: "1px solid #f1f5f9", cursor: "pointer", transition: "background 0.1s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
                    onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                          {row.name?.[0]?.toUpperCase() ?? "S"}
                        </div>
                        <span style={{ color: "#0f172a", fontWeight: 700, whiteSpace: "nowrap" }}>{row.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ color: "#374151", fontSize: 13 }}>{row.owner_name || "—"}</div>
                      <div style={{ color: "#94a3b8", fontSize: 11.5 }}>{row.owner_email}</div>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      {row.plan_name ? <span style={{ fontSize: 11, fontWeight: 700, color: "#6366f1", background: "#eef2ff", padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>{row.plan_name}</span> : <span style={{ color: "#cbd5e1" }}>—</span>}
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      {(() => {
                        const statusBadge = subscriptionStatusBadge(row);
                        return (
                          <span style={{ fontSize: 11.5, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: statusBadge.bg, color: statusBadge.text, textTransform: "capitalize", whiteSpace: "nowrap" }}>
                            {statusBadge.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td style={{ padding: "13px 16px", color: "#374151", fontSize: 12.5, whiteSpace: "nowrap" }}>{fmtDate(row.subscription_start_date)}</td>
                    <td style={{ padding: "13px 16px", color: "#374151", fontSize: 12.5, whiteSpace: "nowrap" }}>{fmtDate(row.subscription_end_date)}</td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: daysBadge.bg, color: daysBadge.text, whiteSpace: "nowrap" }}>
                        {daysBadge.label}
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: renewBadge.bg, color: renewBadge.text, whiteSpace: "nowrap" }}>
                        {renewBadge.label}
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px", color: "#374151", fontSize: 12.5, whiteSpace: "nowrap" }}>{permCount.enabled}/{permCount.total}</td>
                    <td style={{ padding: "13px 16px", textAlign: "right" }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: "#6366f1", whiteSpace: "nowrap" }}>Configure →</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <Pagination
          total={filteredResults.length} page={page} perPage={perPage}
          onPageChange={setPage} onPerPageChange={setPerPage}
          itemLabel="accounts"
        />
      </div>

      {/* ── Subscription permissions modal ── */}
      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 24px 60px rgba(0,0,0,0.25)", width: "min(720px, 100%)", maxHeight: "88vh", overflowY: "auto", position: "relative" }}>
          <button onClick={closeModal} style={{ position: "absolute", top: 14, right: 14, zIndex: 2, background: "#f1f5f9", border: "none", borderRadius: 8, width: 30, height: 30, cursor: "pointer", color: "#64748b", fontSize: 18, lineHeight: 1 }}>×</button>

          {loading && (
            <div style={{ padding: "60px 24px", textAlign: "center", color: "#6366f1", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Spinner />Loading permissions…
            </div>
          )}

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

            {/* Apply / Remove subscription */}
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", background: "#fff" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 2 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a" }}>Subscription Status</div>
                {(() => {
                  const statusBadge = subscriptionStatusBadge(salon);
                  return (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: statusBadge.bg, color: statusBadge.text, textTransform: "capitalize" }}>
                      {statusBadge.label}
                    </span>
                  );
                })()}
              </div>
              <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 11.5, color: "#64748b", marginBottom: 12 }}>
                <span>Start: <b style={{ color: "#374151" }}>{fmtDate(salon.subscription_start_date)}</b></span>
                <span>End: <b style={{ color: "#374151" }}>{fmtDate(salon.subscription_end_date)}</b></span>
              </div>

              <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8 }}>
                Apply a subscription by choosing a start and end date — sets the account active immediately for that period.
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <DatePicker value={applyStart} onChange={v => { setApplyStart(v); setApplyMsg(null); }} placeholder="Start date" max={applyEnd || undefined} />
                <DatePicker value={applyEnd} onChange={v => { setApplyEnd(v); setApplyMsg(null); }} placeholder="End date" min={applyStart || undefined} />
                {applyDurationDays !== null && (
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: "#6366f1", background: "#eef2ff", padding: "5px 10px", borderRadius: 7 }}>
                    {applyDurationDays} day{applyDurationDays !== 1 ? "s" : ""}
                  </span>
                )}
                <button onClick={handleApplySubscription} disabled={applying} style={{
                  padding: "8px 18px", background: applying ? "#a5b4fc" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                  color: "#fff", border: "none", borderRadius: 8, fontSize: 12.5, fontWeight: 700,
                  cursor: applying ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6,
                }}>
                  {applying ? <><Spinner color="#fff" />Applying…</> : "Apply Subscription"}
                </button>
                <button onClick={() => setShowRemoveConfirm(true)} disabled={removing} style={{
                  padding: "8px 18px", background: "#fff", color: "#dc2626", border: "1.5px solid #fecaca", borderRadius: 8,
                  fontSize: 12.5, fontWeight: 700, cursor: removing ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6,
                }}>
                  {removing ? <><Spinner color="#dc2626" />Removing…</> : "Remove Subscription"}
                </button>
                {applyMsg && (
                  <span style={{
                    fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 7,
                    color: applyMsg.ok ? "#16a34a" : "#dc2626",
                    background: applyMsg.ok ? "#f0fdf4" : "#fef2f2",
                    border: `1px solid ${applyMsg.ok ? "#bbf7d0" : "#fecaca"}`,
                  }}>
                    {applyMsg.text}
                  </span>
                )}
                {removeMsg && (
                  <span style={{
                    fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 7,
                    color: removeMsg.ok ? "#16a34a" : "#dc2626",
                    background: removeMsg.ok ? "#f0fdf4" : "#fef2f2",
                    border: `1px solid ${removeMsg.ok ? "#bbf7d0" : "#fecaca"}`,
                  }}>
                    {removeMsg.text}
                  </span>
                )}
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
        </div>

        {showRemoveConfirm && salon && (
          <ConfirmDialog
            title="Remove Subscription"
            message={`Are you sure you want to remove ${salon.name}'s subscription? This immediately deactivates the account's access.`}
            confirmLabel="Remove"
            danger
            onConfirm={handleRemoveSubscription}
            onCancel={() => setShowRemoveConfirm(false)}
          />
        )}
        </div>
      )}

      <style>{`@keyframes sxp-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
