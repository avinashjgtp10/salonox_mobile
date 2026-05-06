import { useState, useEffect } from "react";
import { Crown, User, Check, X, Save, Info, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import {
  fetchSettingsThunk,
  createSettingThunk,
  updateSettingThunk,
} from "../../../middleware/setting/setting.thunk";
import type { EntityId } from "../../../types/common.types";
import Button from "../../../components/ui/Button";

// ── Types ─────────────────────────────────────────────────────────────────────

type RoleKey = "owner" | "staff";

interface Permission {
  key: string;
  label: string;
  desc: string;
  category: string;
  owner: boolean;   // owner is always true, non-editable
  staff: boolean;   // editable by salon_owner
}

// ── Default permission matrix ─────────────────────────────────────────────────

const defaultPermissions: Permission[] = [
  // Dashboard
  { key: "view_dashboard",  label: "View Dashboard",  desc: "Access the main dashboard",       category: "Dashboard",    owner: true, staff: true  },
  { key: "view_analytics",  label: "View Analytics",  desc: "Access reports and analytics",    category: "Dashboard",    owner: true, staff: false },

  // Appointments
  { key: "view_appointments",   label: "View Appointments",   desc: "See all appointments",         category: "Appointments", owner: true, staff: true  },
  { key: "create_appointments", label: "Create Appointments", desc: "Book new appointments",         category: "Appointments", owner: true, staff: true  },
  { key: "edit_appointments",   label: "Edit Appointments",   desc: "Modify existing bookings",      category: "Appointments", owner: true, staff: false },
  { key: "cancel_appointments", label: "Cancel Appointments", desc: "Cancel client bookings",        category: "Appointments", owner: true, staff: false },

  // Clients
  { key: "view_clients",   label: "View Clients",   desc: "Access client profiles",         category: "Clients",      owner: true, staff: true  },
  { key: "edit_clients",   label: "Edit Clients",   desc: "Update client information",      category: "Clients",      owner: true, staff: false },
  { key: "delete_clients", label: "Delete Clients", desc: "Remove client records",          category: "Clients",      owner: true, staff: false },

  // Sales
  { key: "view_sales",      label: "View Sales",      desc: "See sales transactions",           category: "Sales",        owner: true, staff: true  },
  { key: "create_sales",    label: "Create Sales",    desc: "Process sales and payments",       category: "Sales",        owner: true, staff: true  },
  { key: "apply_discounts", label: "Apply Discounts", desc: "Give discounts to clients",        category: "Sales",        owner: true, staff: false },
  { key: "void_sales",      label: "Void / Refund",   desc: "Cancel or refund transactions",    category: "Sales",        owner: true, staff: false },

  // Catalog
  { key: "view_catalog",    label: "View Catalog",    desc: "See services and products",        category: "Catalog",      owner: true, staff: true  },
  { key: "edit_catalog",    label: "Edit Catalog",    desc: "Manage services and pricing",      category: "Catalog",      owner: true, staff: false },
  { key: "manage_inventory",label: "Manage Inventory",desc: "Update product stock",             category: "Catalog",      owner: true, staff: false },

  // Team
  { key: "view_team",    label: "View Team",    desc: "See team members",                  category: "Team",         owner: true, staff: false },
  { key: "manage_team",  label: "Manage Team",  desc: "Add, edit, or remove staff",        category: "Team",         owner: true, staff: false },
  { key: "manage_shifts",label: "Manage Shifts",desc: "Control schedules and shifts",      category: "Team",         owner: true, staff: false },
  { key: "view_payroll", label: "View Payroll", desc: "Access pay runs and wages",         category: "Team",         owner: true, staff: false },

  // Marketing
  { key: "view_marketing",   label: "View Marketing",   desc: "See campaigns and templates", category: "Marketing",    owner: true, staff: false },
  { key: "manage_marketing", label: "Manage Marketing", desc: "Create and send campaigns",   category: "Marketing",    owner: true, staff: false },

  // Settings
  { key: "view_settings",   label: "View Settings",   desc: "Access settings pages",           category: "Settings",     owner: true, staff: false },
  { key: "manage_settings", label: "Manage Settings", desc: "Change business settings",        category: "Settings",     owner: true, staff: false },
  { key: "manage_billing",  label: "Manage Billing",  desc: "Control subscriptions and billing",category: "Settings",   owner: true, staff: false },
];

const PERM_KEY = "role_permissions";
const categories = [...new Set(defaultPermissions.map((p) => p.category))];

const roles: { key: RoleKey; label: string; icon: React.ReactNode; color: string; bg: string; backendRole: string }[] = [
  { key: "owner", label: "Owner",     icon: <Crown size={18} />, color: "#92400e", bg: "#fef3c7", backendRole: "salon_owner" },
  { key: "staff", label: "Staff",     icon: <User  size={18} />, color: "#0369a1", bg: "#e0f2fe", backendRole: "staff"       },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function RolesPermissionsPage() {
  const dispatch = useAppDispatch();
  const { items: settingItems } = useAppSelector((s) => s.setting);
  const { items: staffList, loading: staffLoading } = useAppSelector((s) => s.staff);
  const { profile } = useAppSelector((s) => s.user);

  const [permissions, setPermissions] = useState<Permission[]>(defaultPermissions);
  const [selectedRole, setSelectedRole] = useState<RoleKey>("staff");
  const [settingId, setSettingId] = useState<EntityId | null>(null);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // ── Fetch on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchSettingsThunk());
    dispatch(fetchStaffThunk());
  }, [dispatch]);

  // ── Load saved permissions ──────────────────────────────────────────────────
  useEffect(() => {
    const found = settingItems.find((s) => s.key === PERM_KEY);
    if (!found) return;
    setSettingId(found.id);
    try {
      const raw = typeof found.value === "string" ? found.value : JSON.stringify(found.value);
      const saved: Record<string, { owner: boolean; staff: boolean }> = JSON.parse(raw);
      setPermissions((prev) =>
        prev.map((p) =>
          saved[p.key]
            ? { ...p, owner: true, staff: saved[p.key].staff }
            : p
        )
      );
    } catch {
      // keep defaults
    }
  }, [settingItems]);

  // ── Toggle a staff permission ───────────────────────────────────────────────
  const togglePerm = (key: string, role: RoleKey) => {
    if (role === "owner") return; // owner always has all permissions
    setPermissions((prev) =>
      prev.map((p) => (p.key === key ? { ...p, [role]: !p[role] } : p))
    );
    setIsDirty(true);
  };

  // ── Save to backend ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    const stored: Record<string, { owner: boolean; staff: boolean }> = {};
    permissions.forEach((p) => { stored[p.key] = { owner: p.owner, staff: p.staff }; });
    const value = JSON.stringify(stored);

    let ok = false;
    if (settingId) {
      const result = await dispatch(updateSettingThunk({ id: settingId, data: { key: PERM_KEY, value } }));
      ok = updateSettingThunk.fulfilled.match(result);
    } else {
      const result = await dispatch(createSettingThunk({ key: PERM_KEY, value, description: "Role permissions matrix" }));
      if (createSettingThunk.fulfilled.match(result)) {
        setSettingId(result.payload.id);
        ok = true;
      }
    }
    setSaving(false);
    if (ok) { toast.success("Permissions saved"); setIsDirty(false); }
    else toast.error("Failed to save permissions");
  };

  const handleReset = () => {
    setPermissions(defaultPermissions);
    setIsDirty(true);
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const isOwner = profile?.role === "salon_owner" || (profile as any)?.role === "admin";

  const getRoleBadge = (role?: string) => {
    if (!role) return null;
    const map: Record<string, { label: string; cls: string }> = {
      salon_owner: { label: "Owner",  cls: "s-badge-warning" },
      staff:       { label: "Staff",  cls: "s-badge-info"    },
      admin:       { label: "Admin",  cls: "s-badge-danger"  },
    };
    const r = map[role] ?? { label: role, cls: "s-badge-gray" };
    return <span className={`s-badge ${r.cls}`} style={{ fontSize: 11 }}>{r.label}</span>;
  };

  return (
    <>
      {/* Page Header */}
      <div className="settings-page-header">
        <h2 className="settings-page-title">Roles & Permissions</h2>
        <p className="settings-page-subtitle">
          Control what each role can access and do within your salon management system.
        </p>
      </div>

      {/* Role Cards */}
      <div className="settings-section">
        <div className="settings-section-header">
          <div>
            <p className="settings-section-title">Roles Overview</p>
            <p className="settings-section-desc">
              Two system roles — Owner has full access; Staff permissions are customizable below.
            </p>
          </div>
        </div>
        <div className="settings-section-body">
          <div className="settings-roles-grid">
            {roles.map((role) => (
              <div
                key={role.key}
                className={`settings-role-card ${selectedRole === role.key ? "selected" : ""}`}
                onClick={() => setSelectedRole(role.key)}
              >
                <span className={`settings-role-badge ${role.key}`}>{role.label}</span>
                <div className="settings-role-icon" style={{ color: role.color, background: role.bg }}>
                  {role.icon}
                </div>
                <p className="settings-role-name">{role.label}</p>
                <p className="settings-role-desc" style={{ fontSize: 12 }}>
                  {role.key === "owner"
                    ? "Full access to everything. Cannot be restricted."
                    : "Day-to-day operations. Permissions customizable below."}
                </p>
                <p style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                  Backend role: <code style={{ fontSize: 11 }}>{role.backendRole}</code>
                </p>
              </div>
            ))}
          </div>

          {/* Info banner */}
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "#1d4ed8", marginTop: 16 }}>
            <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              The <strong>Owner</strong> role is assigned to the account creator and always has full access.
              Toggle checkboxes in the permission matrix below to customize <strong>Staff</strong> access.
              {!isOwner && " Only the Owner can edit permissions."}
            </span>
          </div>
        </div>
      </div>

      {/* Permissions Table */}
      <div className="settings-section">
        <div className="settings-section-header">
          <div>
            <p className="settings-section-title">Permission Matrix</p>
            <p className="settings-section-desc">
              {isOwner
                ? "Click any Staff cell to toggle that permission."
                : "Read-only — only the Owner can change permissions."}
            </p>
          </div>
          {isOwner && (
            <div style={{ display: "flex", gap: 8 }}>
              {isDirty && (
                <Button size="sm" variant="ghost" iconLeft={<RefreshCw size={13} />} onClick={handleReset}>
                  Reset defaults
                </Button>
              )}
              <Button size="sm" loading={saving} disabled={!isDirty} iconLeft={<Save size={14} />} onClick={handleSave}>
                Save permissions
              </Button>
            </div>
          )}
        </div>
        <div className="settings-section-body" style={{ padding: 0, overflowX: "auto" }}>
          <table className="settings-perms-table">
            <thead className="settings-perms-head">
              <tr>
                <th style={{ textAlign: "left", paddingLeft: 22, width: "50%" }}>Permission</th>
                <th style={{ background: selectedRole === "owner" ? "#fef3c7" : "#f9fafb", color: selectedRole === "owner" ? "#92400e" : undefined }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <Crown size={14} /> Owner
                  </div>
                </th>
                <th style={{ background: selectedRole === "staff" ? "#e0f2fe" : "#f9fafb", color: selectedRole === "staff" ? "#0369a1" : undefined }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <User size={14} /> Staff
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <>
                  <tr key={`cat-${cat}`}>
                    <td colSpan={3} style={{ padding: "10px 22px 6px", fontSize: 11.5, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", background: "#f9fafb", borderBottom: "1px solid #f3f4f6" }}>
                      {cat}
                    </td>
                  </tr>
                  {permissions.filter((p) => p.category === cat).map((perm) => (
                    <tr key={perm.key} className="settings-perms-row">
                      <td style={{ paddingLeft: 22 }}>
                        <p className="settings-perms-name">{perm.label}</p>
                        <p className="settings-perms-sub">{perm.desc}</p>
                      </td>

                      {/* Owner — always checked, non-editable */}
                      <td className="settings-perms-check" style={{ background: selectedRole === "owner" ? "#fffef5" : undefined }}>
                        <Check size={16} className="settings-perm-on" strokeWidth={2.5} />
                      </td>

                      {/* Staff — editable */}
                      <td
                        className="settings-perms-check"
                        style={{
                          background: selectedRole === "staff" ? "#f0f9ff" : undefined,
                          cursor: isOwner ? "pointer" : "default",
                        }}
                        onClick={() => isOwner && togglePerm(perm.key, "staff")}
                        title={isOwner ? "Click to toggle" : ""}
                      >
                        {perm.staff ? (
                          <Check size={16} className="settings-perm-on" strokeWidth={2.5} />
                        ) : (
                          <X size={16} className="settings-perm-off" />
                        )}
                      </td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Team Members with Roles */}
      <div className="settings-section">
        <div className="settings-section-header">
          <div>
            <p className="settings-section-title">Team Role Assignments</p>
            <p className="settings-section-desc">Current roles of your team members.</p>
          </div>
        </div>
        <div className="settings-section-body">
          {staffLoading.fetchAll ? (
            <p style={{ fontSize: 13, color: "#6b7280" }}>Loading team…</p>
          ) : staffList.length === 0 ? (
            <p style={{ fontSize: 13, color: "#6b7280" }}>
              No team members yet. Add staff from the{" "}
              <a href="/dashboard/team" style={{ color: "#111827", fontWeight: 600 }}>Team section</a>.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {staffList.map((member) => {
                const name = member.fullName || member.first_name || member.email || "Unnamed";
                const initials = String(name).split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                return (
                  <div key={member.id} className="settings-security-item">
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#0369a1", flexShrink: 0 }}>
                      {member.avatar_url ? (
                        <img src={member.avatar_url} alt={name} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
                      ) : initials}
                    </div>
                    <div className="settings-security-info">
                      <p className="settings-security-name">{name}</p>
                      <p className="settings-security-desc">{member.email || member.designation || "Staff member"}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {getRoleBadge(member.role ?? "staff")}
                      {!member.is_active && (
                        <span className="s-badge s-badge-gray" style={{ fontSize: 11 }}>Inactive</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-3">
            <Button size="sm" variant="outline-secondary" onClick={() => (window.location.href = "/dashboard/team")}>
              Manage team roles →
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
