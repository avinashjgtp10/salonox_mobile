import { useState, useRef, useEffect } from "react";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import {
  searchSalonsForPermissionsThunk,
  fetchSalonPermissionsByIdThunk,
  updateSalonPermissionsThunk,
} from "../../../middleware/superAdmin/superAdmin.thunk";
import { defaultPermissions, PERM_CATEGORIES } from "../../settings/data/permissionMatrix";

// ── Platform-wide defaults (display only) ─────────────────────────────────────
const ROLES = [
  {
    key: "salon_owner", label: "Salon Owner", color: "#6366f1", bg: "#eef2ff",
    perms: ["Manage Staff","Manage Services","Manage Clients","View Reports","Manage Billing","Manage Settings","Manage Inventory","Manage Marketing","View Analytics","Manage Packages"],
    total: 10,
  },
  {
    key: "admin", label: "Admin", color: "#3b82f6", bg: "#eff6ff",
    perms: ["Manage Staff","Manage Services","Manage Clients","View Reports","Manage Inventory","Manage Packages"],
    total: 8,
  },
];

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!on)} style={{
      width: 42, height: 23, borderRadius: 12, position: "relative", cursor: "pointer", flexShrink: 0,
      background: on ? "#6366f1" : "#e2e8f0",
      border: `2px solid ${on ? "#6366f1" : "#cbd5e1"}`,
      transition: "background 0.2s, border-color 0.2s",
    }}>
      <div style={{
        position: "absolute", top: 2, left: on ? 19 : 2,
        width: 15, height: 15, borderRadius: "50%",
        background: on ? "#fff" : "#94a3b8",
        boxShadow: on ? "0 1px 3px rgba(0,0,0,0.2)" : "none",
        transition: "left 0.18s",
      }} />
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PermissionsPage() {
  const dispatch = useAppDispatch();

  // Search/dropdown state
  const [query, setQuery]             = useState("");
  const [results, setResults]         = useState<any[]>([]);
  const [searching, setSearching]     = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropRef                        = useRef<HTMLDivElement>(null);

  // Selected salon + permissions
  const [salon, setSalon]             = useState<any>(null);
  const [perms, setPerms]             = useState<Record<string, { owner: boolean; staff: boolean }>>({});
  const [activeTab, setActiveTab]     = useState<"owner" | "staff">("staff");
  const [loading, setLoading]         = useState(false);
  const [saving, setSaving]           = useState(false);
  const [saveMsg, setSaveMsg]         = useState("");

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowDropdown(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // ── Search (debounced on type) ───────────────────────────────────────────────
  useEffect(() => {
    if (!query.trim()) { setResults([]); setShowDropdown(false); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const res = await dispatch(searchSalonsForPermissionsThunk(query.trim()));
      setSearching(false);
      if (searchSalonsForPermissionsThunk.fulfilled.match(res)) {
        setResults(res.payload);
        setShowDropdown(true);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  // ── Select a salon from dropdown ─────────────────────────────────────────────
  async function selectSalon(row: any) {
    setShowDropdown(false);
    setQuery(row.name);
    setSalon(null);
    setPerms({});
    setSaveMsg("");
    setLoading(true);
    const res = await dispatch(fetchSalonPermissionsByIdThunk(row.id));
    setLoading(false);
    if (fetchSalonPermissionsByIdThunk.fulfilled.match(res)) {
      const data = res.payload as any;
      setSalon(data.salon);
      const fetched = data.permissions ?? {};
      const seeded: Record<string, { owner: boolean; staff: boolean }> = {};
      for (const p of defaultPermissions) {
        seeded[p.key] = {
          owner: fetched[p.key]?.owner ?? p.owner,
          staff: fetched[p.key]?.staff ?? p.staff,
        };
      }
      setPerms(seeded);
    }
  }

  // ── Toggle permission ────────────────────────────────────────────────────────
  function toggle(key: string, role: "owner" | "staff") {
    setPerms(prev => ({ ...prev, [key]: { ...prev[key], [role]: !prev[key]?.[role] } }));
    setSaveMsg("");
  }

  function setCategory(cat: string, role: "owner" | "staff", value: boolean) {
    const keys = defaultPermissions.filter(p => p.category === cat).map(p => p.key);
    setPerms(prev => {
      const next = { ...prev };
      keys.forEach(k => { next[k] = { ...next[k], [role]: value }; });
      return next;
    });
    setSaveMsg("");
  }

  // ── Save ─────────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!salon) return;
    setSaving(true);
    setSaveMsg("");
    const res = await dispatch(updateSalonPermissionsThunk({ salonId: salon.id, permissions: perms }));
    setSaving(false);
    setSaveMsg(updateSalonPermissionsThunk.fulfilled.match(res) ? "✓ Permissions saved!" : "✗ Failed to save. Try again.");
  }

  const enabledCount = Object.values(perms).filter(p => p[activeTab]).length;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: "28px 28px 60px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>Roles & Permissions</h1>
        <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>
          View platform defaults · Search a salon to configure its specific access permissions
        </p>
      </div>

      {/* ── Platform defaults ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <div style={{ width: 3, height: 18, background: "#6366f1", borderRadius: 2 }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.07em" }}>Platform-wide Defaults</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {ROLES.map(role => (
            <div key={role.key} style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", background: role.bg, borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: "#fff", border: `1.5px solid ${role.color}40`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={role.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <div>
                  <div style={{ color: role.color, fontSize: 14, fontWeight: 700 }}>{role.label}</div>
                  <div style={{ color: "#94a3b8", fontSize: 11.5 }}>{role.perms.length} of {role.total} enabled</div>
                </div>
              </div>
              <div style={{ padding: "12px 20px 16px" }}>
                {role.perms.map((p, i, arr) => (
                  <div key={p} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: i < arr.length - 1 ? "1px solid #f8fafc" : "none" }}>
                    <span style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>{p}</span>
                    <div style={{ width: 36, height: 20, borderRadius: 10, background: `${role.color}20`, border: `1.5px solid ${role.color}50`, position: "relative", flexShrink: 0 }}>
                      <div style={{ position: "absolute", top: 2, right: 2, width: 12, height: 12, borderRadius: "50%", background: role.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Salon-specific section ── */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "visible", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>

        {/* Section header */}
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc", borderRadius: "16px 16px 0 0", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Salon-Specific Permissions</div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>Search by salon name or owner email — select to configure access</div>
          </div>
        </div>

        {/* Search box */}
        <div style={{ padding: "20px 24px", borderBottom: salon ? "1px solid #f1f5f9" : "none", position: "relative" }} ref={dropRef}>
          <div style={{ position: "relative", maxWidth: 520 }}>
            {/* Input */}
            <div style={{ display: "flex", alignItems: "center", border: `1.5px solid ${showDropdown ? "#6366f1" : "#e2e8f0"}`, borderRadius: 10, background: "#fff", overflow: "hidden", boxShadow: showDropdown ? "0 0 0 3px rgba(99,102,241,0.12)" : "none", transition: "border-color 0.2s, box-shadow 0.2s" }}>
              <div style={{ padding: "0 12px", color: "#94a3b8" }}>
                {searching
                  ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "sa-spin 0.8s linear infinite" }}><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
                  : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                }
              </div>
              <input
                type="text"
                placeholder="Search by salon name or owner email…"
                value={query}
                onChange={e => { setQuery(e.target.value); setSalon(null); setSaveMsg(""); }}
                onFocus={() => results.length > 0 && setShowDropdown(true)}
                style={{ flex: 1, border: "none", outline: "none", fontSize: 13.5, color: "#0f172a", padding: "11px 12px 11px 0", fontFamily: "inherit", background: "transparent" }}
              />
              {query && (
                <button onClick={() => { setQuery(""); setResults([]); setSalon(null); setShowDropdown(false); setSaveMsg(""); }}
                  style={{ padding: "0 12px", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 16 }}>×</button>
              )}
            </div>

            {/* Dropdown results */}
            {showDropdown && results.length > 0 && (
              <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 100, maxHeight: 280, overflowY: "auto" }}>
                {results.map((row, i) => (
                  <div key={row.id}
                    onClick={() => selectSalon(row)}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "pointer", borderBottom: i < results.length - 1 ? "1px solid #f8fafc" : "none", background: "#fff", transition: "background 0.12s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
                    onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
                  >
                    {/* Avatar */}
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 800, flexShrink: 0 }}>
                      {row.name?.[0]?.toUpperCase() ?? "S"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.name}</div>
                      <div style={{ fontSize: 11.5, color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.owner_email}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
                      {row.plan_name && <span style={{ fontSize: 10.5, fontWeight: 700, color: "#6366f1", background: "#eef2ff", padding: "2px 8px", borderRadius: 20 }}>{row.plan_name}</span>}
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: row.is_active ? "#10b981" : "#94a3b8" }} />
                        <span style={{ fontSize: 10.5, color: row.is_active ? "#16a34a" : "#94a3b8", fontWeight: 600 }}>{row.is_active ? "Active" : "Inactive"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* No results */}
            {showDropdown && results.length === 0 && !searching && query.trim() && (
              <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 12, padding: "20px 16px", textAlign: "center", zIndex: 100, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}>
                <div style={{ color: "#64748b", fontSize: 13, fontWeight: 600 }}>No salons found</div>
                <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>Try a different name or email</div>
              </div>
            )}
          </div>

          {/* Loading selected salon */}
          {loading && (
            <div style={{ marginTop: 12, color: "#6366f1", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "sa-spin 0.8s linear infinite" }}><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
              Loading permissions…
            </div>
          )}
        </div>

        {/* ── Selected salon permissions ── */}
        {salon && !loading && (
          <>
            {/* Salon banner */}
            <div style={{ padding: "14px 24px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 11, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 17, fontWeight: 800, flexShrink: 0 }}>
                  {salon.name?.[0]?.toUpperCase() ?? "S"}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{salon.name}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{salon.owner_name} · {salon.owner_email}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {salon.plan_name && <span style={{ background: "#eef2ff", color: "#6366f1", fontSize: 11.5, fontWeight: 700, padding: "4px 10px", borderRadius: 20, border: "1px solid #c7d2fe" }}>{salon.plan_name}</span>}
                <span style={{ fontSize: 11.5, fontWeight: 600, padding: "4px 10px", borderRadius: 20, border: `1px solid ${salon.is_active ? "#bbf7d0" : "#e2e8f0"}`, background: salon.is_active ? "#f0fdf4" : "#f8fafc", color: salon.is_active ? "#16a34a" : "#94a3b8" }}>
                  {salon.is_active ? "● Active" : "● Inactive"}
                </span>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: "#6366f1", background: "#eef2ff", padding: "4px 10px", borderRadius: 20, border: "1px solid #c7d2fe" }}>
                  {enabledCount}/{Object.keys(perms).length} enabled
                </span>
              </div>
            </div>

            {/* Role tabs */}
            <div style={{ padding: "16px 24px 0", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ display: "inline-flex", background: "#f1f5f9", borderRadius: 10, padding: 3, gap: 2 }}>
                {(["staff","owner"] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} style={{
                    padding: "8px 22px", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
                    background: activeTab === tab ? "#6366f1" : "transparent",
                    color: activeTab === tab ? "#fff" : "#64748b",
                    transition: "background 0.15s",
                  }}>
                    {tab === "owner" ? "Salon Owner" : "Staff"}
                  </button>
                ))}
              </div>
              <p style={{ margin: "8px 0 0 2px", fontSize: 12, color: "#94a3b8", paddingBottom: 12 }}>
                {activeTab === "staff"
                  ? "⚡ These permissions are actively enforced — staff can only access what is enabled here."
                  : "ℹ️ Salon owners always have full access. These flags are informational."}
              </p>
            </div>

            {/* Permission categories */}
            <div style={{ padding: "8px 24px 24px" }}>
              {PERM_CATEGORIES.map(cat => {
                const catPerms = defaultPermissions.filter(p => p.category === cat);
                const catEnabled = catPerms.filter(p => perms[p.key]?.[activeTab]).length;
                const allOn = catEnabled === catPerms.length;
                return (
                  <div key={cat} style={{ marginTop: 18 }}>
                    {/* Category row */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.07em" }}>{cat}</span>
                        <span style={{ background: catEnabled > 0 ? "#eef2ff" : "#f1f5f9", color: catEnabled > 0 ? "#6366f1" : "#94a3b8", fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>
                          {catEnabled}/{catPerms.length}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button onClick={() => setCategory(cat, activeTab, true)} style={{ fontSize: 11, color: "#6366f1", fontWeight: 700, background: "none", border: "none", cursor: "pointer", padding: 0 }}>All on</button>
                        <span style={{ color: "#e2e8f0", fontSize: 11 }}>|</span>
                        <button onClick={() => setCategory(cat, activeTab, false)} style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0 }}>All off</button>
                      </div>
                    </div>

                    {/* Permissions list */}
                    <div style={{ borderRadius: 12, border: "1px solid #f1f5f9", overflow: "hidden" }}>
                      {catPerms.map((perm, idx) => {
                        const isOn = perms[perm.key]?.[activeTab] ?? false;
                        return (
                          <div key={perm.key}
                            onClick={() => toggle(perm.key, activeTab)}
                            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", borderBottom: idx < catPerms.length - 1 ? "1px solid #f8fafc" : "none", background: isOn ? "#fff" : "#fafafa", cursor: "pointer", transition: "background 0.12s", userSelect: "none" }}
                            onMouseEnter={e => (e.currentTarget.style.background = isOn ? "#f8fafc" : "#f5f5f5")}
                            onMouseLeave={e => (e.currentTarget.style.background = isOn ? "#fff" : "#fafafa")}
                          >
                            <div>
                              <div style={{ fontSize: 13.5, fontWeight: isOn ? 600 : 400, color: isOn ? "#0f172a" : "#94a3b8", transition: "color 0.15s" }}>{perm.label}</div>
                              <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 1 }}>{perm.desc}</div>
                            </div>
                            <Toggle on={isOn} onChange={(v) => toggle(perm.key, activeTab)} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Save bar */}
              <div style={{ marginTop: 24, padding: "14px 20px", background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <button onClick={handleSave} disabled={saving} style={{ padding: "10px 28px", background: saving ? "#a5b4fc" : "#6366f1", color: "#fff", border: "none", borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                  {saving
                    ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "sa-spin 0.8s linear infinite" }}><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg> Saving…</>
                    : "Save Permissions"}
                </button>
                {saveMsg && (
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: saveMsg.startsWith("✓") ? "#16a34a" : "#dc2626" }}>{saveMsg}</span>
                )}
                <span style={{ marginLeft: "auto", fontSize: 11.5, color: "#94a3b8" }}>Changes apply immediately for this salon's staff</span>
              </div>
            </div>
          </>
        )}

        {/* Empty state */}
        {!salon && !loading && (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>
            <div style={{ color: "#64748b", fontSize: 14, fontWeight: 600 }}>Search for a salon</div>
            <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>Type a salon name or owner email above to begin</div>
          </div>
        )}
      </div>

      <style>{`@keyframes sa-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
