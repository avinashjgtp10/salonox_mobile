import { useState, useMemo, useEffect } from "react";
import { Loader2, Search, ChevronDown, Crown, Users as UsersIcon, RotateCcw } from "lucide-react";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import {
  fetchRolesThunk,
  fetchRoleByIdThunk,
  createRoleThunk,
  updateRoleThunk,
} from "../../../middleware/roles/roles.thunk";
import { sortModuleNames, sortGroupNames } from "../utils/permissionModuleOrder";
import { cascadeOnKeys, cascadeOffKeys, isRevealedChild, findEmptyMasterToggles, findMissingPrerequisites, lockedByMaster } from "../utils/permissionCascade";
import { MODULE_ICON, DEFAULT_MODULE_ICON } from "../utils/permissionModuleIcons";
import PermissionPreviewModal from "./PermissionPreviewModal";
// .ispp-module-grid/.ispp-module-card* (the module card grid — same look as
// IndividualStaffPermissionsPage) live in this stylesheet, not
// SettingsPage.scss, so this component needs its own import rather than
// relying on whichever page happens to render it.
import "../styles/IndividualStaffPermissionsPage.scss";

interface Props {
  /** Fixed tier name — "Manager" or "Staff". There's exactly one role per
   * tier; if it doesn't exist yet (backfill hasn't run), it's created on
   * first save so this panel never hard-depends on the migration script. */
  roleName: "Manager" | "Staff";
  onClose: () => void;
}

// Cosmetic only (Roles & Permissions redesign) — the role detail panel's
// own header icon + one-line description.
const ROLE_META: Record<string, { icon: typeof Crown; description: string }> = {
  Manager: { icon: Crown, description: "Full access to all features. You can customize permissions if needed." },
  Staff: { icon: UsersIcon, description: "Limited access based on assigned permissions. Customize as needed." },
};

const riskBadgeClass: Record<string, string> = {
  low: "s-badge-gray",
  medium: "s-badge-info",
  high: "s-badge-warning",
  critical: "s-badge-danger",
};

// Shown a second time under the Quick Sale group (in addition to their real
// home, Clients) — since editing a client or viewing their history from
// Quick Sale's own client panel only matters once Quick Sale itself is
// accessible. Purely a display convenience in this one group; the keys
// behave completely normally wherever else they're toggled, e.g. under
// Clients. Locking (greying out until create_sales is on) is now handled
// generically by lockedByMaster, same as Catalog > Products' children.
const QUICK_SALE_DEPENDENT_KEYS = ["edit_clients", "view_clients"];

// Human-readable name for a lock message (e.g. "Enable Access Quick Sale
// first") — falls back to the raw key if the catalog hasn't loaded it yet.
function byKeyName(catalog: { key: string; name: string }[], key: string): string {
  return catalog.find((p) => p.key === key)?.name ?? key;
}

