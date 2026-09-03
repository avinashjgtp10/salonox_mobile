import { useEffect, useMemo, useState } from "react";
import { Search, Building, CheckCircle, PersonFill, CashCoin } from "react-bootstrap-icons";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchMySalonsThunk, enterSalonThunk, resetSalonOwnerPasswordThunk, deleteSalonThunk } from "../../../middleware/branchOwner/branchOwner.thunk";
import { JiraFilterMenu } from "../../../components/ui";
import type { JiraFilterField } from "../../../components/ui";
import { usePagination, BoPagination } from "../components/BranchOwnerUI";

const STATUS_OPTIONS = [
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
];

const PLAN_OPTIONS = [
  { id: "has_plan", label: "Has Active Plan" },
  { id: "no_plan", label: "No Active Plan" },
];

function Badge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    active:   { bg: "#f0fdf4", text: "#16a34a" },
    inactive: { bg: "#fef2f2", text: "#dc2626" },
  };
  const c = map[status] ?? { bg: "#f8fafc", text: "#64748b" };
  return <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11.5, fontWeight: 600, background: c.bg, color: c.text, textTransform: "capitalize" }}>{status}</span>;
}

function formatCurrency(amount: number): string {
  return `₹${Number(amount ?? 0).toLocaleString("en-IN")}`;
}

function KpiCard({ icon, bg, label, value, sub }: {
  icon: React.ReactNode; bg: string; label: string; value: string | number; sub?: string;
}) {
  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: "14px 16px", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(15,23,42,0.04)", display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: "#64748b", fontSize: 11.5, fontWeight: 500 }}>{label}</div>
        <div style={{ color: "#0f172a", fontSize: 18, fontWeight: 800, lineHeight: 1.3 }}>{value}</div>
        {sub && <div style={{ color: "#94a3b8", fontSize: 10.5, marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}

function ModalShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: "28px 32px", maxWidth: 420, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}>
        {children}
      </div>
    </div>
  );
}

