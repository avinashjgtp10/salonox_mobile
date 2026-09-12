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
import { sortModuleNames, sortGroupNames } from "../utils/permissionModuleOrder";
import { cascadeOnKeys, isRevealedChild, findEmptyMasterToggles, findMissingPrerequisites } from "../utils/permissionCascade";
import { MODULE_ICON, DEFAULT_MODULE_ICON } from "../utils/permissionModuleIcons";

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

// Shown a second time under the Quick Sale group (in addition to their real
// home, Clients) — locked there unless QUICK_SALE_GATE_KEY is already
// effective, since editing a client or viewing their history from Quick
// Sale's own client panel only matters once Quick Sale itself is accessible.
// Purely a display/lock convenience in this one group; the keys behave
// completely normally (unlocked) wherever else they're toggled, e.g. under
// Clients.
const QUICK_SALE_DEPENDENT_KEYS = ["edit_clients", "view_clients"];
const QUICK_SALE_GATE_KEY = "create_sales";

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
  // Sections start collapsed; expanding one adds its module name here.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpanded = (module: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(module)) next.delete(module); else next.add(module);
      return next;
    });
  };

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
  // Also sub-grouped by group_name (Suppliers/Orders/... within Warehouse) —
  // subGroups.length > 1 is what triggers the drill-down list instead of a
  // flat permission list for that module.
  const groups = useMemo(() => {
    if (!view) return [];
    const q = search.trim().toLowerCase();
    type Row = { key: string; effective: boolean; isCustom: boolean; name: string; desc: string | null; risk: string; groupName: string | null };
    const out: { module: string; rows: Row[]; subGroups: { groupName: string | null; rows: Row[] }[] }[] = [];
    const byModule = new Map<string, Row[]>();
    const subGroupsByModule = new Map<string, Map<string | null, Row[]>>();
    const rowByKey = new Map<string, Row>();
    const addToModule = (module: string, groupName: string | null, row: Row) => {
      if (!byModule.has(module)) { byModule.set(module, []); out.push({ module, rows: byModule.get(module)!, subGroups: [] }); }
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
    for (const group of out) {
      const sg = subGroupsByModule.get(group.module)!;
      const subGroups = Array.from(sg.entries()).map(([groupName, rows]) => ({ groupName, rows }));
      group.subGroups = sortGroupNames(group.module, subGroups, (g) => g.groupName);
    }
    return sortModuleNames(out, (g) => g.module);
  }, [view, catalogByKey, search, pending]);

  const hasPendingChanges = Object.keys(pending).length > 0;

  // One toggle per permission. Flipping it always sets an explicit override
  // to the new effective value — no separate "role vs override" state to
  // reason about while editing. "Reset this one" (below) is the only way
  // back to inheriting the role default for that specific permission.
  //
  // Turning a permission ON cascades to its prerequisites AND to whatever
  // depends on it (see cascadeOnKeys) — e.g. granting a module's master
  // switch (View Booking, View Reports) also grants its channels/categories
  // by default, same behavior as Role Management and Individual Staff.
  // Turning OFF never cascades, so it can't silently strip an
  // individually-granted child.
  const toggleEffective = (key: string, currentEffective: boolean) => {
    const next = !currentEffective;
    setPending((prev) => {
      const updated = { ...prev, [key]: next };
      if (next) for (const k of cascadeOnKeys(catalog, key)) updated[k] = true;
      return updated;
    });
  };


  const getEffective = (key: string): boolean => {
    const perm = view?.permissions.find((p) => p.key === key);
    if (!perm) return false;
    const currentOverride = key in pending ? pending[key] : perm.override;
    return currentOverride !== null ? currentOverride : perm.roleDefault;
  };

  const handleSave = async () => {
    if (!hasPendingChanges) return;
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
              const isOpen = expanded.has(group.module);
              const hasSubGroups = group.subGroups.length > 1;
              // A child of a REVEAL_ON_MASTER_TOGGLE master (currently just
              // Online Booking's channels) stays hidden entirely until the
              // master itself is switched on.
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
              <div key={group.module} className="spm-category">
                <button
                  onClick={() => toggleExpanded(group.module)}
                  style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
                >
                  <ChevronDown size={14} style={{ transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.15s", color: "#9ca3af", flexShrink: 0 }} />
                  <span style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                    background: moduleIcon.bg, color: moduleIcon.color,
                  }}>
                    <ModuleIconTag size={15} />
                  </span>
                  <p className="spm-cat-label" style={{ margin: 0 }}>{group.module} <span style={{ fontWeight: 400, color: "#9ca3af" }}>({group.rows.length})</span></p>
                </button>
                {isOpen && (
                  !hasSubGroups ? (
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
                  )
                )}
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
