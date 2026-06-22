import { useState, useRef, useEffect } from "react";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import {
  searchSalonsForPermissionsThunk,
  fetchSalonPermissionsByIdThunk,
  updateSalonPermissionsThunk,
} from "../../../middleware/superAdmin/superAdmin.thunk";
import { defaultPermissions, PERM_CATEGORIES } from "../../settings/data/permissionMatrix";

// ── Category icons ────────────────────────────────────────────────────────────
const CATEGORY_ICONS: Record<string, JSX.Element> = {
  Dashboard: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  "Quick Sale": (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  ),
  Calendar: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  Clients: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  ),
  Sales: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  Catalog: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  ),
  "Online Booking": (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  Marketing: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
  ),
  Team: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Reports: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  Settings: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  Help: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
};

const CAT_COLORS: Record<string, { from: string; to: string; text: string }> = {
  Dashboard:        { from: "#6366f1", to: "#818cf8", text: "#6366f1" },
  "Quick Sale":     { from: "#10b981", to: "#34d399", text: "#059669" },
  Calendar:         { from: "#0ea5e9", to: "#38bdf8", text: "#0284c7" },
  Clients:          { from: "#ec4899", to: "#f472b6", text: "#db2777" },
  Sales:            { from: "#f59e0b", to: "#fbbf24", text: "#d97706" },
  Catalog:          { from: "#8b5cf6", to: "#a78bfa", text: "#7c3aed" },
  "Online Booking": { from: "#06b6d4", to: "#22d3ee", text: "#0891b2" },
  Marketing:        { from: "#ef4444", to: "#f87171", text: "#dc2626" },
  Team:             { from: "#f97316", to: "#fb923c", text: "#ea580c" },
  Reports:          { from: "#64748b", to: "#94a3b8", text: "#475569" },
  Settings:         { from: "#64748b", to: "#94a3b8", text: "#475569" },
  Help:             { from: "#14b8a6", to: "#2dd4bf", text: "#0d9488" },
};

// ── Premium Toggle ────────────────────────────────────────────────────────────
function Toggle({ on, onChange, color = "#6366f1" }: { on: boolean; onChange: (v: boolean) => void; color?: string }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      width: 48, height: 26, borderRadius: 13, border: "none",
      position: "relative", cursor: "pointer", flexShrink: 0, outline: "none",
      background: on ? `linear-gradient(135deg, ${color}, ${color}cc)` : "#e2e8f0",
      boxShadow: on ? `0 0 0 3px ${color}22, 0 2px 6px ${color}44` : "inset 0 1px 3px rgba(0,0,0,0.08)",
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
        boxShadow: on ? `0 2px 6px rgba(0,0,0,0.2), 0 0 0 1px ${color}33` : "0 1px 4px rgba(0,0,0,0.15)",
        transition: "left 0.22s cubic-bezier(.4,0,.2,1)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {on && <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 6 5 9 10 3"/></svg>}
      </div>
    </button>
  );
}

