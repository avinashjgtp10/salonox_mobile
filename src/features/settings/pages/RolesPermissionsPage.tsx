import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, SlidersHorizontal, ChevronRight, Search, Crown, Users as UsersIcon } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import {
  fetchRolesThunk,
  fetchPermissionsCatalogThunk,
  bulkAssignRoleThunk,
  bulkResetOverridesThunk,
} from "../../../middleware/roles/roles.thunk";
import Button from "../../../components/ui/Button";
import RolePermissionPanel from "../components/RolePermissionPanel";
import PermissionActivityTab from "../components/PermissionActivityTab";
// This page (and RolePermissionPanel/StaffPermissionEditor-derived styles it
// relies on) used to only ever render inside SettingsLayout, which is what
// imported this stylesheet. It's now also reached directly via its own
// routes (roles/manager, roles/staff, etc. — see SettingsRoutes.tsx), which
// bypass SettingsLayout, so it needs its own import too.
import "../styles/SettingsPage.scss";

type TopTab = "roles" | "staff-members" | "activity";
type RoleTier = "Manager" | "Staff";

// Manager/Staff/Individual Staff/Permission Activity each have their own
// explicit route under Settings (SettingsLayout's own routing only supports
// one path segment per section) — this page renders all of them, switching
// on which one the URL points to instead of local tab-button state, so deep
// links and browser back/forward keep working.
function topTabFromPath(pathname: string): TopTab {
  if (pathname.endsWith("/individual-staff")) return "staff-members";
  if (pathname.endsWith("/activity")) return "activity";
  return "roles"; // /manager, /staff, or the bare /roles path
}

function roleTierFromPath(pathname: string): RoleTier {
  return pathname.endsWith("/staff") ? "Staff" : "Manager";
}

const TOP_TABS: { key: TopTab; label: string; to: string }[] = [
  { key: "roles", label: "Roles", to: "/dashboard/settings/roles/manager" },
  { key: "staff-members", label: "Staff Members", to: "/dashboard/settings/roles/individual-staff" },
  { key: "activity", label: "Permission Activity", to: "/dashboard/settings/roles/activity" },
];