export default function RolePermissionPanel({ roleName, onClose }: Props) {
  const dispatch = useAppDispatch();
  const { showSuccess, showError, overlay } = useStatusOverlay();
  const catalog = useAppSelector((s) => s.roles.permissions);
  const roles = useAppSelector((s) => s.roles.roles);

  const existingRole = roles.find((r) => r.name === roleName);

  const [loading, setLoading] = useState(true);
  const [roleId, setRoleId] = useState<string | null>(null);
  const [perms, setPerms] = useState<Record<string, boolean>>({});
  // The last successfully saved (or freshly fetched) permission set — Save
  // Changes must be disabled whenever `perms` is identical to this, not just
  // whenever nothing has ever been touched. Kept in sync everywhere `perms`
  // is set from the server (initial load, handleResetToSaved) and after a
  // successful save.
  const [savedPerms, setSavedPerms] = useState<Record<string, boolean>>({});
  const [showPreview, setShowPreview] = useState(false);
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
    let cancelled = false;
    setLoading(true);
    (async () => {
      if (existingRole) {
        const result = await dispatch(fetchRoleByIdThunk(existingRole.id));
        if (!cancelled && fetchRoleByIdThunk.fulfilled.match(result)) {
          setRoleId(result.payload.id);
          setPerms(result.payload.permissions);
          setSavedPerms(result.payload.permissions);
        }
      } else {
        // No role row yet for this tier — start blank; created on first save.
        setRoleId(null);
        setPerms({});
        setSavedPerms({});
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

  // True whenever any catalog permission's effective boolean differs from
  // the saved baseline — compares every catalog key (not just keys present
  // in `perms`/`savedPerms`, both of which are sparse) so a toggle sequence
  // that nets back to the saved value, e.g. ON -> OFF -> ON, correctly
  // re-disables Save Changes instead of leaving it permanently dirty.
  const isDirty = useMemo(
    () => catalog.some((p) => !!perms[p.key] !== !!savedPerms[p.key]),
    [catalog, perms, savedPerms]
  );

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
      // Calendar's action permissions must read as OFF, not merely locked at
      // their old value, the instant View Calendar/View Appointment goes
      // off — see cascadeOffKeys' own doc comment for why this is an
      // opt-in exception rather than the "OFF is never cascaded" default
      // every other master in this catalog relies on.
      else for (const k of cascadeOffKeys(catalog, key)) updated[k] = false;
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

  const handleSave = async () => {
    const emptyMasters = findEmptyMasterToggles(catalog, (k) => !!perms[k]);
    if (emptyMasters.length > 0) {
      const names = emptyMasters.map((k) => catalog.find((p) => p.key === k)?.name ?? k).join(", ");
      showError(`Turn off "${names}", or select at least one option below it.`);
      return;
    }
    const missingPrereqs = findMissingPrerequisites(catalog, (k) => !!perms[k]);
    if (missingPrereqs.length > 0) {
      const { key, missing } = missingPrereqs[0];
      const keyName = catalog.find((p) => p.key === key)?.name ?? key;
      const missingName = catalog.find((p) => p.key === missing)?.name ?? missing;
      showError(`"${keyName}" requires "${missingName}" to also be enabled.`);
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
      setSavedPerms(perms);
      dispatch(fetchRolesThunk());
      onClose();
    } else {
      showError(`Failed to save ${roleName} permissions`);
    }
  };

  // A role has no higher layer to "reset to" (unlike a staff override, which
  // reverts to its role) — so this discards any UNSAVED edits by re-fetching
  // the role's last-saved permissions, rather than clearing everything.
  const handleResetToSaved = async () => {
    if (!existingRole) {
      setPerms({});
      setSavedPerms({});
      return;
    }
    setLoading(true);
    const result = await dispatch(fetchRoleByIdThunk(existingRole.id));
    if (fetchRoleByIdThunk.fulfilled.match(result)) {
      setPerms(result.payload.permissions);
      setSavedPerms(result.payload.permissions);
    }
    setLoading(false);
  };

  const roleMeta = ROLE_META[roleName];
  const RoleIconTag = roleMeta.icon;

  return (
    <div className="rp-role-detail">
      {overlay}
      <div className="rp-role-detail-header">
        <div className="rp-role-detail-header-left">
          <span className="rp-role-icon"><RoleIconTag size={18} /></span>
          <div>
            <p className="rp-role-name">{roleName}</p>
            <p className="rp-role-desc">{roleMeta.description}</p>
          </div>
        </div>
        <button
          type="button"
          className="ispp-reset-btn"
          disabled={saving || loading}
          onClick={handleResetToSaved}
          title="Discard unsaved changes"
        >
          <RotateCcw size={13} /> Reset to Default
        </button>
      </div>

      <div className="rp-permissions-heading">
        <p className="rp-permissions-title">Permissions</p>
        <p className="rp-permissions-desc">Enable or disable permissions for this role.</p>
      </div>

      <div style={{ padding: "0 0 12px" }}>
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
            <div className="ispp-module-grid">
            {modules.map(([moduleName, modulePerms]) => {
              const isOpen = expanded.has(moduleName);
              const subGroups = getSubGroups(moduleName, modulePerms);
              const hasSubGroups = subGroups.length > 1;
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
                const lockMaster = lockedByMaster(perm.key, (k) => !!perms[k]);
                const locked = lockMaster != null;
                const lockMasterName = lockMaster != null ? byKeyName(catalog, lockMaster) : null;
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
                    {locked && <p className="spm-perm-desc" style={{ color: "#b45309" }}>Enable {lockMasterName ?? "the required permission"} first</p>}
                  </div>
                  <div className="spm-perm-toggle">
                    <label className="settings-toggle" title={locked ? `Enable ${lockMasterName ?? "the required permission"} first` : undefined}>
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
              const moduleIcon = MODULE_ICON[moduleName] ?? DEFAULT_MODULE_ICON;
              const ModuleIconTag = moduleIcon.icon;
              return (
              <div key={moduleName} className={`ispp-module-card${isOpen ? " ispp-module-card--open" : ""}`}>
                <button
                  type="button"
                  className="ispp-module-card-header"
                  onClick={() => toggleExpanded(moduleName)}
                >
                  <div className="ispp-module-card-header-left">
                    <span className="ispp-module-icon" style={{ background: moduleIcon.bg, color: moduleIcon.color }}>
                      <ModuleIconTag size={17} />
                    </span>
                    <div>
                      <p className="ispp-module-card-title">{moduleName}</p>
                      <p className="ispp-module-card-count">
                        {modulePerms.length} permission{modulePerms.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                  <ChevronDown size={16} className={`ispp-module-chevron${isOpen ? " ispp-module-chevron--open" : ""}`} />
                </button>
                {isOpen && (
                  <div className="ispp-module-card-body">
                    {!hasSubGroups ? (
                      modulePerms.filter((p) => !isHiddenChild(p.key)).map(renderPerm)
                    ) : (
                      <div className="ispp-subgroup-accordion">
                        {subGroups.map((sg) => {
                          const key = groupKey(moduleName, sg.groupName);
                          const sgOpen = expandedGroups.has(key);
                          return (
                            <div key={key} className="ispp-subgroup-section">
                              <button
                                type="button"
                                className="ispp-subgroup-item"
                                onClick={() => toggleGroup(moduleName, sg.groupName)}
                              >
                                <span className="ispp-subgroup-item-name">{sg.groupName ?? "General"}</span>
                                <span className="ispp-subgroup-item-meta">
                                  {sg.rows.length} permission{sg.rows.length === 1 ? "" : "s"}
                                  <ChevronDown size={14} style={{ transform: sgOpen ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.15s" }} />
                                </span>
                              </button>
                              {sgOpen && sg.rows.filter((p) => !isHiddenChild(p.key)).map(renderPerm)}
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

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 20px", borderTop: "1px solid #f3f4f6" }}>
          <button className="btn btn-outline-secondary btn-sm" onClick={() => setShowPreview(true)} disabled={loading}>Preview</button>
          <button className="btn btn-outline-secondary btn-sm" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving || loading || !isDirty}>
            {saving ? <Loader2 size={13} className="perm-spin" /> : "Save changes"}
          </button>
        </div>
      <PermissionPreviewModal
        show={showPreview}
        onClose={() => setShowPreview(false)}
        draft={perms}
        subjectLabel={roleName}
      />
    </div>
  );
}
