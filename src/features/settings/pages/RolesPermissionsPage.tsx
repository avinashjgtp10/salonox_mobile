import { useState, useEffect } from "react";
import { SlidersHorizontal, ChevronRight } from "lucide-react";
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
import StaffPermissionEditor from "../components/StaffPermissionEditor";
import RolePermissionPanel from "../components/RolePermissionPanel";
import PermissionActivityTab from "../components/PermissionActivityTab";

type TabKey = "manager" | "staff" | "individual" | "activity";

export default function RolesPermissionsPage() {
  const dispatch = useAppDispatch();
  const { showSuccess, showError, overlay } = useStatusOverlay();
  const { items: staffList, loading: staffLoading } = useAppSelector((s) => s.staff);
  const roles = useAppSelector((s) => s.roles.roles);
  const authRole = useAppSelector((s) => s.auth.role);

  const [tab, setTab] = useState<TabKey>("manager");
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

  return (
    <>
      {overlay}
      <div className="settings-page-header">
        <h2 className="settings-page-title">Roles &amp; Permissions</h2>
        <p className="settings-page-subtitle">
          Set default permissions for Manager and Staff, or customize an individual staff member.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #e5e7eb", marginBottom: 16 }}>
        {([
          { key: "manager", label: "Manager" },
          { key: "staff", label: "Staff" },
          { key: "individual", label: "Individual Staff" },
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
          </div>
        </div>
      )}

      {/* ── Permission Activity tab ── */}
      {tab === "activity" && <PermissionActivityTab />}

      {/* Manager/Staff tier panel (uses the same modal slot as the individual
          editor — only one of the two is ever open at a time) */}
      {selectedStaff?.__rolePanel && (
        <RolePermissionPanel
          roleName={selectedStaff.__rolePanel}
          onClose={() => setSelectedStaff(null)}
        />
      )}

      {/* Individual staff permissions editor */}
      {selectedStaff && !selectedStaff.__rolePanel && (
        <StaffPermissionEditor
          staffId={String(selectedStaff.id)}
          staffName={selectedStaff.fullName || selectedStaff.first_name || selectedStaff.email || "Staff member"}
          onClose={() => {
            setSelectedStaff(null);
            dispatch(fetchStaffThunk());
          }}
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