export default function RolesPermissionsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { showSuccess, showError, overlay } = useStatusOverlay();
  const { items: staffList, loading: staffLoading } = useAppSelector((s) => s.staff);
  const roles = useAppSelector((s) => s.roles.roles);
  const authRole = useAppSelector((s) => s.auth.role);

  const topTab = topTabFromPath(location.pathname);
  const roleTier = roleTierFromPath(location.pathname);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRoleId, setBulkRoleId] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmBulkReset, setConfirmBulkReset] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    dispatch(fetchStaffThunk());
    dispatch(fetchRolesThunk());
    dispatch(fetchPermissionsCatalogThunk());
  }, [dispatch]);

  const isOwner = authRole === "salon_owner" || authRole === "admin";
  const managerRole = roles.find((r) => r.name === "Manager");
  const staffRole = roles.find((r) => r.name === "Staff");

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkAssign = async () => {
    if (!bulkRoleId || selectedIds.size === 0) return;
    setBulkBusy(true);
    const result = await dispatch(bulkAssignRoleThunk({ staffIds: Array.from(selectedIds), roleId: bulkRoleId }));
    setBulkBusy(false);
    if (bulkAssignRoleThunk.fulfilled.match(result)) {
      showSuccess(`Role assigned to ${selectedIds.size} staff member(s)`);
      setSelectedIds(new Set());
      setBulkRoleId("");
      dispatch(fetchStaffThunk());
    } else {
      showError("Failed to bulk-assign role");
    }
  };

  const handleBulkReset = async () => {
    setConfirmBulkReset(false);
    setBulkBusy(true);
    const result = await dispatch(bulkResetOverridesThunk({ staffIds: Array.from(selectedIds) }));
    setBulkBusy(false);
    if (bulkResetOverridesThunk.fulfilled.match(result)) {
      showSuccess(`Overrides reset for ${selectedIds.size} staff member(s)`);
      setSelectedIds(new Set());
      dispatch(fetchStaffThunk());
    } else {
      showError("Failed to bulk-reset overrides");
    }
  };

  const q = search.trim().toLowerCase();

  const roleNavItems = useMemo(
    () => [
      { key: "Manager" as RoleTier, label: "Manager", icon: Crown, roleExists: !!managerRole },
      { key: "Staff" as RoleTier, label: "Staff", icon: UsersIcon, roleExists: !!staffRole },
    ].filter((r) => !q || r.label.toLowerCase().includes(q)),
    [q, managerRole, staffRole],
  );

  const filteredStaffList = useMemo(() => {
    if (!q) return staffList;
    return staffList.filter((m: any) => {
      const name = String(m.fullName || m.first_name || "").toLowerCase();
      const email = String(m.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [staffList, q]);

  // Reached two different ways: the bare "/dashboard/settings/roles" path
  // goes through SettingsLayout's own :section route, which already wraps
  // whatever it renders in .settings-wrapper/.settings-sticky-header/
  // .settings-root--full/.settings-content (see SettingsLayout.tsx) — so
  // this component must NOT add that chrome a second time there. Every
  // other path (roles/manager, roles/staff, roles/individual-staff,
  // roles/activity — see SettingsRoutes.tsx) bypasses SettingsLayout
  // entirely and renders this page directly, so it has to supply that same
  // chrome itself or it renders flush against the sidebar with no padding.
  const isEmbeddedInSettingsLayout = location.pathname === "/dashboard/settings/roles";

  const body = (
    <>
      <div className="settings-page-header">
        <h2 className="settings-page-title">Roles &amp; Permissions</h2>
        <p className="settings-page-subtitle">
          Set default permissions for Manager and Staff, or customize an individual staff member.
        </p>
      </div>

      <div className="rp-top-tabs">
        {TOP_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={topTab === t.key ? "rp-top-tab rp-top-tab--active" : "rp-top-tab"}
            onClick={() => navigate(t.to)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {topTab !== "activity" && (
        <div className="rp-page-search">
          <Search size={14} className="rp-page-search-icon" />
          <input
            type="text"
            placeholder="Search role or staff..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* ── Roles tab: role list on the left, selected role's permissions on
          the right — Manager/Staff open RolePermissionPanel inline (no
          longer a modal); "Custom Roles" is a visible-but-disabled
          placeholder only, no backend feature behind it yet. */}
      {topTab === "roles" && (
        <div className="rp-roles-layout">
          <div className="rp-roles-nav">
            <p className="rp-roles-nav-title">Roles</p>
            <p className="rp-roles-nav-desc">Select a role to view or edit permissions.</p>
            <div className="rp-roles-nav-list">
              {roleNavItems.map((r) => {
                const Icon = r.icon;
                return (
                  <button
                    key={r.key}
                    type="button"
                    className={roleTier === r.key ? "rp-roles-nav-item rp-roles-nav-item--active" : "rp-roles-nav-item"}
                    disabled={!isOwner}
                    onClick={() => navigate(r.key === "Manager" ? "/dashboard/settings/roles/manager" : "/dashboard/settings/roles/staff")}
                  >
                    <Icon size={15} />
                    <span className="rp-roles-nav-text">
                      <span className="rp-roles-nav-label">{r.label}</span>
                      {!r.roleExists && <span className="rp-roles-nav-meta">Not set up yet</span>}
                    </span>
                    <ChevronRight size={14} className="rp-roles-nav-chevron" />
                  </button>
                );
              })}
              {/* "Custom Roles" — we don't have named custom roles, but
                  per-staff permission overrides (Staff Members tab) already
                  serve that exact purpose, so this links straight there
                  instead of being a dead placeholder. */}
              <button
                type="button"
                className="rp-roles-nav-item"
                onClick={() => navigate("/dashboard/settings/roles/individual-staff")}
              >
                <UsersIcon size={15} />
                <span className="rp-roles-nav-text">
                  <span className="rp-roles-nav-label">Custom Roles</span>
                  <span className="rp-roles-nav-meta rp-roles-nav-meta--neutral">Per-staff permission overrides</span>
                </span>
                <ChevronRight size={14} className="rp-roles-nav-chevron" />
              </button>
            </div>
          </div>
          <div className="rp-roles-detail">
            {isOwner ? (
              <RolePermissionPanel roleName={roleTier} onClose={() => {}} />
            ) : (
              <p className="ispp-muted">You don't have permission to view this.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Staff Members tab (formerly "Individual Staff") ── */}
      {topTab === "staff-members" && (
        <div className="settings-section">
          <div className="settings-section-header">
            <div>
              <p className="settings-section-title">Individual Staff Overrides</p>
              <p className="settings-section-desc">
                Click a staff member to customize their permissions, or select multiple to
                bulk-assign a role.
              </p>
            </div>
          </div>
          <div className="settings-section-body">
            {isOwner && selectedIds.size > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#f9fafb", borderRadius: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{selectedIds.size} selected</span>
                <select value={bulkRoleId} onChange={(e) => setBulkRoleId(e.target.value)} style={{ fontSize: 12, padding: "4px 8px", borderRadius: 4, border: "1px solid #e5e7eb" }}>
                  <option value="">Assign role…</option>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <Button size="sm" variant="outline-secondary" disabled={!bulkRoleId || bulkBusy} onClick={handleBulkAssign}>Apply</Button>
                {confirmBulkReset ? (
                  <>
                    <span style={{ fontSize: 12 }}>Reset overrides for all selected?</span>
                    <Button size="sm" variant="outline-secondary" disabled={bulkBusy} onClick={handleBulkReset}>Yes</Button>
                    <Button size="sm" variant="outline-secondary" onClick={() => setConfirmBulkReset(false)}>Cancel</Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline-secondary" disabled={bulkBusy} onClick={() => setConfirmBulkReset(true)}>Reset overrides</Button>
                )}
                <Button size="sm" variant="outline-secondary" onClick={() => setSelectedIds(new Set())}>Clear selection</Button>
              </div>
            )}

            {staffLoading.fetchAll ? (
              <p style={{ fontSize: 13, color: "#6b7280" }}>Loading staff…</p>
            ) : filteredStaffList.length === 0 ? (
              <p style={{ fontSize: 13, color: "#6b7280" }}>
                {staffList.length === 0 ? (
                  <>
                    No staff members yet. Add staff from the{" "}
                    <a href="/dashboard/team" style={{ color: "#111827", fontWeight: 600 }}>Staff section</a>.
                  </>
                ) : (
                  "No staff match your search."
                )}
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {filteredStaffList.map((member: any) => {
                  const name = member.fullName || member.first_name || member.email || "Unnamed";
                  const initials = String(name).split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                  // Mirrors staffHasPermission()'s own branching exactly: once
                  // a staff member has a role_id, only staff_permission_overrides
                  // matters (the legacy custom_permissions blob is never
                  // consulted again) — checking the blob unconditionally, as
                  // before, could show "Custom" for a role_id'd staff member
                  // with a stale leftover blob that no longer does anything,
                  // or miss a real override for one with role_id but no blob.
                  const hasCustom = member.role_id ? !!member.has_overrides : member.custom_permissions != null;
                  return (
                    <div key={member.id} className="settings-security-item">
                      {isOwner && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(member.id)}
                          onChange={() => toggleSelect(member.id)}
                          style={{ marginRight: 8 }}
                        />
                      )}
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#0369a1", flexShrink: 0 }}>
                        {member.avatar_url
                          ? <img src={member.avatar_url} alt={name} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
                          : initials}
                      </div>
                      <div className="settings-security-info">
                        <p className="settings-security-name">{name}</p>
                        <p className="settings-security-desc">{member.email || member.designation || "Staff member"}</p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {hasCustom && (
                          <span className="s-badge s-badge-info" style={{ fontSize: 11 }}>Custom</span>
                        )}
                        {/* The real Roles & Permissions tier (role_name,
                            joined from role_id in staff.repository.ts's
                            list()) — member.role doesn't even exist on the
                            staff object, so this always fell back to a
                            hardcoded "staff" default before, regardless of
                            the member's actual assigned role. */}
                        {member.role_name ? (
                          <span className={`s-badge ${member.role_name === "Manager" ? "s-badge-warning" : "s-badge-info"}`} style={{ fontSize: 11 }}>
                            {member.role_name}
                          </span>
                        ) : (
                          <span className="s-badge s-badge-gray" style={{ fontSize: 11 }}>No role</span>
                        )}
                        {!member.is_active && (
                          <span className="s-badge s-badge-gray" style={{ fontSize: 11 }}>Inactive</span>
                        )}
                        {isOwner && (
                          <button
                            className={`spm-customize-btn ${hasCustom ? "has-custom" : ""}`}
                            onClick={() => navigate(`/dashboard/settings/roles/individual-staff/${member.id}`)}
                          >
                            <SlidersHorizontal size={13} />
                            {hasCustom ? "Edit permissions" : "Customize"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Permission Activity tab ── */}
      {topTab === "activity" && <PermissionActivityTab />}
    </>
  );

  if (isEmbeddedInSettingsLayout) {
    return <>{overlay}{body}</>;
  }

  return (
    <div className="settings-wrapper">
      {overlay}
      <div className="settings-sticky-header d-flex align-items-center gap-2">
        <button type="button" className="settings-back-link" onClick={() => navigate("/dashboard/settings")}>
          <ArrowLeft size={16} /> Settings
        </button>
      </div>
      <div className="settings-root settings-root--full">
        <div className="settings-content">{body}</div>
      </div>
    </div>
  );
}
