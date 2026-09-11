import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronRight, ChevronDown, Loader2, RotateCcw, Search } from "lucide-react";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import {
  fetchPermissionsCatalogThunk,
  fetchRolesThunk,
  fetchStaffPermissionsThunk,
  setStaffOverridesThunk,
  assignStaffRoleThunk,
} from "../../../middleware/roles/roles.thunk";
import { sortModuleNames } from "../utils/permissionModuleOrder";
// Shared .spm-perm-row/.spm-reset-link/.settings-toggle/.s-badge-* classes
// reused here live in this stylesheet — see the same import in
// RolesPermissionsPage.tsx for why this needs to be explicit now that
// Roles & Permissions is reached independently of SettingsLayout.
import "../styles/SettingsPage.scss";
import "../styles/IndividualStaffPermissionsPage.scss";

// Sparse pending-changes map: key -> next override value (null clears it).
// Nothing here is sent to the backend until "Save changes" is clicked.
// Same shape/semantics as the modal editor this page replaces.
type PendingOverrides = Record<string, boolean | null>;

const riskBadgeClass: Record<string, string> = {
  low: "s-badge-gray",
  medium: "s-badge-info",
  high: "s-badge-warning",
  critical: "s-badge-danger",
};

// Full-page replacement for the old StaffPermissionEditor modal, reached
// from Settings -> Roles & Permissions -> Individual Staff -> Edit
// permissions. Reuses the exact same thunks/API/permission-resolution logic
// as the modal (fetchStaffPermissionsThunk / setStaffOverridesThunk /
// assignStaffRoleThunk) — only the presentation changed. The modal itself
// stays in place unmodified since AddStaffPage.tsx's "Permissions" card
// still opens it in a different, out-of-scope flow.
export default function IndividualStaffPermissionsPage() {
  const { staffId } = useParams<{ staffId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { showSuccess, showError, overlay } = useStatusOverlay();

  const { items: staffList, loading: staffLoading } = useAppSelector((s) => s.staff);
  const catalog = useAppSelector((s) => s.roles.permissions);
  const catalogLoaded = useAppSelector((s) => s.roles.permissionsLoaded);
  const roles = useAppSelector((s) => s.roles.roles);

  useEffect(() => {
    dispatch(fetchStaffThunk());
    if (!catalogLoaded) dispatch(fetchPermissionsCatalogThunk());
    if (roles.length === 0) dispatch(fetchRolesThunk());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const [view, setView] = useState<{
    role: { id: string; name: string } | null;
    permissions: { key: string; roleDefault: boolean; override: boolean | null; effective: boolean }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<PendingOverrides>({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [confirmResetAll, setConfirmResetAll] = useState(false);
  // Cards start collapsed, matching the same "closed by default" behavior
  // already applied to the Manager/Staff role panels.
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const staffMember = staffList.find((m: any) => String(m.id) === String(staffId));
  const staffName = staffMember?.fullName || staffMember?.first_name || staffMember?.email || "Staff member";

  useEffect(() => {
    if (!staffId) return;
    let cancelled = false;
    setLoading(true);
    setPending({});
    setExpandedModules(new Set());
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

  const toggleModuleExpanded = (module: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(module)) next.delete(module); else next.add(module);
      return next;
    });
  };

  const handleSave = async () => {
    if (!hasPendingChanges || !staffId) return;
    setSaving(true);
    const result = await dispatch(setStaffOverridesThunk({ staffId, overrides: pending }));
    setSaving(false);
    if (setStaffOverridesThunk.fulfilled.match(result)) {
      setView(result.payload);
      setPending({});
      showSuccess("Permissions saved");
      dispatch(fetchStaffThunk());
    } else {
      showError("Failed to save permissions");
    }
  };

  const handleResetAll = async () => {
    if (!staffId) return;
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
      dispatch(fetchStaffThunk());
    } else {
      showError("Failed to reset permissions");
    }
  };

  const handleRoleChange = async (roleId: string) => {
    if (!staffId || !roleId || roleId === view?.role?.id) return;
    const result = await dispatch(assignStaffRoleThunk({ staffId, roleId }));
    if (assignStaffRoleThunk.fulfilled.match(result)) {
      setView(result.payload);
      setPending({});
      showSuccess("Role updated");
      dispatch(fetchStaffThunk());
    } else {
      showError("Failed to assign role");
    }
  };

  const activeOverrideCount = view ? view.permissions.filter((p) => (p.key in pending ? pending[p.key] !== null : p.override !== null)).length : 0;

  return (
    <div className="ispp-page">
      {overlay}

      <div className="ispp-breadcrumb">
        <button type="button" onClick={() => navigate("/dashboard/settings")}>Settings</button>
        <ChevronRight size={12} />
        <button type="button" onClick={() => navigate("/dashboard/settings/roles/manager")}>Roles &amp; Permissions</button>
        <ChevronRight size={12} />
        <button type="button" onClick={() => navigate("/dashboard/settings/roles/individual-staff")}>Individual Staff</button>
        <ChevronRight size={12} />
        <span>{staffName}</span>
      </div>

      <div className="ispp-header">
        <div>
          <h1 className="ispp-title">Individual Staff Permissions</h1>
          <p className="ispp-subtitle">Customize permissions for individual staff members without changing their default role.</p>
        </div>
        {view?.role && (
          <div className="ispp-role">
            <span>Role:</span>
            <select
              value={view.role.id}
              disabled={roles.length === 0}
              onChange={(e) => handleRoleChange(e.target.value)}
            >
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="ispp-workspace">
        <div className="ispp-staff-panel">
          <p className="ispp-staff-panel-title">Staff members</p>
          <div className="ispp-staff-list">
            {staffLoading.fetchAll ? (
              <p className="ispp-muted">Loading staff…</p>
            ) : staffList.length === 0 ? (
              <p className="ispp-muted">No staff members yet.</p>
            ) : (
              staffList.map((member: any) => {
                const name = member.fullName || member.first_name || member.email || "Unnamed";
                const hasCustom = member.role_id ? !!member.has_overrides : member.custom_permissions != null;
                const isActive = String(member.id) === String(staffId);
                return (
                  <button
                    key={member.id}
                    type="button"
                    className={`ispp-staff-item${isActive ? " ispp-staff-item--active" : ""}`}
                    onClick={() => navigate(`/dashboard/settings/roles/individual-staff/${member.id}`)}
                  >
                    <span className="ispp-staff-name">{name}</span>
                    <span className="ispp-staff-meta">
                      {member.role_name || "No role"} · {hasCustom ? "Custom" : "Defaults"}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="ispp-main">
          <div className="ispp-main-header">
            <div>
              <h2 className="ispp-main-title">{staffName}&apos;s permissions</h2>
              <p className="ispp-main-desc">
                Changes here override the permissions inherited from the {view?.role?.name ?? "role"}.
              </p>
            </div>
            {activeOverrideCount > 0 && (
              confirmResetAll ? (
                <span className="ispp-reset-confirm">
                  Reset all?
                  <button className="spm-reset-link" onClick={handleResetAll} disabled={saving}>Yes, reset</button>
                  <button className="spm-reset-link" onClick={() => setConfirmResetAll(false)}>Cancel</button>
                </span>
              ) : (
                <button type="button" className="spm-reset-link" disabled={saving} onClick={() => setConfirmResetAll(true)}>
                  <RotateCcw size={12} /> Reset to role defaults
                </button>
              )
            )}
          </div>

          <div className="ispp-search">
            <Search size={14} className="ispp-search-icon" />
            <input
              type="text"
              placeholder="Search permissions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <p className="ispp-muted">Loading permissions…</p>
          ) : groups.length === 0 ? (
            <p className="ispp-muted">No permissions match your search.</p>
          ) : (
            <div className="ispp-module-grid">
              {groups.map((group) => {
                const isOpen = expandedModules.has(group.module);
                const customCount = group.rows.filter((r) => r.isCustom).length;
                return (
                  <div key={group.module} className={`ispp-module-card${isOpen ? " ispp-module-card--open" : ""}`}>
                    <button type="button" className="ispp-module-card-header" onClick={() => toggleModuleExpanded(group.module)}>
                      <div>
                        <p className="ispp-module-card-title">{group.module}</p>
                        <p className="ispp-module-card-count">
                          {group.rows.length} permission{group.rows.length === 1 ? "" : "s"}
                          {customCount > 0 && ` · ${customCount} custom`}
                        </p>
                      </div>
                      <ChevronDown size={16} className={`ispp-module-chevron${isOpen ? " ispp-module-chevron--open" : ""}`} />
                    </button>
                    {isOpen && (
                      <div className="ispp-module-card-body">
                        {group.rows.map((row) => (
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
                                  type="button"
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
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="ispp-footer">
        <span className="ispp-footer-count">
          {activeOverrideCount} individual override{activeOverrideCount === 1 ? "" : "s"} active
        </span>
        <div className="ispp-footer-actions">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => navigate("/dashboard/settings/roles/individual-staff")}
            disabled={saving}
          >
            {hasPendingChanges ? "Cancel" : "Back"}
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={!hasPendingChanges || saving}>
            {saving ? <Loader2 size={13} className="perm-spin" /> : `Save changes${hasPendingChanges ? ` (${Object.keys(pending).length})` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
