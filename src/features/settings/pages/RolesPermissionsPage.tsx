import { useState } from "react";
import {
  Crown,
  Shield,
  User,
  Check,
  X,
  Plus,
  Info,
} from "lucide-react";
import toast from "react-hot-toast";
import Button from "../../../components/ui/Button";

type RoleKey = "owner" | "manager" | "staff";

interface Permission {
  key: string;
  label: string;
  desc: string;
  category: string;
  owner: boolean;
  manager: boolean;
  staff: boolean;
}

const permissions: Permission[] = [
  // Dashboard
  { key: "view_dashboard", label: "View Dashboard", desc: "Access the main dashboard", category: "Dashboard", owner: true, manager: true, staff: true },
  { key: "view_analytics", label: "View Analytics", desc: "Access reports and analytics", category: "Dashboard", owner: true, manager: true, staff: false },

  // Appointments
  { key: "view_appointments", label: "View Appointments", desc: "See all appointments", category: "Appointments", owner: true, manager: true, staff: true },
  { key: "create_appointments", label: "Create Appointments", desc: "Book new appointments", category: "Appointments", owner: true, manager: true, staff: true },
  { key: "edit_appointments", label: "Edit Appointments", desc: "Modify existing bookings", category: "Appointments", owner: true, manager: true, staff: false },
  { key: "cancel_appointments", label: "Cancel Appointments", desc: "Cancel client bookings", category: "Appointments", owner: true, manager: true, staff: false },

  // Clients
  { key: "view_clients", label: "View Clients", desc: "Access client profiles", category: "Clients", owner: true, manager: true, staff: true },
  { key: "edit_clients", label: "Edit Clients", desc: "Update client information", category: "Clients", owner: true, manager: true, staff: false },
  { key: "delete_clients", label: "Delete Clients", desc: "Remove client records", category: "Clients", owner: true, manager: false, staff: false },

  // Sales
  { key: "view_sales", label: "View Sales", desc: "See sales transactions", category: "Sales", owner: true, manager: true, staff: true },
  { key: "create_sales", label: "Create Sales", desc: "Process sales and payments", category: "Sales", owner: true, manager: true, staff: true },
  { key: "apply_discounts", label: "Apply Discounts", desc: "Give discounts to clients", category: "Sales", owner: true, manager: true, staff: false },
  { key: "void_sales", label: "Void / Refund", desc: "Cancel or refund transactions", category: "Sales", owner: true, manager: true, staff: false },

  // Catalog
  { key: "view_catalog", label: "View Catalog", desc: "See services and products", category: "Catalog", owner: true, manager: true, staff: true },
  { key: "edit_catalog", label: "Edit Catalog", desc: "Manage services and pricing", category: "Catalog", owner: true, manager: true, staff: false },
  { key: "manage_inventory", label: "Manage Inventory", desc: "Update product stock", category: "Catalog", owner: true, manager: true, staff: false },

  // Team
  { key: "view_team", label: "View Team", desc: "See team members", category: "Team", owner: true, manager: true, staff: false },
  { key: "manage_team", label: "Manage Team", desc: "Add, edit, or remove staff", category: "Team", owner: true, manager: false, staff: false },
  { key: "manage_shifts", label: "Manage Shifts", desc: "Control schedules and shifts", category: "Team", owner: true, manager: true, staff: false },
  { key: "view_payroll", label: "View Payroll", desc: "Access pay runs and wages", category: "Team", owner: true, manager: false, staff: false },

  // Marketing
  { key: "view_marketing", label: "View Marketing", desc: "See campaigns and templates", category: "Marketing", owner: true, manager: true, staff: false },
  { key: "manage_marketing", label: "Manage Marketing", desc: "Create and send campaigns", category: "Marketing", owner: true, manager: true, staff: false },

  // Settings
  { key: "view_settings", label: "View Settings", desc: "Access settings pages", category: "Settings", owner: true, manager: true, staff: false },
  { key: "manage_settings", label: "Manage Settings", desc: "Change business settings", category: "Settings", owner: true, manager: false, staff: false },
  { key: "manage_billing", label: "Manage Billing", desc: "Control subscriptions and billing", category: "Settings", owner: true, manager: false, staff: false },
];

const roles: { key: RoleKey; label: string; desc: string; badge: string; icon: React.ReactNode; color: string }[] = [
  {
    key: "owner",
    label: "Owner",
    desc: "Full access to everything. Manages billing, settings, and all staff.",
    badge: "owner",
    icon: <Crown size={18} />,
    color: "#92400e",
  },
  {
    key: "manager",
    label: "Manager",
    desc: "Oversees day-to-day operations. Can manage clients, staff, and bookings.",
    badge: "manager",
    icon: <Shield size={18} />,
    color: "#5b21b6",
  },
  {
    key: "staff",
    label: "Staff",
    desc: "Handles own appointments and clients. Limited administrative access.",
    badge: "staff",
    icon: <User size={18} />,
    color: "#0369a1",
  },
];