type PermMap = Record<string, { owner: boolean; staff: boolean; manager: boolean }>;

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PermissionsPage() {
  const dispatch = useAppDispatch();

  const [query, setQuery]               = useState("");
  const [results, setResults]           = useState<any[]>([]);
  const [searching, setSearching]       = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropRef                         = useRef<HTMLDivElement>(null);

  const [salon, setSalon]     = useState<any>(null);
  const [perms, setPerms]     = useState<PermMap>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(PERM_CATEGORIES));
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

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
      const res = await dispatch(searchSalonsForPermissionsThunk(query.trim()));
      setSearching(false);
      if (searchSalonsForPermissionsThunk.fulfilled.match(res)) {
        setResults(res.payload); setShowDropdown(true);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  async function selectSalon(row: any) {
    setShowDropdown(false); setQuery(row.name);
    setSalon(null); setPerms({}); setSaveMsg(""); setLoading(true);
    setCollapsed(new Set(PERM_CATEGORIES));
    const res = await dispatch(fetchSalonPermissionsByIdThunk(row.id));
    setLoading(false);
    if (fetchSalonPermissionsByIdThunk.fulfilled.match(res)) {
      const data = res.payload as any;
      setSalon(data.salon);
      const fetched = data.permissions ?? {};
      const seeded: PermMap = {};
      for (const p of defaultPermissions) {
        seeded[p.key] = {
          owner:   fetched[p.key]?.owner   ?? true,
          staff:   fetched[p.key]?.staff   ?? true,
          manager: fetched[p.key]?.manager ?? true,
        };
      }
      setPerms(seeded);
    }
  }

  function toggle(key: string, role: "owner" | "staff" | "manager") {
    setPerms(prev => ({ ...prev, [key]: { ...prev[key], [role]: !prev[key]?.[role] } }));
    setSaveMsg("");
  }

  function setCategory(cat: string, role: "owner" | "staff" | "manager", value: boolean) {
    const keys = defaultPermissions.filter(p => p.category === cat).map(p => p.key);
    setPerms(prev => {
      const next = { ...prev };
      keys.forEach(k => { next[k] = { ...next[k], [role]: value }; });
      return next;
    });
    setSaveMsg("");
  }

  function toggleCollapse(cat: string) {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }

  function toggleGroup(groupKey: string) {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(groupKey) ? next.delete(groupKey) : next.add(groupKey);
      return next;
    });
  }

  async function handleSave() {
    if (!salon) return;
    setSaving(true); setSaveMsg("");
    const res = await dispatch(updateSalonPermissionsThunk({ salonId: salon.id, permissions: perms }));
    setSaving(false);
    setSaveMsg(updateSalonPermissionsThunk.fulfilled.match(res) ? "saved" : "error");
    if (updateSalonPermissionsThunk.fulfilled.match(res)) setTimeout(() => setSaveMsg(""), 3000);
  }

  const totalPerms    = Object.keys(perms).length;
  const ownerEnabled  = Object.values(perms).filter(p => p.owner).length;
  const staffEnabled  = Object.values(perms).filter(p => p.staff).length;
  const managerEnabled = Object.values(perms).filter(p => p.manager).length;

  // ── Spinner SVG ────────────────────────────────────────────────────────────
  const Spinner = ({ color = "#6366f1" }: { color?: string }) => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ animation: "sx-spin 0.8s linear infinite", flexShrink: 0 }}>
      <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
      <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
    </svg>
  );

  const COL = "1fr 88px 88px 88px";

  return (
    <div style={{ padding: "24px 24px 60px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", background: "#f8fafc", minHeight: "100vh" }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 22, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(99,102,241,0.35)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>Roles & Permissions</h1>
          <p style={{ margin: 0, color: "#94a3b8", fontSize: 12 }}>Search a salon to configure per-salon Owner, Staff &amp; Manager access</p>
        </div>
      </div>

      {/* ── Card ── */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "visible", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>

        {/* Card header */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", background: "linear-gradient(135deg,#f8fafc,#eef2ff22)", borderRadius: "16px 16px 0 0", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 3px 10px rgba(99,102,241,0.3)", flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Salon-Specific Permissions</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>Configure Owner, Staff &amp; Manager access per salon</div>
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
                  Owner {ownerEnabled}/{totalPerms}
                </span>
                <span style={{ fontSize: 10.5, fontWeight: 600, color: "#10b981", background: "#f0fdf4", padding: "3px 10px", borderRadius: 20, border: "1px solid #bbf7d0" }}>
                  Staff {staffEnabled}/{totalPerms}
                </span>
                <span style={{ fontSize: 10.5, fontWeight: 600, color: "#f59e0b", background: "#fffbeb", padding: "3px 10px", borderRadius: 20, border: "1px solid #fde68a" }}>
                  Manager {managerEnabled}/{totalPerms}
                </span>
              </div>
            </div>

            {/* Column header */}
            <div style={{ display: "grid", gridTemplateColumns: COL, padding: "7px 20px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em" }}>Permission</div>
              <div style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.07em" }}>Owner</div>
              <div style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.07em" }}>Staff</div>
              <div style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.07em" }}>Manager</div>
            </div>

            {/* Permission categories */}
            <div style={{ paddingBottom: 4 }}>
              {PERM_CATEGORIES.map(cat => {
                const catPerms   = defaultPermissions.filter(p => p.category === cat);
                const col        = CAT_COLORS[cat] ?? { from: "#6366f1", to: "#818cf8", text: "#6366f1" };
                const ownerCnt   = catPerms.filter(p => perms[p.key]?.owner).length;
                const staffCnt   = catPerms.filter(p => perms[p.key]?.staff).length;
                const mgrCnt     = catPerms.filter(p => perms[p.key]?.manager).length;
                const allOwnerOn = ownerCnt === catPerms.length;
                const allStaffOn = staffCnt === catPerms.length;
                const allMgrOn   = mgrCnt   === catPerms.length;
                const isCollapsed = collapsed.has(cat);

                // Sub-groups (e.g. Catalog has Services / Memberships / …)
                const groups = [...new Set(catPerms.map(p => p.group).filter(Boolean))] as string[];
                const hasGroups = groups.length > 0;

                return (
                  <div key={cat}>
                    {/* ── Category header ── */}
                    <div style={{ display: "grid", gridTemplateColumns: COL, padding: "6px 20px", background: "#f1f5f9", borderTop: "1px solid #e2e8f0", borderBottom: isCollapsed ? "none" : "1px solid #e2e8f0", cursor: "pointer", userSelect: "none" }}
                      onClick={() => toggleCollapse(cat)}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                          style={{ flexShrink: 0, transition: "transform 0.2s", transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }}>
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                        <div style={{ width: 20, height: 20, borderRadius: 5, background: `linear-gradient(135deg,${col.from}18,${col.to}0d)`, border: `1px solid ${col.from}30`, display: "flex", alignItems: "center", justifyContent: "center", color: col.from, flexShrink: 0 }}>
                          {CATEGORY_ICONS[cat] ?? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="12" r="10"/></svg>}
                        </div>
                        <span style={{ fontSize: 10.5, fontWeight: 800, color: col.text, textTransform: "uppercase", letterSpacing: "0.07em" }}>{cat}</span>
                        <span style={{ fontSize: 10, fontWeight: 500, color: "#b0bec5" }}>{catPerms.length}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "center" }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => setCategory(cat, "owner", !allOwnerOn)}
                          style={{ fontSize: 9, fontWeight: 700, color: allOwnerOn ? "#6366f1" : "#94a3b8", background: allOwnerOn ? "#eef2ff" : "#fff", border: `1px solid ${allOwnerOn ? "#c7d2fe" : "#e2e8f0"}`, borderRadius: 5, padding: "2px 7px", cursor: "pointer" }}>
                          {allOwnerOn ? "All off" : "All on"}
                        </button>
                      </div>
                      <div style={{ display: "flex", justifyContent: "center" }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => setCategory(cat, "staff", !allStaffOn)}
                          style={{ fontSize: 9, fontWeight: 700, color: allStaffOn ? "#10b981" : "#94a3b8", background: allStaffOn ? "#f0fdf4" : "#fff", border: `1px solid ${allStaffOn ? "#bbf7d0" : "#e2e8f0"}`, borderRadius: 5, padding: "2px 7px", cursor: "pointer" }}>
                          {allStaffOn ? "All off" : "All on"}
                        </button>
                      </div>
                      <div style={{ display: "flex", justifyContent: "center" }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => setCategory(cat, "manager", !allMgrOn)}
                          style={{ fontSize: 9, fontWeight: 700, color: allMgrOn ? "#f59e0b" : "#94a3b8", background: allMgrOn ? "#fffbeb" : "#fff", border: `1px solid ${allMgrOn ? "#fde68a" : "#e2e8f0"}`, borderRadius: 5, padding: "2px 7px", cursor: "pointer" }}>
                          {allMgrOn ? "All off" : "All on"}
                        </button>
                      </div>
                    </div>

                    {/* ── Permissions (flat or grouped) ── */}
                    {!isCollapsed && (
                      hasGroups ? (
                        // ── Sub-grouped (Catalog) ──
                        groups.map(grp => {
                          const gKey      = `${cat}::${grp}`;
                          const gPerms    = catPerms.filter(p => p.group === grp);
                          const gCollapsed = collapsedGroups.has(gKey);
                          return (
                            <div key={grp}>
                              {/* Sub-group header */}
                              <div style={{ display: "grid", gridTemplateColumns: COL, padding: "5px 20px 5px 32px", background: "#f8fafc", borderBottom: gCollapsed ? "none" : "1px solid #f1f5f9", cursor: "pointer", userSelect: "none" }}
                                onClick={() => toggleGroup(gKey)}>
                                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                    style={{ flexShrink: 0, transition: "transform 0.2s", transform: gCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }}>
                                    <polyline points="6 9 12 15 18 9"/>
                                  </svg>
                                  <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>{grp}</span>
                                  <span style={{ fontSize: 9.5, color: "#b0bec5" }}>{gPerms.length}</span>
                                </div>
                              </div>
                              {/* Sub-group rows */}
                              {!gCollapsed && gPerms.map((perm, idx) => {
                                const ownerOn = perms[perm.key]?.owner   ?? false;
                                const staffOn = perms[perm.key]?.staff   ?? false;
                                const mgrOn   = perms[perm.key]?.manager ?? false;
                                return (
                                  <div key={perm.key} style={{
                                    display: "grid", gridTemplateColumns: COL,
                                    padding: "7px 20px 7px 44px",
                                    background: idx % 2 === 0 ? "#fff" : "#fafbff",
                                    borderBottom: idx < gPerms.length - 1 ? "1px solid #f1f5f9" : "none",
                                    alignItems: "center",
                                  }}>
                                    <div>
                                      <div style={{ fontSize: 12.5, fontWeight: (ownerOn || staffOn || mgrOn) ? 600 : 400, color: (ownerOn || staffOn || mgrOn) ? "#0f172a" : "#64748b" }}>{perm.label}</div>
                                      <div style={{ fontSize: 10.5, color: "#b0bec5", marginTop: 1 }}>{perm.desc}</div>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "center" }}><Toggle on={ownerOn} onChange={() => toggle(perm.key, "owner")} color="#6366f1" /></div>
                                    <div style={{ display: "flex", justifyContent: "center" }}><Toggle on={staffOn} onChange={() => toggle(perm.key, "staff")} color="#10b981" /></div>
                                    <div style={{ display: "flex", justifyContent: "center" }}><Toggle on={mgrOn}   onChange={() => toggle(perm.key, "manager")} color="#f59e0b" /></div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })
                      ) : (
                        // ── Flat permissions ──
                        catPerms.map((perm, idx) => {
                          const ownerOn = perms[perm.key]?.owner   ?? false;
                          const staffOn = perms[perm.key]?.staff   ?? false;
                          const mgrOn   = perms[perm.key]?.manager ?? false;
                          return (
                            <div key={perm.key} style={{
                              display: "grid", gridTemplateColumns: COL,
                              padding: "7px 20px 7px 30px",
                              background: idx % 2 === 0 ? "#fff" : "#fafbff",
                              borderBottom: idx < catPerms.length - 1 ? "1px solid #f1f5f9" : "none",
                              alignItems: "center",
                            }}>
                              <div>
                                <div style={{ fontSize: 12.5, fontWeight: (ownerOn || staffOn || mgrOn) ? 600 : 400, color: (ownerOn || staffOn || mgrOn) ? "#0f172a" : "#64748b" }}>{perm.label}</div>
                                <div style={{ fontSize: 10.5, color: "#b0bec5", marginTop: 1 }}>{perm.desc}</div>
                              </div>
                              <div style={{ display: "flex", justifyContent: "center" }}><Toggle on={ownerOn} onChange={() => toggle(perm.key, "owner")} color="#6366f1" /></div>
                              <div style={{ display: "flex", justifyContent: "center" }}><Toggle on={staffOn} onChange={() => toggle(perm.key, "staff")} color="#10b981" /></div>
                              <div style={{ display: "flex", justifyContent: "center" }}><Toggle on={mgrOn}   onChange={() => toggle(perm.key, "manager")} color="#f59e0b" /></div>
                            </div>
                          );
                        })
                      )
                    )}
                  </div>
                );
              })}
            </div>

            {/* Save bar */}
            <div style={{ margin: "0 20px 20px", padding: "12px 18px", background: "linear-gradient(135deg,#f8fafc,#eef2ff22)", borderRadius: 12, border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
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
              <span style={{ marginLeft: "auto", fontSize: 11, color: "#94a3b8" }}>Changes apply immediately for this salon</span>
            </div>
          </>
        )}

        {/* Empty state */}
        {!salon && !loading && (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg,#f1f5f9,#e2e8f0)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>
            <div style={{ color: "#374151", fontSize: 14, fontWeight: 700 }}>Search for a salon</div>
            <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 5 }}>Type a salon name or owner email to configure its permissions</div>
          </div>
        )}
      </div>

      <style>{`@keyframes sx-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
