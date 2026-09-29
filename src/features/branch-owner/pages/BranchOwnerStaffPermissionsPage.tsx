import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PersonBadge } from "react-bootstrap-icons";
import { SlidersHorizontal } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchMySalonsThunk, fetchAllStaffThunk } from "../../../middleware/branchOwner/branchOwner.thunk";
import { BoEmptyState, BoSearchInput, usePagination, BoPagination, BoTable, SoftBadge } from "../components/BranchOwnerUI";
import { JiraFilterMenu } from "../../../components/ui";
import type { JiraFilterField } from "../../../components/ui";
import type { Staff } from "../../../types/staff.types";

const STATUS_OPTIONS = [
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
];

const PERMISSIONS_OPTIONS = [
  { id: "customised", label: "Customised" },
  { id: "default", label: "Role default" },
];

interface StaffRow extends Staff {
  salonId: string;
  salonName: string;
  // Real Roles & Permissions fields (roles.name / staff_permission_overrides,
  // see staff.repository.ts's list() join) — not the legacy `role` column,
  // which is almost always "staff" and never reflects Manager vs Staff.
  role_id?: string | null;
  role_name?: string | null;
  has_overrides?: boolean;
}

export default function BranchOwnerStaffPermissionsPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const salons = useAppSelector((s) => s.branchOwner.salons);

  const [staffList, setStaffList] = useState<StaffRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [search, setSearch] = useState("");
  const [salonFilter, setSalonFilter] = useState<string[]>([]);
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [permsFilter, setPermsFilter] = useState<string[]>([]);

  useEffect(() => { dispatch(fetchMySalonsThunk()); }, [dispatch]);

  // One combined list across every assigned salon — the backend does the
  // per-salon fan-out itself now, so this is a single POST instead of one
  // GET per assigned salon fired from the browser.
  const loadStaff = () => {
    setLoaded(false);
    dispatch(fetchAllStaffThunk()).then((r) => {
      setStaffList(fetchAllStaffThunk.fulfilled.match(r) ? (r.payload as StaffRow[]) : []);
      setLoaded(true);
    });
  };
  useEffect(loadStaff, [dispatch]);

  const salonOptions = useMemo(() => salons.map((s) => ({ id: s.id, label: s.name })), [salons]);

  // The salon-configurable role names actually present across the loaded
  // staff (Manager/Staff by default, but an owner can rename/add roles per
  // salon in Settings > Roles & Permissions) — not a hardcoded list.
  const roleOptions = useMemo(() => {
    const seen = new Set<string>();
    staffList.forEach((m) => { if (m.role_name) seen.add(m.role_name); });
    return Array.from(seen).sort().map((name) => ({ id: name, label: name }));
  }, [staffList]);

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "salon", label: "Salon", options: salonOptions, searchable: true },
    { key: "role", label: "Role", options: roleOptions },
    { key: "status", label: "Status", options: STATUS_OPTIONS },
    { key: "permissions", label: "Permissions", options: PERMISSIONS_OPTIONS },
  ], [salonOptions, roleOptions]);

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
      if (roleFilter.length && !roleFilter.includes(m.role_name ?? "")) return false;
      const isActive = m.is_active !== false;
      if (statusFilter.length && !statusFilter.includes(isActive ? "active" : "inactive")) return false;
      if (permsFilter.length && !permsFilter.includes(m.has_overrides ? "customised" : "default")) return false;
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
        <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>Assign roles and customize per-staff permission overrides across every salon you manage.</p>
      </div>

      {loaded && staffList.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
          <JiraFilterMenu fields={filterFields} selected={filterMenuSelected} onApply={handleFiltersApply} triggerLabel="Filters" />
          <BoSearchInput value={search} onChange={setSearch} placeholder="Search staff, email or salon" />
        </div>
      )}

      <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: "0 0 4px" }}>Team Members</h2>
      <p style={{ margin: "0 0 12px", color: "#94a3b8", fontSize: 12.5 }}>Click Customize on any staff member to assign a role or set individual permissions.</p>

      {loaded && staffList.length === 0 ? (
        <BoEmptyState icon={<PersonBadge size={26} />} text="No staff members across your salons yet." />
      ) : loaded && filteredStaff.length === 0 ? (
        <BoEmptyState icon={<PersonBadge size={26} />} text="No staff members match the current filters." />
      ) : (
        <>
          <BoTable<StaffRow>
            loading={!loaded}
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
              { header: "Salon", key: "salonName", render: (member) => <span style={{ color: "#64748b" }}>{member.salonName}</span> },
              { header: "Contact", key: "email", render: (member) => <span style={{ color: "#64748b" }}>{member.email || member.designation || "—"}</span> },
              {
                header: "Role", key: "role_name",
                render: (member) => member.role_name
                  ? <SoftBadge variant={member.role_name === "Manager" ? "warning" : "info"}>{member.role_name}</SoftBadge>
                  : <SoftBadge variant="secondary">No role</SoftBadge>,
              },
              {
                header: "Status", key: "is_active",
                render: (member) => member.is_active === false
                  ? <SoftBadge variant="secondary">Inactive</SoftBadge>
                  : <SoftBadge variant="success">Active</SoftBadge>,
              },
              {
                header: "Permissions", key: "has_overrides",
                render: (member) => member.has_overrides
                  ? <SoftBadge variant="primary">Customised</SoftBadge>
                  : <span style={{ color: "#94a3b8", fontSize: 12.5 }}>Role default</span>,
              },
              {
                header: "Action", key: "action",
                render: (member) => (
                  <button
                    onClick={() => navigate(`/branch-owner/staff-permissions/${member.id}`)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 7,
                      border: member.has_overrides ? "none" : "1.5px solid #e2e8f0",
                      background: member.has_overrides ? "#6366f1" : "#fff",
                      color: member.has_overrides ? "#fff" : "#374151",
                      fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    <SlidersHorizontal size={13} />
                    {member.has_overrides ? "Edit" : "Customize"}
                  </button>
                ),
              },
            ]}
          />
          {loaded && <BoPagination {...staffPage} />}
        </>
      )}
    </div>
  );
}
