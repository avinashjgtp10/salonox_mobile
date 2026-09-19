import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronRight, ChevronDown, Loader2, RotateCcw, Search, UserRound } from "lucide-react";
import { MODULE_ICON, DEFAULT_MODULE_ICON } from "../../settings/utils/permissionModuleIcons";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import {
  fetchAllStaffThunk,
  fetchSalonRolesThunk,
  fetchSalonStaffPermissionsThunk,
  setSalonStaffOverridesThunk,
  assignSalonStaffRoleThunk,
} from "../../../middleware/branchOwner/branchOwner.thunk";
import { fetchPermissionsCatalogThunk } from "../../../middleware/roles/roles.thunk";
import { sortModuleNames, sortGroupNames } from "../../settings/utils/permissionModuleOrder";
import { cascadeOnKeys, isRevealedChild, findEmptyMasterToggles, findMissingPrerequisites } from "../../settings/utils/permissionCascade";
import type { StaffPermissionsView } from "../../../types/roles.types";
import type { Staff } from "../../../types/staff.types";
// Same full-page Roles & Permissions editor styling Settings uses — reused
// exactly, not re-implemented, per the "use the same UI, not a card/modal"
// requirement (see IndividualStaffPermissionsPage.tsx for the salon-owner
// version this mirrors).
import "../../settings/styles/SettingsPage.scss";
import "../../settings/styles/IndividualStaffPermissionsPage.scss";

type PendingOverrides = Record<string, boolean | null>;

const riskBadgeClass: Record<string, string> = {
  low: "s-badge-gray",
  medium: "s-badge-info",
  high: "s-badge-warning",
  critical: "s-badge-danger",
};

const AVATAR_COLORS = ["#2563eb", "#7c3aed", "#db2777", "#d97706", "#16a34a", "#0891b2"];
function avatarColorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

const QUICK_SALE_DEPENDENT_KEYS = ["edit_clients", "view_clients"];
const QUICK_SALE_GATE_KEY = "create_sales";

interface StaffRow extends Staff {
  salonId: string;
  salonName: string;
  role_name?: string | null;
  has_overrides?: boolean;
}