function ResetPasswordModal({ salonName, onConfirm, onCancel, loading, error }: {
  salonName: string; onConfirm: (password: string) => void; onCancel: () => void; loading: boolean; error: string;
}) {
  const [password, setPassword] = useState("");
  return (
    <ModalShell>
      <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 4 }}>Reset Password</div>
      <div style={{ color: "#64748b", fontSize: 12.5, marginBottom: 18 }}>Set a new password for the owner of <strong style={{ color: "#0f172a" }}>{salonName}</strong></div>
      <input type="text" value={password} placeholder="New password (min 6 characters)" autoFocus
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 8 }}
      />
      {error && <div style={{ color: "#dc2626", fontSize: 12.5, marginBottom: 8 }}>{error}</div>}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
        <button onClick={onCancel} disabled={loading}
          style={{ padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "1.5px solid #e2e8f0", background: "#fff", color: "#374151", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}>
          Cancel
        </button>
        <button onClick={() => onConfirm(password)} disabled={loading}
          style={{ padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none", background: "#6366f1", color: "#fff", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
          {loading ? "Resetting…" : "Reset Password"}
        </button>
      </div>
    </ModalShell>
  );
}

function ConfirmDeleteSalonModal({ salonName, onConfirm, onCancel, loading }: {
  salonName: string; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <ModalShell>
      <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 4 }}>Delete Salon</div>
      <p style={{ margin: "8px 0 20px", color: "#374151", fontSize: 13.5, lineHeight: 1.6 }}>
        Are you sure you want to delete <strong style={{ color: "#0f172a" }}>{salonName}</strong>? All associated data will be permanently removed. This action cannot be undone.
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onCancel} disabled={loading}
          style={{ padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "1.5px solid #e2e8f0", background: "#fff", color: "#374151", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}>
          Cancel
        </button>
        <button onClick={onConfirm} disabled={loading}
          style={{ padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none", background: "#dc2626", color: "#fff", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
          {loading ? "Deleting…" : "Delete Salon"}
        </button>
      </div>
    </ModalShell>
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
        <KpiCard icon={<Building size={16} color="#2563eb" />} bg="#eff6ff" label="Total Salons" value={kpis.total} />
        <KpiCard icon={<CheckCircle size={16} color="#16a34a" />} bg="#f0fdf4" label="Active Salons" value={kpis.activeCount} sub={`${kpis.total - kpis.activeCount} inactive`} />
        <KpiCard icon={<PersonFill size={16} color="#7c3aed" />} bg="#faf5ff" label="Total Staff" value={kpis.totalStaff} />
        <KpiCard icon={<CashCoin size={16} color="#ea580c" />} bg="#fff7ed" label="Revenue Today" value={formatCurrency(kpis.revenueToday)} />
        <KpiCard icon={<Building size={16} color="#dc2626" />} bg="#fef2f2" label="Without Active Plan" value={kpis.noPlanCount} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        <JiraFilterMenu fields={filterFields} selected={filterMenuSelected} onApply={handleFiltersApply} triggerLabel="Filters" />
        <div style={{ position: "relative", flex: "1 1 240px", maxWidth: 320 }}>
          <Search size={13} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input
            type="text"
            placeholder="Search salon or owner"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "9px 12px 9px 32px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box", background: "#fff" }}
          />
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "auto", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 960 }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              {["Salon", "Owner", "Staff", "Customers", "Today's Appointments", "Revenue", "Status", "Actions"].map((h) => (
                <th key={h} style={{ padding: "11px 16px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(4)].map((_, i) => (
                <tr key={i} style={{ borderTop: "1px solid #f1f5f9" }}>
                  {[...Array(8)].map((_, j) => (
                    <td key={j} style={{ padding: "14px 16px" }}>
                      <div style={{ height: 13, borderRadius: 4, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "bo-shimmer 1.4s infinite" }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filteredSalons.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: "48px 0", textAlign: "center", color: "#94a3b8", fontSize: 13.5 }}>{salons.length === 0 ? "No salons assigned yet" : "No salons match these filters"}</td></tr>
            ) : (
              salonsPage.pageItems.map((s) => (
                <tr key={s.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "13px 16px", color: "#0f172a", fontWeight: 700 }}>{s.name}</td>
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ color: "#374151", fontSize: 13 }}>{s.owner_name || "—"}</div>
                    <div style={{ color: "#94a3b8", fontSize: 11.5 }}>{s.owner_email}</div>
                  </td>
                  <td style={{ padding: "13px 16px", color: "#374151" }}>{s.staff_count ?? 0}</td>
                  <td style={{ padding: "13px 16px", color: "#374151" }}>{(s.client_count ?? 0).toLocaleString("en-IN")}</td>
                  <td style={{ padding: "13px 16px", color: "#374151" }}>{s.appointments_today ?? 0}</td>
                  <td style={{ padding: "13px 16px", color: "#374151" }}>{formatCurrency(s.revenue_today ?? 0)}</td>
                  <td style={{ padding: "13px 16px" }}><Badge status={s.status} /></td>
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button onClick={() => handleEnter(s.id)} disabled={enteringId === s.id}
                        style={{ padding: "5px 11px", borderRadius: 7, fontSize: 11.5, fontWeight: 600, border: "1.5px solid #6366f1", cursor: enteringId === s.id ? "not-allowed" : "pointer", background: "#eef2ff", color: "#6366f1", opacity: enteringId === s.id ? 0.5 : 1 }}>
                        {enteringId === s.id ? "Opening…" : "Enter Salon"}
                      </button>
                      <button onClick={() => { setResetErr(""); setResetTarget({ id: s.id, name: s.name }); }}
                        style={{ padding: "5px 11px", borderRadius: 7, fontSize: 11.5, fontWeight: 600, border: "1.5px solid #d97706", cursor: "pointer", background: "#fffbeb", color: "#d97706" }}>
                        Reset Password
                      </button>
                      <button onClick={() => setDeleteTarget({ id: s.id, name: s.name })}
                        style={{ padding: "5px 11px", borderRadius: 7, fontSize: 11.5, fontWeight: 600, border: "1.5px solid #dc2626", cursor: "pointer", background: "#fef2f2", color: "#dc2626" }}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <BoPagination {...salonsPage} />
      </div>
      <style>{`@keyframes bo-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>

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
        <ConfirmDeleteSalonModal
          salonName={deleteTarget.name}
          loading={deleteLoading}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
