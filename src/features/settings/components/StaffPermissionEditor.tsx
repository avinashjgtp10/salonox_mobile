import { useState, useEffect, useMemo } from "react";
import { X, Loader2, RotateCcw, Search } from "lucide-react";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import {
  fetchPermissionsCatalogThunk,
  fetchRolesThunk,
  fetchStaffPermissionsThunk,
  setStaffOverridesThunk,
  assignStaffRoleThunk,
} from "../../../middleware/roles/roles.thunk";

interface Props {
  staffId: string;
  staffName: string;
  onClose: () => void;
}

// Sparse pending-changes map: key -> next override value (null clears it).
// Nothing here is sent to the backend until "Save changes" is clicked —
// this is the batch-save pattern the old per-toggle-autosave modal lacked.
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

  const catalogByKey = useMemo(() => {
    const map = new Map(catalog.map((p) => [p.key, p]));
    return map;
  }, [catalog]);

  // Group by module/group_name, in catalog order, filtered by search.
  const groups = useMemo(() => {
    if (!view) return [];
    const q = search.trim().toLowerCase();
    const out: { module: string; rows: { key: string; roleDefault: boolean; override: boolean | null; effective: boolean; name: string; desc: string | null; risk: string }[] }[] = [];
    const byModule = new Map<string, typeof out[number]["rows"]>();
    for (const perm of view.permissions) {
      const meta = catalogByKey.get(perm.key);
      const name = meta?.name ?? perm.key;
      const desc = meta?.description ?? null;
      if (q && !name.toLowerCase().includes(q) && !perm.key.toLowerCase().includes(q)) continue;
      const module = meta?.module ?? "Other";
      const effectiveOverride = perm.key in pending ? pending[perm.key] : perm.override;
      const effective = effectiveOverride !== null ? effectiveOverride : perm.roleDefault;
      const row = { key: perm.key, roleDefault: perm.roleDefault, override: effectiveOverride, effective, name, desc, risk: meta?.risk_level ?? "low" };
      if (!byModule.has(module)) { byModule.set(module, []); out.push({ module, rows: byModule.get(module)! }); }
      byModule.get(module)!.push(row);
    }
    return out;
  }, [view, catalogByKey, search, pending]);

  const hasPendingChanges = Object.keys(pending).length > 0;

  const toggleOverride = (key: string, currentOverride: boolean | null) => {
    // Cycle: no override -> ON -> OFF -> no override (clears back to role default)
    let next: boolean | null;
    if (currentOverride === null) next = true;
    else if (currentOverride === true) next = false;
    else next = null;
    setPending((prev) => ({ ...prev, [key]: next }));
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
      showSuccess("Permission overrides saved");
    } else {
      showError("Failed to save permission overrides");
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

  const activeOverrideCount = view ? view.permissions.filter((p) => (p.key in pending ? pending[p.key] : p.override) !== null).length : 0;

  return (
    <div className="spm-overlay" onClick={(e) => e.target === e.currentTarget && !saving && onClose()}>
      {overlay}
      <div className="spm-panel" style={{ maxWidth: 720 }}>
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
        <div className={`spm-mode-banner ${activeOverrideCount > 0 ? "custom" : "default"}`}>
          <span>
            {activeOverrideCount > 0
              ? `${activeOverrideCount} individual override${activeOverrideCount === 1 ? "" : "s"} active.`
              : "Using role defaults — no individual overrides."}
          </span>
          {activeOverrideCount > 0 && (
            confirmResetAll ? (
              <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                Reset all?
                <button className="spm-reset-link" onClick={handleResetAll} disabled={saving}>Yes, reset</button>
                <button className="spm-reset-link" onClick={() => setConfirmResetAll(false)}>Cancel</button>
              </span>
            ) : (
              <button className="spm-reset-link" onClick={() => setConfirmResetAll(true)} disabled={saving}>
                <RotateCcw size={12} /> Reset all to role defaults
              </button>
            )
          )}
        </div>

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

        {/* Permission list */}
        <div className="spm-body">
          {loading ? (
            <p style={{ fontSize: 13, color: "#6b7280", padding: 20 }}>Loading permissions…</p>
          ) : groups.length === 0 ? (
            <p style={{ fontSize: 13, color: "#6b7280", padding: 20 }}>No permissions match your search.</p>
          ) : (
            groups.map((group) => (
              <div key={group.module} className="spm-category">
                <p className="spm-cat-label">{group.module}</p>
                {/* Column headers */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 110px 90px", fontSize: 11, color: "#9ca3af", padding: "0 4px 4px", fontWeight: 600 }}>
                  <span>Permission</span>
                  <span style={{ textAlign: "center" }}>Role</span>
                  <span style={{ textAlign: "center" }}>Override</span>
                  <span style={{ textAlign: "center" }}>Effective</span>
                </div>
                {group.rows.map((row) => (
                  <div key={row.key} className="spm-perm-row" style={{ display: "grid", gridTemplateColumns: "1fr 90px 110px 90px", alignItems: "center" }}>
                    <div className="spm-perm-info">
                      <p className="spm-perm-name">
                        {row.name}
                        {(row.risk === "high" || row.risk === "critical") && (
                          <span className={`s-badge ${riskBadgeClass[row.risk]}`} style={{ fontSize: 10, marginLeft: 6 }}>{row.risk}</span>
                        )}
                      </p>
                      {row.desc && <p className="spm-perm-desc">{row.desc}</p>}
                    </div>
                    <span style={{ textAlign: "center", fontSize: 12, color: row.roleDefault ? "#059669" : "#9ca3af" }}>
                      {row.roleDefault ? "ON" : "OFF"}
                    </span>
                    <div style={{ textAlign: "center" }}>
                      <button
                        className={`spm-reset-link`}
                        style={{ fontSize: 11, padding: "2px 6px", border: "1px solid #e5e7eb", borderRadius: 4 }}
                        onClick={() => toggleOverride(row.key, row.override)}
                        title="Click to cycle: role default -> ON -> OFF -> role default"
                      >
                        {row.override === null ? "Role" : row.override ? "ON" : "OFF"}
                      </button>
                      {row.override !== null && (
                        <button
                          className="spm-reset-link"
                          style={{ fontSize: 10, marginLeft: 4, opacity: 0.6 }}
                          onClick={() => clearOneOverride(row.key)}
                          title="Clear this override"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <span style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: row.effective ? "#059669" : "#dc2626" }}>
                      {row.effective ? "ON" : "OFF"}
                    </span>
                  </div>
                ))}
              </div>
            ))
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
