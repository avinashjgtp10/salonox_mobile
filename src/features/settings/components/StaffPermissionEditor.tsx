import { useState, useEffect, useMemo } from "react";
import { X, Loader2, RotateCcw, Search, ChevronDown } from "lucide-react";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import {
  fetchPermissionsCatalogThunk,
  fetchRolesThunk,
  fetchStaffPermissionsThunk,
  setStaffOverridesThunk,
  assignStaffRoleThunk,
} from "../../../middleware/roles/roles.thunk";
import { sortModuleNames } from "../utils/permissionModuleOrder";

interface Props {
  staffId: string;
  staffName: string;
  onClose: () => void;
}

// Sparse pending-changes map: key -> next override value (null clears it).
// Nothing here is sent to the backend until "Save changes" is clicked.
type PendingOverrides = Record<string, boolean | null>;

const riskBadgeClass: Record<string, string> = {
  low: "s-badge-gray",
  medium: "s-badge-info",
  high: "s-badge-warning",
  critical: "s-badge-danger",
};

export default function StaffPermissionEditor({ staffId, staffName, onClose }: Props) {
  const dispatch = useAppDispatch();
  const { showSuccess, showError, overlay } = useStatusOverlay();

  const catalog = useAppSelector((s) => s.roles.permissions);
  const catalogLoaded = useAppSelector((s) => s.roles.permissionsLoaded);
  const roles = useAppSelector((s) => s.roles.roles);

  const [view, setView] = useState<{
    role: { id: string; name: string } | null;
    permissions: { key: string; roleDefault: boolean; override: boolean | null; effective: boolean }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<PendingOverrides>({});
  const [saving, setSaving] = useState(false);
  const [changingRole, setChangingRole] = useState(false);
  const [search, setSearch] = useState("");
  const [confirmResetAll, setConfirmResetAll] = useState(false);
  // Sections start expanded; collapsing one adds its module name here.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleCollapsed = (module: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(module)) next.delete(module); else next.add(module);
      return next;
    });
  };

  useEffect(() => {
    if (!catalogLoaded) dispatch(fetchPermissionsCatalogThunk());
    if (roles.length === 0) dispatch(fetchRolesThunk());
  }, [dispatch, catalogLoaded, roles.length]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    dispatch(fetchStaffPermissionsThunk(staffId)).then((result) => {
      if (cancelled) return;
      if (fetchStaffPermissionsThunk.fulfilled.match(result)) {
        setView(result.payload);
      } else {
        showError("Failed to load this staff member's permissions");
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffId]);

  const catalogByKey = useMemo(() => new Map(catalog.map((p) => [p.key, p])), [catalog]);

  // Group by module, in catalog order, filtered by search. Each row's
  // "effective" toggle state already folds in any pending (unsaved) change.
  const groups = useMemo(() => {
    if (!view) return [];
    const q = search.trim().toLowerCase();
    const out: { module: string; rows: { key: string; effective: boolean; isCustom: boolean; name: string; desc: string | null; risk: string }[] }[] = [];
    const byModule = new Map<string, typeof out[number]["rows"]>();
    for (const perm of view.permissions) {
      const meta = catalogByKey.get(perm.key);
      const name = meta?.name ?? perm.key;
      const desc = meta?.description ?? null;
      if (q && !name.toLowerCase().includes(q) && !perm.key.toLowerCase().includes(q)) continue;
      const module = meta?.module ?? "Other";
      const currentOverride = perm.key in pending ? pending[perm.key] : perm.override;
      const effective = currentOverride !== null ? currentOverride : perm.roleDefault;
      const row = { key: perm.key, effective, isCustom: currentOverride !== null, name, desc, risk: meta?.risk_level ?? "low" };
      if (!byModule.has(module)) { byModule.set(module, []); out.push({ module, rows: byModule.get(module)! }); }
      byModule.get(module)!.push(row);
    }
    return sortModuleNames(out, (g) => g.module);
  }, [view, catalogByKey, search, pending]);

  const hasPendingChanges = Object.keys(pending).length > 0;

  // One toggle per permission. Flipping it always sets an explicit override
  // to the new effective value — no separate "role vs override" state to
  // reason about while editing. "Reset this one" (below) is the only way
  // back to inheriting the role default for that specific permission.
  const toggleEffective = (key: string, currentEffective: boolean) => {
    setPending((prev) => ({ ...prev, [key]: !currentEffective }));
  };

  const clearOneOverride = (key: string) => {
    setPending((prev) => ({ ...prev, [key]: null }));
  };

  const handleSave = async () => {
    if (!hasPendingChanges) return;
    setSaving(true);
    const result = await dispatch(setStaffOverridesThunk({ staffId, overrides: pending }));
    setSaving(false);
    if (setStaffOverridesThunk.fulfilled.match(result)) {
      setView(result.payload);
      setPending({});
      showSuccess("Permissions saved");
    } else {
      showError("Failed to save permissions");
    }
  };

  const handleResetAll = async () => {
    setConfirmResetAll(false);
    setSaving(true);
    const keysToReset: Record<string, null> = {};
    for (const perm of view?.permissions ?? []) keysToReset[perm.key] = null;
    const result = await dispatch(setStaffOverridesThunk({ staffId, overrides: keysToReset }));
    setSaving(false);
    if (setStaffOverridesThunk.fulfilled.match(result)) {
      setView(result.payload);
      setPending({});
      showSuccess(`${staffName} reset to role defaults`);
    } else {
      showError("Failed to reset permissions");
    }
  };

  const handleRoleChange = async (roleId: string) => {
    if (!roleId || roleId === view?.role?.id) return;
    setChangingRole(true);
    const result = await dispatch(assignStaffRoleThunk({ staffId, roleId }));
    setChangingRole(false);
    if (assignStaffRoleThunk.fulfilled.match(result)) {
      setView(result.payload);
      setPending({});
      showSuccess("Role updated");
    } else {
      showError("Failed to assign role");
    }
  };

  const activeOverrideCount = view ? view.permissions.filter((p) => (p.key in pending ? pending[p.key] !== null : p.override !== null)).length : 0;

  return (
    <div className="spm-overlay" onClick={(e) => e.target === e.currentTarget && !saving && onClose()}>
      {overlay}
      <div className="spm-panel spm-panel--permissions">
        {/* Header */}
        <div className="spm-header">
          <div className="spm-header-info">
            <div className="spm-avatar">{staffName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}</div>
            <div>
              <p className="spm-name">{staffName}</p>
              <p className="spm-email">
                {view?.role ? (
                  <>
                    Role:{" "}
                    <select
                      value={view.role.id}
                      disabled={changingRole || roles.length === 0}
                      onChange={(e) => handleRoleChange(e.target.value)}
                      style={{ fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 4, padding: "1px 4px" }}
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </>
                ) : "No role assigned yet"}
              </p>
            </div>
          </div>
          <button className="spm-close-btn" onClick={onClose} aria-label="Close" disabled={saving}>
            <X size={18} />
          </button>
        </div>

        {/* Mode banner */}
        {activeOverrideCount > 0 && (
          <div className="spm-mode-banner custom">
            <span>{activeOverrideCount} individual override{activeOverrideCount === 1 ? "" : "s"} active.</span>
            {confirmResetAll ? (
              <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                Reset all?
                <button className="spm-reset-link" onClick={handleResetAll} disabled={saving}>Yes, reset</button>
                <button className="spm-reset-link" onClick={() => setConfirmResetAll(false)}>Cancel</button>
              </span>
            ) : (
              <button className="spm-reset-link" onClick={() => setConfirmResetAll(true)} disabled={saving}>
                <RotateCcw size={12} /> Reset all to role defaults
              </button>
            )}
          </div>
        )}

        {/* Search */}
        <div style={{ padding: "8px 20px 0" }}>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 8, top: 8, color: "#9ca3af" }} />
            <input
              type="text"
              placeholder="Search permissions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", padding: "6px 8px 6px 28px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 13 }}
            />
          </div>
        </div>

        {/* Permission list — one toggle per row */}
        <div className="spm-body">
          {loading ? (
            <p style={{ fontSize: 13, color: "#6b7280", padding: 20 }}>Loading permissions…</p>
          ) : groups.length === 0 ? (
            <p style={{ fontSize: 13, color: "#6b7280", padding: 20 }}>No permissions match your search.</p>
          ) : (
            groups.map((group) => {
              const isOpen = !collapsed.has(group.module);
              return (
              <div key={group.module} className="spm-category">
                <button
                  onClick={() => toggleCollapsed(group.module)}
                  style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
                >
                  <ChevronDown size={14} style={{ transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.15s", color: "#9ca3af", flexShrink: 0 }} />
                  <p className="spm-cat-label" style={{ margin: 0 }}>{group.module} <span style={{ fontWeight: 400, color: "#9ca3af" }}>({group.rows.length})</span></p>
                </button>
                {isOpen && group.rows.map((row) => (
                  <div key={row.key} className="spm-perm-row">
                    <div className="spm-perm-info">
                      <p className="spm-perm-name">
                        {row.name}
                        {row.isCustom && <span className="s-badge s-badge-info" style={{ fontSize: 10, marginLeft: 6 }}>Custom</span>}
                        {(row.risk === "high" || row.risk === "critical") && (
                          <span className={`s-badge ${riskBadgeClass[row.risk]}`} style={{ fontSize: 10, marginLeft: 6 }}>{row.risk}</span>
                        )}
                      </p>
                      {row.desc && <p className="spm-perm-desc">{row.desc}</p>}
                    </div>
                    <div className="spm-perm-toggle" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {row.isCustom && (
                        <button
                          className="spm-reset-link"
                          style={{ fontSize: 10, opacity: 0.6 }}
                          onClick={() => clearOneOverride(row.key)}
                          title="Revert to role default"
                        >
                          ↺
                        </button>
                      )}
                      <label className="settings-toggle">
                        <input
                          type="checkbox"
                          checked={row.effective}
                          onChange={() => toggleEffective(row.key, row.effective)}
                        />
                        <span className="settings-toggle-slider" />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
              );
            })
          )}
        </div>

        {/* Footer — batch save */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 20px", borderTop: "1px solid #f3f4f6" }}>
          <button className="btn btn-outline-secondary btn-sm" onClick={onClose} disabled={saving}>
            {hasPendingChanges ? "Cancel" : "Close"}
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={!hasPendingChanges || saving}>
            {saving ? <Loader2 size={13} className="perm-spin" /> : `Save changes${hasPendingChanges ? ` (${Object.keys(pending).length})` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
