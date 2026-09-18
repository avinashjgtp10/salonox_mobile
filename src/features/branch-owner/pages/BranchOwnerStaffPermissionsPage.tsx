import { useEffect, useMemo, useState } from "react";
import { PersonBadge, Search } from "react-bootstrap-icons";
import { SlidersHorizontal } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchMySalonsThunk, fetchAllStaffThunk, updateSalonStaffPermissionsThunk } from "../../../middleware/branchOwner/branchOwner.thunk";
import StaffPermissionsModal from "../../settings/components/StaffPermissionsModal";
import { defaultPermissions } from "../../settings/data/permissionMatrix";
import { SectionCard, BoEmptyState, Shimmer, usePagination, BoPagination } from "../components/BranchOwnerUI";
import { JiraFilterMenu } from "../../../components/ui";
import type { JiraFilterField } from "../../../components/ui";
import type { Staff } from "../../../types/staff.types";

const ROLE_STYLE: Record<string, { label: string; bg: string; text: string }> = {
  salon_owner: { label: "Owner",   bg: "#fffbeb", text: "#d97706" },
  admin:       { label: "Admin",   bg: "#fef2f2", text: "#dc2626" },
  manager:     { label: "Manager", bg: "#f5f3ff", text: "#7c3aed" },
  staff:       { label: "Staff",   bg: "#eff6ff", text: "#2563eb" },
};

const ROLE_OPTIONS = [
  { id: "salon_owner", label: "Owner" },
  { id: "manager", label: "Manager" },
  { id: "staff", label: "Staff" },
  { id: "admin", label: "Admin" },
];

const STATUS_OPTIONS = [
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
];

const PERMISSIONS_OPTIONS = [
  { id: "customised", label: "Customised" },
  { id: "default", label: "Role default" },
];

function Pill({ label, bg, text }: { label: string; bg: string; text: string }) {
  return <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: bg, color: text, whiteSpace: "nowrap" }}>{label}</span>;
}

// A staff row's `role` column is almost always "staff" — the meaningful
// distinction (Staff vs Manager) lives in `permission_level`/`designation`
// instead, so check those before falling back to `role`.
function resolveRoleKey(member: Staff): string {
  const level = String(member.permission_level ?? "").toLowerCase();
  if (level === "manager") return "manager";
  const designation = String(member.designation ?? "").toLowerCase();
  if (designation.includes("manager")) return "manager";
  return member.role ?? "staff";
}

interface StaffRow extends Staff {
  salonId: string;
  salonName: string;
}

