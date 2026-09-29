import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Building, CheckCircle, PersonFill, CashCoin, Search, GeoAlt, CalendarEvent, EnvelopeAt } from "react-bootstrap-icons";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchMySalonsThunk, enterSalonThunk, resetSalonOwnerPasswordThunk, deleteSalonThunk } from "../../../middleware/branchOwner/branchOwner.thunk";
import type { BranchOwnerSalon } from "../../../store/branchOwnerSlice";
import { JiraFilterMenu, Button, Modal, ConfirmDialog, Input, Badge } from "../../../components/ui";
import type { JiraFilterField } from "../../../components/ui";
import { StatTile, StatusBadge, usePagination, BoPagination } from "../components/BranchOwnerUI";

// ── Super Admin table look-and-feel, reproduced exactly ─────────────────────
// components/ui's Table/Badge (Bootstrap solid pills, zebra rows) can't hit
// Super Admin's soft-pastel/plain-table look without fighting Bootstrap's
// own CSS, so this table is bespoke-styled (matching SalonsPage.tsx's own
// inline styles 1:1: header bg #f8fafc, row hover #f8fafc, soft pill
// badges, three-dot ActionsMenu) rather than reused from the shared kit.
function SoftBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    active: { bg: "#f0fdf4", text: "#16a34a" },
    inactive: { bg: "#fef2f2", text: "#dc2626" },
  };
  const c = map[status] ?? { bg: "#f8fafc", text: "#64748b" };
  return <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11.5, fontWeight: 600, background: c.bg, color: c.text, textTransform: "capitalize" }}>{status}</span>;
}

