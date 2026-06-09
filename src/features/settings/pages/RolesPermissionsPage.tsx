import { useState, useEffect } from "react";
import { SlidersHorizontal } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import Button from "../../../components/ui/Button";
import StaffPermissionsModal from "../components/StaffPermissionsModal";
import { defaultPermissions } from "../data/permissionMatrix";

// ── Component ─────────────────────────────────────────────────────────────────

export default function RolesPermissionsPage() {
  const dispatch = useAppDispatch();
  const { items: staffList, loading: staffLoading } = useAppSelector((s) => s.staff);
  const authRole = useAppSelector((s) => s.auth.role);

  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);

  // ── Fetch on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchStaffThunk());
  }, [dispatch]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
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

  return (
    <>
      {/* Page Header */}
      <div className="settings-page-header">
        <h2 className="settings-page-title">Roles &amp; Permissions</h2>
        <p className="settings-page-subtitle">
          Customize permissions per staff member from the team section below.
        </p>
      </div>

      {/* Team Members with individual permission override */}
      <div className="settings-section">
        <div className="settings-section-header">
          <div>
            <p className="settings-section-title">Per-Staff Permission Overrides</p>
            <p className="settings-section-desc">
              Click "Customize" on any team member to set individual permissions.
            </p>
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
                const hasCustom = member.custom_permissions != null;
                return (
                  <div key={member.id} className="settings-security-item">
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
              Manage team →
            </Button>
          </div>
        </div>
      </div>

      {/* Per-staff permissions modal */}
      {selectedStaff && (
        <StaffPermissionsModal
          staff={selectedStaff}
          globalPermissions={defaultPermissions}
          onClose={() => setSelectedStaff(null)}
          onSaved={(_staffId, customPerms) => {
            setSelectedStaff((prev: any) => prev ? { ...prev, custom_permissions: customPerms } : null);
            // Re-fetch to sync Redux list with the latest DB state
            dispatch(fetchStaffThunk());
          }}
        />
      )}
    </>
  );
}