// Branch Owner's own full-page Individual Staff Permissions editor — this is
// a straight port of src/features/settings/pages/IndividualStaffPermissionsPage.tsx
// (same layout, same module/subgroup accordion, same cascade/validation
// logic, same stylesheet classes), NOT a modal, per the "use the exact same
// Roles & Permissions full-page UI, not a card" requirement. The only real
// difference is data plumbing: every call is salon-scoped by an explicit
// salonId (looked up per staff row) instead of the caller's own JWT
// salonId, since a branch_owner token manages many salons and has none of
// its own — see branchOwner.thunk.ts's fetchSalonRolesThunk /
// fetchSalonStaffPermissionsThunk / setSalonStaffOverridesThunk /
// assignSalonStaffRoleThunk.
export default function BranchOwnerStaffPermissionsDetailPage() {
  const { staffId } = useParams<{ staffId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { showSuccess, showError, overlay } = useStatusOverlay();

  const catalog = useAppSelector((s) => s.roles.permissions);
  const catalogLoaded = useAppSelector((s) => s.roles.permissionsLoaded);

  const [staffList, setStaffList] = useState<StaffRow[]>([]);
  const [staffListLoading, setStaffListLoading] = useState(true);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!catalogLoaded) dispatch(fetchPermissionsCatalogThunk());
    setStaffListLoading(true);
    dispatch(fetchAllStaffThunk()).then((r) => {
      setStaffList(fetchAllStaffThunk.fulfilled.match(r) ? (r.payload as StaffRow[]) : []);
      setStaffListLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const [view, setView] = useState<StaffPermissionsView | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<PendingOverrides>({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [confirmResetAll, setConfirmResetAll] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
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

  const staffMember = staffList.find((m) => String(m.id) === String(staffId));
  const staffName = staffMember?.fullName || staffMember?.first_name || staffMember?.email || "Staff member";
  const salonId = staffMember?.salonId;

  // Roles are per-salon (an owner can rename/add roles independently per
  // salon), so they're re-fetched every time the selected staff member's
  // salon changes — unlike the salon-owner page, which loads them once for
  // its own single salon.
  useEffect(() => {
    if (!salonId) return;
    dispatch(fetchSalonRolesThunk(salonId)).then((r) => {
      if (fetchSalonRolesThunk.fulfilled.match(r)) setRoles(r.payload);
    });
  }, [dispatch, salonId]);

  useEffect(() => {
    if (!staffId || !salonId) return;
    let cancelled = false;
    setLoading(true);
    setPending({});
    setExpandedModules(new Set());
    dispatch(fetchSalonStaffPermissionsThunk({ salonId, staffId })).then((result) => {
      if (cancelled) return;
      if (fetchSalonStaffPermissionsThunk.fulfilled.match(result)) {
        setView(result.payload);
      } else {
        showError("Failed to load this staff member's permissions");
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffId, salonId]);

  const catalogByKey = useMemo(() => new Map(catalog.map((p) => [p.key, p])), [catalog]);

  const groups = useMemo(() => {
    if (!view) return [];
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
    return sortModuleNames(out, (g) => g.module);
  }, [view, catalogByKey, search, pending]);

  const hasPendingChanges = Object.keys(pending).length > 0;

  const toggleEffective = (key: string, currentEffective: boolean) => {
    const next = !currentEffective;
    setPending((prev) => {
      const updated = { ...prev, [key]: next };
      if (next) for (const k of cascadeOnKeys(catalog, key)) updated[k] = true;
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

  const refreshStaffList = () => {
    dispatch(fetchAllStaffThunk()).then((r) => {
      if (fetchAllStaffThunk.fulfilled.match(r)) setStaffList(r.payload as StaffRow[]);
    });
  };

  const handleSave = async () => {
    if (!hasPendingChanges || !staffId || !salonId) return;
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
    const result = await dispatch(setSalonStaffOverridesThunk({ salonId, staffId, overrides: pending }));
    setSaving(false);
    if (setSalonStaffOverridesThunk.fulfilled.match(result)) {
      setView(result.payload);
      setPending({});
      showSuccess("Permissions saved");
      refreshStaffList();
    } else {
      showError("Failed to save permissions");
    }
  };

  const handleResetAll = async () => {
    if (!staffId || !salonId) return;
    setConfirmResetAll(false);
    setSaving(true);
    const keysToReset: Record<string, null> = {};
    for (const perm of view?.permissions ?? []) keysToReset[perm.key] = null;
    const result = await dispatch(setSalonStaffOverridesThunk({ salonId, staffId, overrides: keysToReset }));
    setSaving(false);
    if (setSalonStaffOverridesThunk.fulfilled.match(result)) {
      setView(result.payload);
      setPending({});
      showSuccess(`${staffName} reset to role defaults`);
      refreshStaffList();
    } else {
      showError("Failed to reset permissions");
    }
  };

  const handleRoleChange = async (roleId: string) => {
    if (!staffId || !salonId || !roleId || roleId === view?.role?.id) return;
    const result = await dispatch(assignSalonStaffRoleThunk({ salonId, staffId, roleId }));
    if (assignSalonStaffRoleThunk.fulfilled.match(result)) {
      setView(result.payload);
      setPending({});
      showSuccess("Role updated");
      refreshStaffList();
    } else {
      showError("Failed to assign role");
    }
  };

  const activeOverrideCount = view ? view.permissions.filter((p) => (p.key in pending ? pending[p.key] !== null : p.override !== null)).length : 0;

  const [staffSearch, setStaffSearch] = useState("");
  const filteredStaffList = useMemo(() => {
    const q = staffSearch.trim().toLowerCase();
    if (!q) return staffList;
    return staffList.filter((m) => {
      const name = m.fullName || m.first_name || m.email || "";
      return name.toLowerCase().includes(q) || m.salonName.toLowerCase().includes(q);
    });
  }, [staffList, staffSearch]);

  return (
    <div className="ispp-page">
      {overlay}

      <div className="ispp-breadcrumb">
        <button type="button" onClick={() => navigate("/branch-owner/staff-permissions")}>Staff &amp; Permissions</button>
        <ChevronRight size={12} />
        <span>{staffName}</span>
      </div>

      <div className="ispp-header">
        <div className="ispp-header-title-row">
          <span className="ispp-header-icon"><UserRound size={20} /></span>
          <div>
            <h1 className="ispp-title">Individual Staff Permissions</h1>
            <p className="ispp-subtitle">
              {staffMember ? `${staffMember.salonName} — c` : "C"}ustomize permissions for individual staff members without changing their default role.
            </p>
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
              placeholder="Search staff or salon..."
              value={staffSearch}
              onChange={(e) => setStaffSearch(e.target.value)}
            />
          </div>
          <div className="ispp-staff-list">
            {staffListLoading ? (
              <p className="ispp-muted">Loading staff…</p>
            ) : filteredStaffList.length === 0 ? (
              <p className="ispp-muted">{staffList.length === 0 ? "No staff members yet." : "No staff match your search."}</p>
            ) : (
              filteredStaffList.map((member) => {
                const name = member.fullName || member.first_name || member.email || "Unnamed";
                const isActive = String(member.id) === String(staffId);
                return (
                  <button
                    key={`${member.id}-${member.salonId}`}
                    type="button"
                    className={`ispp-staff-item${isActive ? " ispp-staff-item--active" : ""}`}
                    onClick={() => navigate(`/branch-owner/staff-permissions/${member.id}`)}
                  >
                    <span className="ispp-staff-avatar" style={{ background: avatarColorFor(name) }}>
                      {name.charAt(0).toUpperCase()}
                    </span>
                    <span className="ispp-staff-item-text">
                      <span className="ispp-staff-name">{name}</span>
                      <span className="ispp-staff-meta">
                        {member.salonName} · {member.role_name || "No role"} · {member.has_overrides ? "Custom" : "Default role"}
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
                const isHiddenChild = (key: string) => {
                  const parentKey = isRevealedChild(catalog, key);
                  if (parentKey == null) return false;
                  return !group.rows.find((r) => r.key === parentKey)?.effective;
                };
                const renderRow = (row: (typeof group.rows)[number]) => {
                  const locked = group.module === "Quick Sale"
                    && QUICK_SALE_DEPENDENT_KEYS.includes(row.key)
                    && !group.rows.find((r) => r.key === QUICK_SALE_GATE_KEY)?.effective;
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
                      {locked && <p className="spm-perm-desc" style={{ color: "#b45309" }}>Enable Quick Sale access first</p>}
                    </div>
                    <div className="spm-perm-toggle" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <label className="settings-toggle" title={locked ? "Enable Quick Sale access first" : undefined}>
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
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => navigate("/branch-owner/staff-permissions")}
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
