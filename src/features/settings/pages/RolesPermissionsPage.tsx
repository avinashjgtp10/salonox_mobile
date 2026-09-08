import { useState, useEffect } from "react";
import { SlidersHorizontal, Plus, Copy, Trash2, Pencil } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import {
  fetchRolesThunk,
  fetchPermissionsCatalogThunk,
  deleteRoleThunk,
  duplicateRoleThunk,
  fetchRoleByIdThunk,
  bulkAssignRoleThunk,
  bulkResetOverridesThunk,
} from "../../../middleware/roles/roles.thunk";
import Button from "../../../components/ui/Button";
import StaffPermissionEditor from "../components/StaffPermissionEditor";
import RoleEditor from "../components/RoleEditor";
import PermissionActivityTab from "../components/PermissionActivityTab";
import type { RoleWithPermissions } from "../../../types/roles.types";

type TabKey = "staff" | "roles" | "activity";

export default function RolesPermissionsPage() {
  const dispatch = useAppDispatch();
  const { showSuccess, showError, overlay } = useStatusOverlay();
  const { items: staffList, loading: staffLoading } = useAppSelector((s) => s.staff);
  const roles = useAppSelector((s) => s.roles.roles);
  const rolesLoading = useAppSelector((s) => s.roles.loading.roles);
  const authRole = useAppSelector((s) => s.auth.role);

  const [tab, setTab] = useState<TabKey>("staff");
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
  const [editingRole, setEditingRole] = useState<RoleWithPermissions | "new" | null>(null);
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

  const getRoleBadge = (role?: string) => {
    if (!role) return null;
    const map: Record<string, { label: string; cls: string }> = {
      salon_owner: { label: "Owner", cls: "s-badge-warning" },
      staff:       { label: "Staff", cls: "s-badge-info"    },
      admin:       { label: "Admin", cls: "s-badge-danger"  },
    };
    const r = map[role] ?? { label: role, cls: "s-badge-gray" };
    return <span className={`s-badge ${r.cls}`} style={{ fontSize: 11 }}>{r.label}</span>;
  };

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

  const handleDeleteRole = async (role: RoleWithPermissions) => {
    if (role.staff_count > 0) {
      showError(`Cannot delete "${role.name}" — ${role.staff_count} staff member(s) are still assigned to it.`);
      return;
    }
    if (!window.confirm(`Delete the role "${role.name}"? This cannot be undone.`)) return;
    const result = await dispatch(deleteRoleThunk({ id: role.id }));
    if (deleteRoleThunk.fulfilled.match(result)) {
      showSuccess("Role deleted");
    } else {
      showError("Failed to delete role");
    }
  };

  const handleDuplicateRole = async (role: RoleWithPermissions) => {
    const result = await dispatch(duplicateRoleThunk(role.id));
    if (duplicateRoleThunk.fulfilled.match(result)) {
      showSuccess(`"${role.name}" duplicated`);
    } else {
      showError("Failed to duplicate role");
    }
  };

  const openRoleEditor = async (roleId: string) => {
    const result = await dispatch(fetchRoleByIdThunk(roleId));
    if (fetchRoleByIdThunk.fulfilled.match(result)) {
      setEditingRole(result.payload);
    } else {
      showError("Failed to load role");
    }
  };

  return (
    <>
      {overlay}
      <div className="settings-page-header">
        <h2 className="settings-page-title">Roles &amp; Permissions</h2>
        <p className="settings-page-subtitle">
          Manage roles and their default permissions, and customize individual staff overrides.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #e5e7eb", marginBottom: 16 }}>
        {([
          { key: "staff", label: "Staff" },
          { key: "roles", label: "Roles" },
          { key: "activity", label: "Permission Activity" },
        ] as { key: TabKey; label: string }[]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 600,
              background: "none",
              border: "none",
              borderBottom: tab === t.key ? "2px solid #111827" : "2px solid transparent",
              color: tab === t.key ? "#111827" : "#6b7280",
              cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Staff tab ── */}
      {tab === "staff" && (
        <div className="settings-section">
          <div className="settings-section-header">
            <div>
              <p className="settings-section-title">Per-Staff Permission Overrides</p>
              <p className="settings-section-desc">
                Click "Customize" on any staff member to set individual permissions, or select
                multiple to bulk-assign a role.
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
                  const hasCustom = member.custom_permissions != null;
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
                        {getRoleBadge(member.role ?? "staff")}
                        {!member.is_active && (
                          <span className="s-badge s-badge-gray" style={{ fontSize: 11 }}>Inactive</span>
                        )}
                        {isOwner && (
                          <button
                            className={`spm-customize-btn ${hasCustom ? "has-custom" : ""}`}
                            onClick={() => setSelectedStaff(member)}
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

            <div className="mt-3">
              <Button size="sm" variant="outline-secondary" onClick={() => { window.location.href = "/dashboard/team"; }}>
                Manage staff →
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Roles tab ── */}
      {tab === "roles" && (
        <div className="settings-section">
          <div className="settings-section-header">
            <div>
              <p className="settings-section-title">Roles</p>
              <p className="settings-section-desc">
                Define what each role can access by default. Individual staff can still be given
                overrides from the Staff tab.
              </p>
            </div>
            {isOwner && (
              <Button size="sm" variant="primary" onClick={() => setEditingRole("new")}>
                <Plus size={14} /> Create role
              </Button>
            )}
          </div>
          <div className="settings-section-body">
            {rolesLoading ? (
              <p style={{ fontSize: 13, color: "#6b7280" }}>Loading roles…</p>
            ) : roles.length === 0 ? (
              <p style={{ fontSize: 13, color: "#6b7280" }}>No roles yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {roles.map((role) => (
                  <div key={role.id} className="settings-security-item">
                    <div className="settings-security-info">
                      <p className="settings-security-name">{role.name}</p>
                      <p className="settings-security-desc">
                        {role.description || "No description"} · {role.staff_count} staff member{role.staff_count === 1 ? "" : "s"}
                      </p>
                    </div>
                    {isOwner && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="spm-customize-btn" onClick={() => openRoleEditor(role.id)}>
                          <Pencil size={13} /> Edit
                        </button>
                        <button className="spm-customize-btn" onClick={() => handleDuplicateRole(role as RoleWithPermissions)}>
                          <Copy size={13} /> Duplicate
                        </button>
                        <button className="spm-customize-btn" onClick={() => handleDeleteRole(role as RoleWithPermissions)}>
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Permission Activity tab ── */}
      {tab === "activity" && <PermissionActivityTab />}

      {/* Per-staff permissions editor */}
      {selectedStaff && (
        <StaffPermissionEditor
          staffId={String(selectedStaff.id)}
          staffName={selectedStaff.fullName || selectedStaff.first_name || selectedStaff.email || "Staff member"}
          onClose={() => {
            setSelectedStaff(null);
            dispatch(fetchStaffThunk());
          }}
        />
      )}

      {/* Role create/edit */}
      {editingRole && (
        <RoleEditor
          role={editingRole === "new" ? undefined : editingRole}
          onClose={() => setEditingRole(null)}
          onSaved={() => {
            setEditingRole(null);
            dispatch(fetchRolesThunk());
          }}
        />
      )}
    </>
  );
}
