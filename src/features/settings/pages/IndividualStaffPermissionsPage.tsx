import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronRight, ChevronDown, Loader2, RotateCcw, Search, UserRound } from "lucide-react";
import { MODULE_ICON, DEFAULT_MODULE_ICON } from "../utils/permissionModuleIcons";
import PermissionPreviewModal from "../components/PermissionPreviewModal";
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
import { sortModuleNames, sortGroupNames } from "../utils/permissionModuleOrder";
import { cascadeOnKeys, cascadeOffKeys, isRevealedChild, findEmptyMasterToggles, findMissingPrerequisites, lockedByMaster } from "../utils/permissionCascade";
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

// Staff avatar initial background — cycles through a small fixed palette
// keyed by name so the same person always gets the same color across
// renders/sessions (no persistence needed, just deterministic).
const AVATAR_COLORS = ["#2563eb", "#7c3aed", "#db2777", "#d97706", "#16a34a", "#0891b2"];
function avatarColorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

// Shown a second time under the Quick Sale group (in addition to their real
// home, Clients) — since editing a client or viewing their history from
// Quick Sale's own client panel only matters once Quick Sale itself is
// accessible. Purely a display convenience in this one group; the keys
// behave completely normally wherever else they're toggled, e.g. under
// Clients. Kept in sync with the same constant in RolePermissionPanel.tsx.
// Locking (greying out until create_sales is on) is now handled generically
// by lockedByMaster, same as Catalog > Products' children.
const QUICK_SALE_DEPENDENT_KEYS = ["edit_clients", "view_clients"];

