import { useEffect, useMemo, useState } from "react";
import { PersonBadge } from "react-bootstrap-icons";
import { SlidersHorizontal } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchMySalonsThunk, fetchAllStaffThunk, updateSalonStaffPermissionsThunk } from "../../../middleware/branchOwner/branchOwner.thunk";
import StaffPermissionsModal from "../../settings/components/StaffPermissionsModal";
import { defaultPermissions } from "../../settings/data/permissionMatrix";
import { SectionCard, BoEmptyState, Shimmer, BoSearchInput, usePagination, BoPagination } from "../components/BranchOwnerUI";
import { JiraFilterMenu, Badge, Button, Table } from "../../../components/ui";
import type { JiraFilterField } from "../../../components/ui";
import type { Staff } from "../../../types/staff.types";

const ROLE_VARIANT: Record<string, "warning" | "danger" | "info" | "secondary"> = {
  salon_owner: "warning",
  admin: "danger",
  manager: "info",
  staff: "secondary",
};
const ROLE_LABEL: Record<string, string> = {
  salon_owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  staff: "Staff",
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
          <BoSearchInput value={search} onChange={setSearch} placeholder="Search staff, email or salon" />
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
            <Table<StaffRow>
              data={staffPage.pageItems}
              columns={[
                {
                  header: "Staff", key: "name",
                  render: (member) => {
                    const name = member.fullName || member.first_name || member.email || "Unnamed";
                    const initials = String(name).split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                    return (
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#0369a1", flexShrink: 0 }}>
                          {member.avatar_url
                            ? <img src={member.avatar_url} alt={name} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
                            : initials}
                        </div>
                        <span style={{ fontWeight: 700, color: "#0f172a" }}>{name}</span>
                      </div>
                    );
                  },
                },
                { header: "Salon", key: "salonName", className: "text-secondary" },
                { header: "Contact", key: "email", className: "text-secondary", render: (member) => member.email || member.designation || "—" },
                {
                  header: "Role", key: "role",
                  render: (member) => {
                    const roleKey = resolveRoleKey(member);
                    return <Badge variant={ROLE_VARIANT[roleKey] ?? "secondary"}>{ROLE_LABEL[roleKey] ?? roleKey}</Badge>;
                  },
                },
                {
                  header: "Status", key: "is_active",
                  render: (member) => member.is_active === false
                    ? <Badge variant="secondary">Inactive</Badge>
                    : <Badge variant="success">Active</Badge>,
                },
                {
                  header: "Permissions", key: "custom_permissions",
                  render: (member) => member.custom_permissions != null
                    ? <Badge variant="primary">Customised</Badge>
                    : <span style={{ color: "#94a3b8", fontSize: 12.5 }}>Role default</span>,
                },
                {
                  header: "Action", key: "action",
                  render: (member) => {
                    const hasCustom = member.custom_permissions != null;
                    return (
                      <Button
                        size="sm"
                        variant={hasCustom ? "primary" : "outline-secondary"}
                        iconLeft={<SlidersHorizontal size={13} />}
                        onClick={() => setSelectedStaff(member)}
                      >
                        {hasCustom ? "Edit" : "Customize"}
                      </Button>
                    );
                  },
                },
              ]}
            />
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
