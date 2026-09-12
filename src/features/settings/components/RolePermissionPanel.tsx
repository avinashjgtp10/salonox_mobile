import { useState, useMemo, useEffect } from "react";
import { X, Loader2, Search, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import {
  fetchRolesThunk,
  fetchRoleByIdThunk,
  createRoleThunk,
  updateRoleThunk,
} from "../../../middleware/roles/roles.thunk";
import { sortModuleNames, sortGroupNames } from "../utils/permissionModuleOrder";
import { cascadeOnKeys, isRevealedChild, findEmptyMasterToggles } from "../utils/permissionCascade";

interface Props {
  /** Fixed tier name — "Manager" or "Staff". There's exactly one role per
   * tier; if it doesn't exist yet (backfill hasn't run), it's created on
   * first save so this panel never hard-depends on the migration script. */
  roleName: "Manager" | "Staff";
  onClose: () => void;
}

const riskBadgeClass: Record<string, string> = {
  low: "s-badge-gray",
  medium: "s-badge-info",
  high: "s-badge-warning",
  critical: "s-badge-danger",
};

// Shown a second time under the Quick Sale group (in addition to their real
// home, Clients) — locked there unless QUICK_SALE_GATE_KEY is already on,
// since editing a client or viewing their history from Quick Sale's own
// client panel only matters once Quick Sale itself is accessible. Purely a
// display/lock convenience in this one group; the keys behave completely
// normally (unlocked) wherever else they're toggled, e.g. under Clients.
const QUICK_SALE_DEPENDENT_KEYS = ["edit_clients", "view_clients"];
const QUICK_SALE_GATE_KEY = "create_sales";

export default function RolePermissionPanel({ roleName, onClose }: Props) {
  const dispatch = useAppDispatch();
  const { showSuccess, showError, overlay } = useStatusOverlay();
  const catalog = useAppSelector((s) => s.roles.permissions);
  const roles = useAppSelector((s) => s.roles.roles);

  const existingRole = roles.find((r) => r.name === roleName);

  const [loading, setLoading] = useState(true);
  const [roleId, setRoleId] = useState<string | null>(null);
  const [perms, setPerms] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
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
  // has more than one distinct group_name, opening its card shows a
  // sub-section list first; picking one drills into just that sub-section's
  // permissions, with a way back to the list.
  const [selectedGroupByModule, setSelectedGroupByModule] = useState<Record<string, string>>({});
  const UNGROUPED = "__ungrouped__";
  const selectGroup = (module: string, groupName: string | null) => {
    setSelectedGroupByModule((prev) => ({ ...prev, [module]: groupName ?? UNGROUPED }));
  };
  const clearSelectedGroup = (module: string) => {
    setSelectedGroupByModule((prev) => {
      const next = { ...prev };
      delete next[module];
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      if (existingRole) {
        const result = await dispatch(fetchRoleByIdThunk(existingRole.id));
        if (!cancelled && fetchRoleByIdThunk.fulfilled.match(result)) {
          setRoleId(result.payload.id);
          setPerms(result.payload.permissions);
        }
      } else {
        // No role row yet for this tier — start blank; created on first save.
        setRoleId(null);
        setPerms({});
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleName, existingRole?.id]);

  const modules = useMemo(() => {
    const q = search.trim().toLowerCase();
    const byModule = new Map<string, typeof catalog>();
    for (const perm of catalog) {
      if (q && !perm.name.toLowerCase().includes(q) && !perm.key.toLowerCase().includes(q)) continue;
      if (!byModule.has(perm.module)) byModule.set(perm.module, []);
      byModule.get(perm.module)!.push(perm);
    }
    // Edit Client / View History also show up here — Quick Sale's own
    // client-details panel is where they're used (edit_clients, view_clients),
    // so a role's Quick Sale access and its client-editing rights read
    // together instead of being scattered across two unrelated sections.
    // They stay listed under Clients too, unlocked — this only adds a
    // second, dependency-locked view of the same two keys (see QUICK_SALE_DEPENDENT_KEYS below).
    for (const key of QUICK_SALE_DEPENDENT_KEYS) {
      const meta = catalog.find((p) => p.key === key);
      if (!meta) continue;
      if (q && !meta.name.toLowerCase().includes(q) && !meta.key.toLowerCase().includes(q)) continue;
      if (!byModule.has("Quick Sale")) byModule.set("Quick Sale", []);
      byModule.get("Quick Sale")!.push(meta);
    }
    return sortModuleNames(Array.from(byModule.entries()), ([module]) => module);
  }, [catalog, search]);

  const togglePerm = (key: string) => {
    setPerms((prev) => {
      const next = !prev[key];
      const updated = { ...prev, [key]: next };
      // ON cascades both ways — up to this key's own prerequisites, and
      // down to every permission that depends on it (e.g. a module's master
      // switch also turns on its channels/categories by default, matching
      // the same "grant the parent, get the children" expectation the
      // Reports categories already had — now generalized to every
      // depends_on relationship instead of a Reports-only special case).
      if (next) for (const k of cascadeOnKeys(catalog, key)) updated[k] = true;
      return updated;
    });
  };

  const getSubGroups = (module: string, modulePerms: typeof catalog) => {
    const map = new Map<string | null, typeof catalog>();
    for (const p of modulePerms) {
      const gn = p.group_name ?? null;
      if (!map.has(gn)) map.set(gn, []);
      map.get(gn)!.push(p);
    }
    const groups = Array.from(map.entries()).map(([groupName, rows]) => ({ groupName, rows }));
    return sortGroupNames(module, groups, (g) => g.groupName);
  };

  const setAllInModule = (modulePerms: typeof catalog, value: boolean) => {
    setPerms((prev) => {
      const updated = { ...prev };
      for (const p of modulePerms) {
        updated[p.key] = value;
        if (value) for (const k of cascadeOnKeys(catalog, p.key)) updated[k] = true;
      }
      return updated;
    });
  };

  const handleSave = async () => {
    const emptyMasters = findEmptyMasterToggles(catalog, (k) => !!perms[k]);
    if (emptyMasters.length > 0) {
      const names = emptyMasters.map((k) => catalog.find((p) => p.key === k)?.name ?? k).join(", ");
      showError(`Turn off "${names}", or select at least one option below it.`);
      return;
    }
    setSaving(true);
    const result = roleId
      ? await dispatch(updateRoleThunk({ id: roleId, permissions: perms }))
      : await dispatch(createRoleThunk({ name: roleName, description: `Default permissions for the ${roleName} tier`, permissions: perms }));
    setSaving(false);
    const ok = roleId ? updateRoleThunk.fulfilled.match(result) : createRoleThunk.fulfilled.match(result);
    if (ok) {
      showSuccess(`${roleName} permissions saved`);
      dispatch(fetchRolesThunk());
      onClose();
    } else {
      showError(`Failed to save ${roleName} permissions`);
    }
  };

  const grantedCount = Object.values(perms).filter(Boolean).length;

  return (
    <div className="spm-overlay" onClick={(e) => e.target === e.currentTarget && !saving && onClose()}>
      {overlay}
      <div className="spm-panel spm-panel--permissions">
        <div className="spm-header">
          <div className="spm-header-info">
            <div>
              <p className="spm-name">{roleName} Permissions</p>
              <p className="spm-email">{grantedCount} permission{grantedCount === 1 ? "" : "s"} granted</p>
            </div>
          </div>
          <button className="spm-close-btn" onClick={onClose} aria-label="Close" disabled={saving}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "10px 20px 0" }}>
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

        <div className="spm-body">
          {loading ? (
            <p style={{ fontSize: 13, color: "#6b7280", padding: 20 }}>Loading…</p>
          ) : modules.length === 0 ? (
            <p style={{ fontSize: 13, color: "#6b7280", padding: 20 }}>No permissions match your search.</p>
          ) : (
            modules.map(([moduleName, modulePerms]) => {
              const isOpen = expanded.has(moduleName);
              const subGroups = getSubGroups(moduleName, modulePerms);
              const hasSubGroups = subGroups.length > 1;
              const selectedKey = selectedGroupByModule[moduleName];
              const selectedSubGroup = selectedKey != null
                ? subGroups.find((sg) => (sg.groupName ?? UNGROUPED) === selectedKey)
                : undefined;
              // A child of a REVEAL_ON_MASTER_TOGGLE master (currently just
              // Online Booking's channels) stays hidden entirely — not just
              // greyed out — until the master itself is switched on, so
              // toggling "View Booking" reveals the channel toggles below
              // it instead of showing all 7 at once.
              const isHiddenChild = (key: string) => {
                const parentKey = isRevealedChild(catalog, key);
                return parentKey != null && !perms[parentKey];
              };
              const renderPerm = (perm: typeof modulePerms[number]) => {
                const locked = moduleName === "Quick Sale" && QUICK_SALE_DEPENDENT_KEYS.includes(perm.key) && !perms[QUICK_SALE_GATE_KEY];
                return (
                <div key={perm.key} className="spm-perm-row">
                  <div className="spm-perm-info">
                    <p className="spm-perm-name">
                      {perm.name}
                      {(perm.risk_level === "high" || perm.risk_level === "critical") && (
                        <span className={`s-badge ${riskBadgeClass[perm.risk_level]}`} style={{ fontSize: 10, marginLeft: 6 }}>{perm.risk_level}</span>
                      )}
                    </p>
                    {perm.description && <p className="spm-perm-desc">{perm.description}</p>}
                    {locked && <p className="spm-perm-desc" style={{ color: "#b45309" }}>Enable Quick Sale access first</p>}
                  </div>
                  <div className="spm-perm-toggle">
                    <label className="settings-toggle" title={locked ? "Enable Quick Sale access first" : undefined}>
                      <input
                        type="checkbox"
                        checked={!!perms[perm.key]}
                        disabled={locked}
                        onChange={() => !locked && togglePerm(perm.key)}
                      />
                      <span className="settings-toggle-slider" />
                    </label>
                  </div>
                </div>
                );
              };
              return (
              <div key={moduleName} className="spm-category">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button
                    onClick={() => toggleExpanded(moduleName)}
                    style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", padding: 0, cursor: "pointer" }}
                  >
                    <ChevronDown size={14} style={{ transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.15s", color: "#9ca3af", flexShrink: 0 }} />
                    <p className="spm-cat-label" style={{ margin: 0 }}>{moduleName} <span style={{ fontWeight: 400, color: "#9ca3af" }}>({modulePerms.length})</span></p>
                  </button>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="spm-reset-link" style={{ fontSize: 11 }} onClick={() => setAllInModule(modulePerms, true)}>All on</button>
                    <button className="spm-reset-link" style={{ fontSize: 11 }} onClick={() => setAllInModule(modulePerms, false)}>All off</button>
                  </div>
                </div>
                {isOpen && (
                  !hasSubGroups ? (
                    modulePerms.filter((p) => !isHiddenChild(p.key)).map(renderPerm)
                  ) : selectedSubGroup ? (
                    <>
                      <button
                        type="button"
                        className="ispp-subgroup-back"
                        onClick={() => clearSelectedGroup(moduleName)}
                      >
                        <ChevronLeft size={13} /> Back to {moduleName}
                      </button>
                      {selectedSubGroup.rows.filter((p) => !isHiddenChild(p.key)).map(renderPerm)}
                    </>
                  ) : (
                    <div className="ispp-subgroup-list">
                      {subGroups.map((sg) => (
                        <button
                          key={sg.groupName ?? UNGROUPED}
                          type="button"
                          className="ispp-subgroup-item"
                          onClick={() => selectGroup(moduleName, sg.groupName)}
                        >
                          <span className="ispp-subgroup-item-name">{sg.groupName ?? "General"}</span>
                          <span className="ispp-subgroup-item-meta">
                            {sg.rows.length} permission{sg.rows.length === 1 ? "" : "s"}
                            <ChevronRight size={14} />
                          </span>
                        </button>
                      ))}
                    </div>
                  )
                )}
              </div>
              );
            })
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 20px", borderTop: "1px solid #f3f4f6" }}>
          <button className="btn btn-outline-secondary btn-sm" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving || loading}>
            {saving ? <Loader2 size={13} className="perm-spin" /> : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