// Human-readable name for a lock message — falls back to the raw key if the
// catalog hasn't loaded it yet.
function byKeyName(catalog: { key: string; name: string }[], key: string): string {
  return catalog.find((p) => p.key === key)?.name ?? key;
}

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
  const [showPreview, setShowPreview] = useState(false);
  // Cards start collapsed, matching the same "closed by default" behavior
  // already applied to the Manager/Staff role panels.
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  // Warehouse-style modules split their permissions into named sub-sections
  // (Suppliers/Orders/Product Inventory/...) via the catalog's group_name —
  // dumping all of them flat in one card was too big to scan. When a module
  // has more than one distinct group_name, every sub-section header shows
  // at once as its own collapsible row (an accordion) — clicking one toggles
  // just its own expanded state, without hiding its siblings (Clients
  // permissions accordion ticket; previously picking one replaced the whole
  // list with only that section + a "Back to X" link, which hid the others).
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const UNGROUPED = "__ungrouped__";
  const groupKey = (module: string, groupName: string | null) => `${module}::${groupName ?? UNGROUPED}`;
  const toggleGroup = (module: string, groupName: string | null) => {
    setExpandedGroups((prev) => {
      const key = groupKey(module, groupName);
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

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
  // Also sub-grouped by group_name (Suppliers/Orders/... within Warehouse) —
  // subGroups.length > 1 is what triggers the drill-down list instead of a
  // flat permission list for that module.
  const groupsResult = useMemo(() => {
    if (!view) return { groups: [] as { module: string; rows: any[]; subGroups: { groupName: string | null; rows: any[] }[] }[], effectiveByKey: new Map<string, boolean>() };
    const q = search.trim().toLowerCase();
    type Row = { key: string; effective: boolean; isCustom: boolean; name: string; desc: string | null; risk: string; groupName: string | null };
    const out: { module: string; rows: Row[]; subGroups: { groupName: string | null; rows: Row[] }[] }[] = [];
    const byModule = new Map<string, Row[]>();
    const subGroupsByModule = new Map<string, Map<string | null, Row[]>>();
    const rowByKey = new Map<string, Row>();
    const addToModule = (module: string, groupName: string | null, row: Row) => {
      if (!byModule.has(module)) byModule.set(module, []);
      byModule.get(module)!.push(row);
      if (!subGroupsByModule.has(module)) subGroupsByModule.set(module, new Map());
      const sg = subGroupsByModule.get(module)!;
      if (!sg.has(groupName)) sg.set(groupName, []);
      sg.get(groupName)!.push(row);
    };
    for (const perm of view.permissions) {
      const meta = catalogByKey.get(perm.key);
      const name = meta?.name ?? perm.key;
      const desc = meta?.description ?? null;
      if (q && !name.toLowerCase().includes(q) && !perm.key.toLowerCase().includes(q)) continue;
      const module = meta?.module ?? "Other";
      const groupName = meta?.group_name ?? null;
      const currentOverride = perm.key in pending ? pending[perm.key] : perm.override;
      const effective = currentOverride !== null ? currentOverride : perm.roleDefault;
      const row: Row = { key: perm.key, effective, isCustom: currentOverride !== null, name, desc, risk: meta?.risk_level ?? "low", groupName };
      rowByKey.set(perm.key, row);
      addToModule(module, groupName, row);
    }
    // Edit Client / View History also show up under Quick Sale — see
    // QUICK_SALE_DEPENDENT_KEYS's comment above.
    for (const key of QUICK_SALE_DEPENDENT_KEYS) {
      const row = rowByKey.get(key);
      if (!row) continue;
      addToModule("Quick Sale", row.groupName, row);
    }
    for (const [module, rows] of byModule) {
      const sg = subGroupsByModule.get(module)!;
      const subGroups = sortGroupNames(module, Array.from(sg.entries()).map(([groupName, rows]) => ({ groupName, rows })), (sg) => sg.groupName);
      out.push({ module, rows, subGroups });
    }
    return { groups: sortModuleNames(out, (g) => g.module), effectiveByKey: new Map(Array.from(rowByKey.entries()).map(([k, r]) => [k, r.effective])) };
  }, [view, catalogByKey, search, pending]);
  const { groups, effectiveByKey } = groupsResult;

  const hasPendingChanges = Object.keys(pending).length > 0;

  // One toggle per permission. Flipping it always sets an explicit override
  // to the new effective value — no separate "role vs override" state to
  // reason about while editing. "Reset this one" (below) is the only way
  // back to inheriting the role default for that specific permission.
  //
  // Turning a permission ON cascades to its prerequisites AND to whatever
  // depends on it (see cascadeOnKeys) — e.g. switching on a Reports category
  // now also grants every report inside it (without this, "Sales Reports"
  // looked granted but each report's own view_report_<id> key still gated
  // it independently, opening an empty-feeling page with every card
  // 403ing — found 2026-09-11), and switching on a module's own master
  // switch (View Booking, View Reports) also grants its channels/categories
  // by default. Generalized from a Reports-only special case to every
  // depends_on relationship, so Online Booking's channels get the same
  // "turn on the parent, get the children" behavior. OFF is deliberately
  // NOT symmetric in either direction — it never strips an
  // individually-granted child, and never re-locks a sibling that still
  // needs the same parent.
  // Baseline (last-saved) effective value for a key — used to prune `pending`
  // back to empty when a toggle sequence nets out to the saved state (e.g.
  // ON -> OFF -> ON), so hasPendingChanges reflects a real diff instead of
  // "was this key ever touched this session."
  const baselineEffective = (key: string): boolean =>
    view?.permissions.find((p) => p.key === key)?.effective ?? false;

  const toggleEffective = (key: string, currentEffective: boolean) => {
    const next = !currentEffective;
    setPending((prev) => {
      const updated = { ...prev };
      if (next === baselineEffective(key)) delete updated[key];
      else updated[key] = next;
      if (next) {
        for (const k of cascadeOnKeys(catalog, key)) {
          if (k === key) continue;
          if (baselineEffective(k)) delete updated[k];
          else updated[k] = true;
        }
      } else {
        // Calendar's action permissions must read as OFF, not merely locked
        // at their old value, the instant View Calendar/View Appointment
        // goes off — see cascadeOffKeys' own doc comment.
        for (const k of cascadeOffKeys(catalog, key)) {
          if (k === key) continue;
          if (baselineEffective(k) === false) delete updated[k];
          else updated[k] = false;
        }
      }
      return updated;
    });
  };


  const toggleModuleExpanded = (module: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(module)) next.delete(module); else next.add(module);
      return next;
    });
  };


  const getEffective = (key: string): boolean => {
    const perm = view?.permissions.find((p) => p.key === key);
    if (!perm) return false;
    const currentOverride = key in pending ? pending[key] : perm.override;
    return currentOverride !== null ? currentOverride : perm.roleDefault;
  };

  const handleSave = async () => {
    if (!hasPendingChanges || !staffId) return;
    const emptyMasters = findEmptyMasterToggles(catalog, getEffective);
    if (emptyMasters.length > 0) {
      const names = emptyMasters.map((k) => catalogByKey.get(k)?.name ?? k).join(", ");
      showError(`Turn off "${names}", or select at least one option below it.`);
      return;
    }
    const missingPrereqs = findMissingPrerequisites(catalog, getEffective);
    if (missingPrereqs.length > 0) {
      const { key, missing } = missingPrereqs[0];
      const keyName = catalogByKey.get(key)?.name ?? key;
      const missingName = catalogByKey.get(missing)?.name ?? missing;
      showError(`"${keyName}" requires "${missingName}" to also be enabled.`);
      return;
    }
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

  const [staffSearch, setStaffSearch] = useState("");
  const filteredStaffList = useMemo(() => {
    const q = staffSearch.trim().toLowerCase();
    if (!q) return staffList;
    return staffList.filter((m: any) => {
      const name = m.fullName || m.first_name || m.email || "";
      return name.toLowerCase().includes(q);
    });
  }, [staffList, staffSearch]);

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
        <div className="ispp-header-title-row">
          <span className="ispp-header-icon"><UserRound size={20} /></span>
          <div>
            <h1 className="ispp-title">Individual Staff Permissions</h1>
            <p className="ispp-subtitle">Customize permissions for individual staff members without changing their default role.</p>
          </div>
        </div>
        <div className="ispp-header-actions">
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
          {view && (
            confirmResetAll ? (
              <span className="ispp-reset-confirm">
                Reset all?
                <button className="spm-reset-link" onClick={handleResetAll} disabled={saving}>Yes, reset</button>
                <button className="spm-reset-link" onClick={() => setConfirmResetAll(false)}>Cancel</button>
              </span>
            ) : (
              // Always visible (never hidden) — just disabled when there's
              // nothing to reset, same "visible but disabled" pattern used
              // everywhere else in this app rather than hiding the control.
              <button
                type="button"
                className="ispp-reset-btn"
                disabled={saving || activeOverrideCount === 0}
                onClick={() => setConfirmResetAll(true)}
              >
                <RotateCcw size={13} /> Reset to Default
              </button>
            )
          )}
        </div>
      </div>

      <div className="ispp-workspace">
        <div className="ispp-staff-panel">
          <p className="ispp-staff-panel-title">Staff Members</p>
          <div className="ispp-staff-search">
            <Search size={13} className="ispp-staff-search-icon" />
            <input
              type="text"
              placeholder="Search staff..."
              value={staffSearch}
              onChange={(e) => setStaffSearch(e.target.value)}
            />
          </div>
          <div className="ispp-staff-list">
            {staffLoading.fetchAll ? (
              <p className="ispp-muted">Loading staff…</p>
            ) : filteredStaffList.length === 0 ? (
              <p className="ispp-muted">{staffList.length === 0 ? "No staff members yet." : "No staff match your search."}</p>
            ) : (
              filteredStaffList.map((member: any) => {
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
                    <span className="ispp-staff-avatar" style={{ background: avatarColorFor(name) }}>
                      {name.charAt(0).toUpperCase()}
                    </span>
                    <span className="ispp-staff-item-text">
                      <span className="ispp-staff-name">{name}</span>
                      <span className="ispp-staff-meta">
                        {member.role_name || "No role"} · {hasCustom ? "Custom" : "Default role"}
                      </span>
                    </span>
                    <ChevronRight size={14} className="ispp-staff-chevron" />
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
                const hasSubGroups = group.subGroups.length > 1;
                // A child of a REVEAL_ON_MASTER_TOGGLE master (currently
                // just Online Booking's channels) stays hidden entirely
                // until the master itself is switched on.
                const isHiddenChild = (key: string) => {
                  const parentKey = isRevealedChild(catalog, key);
                  if (parentKey == null) return false;
                  return !group.rows.find((r) => r.key === parentKey)?.effective;
                };
                const renderRow = (row: (typeof group.rows)[number]) => {
                  const lockMaster = lockedByMaster(row.key, (k) => !!effectiveByKey.get(k));
                  const locked = lockMaster != null;
                  const lockMasterName = lockMaster != null ? byKeyName(catalog, lockMaster) : null;
                  return (
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
                      {locked && <p className="spm-perm-desc" style={{ color: "#b45309" }}>Enable {lockMasterName ?? "the required permission"} first</p>}
                    </div>
                    <div className="spm-perm-toggle" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <label className="settings-toggle" title={locked ? `Enable ${lockMasterName ?? "the required permission"} first` : undefined}>
                        <input
                          type="checkbox"
                          checked={row.effective}
                          disabled={locked}
                          onChange={() => !locked && toggleEffective(row.key, row.effective)}
                        />
                        <span className="settings-toggle-slider" />
                      </label>
                    </div>
                  </div>
                  );
                };
                const moduleIcon = MODULE_ICON[group.module] ?? DEFAULT_MODULE_ICON;
                const ModuleIconTag = moduleIcon.icon;
                return (
                  <div key={group.module} className={`ispp-module-card${isOpen ? " ispp-module-card--open" : ""}`}>
                    <button
                      type="button"
                      className="ispp-module-card-header"
                      onClick={() => toggleModuleExpanded(group.module)}
                    >
                      <div className="ispp-module-card-header-left">
                        <span className="ispp-module-icon" style={{ background: moduleIcon.bg, color: moduleIcon.color }}>
                          <ModuleIconTag size={17} />
                        </span>
                        <div>
                          <p className="ispp-module-card-title">{group.module}</p>
                          <p className="ispp-module-card-count">
                            {group.rows.length} permission{group.rows.length === 1 ? "" : "s"}
                            {customCount > 0 && ` · ${customCount} custom`}
                          </p>
                        </div>
                      </div>
                      <ChevronDown size={16} className={`ispp-module-chevron${isOpen ? " ispp-module-chevron--open" : ""}`} />
                    </button>
                    {isOpen && (
                      <div className="ispp-module-card-body">
                        {!hasSubGroups ? (
                          group.rows.filter((r) => !isHiddenChild(r.key)).map(renderRow)
                        ) : (
                          <div className="ispp-subgroup-accordion">
                            {group.subGroups.map((sg) => {
                              const label = sg.groupName ?? "General";
                              const sgCustomCount = sg.rows.filter((r) => r.isCustom).length;
                              const key = groupKey(group.module, sg.groupName);
                              const sgOpen = expandedGroups.has(key);
                              return (
                                <div key={key} className="ispp-subgroup-section">
                                  <button
                                    type="button"
                                    className="ispp-subgroup-item"
                                    onClick={() => toggleGroup(group.module, sg.groupName)}
                                  >
                                    <span className="ispp-subgroup-item-name">{label}</span>
                                    <span className="ispp-subgroup-item-meta">
                                      {sg.rows.length} permission{sg.rows.length === 1 ? "" : "s"}
                                      {sgCustomCount > 0 && ` · ${sgCustomCount} custom`}
                                      <ChevronDown size={14} style={{ transform: sgOpen ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.15s" }} />
                                    </span>
                                  </button>
                                  {sgOpen && sg.rows.filter((r) => !isHiddenChild(r.key)).map(renderRow)}
                                </div>
                              );
                            })}
                          </div>
                        )}
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
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowPreview(true)}>Preview</button>
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
      <PermissionPreviewModal
        show={showPreview}
        onClose={() => setShowPreview(false)}
        draft={Object.fromEntries(effectiveByKey)}
        subjectLabel={staffName}
      />
    </div>
  );
}
