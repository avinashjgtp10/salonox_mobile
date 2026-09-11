import { useState, useEffect } from "react";
import { useNavigate, useLocation, NavLink } from "react-router-dom";
import { ArrowLeft, SlidersHorizontal, ChevronRight } from "lucide-react";
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

// Manager/Staff/Individual Staff/Permission Activity each have their own
// explicit route under Settings (SettingsLayout's own routing only supports
// one path segment per section) — this page renders all 4, switching on
// which one the URL points to instead of local tab-button state, and the
// left nav below is real NavLinks to those routes.
function tabFromPath(pathname: string): "manager" | "staff" | "individual" | "activity" {
  if (pathname.endsWith("/staff")) return "staff";
  if (pathname.endsWith("/individual-staff")) return "individual";
  if (pathname.endsWith("/activity")) return "activity";
  return "manager";
}

const NAV_ITEMS: { to: string; key: ReturnType<typeof tabFromPath>; label: string }[] = [
  { to: "/dashboard/settings/roles/manager",          key: "manager",    label: "Manager" },
  { to: "/dashboard/settings/roles/staff",            key: "staff",      label: "Staff" },
  { to: "/dashboard/settings/roles/individual-staff", key: "individual", label: "Individual Staff" },
  { to: "/dashboard/settings/roles/activity",         key: "activity",   label: "Permission Activity" },
];

export default function RolesPermissionsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { showSuccess, showError, overlay } = useStatusOverlay();
  const { items: staffList, loading: staffLoading } = useAppSelector((s) => s.staff);
  const roles = useAppSelector((s) => s.roles.roles);
  const authRole = useAppSelector((s) => s.auth.role);

  const tab = tabFromPath(location.pathname);
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRoleId, setBulkRoleId] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmBulkReset, setConfirmBulkReset] = useState(false);

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

  return (
    <>
      {overlay}
      {/* Reached both via SettingsLayout (section id "roles", shows its own
          "← Settings" link) and directly via /settings/roles/manager etc.
          (bypasses SettingsLayout) — this button covers the second case;
          it's a harmless extra "back" affordance in the first. */}
      <button
        type="button"
        onClick={() => navigate("/dashboard/settings")}
        style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", padding: 0, marginBottom: 16, fontSize: 13, fontWeight: 600, color: "#6b7280", cursor: "pointer" }}
      >
        <ArrowLeft size={16} /> Settings
      </button>

      <div className="settings-page-header">
        <h2 className="settings-page-title">Roles &amp; Permissions</h2>
        <p className="settings-page-subtitle">
          Set default permissions for Manager and Staff, or customize an individual staff member.
        </p>
      </div>

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        {/* Left — sidebar-style nav between the 4 sub-sections */}
        <div style={{ width: 200, flexShrink: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={() => (tab === item.key ? "sub-link active" : "sub-link")}
              style={{ borderRadius: 8 }}
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        {/* Right — active sub-section's content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* ── Manager tab ── */}
          {tab === "manager" && (
            <RoleTierCard
              title="Manager"
              description="Default permissions for anyone assigned the Manager role."
              grantedCount={managerRole ? undefined : 0}
              roleExists={!!managerRole}
              disabled={!isOwner}
              onOpen={() => setSelectedStaff({ __rolePanel: "Manager" })}
            />
          )}

          {/* ── Staff tab ── */}
          {tab === "staff" && (
            <RoleTierCard
              title="Staff"
              description="Default permissions for anyone assigned the Staff role — this is what every new staff member starts with."
              grantedCount={staffRole ? undefined : 0}
              roleExists={!!staffRole}
              disabled={!isOwner}
              onOpen={() => setSelectedStaff({ __rolePanel: "Staff" })}
            />
          )}

          {/* ── Individual Staff tab ── */}
          {tab === "individual" && (
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
            ) : staffList.length === 0 ? (
              <p style={{ fontSize: 13, color: "#6b7280" }}>
                No staff members yet. Add staff from the{" "}
                <a href="/dashboard/team" style={{ color: "#111827", fontWeight: 600 }}>Staff section</a>.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {staffList.map((member: any) => {
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
          {tab === "activity" && <PermissionActivityTab />}
        </div>
      </div>

      {/* Manager/Staff tier panel — individual staff permissions now live on
          their own full page (IndividualStaffPermissionsPage), reached via
          navigate() above, not this modal slot. */}
      {selectedStaff?.__rolePanel && (
        <RolePermissionPanel
          roleName={selectedStaff.__rolePanel}
          onClose={() => setSelectedStaff(null)}
        />
      )}
    </>
  );
}

function RoleTierCard({
  title, description, roleExists, disabled, onOpen,
}: {
  title: string;
  description: string;
  grantedCount?: number;
  roleExists: boolean;
  disabled: boolean;
  onOpen: () => void;
}) {
  return (
    <div className="settings-section">
      <div className="settings-section-body">
        <button
          onClick={onOpen}
          disabled={disabled}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px", border: "1px solid #e5e7eb", borderRadius: 10, background: "#fff",
            cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1,
          }}
        >
          <div style={{ textAlign: "left" }}>
            <p className="settings-security-name" style={{ margin: 0 }}>{title}</p>
            <p className="settings-security-desc" style={{ margin: "2px 0 0" }}>
              {description}
              {!roleExists && " (not set up yet — opening this will create it)"}
            </p>
          </div>
          <ChevronRight size={18} color="#9ca3af" />
        </button>
      </div>
    </div>
  );
}