const categories = [...new Set(permissions.map((p) => p.category))];

export default function RolesPermissionsPage() {
  const [selectedRole, setSelectedRole] = useState<RoleKey>("manager");

  const filteredPerms = permissions;

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
              Three predefined roles with different permission levels.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline-secondary"
            iconLeft={<Plus size={14} />}
            onClick={() => toast("Custom roles coming soon", { icon: "🔧" })}
          >
            Custom role
          </Button>
        </div>
        <div className="settings-section-body">
          <div className="settings-roles-grid">
            {roles.map((role) => (
              <div
                key={role.key}
                className={`settings-role-card ${selectedRole === role.key ? "selected" : ""}`}
                onClick={() => setSelectedRole(role.key)}
              >
                <span className={`settings-role-badge ${role.badge}`}>
                  {role.label}
                </span>
                <div
                  className="settings-role-icon"
                  style={{ color: role.color, background: `${role.color}18` }}
                >
                  {role.icon}
                </div>
                <p className="settings-role-name">{role.label}</p>
                <p className="settings-role-desc">{role.desc}</p>
              </div>
            ))}
          </div>

          {/* Info Banner */}
          <div
            style={{
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: 10,
              padding: "12px 16px",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              fontSize: 13,
              color: "#1d4ed8",
            }}
          >
            <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              Roles are assigned when adding team members. The{" "}
              <strong>Owner</strong> role is assigned automatically to the
              account creator and cannot be removed or downgraded.
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
              Showing permissions for all roles. Click a role card above to
              highlight its column.
            </p>
          </div>
        </div>
        <div className="settings-section-body" style={{ padding: 0, overflowX: "auto" }}>
          <table className="settings-perms-table">
            <thead className="settings-perms-head">
              <tr>
                <th style={{ textAlign: "left", paddingLeft: 22, width: "40%" }}>
                  Permission
                </th>
                <th
                  style={{
                    background: selectedRole === "owner" ? "#fef3c7" : "#f9fafb",
                    color: selectedRole === "owner" ? "#92400e" : undefined,
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <Crown size={14} />
                    Owner
                  </div>
                </th>
                <th
                  style={{
                    background: selectedRole === "manager" ? "#ede9fe" : "#f9fafb",
                    color: selectedRole === "manager" ? "#5b21b6" : undefined,
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <Shield size={14} />
                    Manager
                  </div>
                </th>
                <th
                  style={{
                    background: selectedRole === "staff" ? "#e0f2fe" : "#f9fafb",
                    color: selectedRole === "staff" ? "#0369a1" : undefined,
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <User size={14} />
                    Staff
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <>
                  {/* Category separator row */}
                  <tr key={`cat-${cat}`}>
                    <td
                      colSpan={4}
                      style={{
                        padding: "10px 22px 6px",
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: "#6b7280",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        background: "#f9fafb",
                        borderBottom: "1px solid #f3f4f6",
                      }}
                    >
                      {cat}
                    </td>
                  </tr>

                  {filteredPerms
                    .filter((p) => p.category === cat)
                    .map((perm) => (
                      <tr key={perm.key} className="settings-perms-row">
                        <td style={{ paddingLeft: 22 }}>
                          <p className="settings-perms-name">{perm.label}</p>
                          <p className="settings-perms-sub">{perm.desc}</p>
                        </td>
                        <td
                          className="settings-perms-check"
                          style={{
                            background:
                              selectedRole === "owner" ? "#fffef5" : undefined,
                          }}
                        >
                          {perm.owner ? (
                            <Check
                              size={16}
                              className="settings-perm-on"
                              strokeWidth={2.5}
                            />
                          ) : (
                            <X size={16} className="settings-perm-off" />
                          )}
                        </td>
                        <td
                          className="settings-perms-check"
                          style={{
                            background:
                              selectedRole === "manager" ? "#faf5ff" : undefined,
                          }}
                        >
                          {perm.manager ? (
                            <Check
                              size={16}
                              className="settings-perm-on"
                              strokeWidth={2.5}
                            />
                          ) : (
                            <X size={16} className="settings-perm-off" />
                          )}
                        </td>
                        <td
                          className="settings-perms-check"
                          style={{
                            background:
                              selectedRole === "staff" ? "#f0f9ff" : undefined,
                          }}
                        >
                          {perm.staff ? (
                            <Check
                              size={16}
                              className="settings-perm-on"
                              strokeWidth={2.5}
                            />
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
            <p className="settings-section-desc">
              Manage individual role assignments for your team members.
            </p>
          </div>
        </div>
        <div className="settings-section-body">
          <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
            Role assignments are managed from the{" "}
            <a
              href="/dashboard/team"
              style={{ color: "#111827", fontWeight: 600 }}
            >
              Team section
            </a>
            . Navigate there to add or modify individual staff members and their
            access level.
          </p>
          <div className="mt-3">
            <Button
              size="sm"
              variant="outline-secondary"
              onClick={() =>
                (window.location.href = "/dashboard/team")
              }
            >
              Go to Team Management
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