function daysRemaining(iso?: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

type MenuAction = { label: string; color: string; bg: string; onClick: () => void; disabled?: boolean };

function ActionsMenu({ actions, rowId, openId, setOpenId }: { actions: MenuAction[]; rowId: string; openId: string | null; setOpenId: (id: string | null) => void }) {
  const open = openId === rowId;
  const [hov, setHov] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpenId(null);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open, setOpenId]);

  function toggle() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 4, left: rect.right - 170 });
    }
    setOpenId(open ? null : rowId);
  }

  return (
    <div style={{ display: "inline-block" }} onClick={(e) => e.stopPropagation()}>
      <button
        ref={btnRef}
        onClick={toggle}
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        title="Actions"
        style={{ width: 30, height: 30, borderRadius: 7, border: "1.5px solid #e2e8f0", background: hov || open ? "#f8fafc" : "#fff", color: "#374151", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>
      </button>
      {open && coords && createPortal(
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ position: "fixed", top: coords.top, left: coords.left, zIndex: 10000, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 170, padding: 6, display: "flex", flexDirection: "column", gap: 3 }}>
          {actions.map((a, i) => (
            <button key={i}
              onClick={() => { setOpenId(null); a.onClick(); }}
              disabled={a.disabled}
              style={{ display: "flex", alignItems: "center", padding: "8px 10px", borderRadius: 7, border: "none", background: "transparent", color: a.color, fontSize: 12.5, fontWeight: 600, cursor: a.disabled ? "not-allowed" : "pointer", opacity: a.disabled ? 0.5 : 1, textAlign: "left", transition: "background 0.12s" }}
              onMouseEnter={(e) => !a.disabled && (e.currentTarget.style.background = a.bg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              {a.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

function DateRemainingCell({ iso }: { iso?: string | null }) {
  const days = daysRemaining(iso);
  if (days === null) return <span style={{ color: "#cbd5e1" }}>—</span>;
  if (days < 0) return <span style={{ color: "#dc2626", fontWeight: 600, fontSize: 12.5 }}>Expired {fmtDateShort(iso)}</span>;
  if (days === 0) return <span style={{ color: "#d97706", fontWeight: 700, fontSize: 12.5 }}>Expires today</span>;
  if (days <= 7) return <span style={{ color: "#d97706", fontWeight: 700, fontSize: 12.5 }}>{days} day{days !== 1 ? "s" : ""} left</span>;
  return <span style={{ color: "#374151", fontSize: 12.5 }}>{days} days left</span>;
}

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

const fmtDateShort = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

// Plan status is derived from the salon's actual subscription expiry date
// (plan_expires_at, from the latest row in the Razorpay-hosted
// `subscriptions` table — see branch-owner.repository.ts::getMySalons),
// not from `has_active_plan` alone or the salon's own active/inactive flag,
// so an expired plan always reads "Expired on {date}" regardless of either.
// Uses the same shared Badge component (and success/danger/secondary
// variant palette) as StatusBadge above, so it reads as the same pill style
// as every other badge on this page instead of a mismatched solid block.
function PlanStatusBadge({ salon }: { salon: BranchOwnerSalon }) {
  if (!salon.plan_expires_at) {
    return <Badge variant="secondary">No Plan</Badge>;
  }
  const expired = new Date(salon.plan_expires_at).getTime() < Date.now();
  if (expired) {
    return <Badge variant="danger">Expired {fmtDateShort(salon.plan_expires_at)}</Badge>;
  }
  return <Badge variant="success">Active — expires {fmtDateShort(salon.plan_expires_at)}</Badge>;
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

// Shown when a salon row is clicked — the same details already in the table
// (name, owner, status, staff/customers/appointments/revenue), just laid out
// as a single-salon detail card instead of scanning across a row, plus the
// same actions the row's own buttons offer.
function SalonDetailModal({ salon, onClose, onEnter, entering, onResetPassword, onDelete }: {
  salon: BranchOwnerSalon;
  onClose: () => void;
  onEnter: () => void;
  entering: boolean;
  onResetPassword: () => void;
  onDelete: () => void;
}) {
  return (
    <Modal show title={salon.name} onClose={onClose} size="lg"
      footer={(
        <>
          <Button variant="outline-danger" onClick={onDelete}>Delete</Button>
          <Button variant="outline-warning" onClick={onResetPassword}>Reset Password</Button>
          <Button variant="primary" loading={entering} onClick={onEnter}>{entering ? "Opening…" : "Enter Salon"}</Button>
        </>
      )}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <StatusBadge status={salon.status} />
        <PlanStatusBadge salon={salon} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: "#374151" }}>
          <PersonFill size={13} color="#9ca3af" />
          <span>{salon.owner_name || "—"}</span>
        </div>
        {salon.owner_email && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: "#374151" }}>
            <EnvelopeAt size={13} color="#9ca3af" />
            <span>{salon.owner_email}</span>
          </div>
        )}
        {salon.location && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: "#374151" }}>
            <GeoAlt size={13} color="#9ca3af" />
            <span>{salon.location}</span>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: "#374151" }}>
          <CalendarEvent size={13} color="#9ca3af" />
          <span>Onboarded {salon.created_at ? new Date(salon.created_at).toLocaleDateString("en-IN") : "—"}</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
        <StatTile icon={<PersonFill size={16} />} label="Staff" value={salon.staff_count ?? 0} />
        <StatTile icon={<PersonFill size={16} />} label="Customers" value={(salon.client_count ?? 0).toLocaleString("en-IN")} />
        <StatTile icon={<CalendarEvent size={16} />} label="Today's Appointments" value={salon.appointments_today ?? 0} />
        <StatTile icon={<CashCoin size={16} />} label="Revenue Today" value={formatCurrency(salon.revenue_today ?? 0)} />
      </div>
    </Modal>
  );
}

export default function BranchOwnerSalonsPage() {
  const dispatch = useAppDispatch();
  const { salons, loading: loadingState } = useAppSelector((s) => s.branchOwner);
  const loading = loadingState.salons;
  const [enteringId, setEnteringId] = useState<string | null>(null);
  const [selectedSalon, setSelectedSalon] = useState<BranchOwnerSalon | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [resetTarget, setResetTarget] = useState<{ id: string; name: string } | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetErr, setResetErr] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [salonFilter, setSalonFilter] = useState<string[]>([]);
  const [planFilter, setPlanFilter] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { dispatch(fetchMySalonsThunk()); }, [dispatch]);

  // Same Ctrl/Cmd + / focus shortcut as the Reports page's header search —
  // ported alongside its look, not just its styling.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
    if (!deleteTarget || deleteLoading) return;
    setDeleteLoading(true);
    const r = await dispatch(deleteSalonThunk(deleteTarget.id));
    setDeleteLoading(false);
    if (deleteSalonThunk.fulfilled.match(r)) {
      setDeleteTarget(null);
    }
  }

  return (
    <div style={{ padding: "28px 28px 40px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      {/* Header — same layout/styling as the Reports page's own header
          (icon badge + title/subtitle on the left, search on the right
          with the same Ctrl+/ shortcut hint), see ReportsPage.scss's
          .rp-header/.rp-search-* rules. */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: "#111827", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Building size={20} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" }}>My Salons</h1>
            <p style={{ margin: "2px 0 0", color: "#6b7280", fontSize: 13 }}>{filteredSalons.length} salon{filteredSalons.length !== 1 ? "s" : ""} assigned to you</p>
          </div>
        </div>
        <div style={{ position: "relative", width: 320, maxWidth: "100%" }}>
          <Search size={14} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search salon or owner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "9px 68px 9px 38px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13.5, color: "#111827", background: "#fff", outline: "none", boxSizing: "border-box" }}
          />
          <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 10.5, fontWeight: 600, color: "#9ca3af", background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 5, padding: "2px 6px", pointerEvents: "none" }}>
            Ctrl + /
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 20 }}>
        <StatTile icon={<Building size={16} />} label="Total Salons" value={loading ? "—" : kpis.total} />
        <StatTile icon={<CheckCircle size={16} />} label="Active Salons" value={loading ? "—" : kpis.activeCount} sub={loading ? undefined : `${kpis.total - kpis.activeCount} inactive`} />
        <StatTile icon={<PersonFill size={16} />} label="Total Staff" value={loading ? "—" : kpis.totalStaff} />
        <StatTile icon={<CashCoin size={16} />} label="Revenue Today" value={loading ? "—" : formatCurrency(kpis.revenueToday)} />
        <StatTile icon={<Building size={16} />} label="Without Active Plan" value={loading ? "—" : kpis.noPlanCount} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        <JiraFilterMenu fields={filterFields} selected={filterMenuSelected} onApply={handleFiltersApply} triggerLabel="Filters" />
      </div>

      <div className="bo-table-scroll" style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 1100 }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              {["Salon", "Owner", "Plan", "Date Remaining", "Staff", "Clients", "Revenue", "Created Date", "Status", "Actions"].map((h) => (
                <th key={h} style={{ padding: "11px 16px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i} style={{ borderTop: "1px solid #f1f5f9" }}>
                  {[...Array(10)].map((_, j) => (
                    <td key={j} style={{ padding: "14px 16px" }}>
                      <div style={{ height: 13, borderRadius: 4, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "bo-sal-shimmer 1.4s infinite" }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : salonsPage.pageItems.length === 0 ? (
              <tr><td colSpan={10} style={{ padding: "48px 0", textAlign: "center", color: "#94a3b8", fontSize: 13.5 }}>
                {salons.length === 0 ? "No salons assigned yet" : "No salons match these filters"}
              </td></tr>
            ) : (
              salonsPage.pageItems.map((s) => (
                <tr key={s.id} style={{ borderTop: "1px solid #f1f5f9", cursor: "pointer" }}
                  onClick={() => setSelectedSalon(s)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}>
                  <td style={{ padding: "13px 16px" }}>
                    <span style={{ color: "#0f172a", fontWeight: 700, fontSize: 13.5 }}>{s.name}</span>
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ color: "#374151", fontSize: 13 }}>{s.owner_name || "—"}</div>
                    <div style={{ color: "#94a3b8", fontSize: 11.5 }}>{s.owner_email}</div>
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    {s.plan_name ? <span style={{ color: "#6366f1", fontWeight: 600, fontSize: 12.5 }}>{s.plan_name}</span> : <span style={{ color: "#cbd5e1" }}>—</span>}
                  </td>
                  <td style={{ padding: "13px 16px", whiteSpace: "nowrap" }}>
                    <DateRemainingCell iso={s.plan_expires_at} />
                  </td>
                  <td style={{ padding: "13px 16px", color: "#374151" }}>{s.staff_count ?? 0}</td>
                  <td style={{ padding: "13px 16px", color: "#374151" }}>{(s.client_count ?? 0).toLocaleString("en-IN")}</td>
                  <td style={{ padding: "13px 16px", color: "#16a34a", fontWeight: 700 }}>{formatCurrency(s.revenue_today ?? 0)}</td>
                  <td style={{ padding: "13px 16px", color: "#374151", whiteSpace: "nowrap" }}>{fmtDateShort(s.created_at)}</td>
                  <td style={{ padding: "13px 16px" }}><SoftBadge status={s.status} /></td>
                  <td style={{ padding: "13px 16px" }} onClick={(e) => e.stopPropagation()}>
                    <ActionsMenu
                      rowId={s.id}
                      openId={openMenuId}
                      setOpenId={setOpenMenuId}
                      actions={[
                        { label: enteringId === s.id ? "Opening…" : "Enter Salon", color: "#6366f1", bg: "#eef2ff", onClick: () => handleEnter(s.id), disabled: enteringId === s.id },
                        { label: "Reset Password", color: "#d97706", bg: "#fffbeb", onClick: () => { setResetErr(""); setResetTarget({ id: s.id, name: s.name }); } },
                        { label: "Delete", color: "#dc2626", bg: "#fef2f2", onClick: () => setDeleteTarget({ id: s.id, name: s.name }) },
                      ]}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <BoPagination {...salonsPage} />
      </div>

      <style>{`@keyframes bo-sal-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>

      {selectedSalon && (
        <SalonDetailModal
          salon={selectedSalon}
          entering={enteringId === selectedSalon.id}
          onClose={() => setSelectedSalon(null)}
          onEnter={() => handleEnter(selectedSalon.id)}
          onResetPassword={() => {
            setResetErr("");
            setResetTarget({ id: selectedSalon.id, name: selectedSalon.name });
            setSelectedSalon(null);
          }}
          onDelete={() => {
            setDeleteTarget({ id: selectedSalon.id, name: selectedSalon.name });
            setSelectedSalon(null);
          }}
        />
      )}

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
          message={<>Are you sure you want to delete <strong>{deleteTarget.name}</strong>? All associated data will be permanently removed. This action cannot be undone.</>}
          confirmLabel={deleteLoading ? "Deleting…" : "Delete Salon"}
          danger
          confirmDisabled={deleteLoading}
          onConfirm={handleDelete}
          onCancel={() => !deleteLoading && setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
