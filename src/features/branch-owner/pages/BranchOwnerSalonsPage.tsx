import { useEffect, useMemo, useState } from "react";
import { Building, CheckCircle, PersonFill, CashCoin } from "react-bootstrap-icons";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchMySalonsThunk, enterSalonThunk, resetSalonOwnerPasswordThunk, deleteSalonThunk } from "../../../middleware/branchOwner/branchOwner.thunk";
import type { BranchOwnerSalon } from "../../../store/branchOwnerSlice";
import { JiraFilterMenu, Button, Table, Modal, ConfirmDialog, Input, Card } from "../../../components/ui";
import type { JiraFilterField } from "../../../components/ui";
import { StatTile, StatusBadge, Shimmer, BoSearchInput, usePagination, BoPagination } from "../components/BranchOwnerUI";

const STATUS_OPTIONS = [
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
];

const PLAN_OPTIONS = [
  { id: "has_plan", label: "Has Active Plan" },
  { id: "no_plan", label: "No Active Plan" },
];

function formatCurrency(amount: number): string {
  return `₹${Number(amount ?? 0).toLocaleString("en-IN")}`;
}

function ResetPasswordModal({ salonName, onConfirm, onCancel, loading, error }: {
  salonName: string; onConfirm: (password: string) => void; onCancel: () => void; loading: boolean; error: string;
}) {
  const [password, setPassword] = useState("");
  return (
    <Modal show title="Reset Password" onClose={onCancel} size="sm" disableBackdropClose={loading}
      footer={(
        <>
          <Button variant="outline-secondary" onClick={onCancel} disabled={loading}>Cancel</Button>
          <Button variant="primary" onClick={() => onConfirm(password)} loading={loading}>Reset Password</Button>
        </>
      )}
    >
      <p className="text-muted mb-3" style={{ fontSize: 13 }}>
        Set a new password for the owner of <strong className="text-dark">{salonName}</strong>
      </p>
      <Input
        type="text"
        value={password}
        placeholder="New password (min 6 characters)"
        autoFocus
        error={error}
        onChange={(e) => setPassword(e.target.value)}
      />
    </Modal>
  );
}