export default function BranchOwnerStaffPermissionsPage() {
  const dispatch = useAppDispatch();
  const salons = useAppSelector((s) => s.branchOwner.salons);

  const [staffList, setStaffList] = useState<StaffRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffRow | null>(null);

  const [search, setSearch] = useState("");
  const [salonFilter, setSalonFilter] = useState<string[]>([]);
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [permsFilter, setPermsFilter] = useState<string[]>([]);

  useEffect(() => { dispatch(fetchMySalonsThunk()); }, [dispatch]);

  // One combined list across every assigned salon — the backend does the
  // per-salon fan-out itself now, so this is a single POST instead of one
  // GET per assigned salon fired from the browser.
  useEffect(() => {
    setLoaded(false);
    dispatch(fetchAllStaffThunk()).then((r) => {
      setStaffList(fetchAllStaffThunk.fulfilled.match(r) ? (r.payload as StaffRow[]) : []);
      setLoaded(true);
    });
  }, [dispatch]);

  const salonOptions = useMemo(() => salons.map((s) => ({ id: s.id, label: s.name })), [salons]);

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "salon", label: "Salon", options: salonOptions, searchable: true },
    { key: "role", label: "Role", options: ROLE_OPTIONS },
    { key: "status", label: "Status", options: STATUS_OPTIONS },
    { key: "permissions", label: "Permissions", options: PERMISSIONS_OPTIONS },
  ], [salonOptions]);

  const filterMenuSelected = useMemo(() => ({
    salon: salonFilter, role: roleFilter, status: statusFilter, permissions: permsFilter,
  }), [salonFilter, roleFilter, statusFilter, permsFilter]);

  const handleFiltersApply = (next: Record<string, string[]>) => {
    setSalonFilter(next.salon ?? []);
    setRoleFilter(next.role ?? []);
    setStatusFilter(next.status ?? []);
    setPermsFilter(next.permissions ?? []);
  };

  const filteredStaff = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staffList.filter((m) => {
      if (salonFilter.length && !salonFilter.includes(m.salonId)) return false;
      if (roleFilter.length && !roleFilter.includes(resolveRoleKey(m))) return false;
      const isActive = m.is_active !== false;
      if (statusFilter.length && !statusFilter.includes(isActive ? "active" : "inactive")) return false;
      const hasCustom = m.custom_permissions != null;
      if (permsFilter.length && !permsFilter.includes(hasCustom ? "customised" : "default")) return false;
      if (q) {
        const name = m.fullName || m.first_name || m.email || "";
        const haystack = `${name} ${m.email ?? ""} ${m.salonName}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [staffList, salonFilter, roleFilter, statusFilter, permsFilter, search]);

  const staffPage = usePagination(filteredStaff, 10);

  return (
    <div style={{ padding: "28px 28px 40px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>Staff & Permissions</h1>
        <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>Customize per-staff permission overrides across every salon you manage.</p>
      </div>

      {loaded && staffList.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
          <JiraFilterMenu fields={filterFields} selected={filterMenuSelected} onApply={handleFiltersApply} triggerLabel="Filters" />
          <div style={{ position: "relative", flex: "1 1 240px", maxWidth: 320 }}>
            <Search size={13} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              type="text"
              placeholder="Search staff, email or salon"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", padding: "9px 12px 9px 32px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box", background: "#fff" }}
            />
          </div>
        </div>
      )}

      <SectionCard
        title="Team Members"
        subtitle="Click Customize on any staff member to set individual permissions."
        noPadding
      >
        {!loaded ? (
          <div style={{ padding: 20 }}><Shimmer h={160} /></div>
        ) : staffList.length === 0 ? (
          <BoEmptyState icon={<PersonBadge size={26} />} text="No staff members across your salons yet." />
        ) : filteredStaff.length === 0 ? (
          <BoEmptyState icon={<PersonBadge size={26} />} text="No staff members match the current filters." />
        ) : (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Staff", "Salon", "Contact", "Role", "Status", "Permissions", "Action"].map((h) => (
                    <th key={h} style={{ padding: "10px 20px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staffPage.pageItems.map((member) => {
                  const name = member.fullName || member.first_name || member.email || "Unnamed";
                  const initials = String(name).split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                  const hasCustom = member.custom_permissions != null;
                  const roleKey = resolveRoleKey(member);
                  const roleStyle = ROLE_STYLE[roleKey] ?? { label: roleKey, bg: "#f8fafc", text: "#64748b" };
                  return (
                    <tr key={`${member.salonId}-${member.id}`} style={{ borderTop: "1px solid #f8fafc" }}>
                      <td style={{ padding: "11px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#0369a1", flexShrink: 0 }}>
                            {member.avatar_url
                              ? <img src={member.avatar_url} alt={name} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
                              : initials}
                          </div>
                          <span style={{ fontWeight: 700, color: "#0f172a" }}>{name}</span>
                        </div>
                      </td>
                      <td style={{ padding: "11px 20px", color: "#475569" }}>{member.salonName}</td>
                      <td style={{ padding: "11px 20px", color: "#475569" }}>{member.email || member.designation || "—"}</td>
                      <td style={{ padding: "11px 20px" }}><Pill label={roleStyle.label} bg={roleStyle.bg} text={roleStyle.text} /></td>
                      <td style={{ padding: "11px 20px" }}>
                        {member.is_active === false
                          ? <Pill label="Inactive" bg="#f8fafc" text="#64748b" />
                          : <Pill label="Active" bg="#f0fdf4" text="#16a34a" />}
                      </td>
                      <td style={{ padding: "11px 20px" }}>
                        {hasCustom ? <Pill label="Customised" bg="#eef2ff" text="#6366f1" /> : <span style={{ color: "#94a3b8", fontSize: 12.5 }}>Role default</span>}
                      </td>
                      <td style={{ padding: "11px 20px" }}>
                        <button
                          onClick={() => setSelectedStaff(member)}
                          style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600, border: hasCustom ? "1.5px solid #6366f1" : "1.5px solid #e2e8f0", cursor: "pointer", background: hasCustom ? "#eef2ff" : "#fff", color: hasCustom ? "#6366f1" : "#374151", whiteSpace: "nowrap" }}>
                          <SlidersHorizontal size={13} />
                          {hasCustom ? "Edit" : "Customize"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <BoPagination {...staffPage} />
          </>
        )}
      </SectionCard>

      {selectedStaff && (
        <StaffPermissionsModal
          staff={selectedStaff}
          globalPermissions={defaultPermissions}
          onClose={() => setSelectedStaff(null)}
          savePermissions={async (staffId, customPerms) => {
            const r = await dispatch(updateSalonStaffPermissionsThunk({ salonId: selectedStaff.salonId, staffId: String(staffId), customPermissions: customPerms }));
            return updateSalonStaffPermissionsThunk.fulfilled.match(r);
          }}
          onSaved={(staffId, customPerms) => {
            setSelectedStaff((prev) => prev ? { ...prev, custom_permissions: customPerms } : null);
            setStaffList((prev) => prev.map((m) => m.id === staffId ? { ...m, custom_permissions: customPerms } : m));
          }}
        />
      )}
    </div>
  );
}