export default function BranchOwnerSalonsPage() {
  const dispatch = useAppDispatch();
  const { salons, loading: loadingState } = useAppSelector((s) => s.branchOwner);
  const loading = loadingState.salons;
  const [enteringId, setEnteringId] = useState<string | null>(null);

  const [resetTarget, setResetTarget] = useState<{ id: string; name: string } | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetErr, setResetErr] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [salonFilter, setSalonFilter] = useState<string[]>([]);
  const [planFilter, setPlanFilter] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => { dispatch(fetchMySalonsThunk()); }, [dispatch]);

  // Salon name is always populated (unlike city, which most salons in this
  // dataset never set), so it's a reliably useful multi-select filter.
  const salonOptions = useMemo(
    () => salons.map((s) => ({ id: s.id, label: s.name })),
    [salons]
  );

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "status", label: "Status", options: STATUS_OPTIONS },
    { key: "salon", label: "Salon", options: salonOptions, searchable: true },
    { key: "plan", label: "Subscription", options: PLAN_OPTIONS },
  ], [salonOptions]);

  const filterMenuSelected = useMemo(() => ({ status: statusFilter, salon: salonFilter, plan: planFilter }), [statusFilter, salonFilter, planFilter]);

  const handleFiltersApply = (next: Record<string, string[]>) => {
    setStatusFilter(next.status ?? []);
    setSalonFilter(next.salon ?? []);
    setPlanFilter(next.plan ?? []);
  };

  const filteredSalons = useMemo(() => {
    const q = search.trim().toLowerCase();
    return salons.filter((s) => {
      if (statusFilter.length && !statusFilter.includes(s.status)) return false;
      if (salonFilter.length && !salonFilter.includes(s.id)) return false;
      if (planFilter.length) {
        const wantsPlan = planFilter.includes("has_plan");
        const wantsNoPlan = planFilter.includes("no_plan");
        if (wantsPlan && !wantsNoPlan && !s.has_active_plan) return false;
        if (wantsNoPlan && !wantsPlan && s.has_active_plan) return false;
      }
      if (q) {
        const haystack = `${s.name} ${s.owner_name ?? ""} ${s.owner_email ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [salons, statusFilter, salonFilter, planFilter, search]);

  const kpis = useMemo(() => {
    const activeCount = salons.filter((s) => s.status === "active").length;
    const totalStaff = salons.reduce((sum, s) => sum + (s.staff_count ?? 0), 0);
    const revenueToday = salons.reduce((sum, s) => sum + (s.revenue_today ?? 0), 0);
    const noPlanCount = salons.filter((s) => !s.has_active_plan).length;
    return { total: salons.length, activeCount, totalStaff, revenueToday, noPlanCount };
  }, [salons]);

  const salonsPage = usePagination(filteredSalons, 10);

  async function handleEnter(salonId: string) {
    setEnteringId(salonId);
    const r = await dispatch(enterSalonThunk(salonId));
    if (enterSalonThunk.fulfilled.match(r)) {
      const { token, isOnboardingComplete = true } = r.payload as any;
      window.open(`${window.location.origin}/oauth/success?token=${token}&isOnboardingComplete=${isOnboardingComplete}`, "_blank");
    }
    setEnteringId(null);
  }

  async function handleResetPassword(password: string) {
    if (!resetTarget) return;
    if (password.length < 6) { setResetErr("Password must be at least 6 characters."); return; }
    setResetErr(""); setResetLoading(true);
    const r = await dispatch(resetSalonOwnerPasswordThunk({ salonId: resetTarget.id, password }));
    setResetLoading(false);
    if (resetSalonOwnerPasswordThunk.fulfilled.match(r)) {
      setResetTarget(null);
    } else {
      setResetErr((r.payload as string) || "Failed to reset password.");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const r = await dispatch(deleteSalonThunk(deleteTarget.id));
    setDeleteLoading(false);
    if (deleteSalonThunk.fulfilled.match(r)) {
      setDeleteTarget(null);
    }
  }

  return (
    <div style={{ padding: "28px 28px 40px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>My Salons</h1>
        <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>{filteredSalons.length} salon{filteredSalons.length !== 1 ? "s" : ""} assigned to you</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 20 }}>
        {loading ? [...Array(5)].map((_, i) => <Shimmer key={i} h={72} />) : (<>
          <StatTile icon={<Building size={16} />} label="Total Salons" value={kpis.total} variantIndex={0} />
          <StatTile icon={<CheckCircle size={16} />} label="Active Salons" value={kpis.activeCount} variantIndex={1} sub={`${kpis.total - kpis.activeCount} inactive`} />
          <StatTile icon={<PersonFill size={16} />} label="Total Staff" value={kpis.totalStaff} variantIndex={2} />
          <StatTile icon={<CashCoin size={16} />} label="Revenue Today" value={formatCurrency(kpis.revenueToday)} variantIndex={3} />
          <StatTile icon={<Building size={16} />} label="Without Active Plan" value={kpis.noPlanCount} variantIndex={4} />
        </>)}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        <JiraFilterMenu fields={filterFields} selected={filterMenuSelected} onApply={handleFiltersApply} triggerLabel="Filters" />
        <BoSearchInput value={search} onChange={setSearch} placeholder="Search salon or owner" />
      </div>

      <Card noPadding shadow="sm">
        <Table<BranchOwnerSalon>
          loading={loading}
          data={salonsPage.pageItems}
          emptyMessage={salons.length === 0 ? "No salons assigned yet" : "No salons match these filters"}
          columns={[
            { header: "Salon", key: "name", render: (s) => <span className="fw-bold text-dark">{s.name}</span> },
            {
              header: "Owner", key: "owner_name",
              render: (s) => (
                <div>
                  <div className="text-dark" style={{ fontSize: 13 }}>{s.owner_name || "—"}</div>
                  <div className="text-muted" style={{ fontSize: 11.5 }}>{s.owner_email}</div>
                </div>
              ),
            },
            { header: "Staff", key: "staff_count", render: (s) => s.staff_count ?? 0 },
            { header: "Customers", key: "client_count", render: (s) => (s.client_count ?? 0).toLocaleString("en-IN") },
            { header: "Today's Appointments", key: "appointments_today", render: (s) => s.appointments_today ?? 0 },
            { header: "Revenue", key: "revenue_today", render: (s) => formatCurrency(s.revenue_today ?? 0) },
            { header: "Status", key: "status", render: (s) => <StatusBadge status={s.status} /> },
            {
              header: "Actions", key: "actions",
              render: (s) => (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <Button size="sm" variant="outline-primary" loading={enteringId === s.id} onClick={() => handleEnter(s.id)}>
                    {enteringId === s.id ? "Opening…" : "Enter Salon"}
                  </Button>
                  <Button size="sm" variant="outline-warning" onClick={() => { setResetErr(""); setResetTarget({ id: s.id, name: s.name }); }}>
                    Reset Password
                  </Button>
                  <Button size="sm" variant="outline-danger" onClick={() => setDeleteTarget({ id: s.id, name: s.name })}>
                    Delete
                  </Button>
                </div>
              ),
            },
          ]}
        />
        <BoPagination {...salonsPage} />
      </Card>

      {resetTarget && (
        <ResetPasswordModal
          salonName={resetTarget.name}
          loading={resetLoading}
          error={resetErr}
          onConfirm={handleResetPassword}
          onCancel={() => setResetTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Salon"
          message={`Are you sure you want to delete ${deleteTarget.name}? All associated data will be permanently removed. This action cannot be undone.`}
          confirmLabel={deleteLoading ? "Deleting…" : "Delete Salon"}
          danger
          onConfirm={handleDelete}
          onCancel={() => !deleteLoading && setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
