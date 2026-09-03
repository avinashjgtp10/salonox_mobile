import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building, PersonPlusFill, CalendarPlus, CashCoin, People,
  ArrowUpRight, ArrowDownRight, X, ExclamationTriangleFill, ClockHistory, ReceiptCutoff, ChevronRight,
} from "react-bootstrap-icons";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchBranchOwnerDashboardThunk, enterSalonThunk } from "../../../middleware/branchOwner/branchOwner.thunk";
import Dropdown from "../../../components/ui/Dropdown";
import Tabs from "../../../components/ui/Tabs";
import api from "../../../services/api/axios";
import { BRANCH_OWNER } from "../../../services/api/endpoints/branchOwner.endpoints";
import type { BranchOwnerRevenuePoint } from "../../../store/branchOwnerSlice";
import "../styles/BranchOwnerDashboardPage.scss";

type RevenuePeriod = "daily" | "weekly" | "monthly";
const REVENUE_PERIOD_TABS = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
];
const REVENUE_PERIOD_SUBTITLE: Record<RevenuePeriod, string> = {
  daily: "Last 14 days, across every salon you manage",
  weekly: "Last 12 weeks, across every salon you manage",
  monthly: "Last 12 months, across every salon you manage",
};

function Shimmer({ h = 110 }: { h?: number }) {
  return <div className="bod-shimmer" style={{ height: h }} />;
}

const fmt = (n: any) => n != null ? `₹${Number(n).toLocaleString("en-IN")}` : "—";
const fmtCompact = (n: number) => (n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(1)}K` : `₹${Math.round(n)}`);

// KPI card with the premium navy-on-white treatment: white surface, a
// colored icon chip, and a real trend badge (up/down) only when there's an
// actual previous-period figure to compare against — never a fabricated %.
// Icon background is the one legitimately per-instance color, so it stays inline.
function KpiCard({ label, value, sub, icon, bg, trendPct }: {
  label: string; value: string | number; sub?: string; icon: React.ReactNode; bg: string; trendPct?: number | null;
}) {
  return (
    <div className="bod-kpi-card">
      <div className="bod-kpi-top">
        <div className="bod-kpi-icon" style={{ background: bg }}>{icon}</div>
        {trendPct != null && (
          <span className={`bod-kpi-trend ${trendPct >= 0 ? "bod-kpi-trend--up" : "bod-kpi-trend--down"}`}>
            {trendPct >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            {Math.abs(trendPct).toFixed(0)}%
          </span>
        )}
      </div>
      <div>
        <div className="bod-kpi-label">{label}</div>
        <div className="bod-kpi-value">{value}</div>
        {sub && <div className="bod-kpi-sub">{sub}</div>}
      </div>
    </div>
  );
}

// Plain SVG line chart — 14 points is far below where a charting library
// earns its weight, and this keeps the bundle untouched.
function RevenueTrendChart({ points }: { points: { day: string; revenue: number }[] }) {
  const width = 640, height = 180, padX = 8, padY = 16;
  const max = Math.max(1, ...points.map((p) => p.revenue));
  const stepX = points.length > 1 ? (width - padX * 2) / (points.length - 1) : 0;

  const coords = points.map((p, i) => {
    const x = padX + i * stepX;
    const y = height - padY - (p.revenue / max) * (height - padY * 2);
    return { x, y, ...p };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${coords[coords.length - 1]?.x.toFixed(1)} ${height - padY} L ${coords[0]?.x.toFixed(1)} ${height - padY} Z`;

  const [hover, setHover] = useState<number | null>(null);
  const fmtDay = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  return (
    <svg viewBox={`0 0 ${width} ${height + 20}`} width="100%" height={height + 20} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id="bo-rev-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={padX} x2={width - padX} y1={height - padY - f * (height - padY * 2)} y2={height - padY - f * (height - padY * 2)} stroke="#f1f5f9" strokeWidth={1} />
      ))}
      <path d={areaPath} fill="url(#bo-rev-fill)" stroke="none" />
      <path d={linePath} fill="none" stroke="#6366f1" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {coords.map((c, i) => (
        <g key={c.day} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
          <circle cx={c.x} cy={c.y} r={hover === i ? 5 : 3} fill="#fff" stroke="#6366f1" strokeWidth={2} />
          <rect x={c.x - stepX / 2} y={0} width={stepX || width} height={height} fill="transparent" />
          {(i === 0 || i === coords.length - 1 || i % 3 === 0) && (
            <text x={c.x} y={height + 14} fill="#94a3b8" fontSize="9" textAnchor="middle">{fmtDay(c.day)}</text>
          )}
          {hover === i && (
            <g>
              <rect x={Math.min(Math.max(c.x - 38, 0), width - 76)} y={Math.max(c.y - 34, 0)} width={76} height={26} rx={6} fill="#0f172a" />
              <text x={Math.min(Math.max(c.x - 38, 0), width - 76) + 38} y={Math.max(c.y - 34, 0) + 17} fill="#fff" fontSize="10.5" textAnchor="middle" fontWeight={700}>
                {fmtCompact(c.revenue)}
              </text>
            </g>
          )}
        </g>
      ))}
    </svg>
  );
}

function SalonPickerModal({ salons, title, onSelect, onClose }: {
  salons: { id: string; name: string }[]; title: string; onSelect: (id: string) => void; onClose: () => void;
}) {
  const [salonId, setSalonId] = useState(salons[0]?.id ?? "");
  return (
    <div className="bod-modal-overlay" onClick={onClose}>
      <div className="bod-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bod-modal-head">
          <div className="bod-modal-title">{title}</div>
          <button className="bod-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <label className="bod-modal-label">Select salon</label>
        <Dropdown
          value={salonId}
          onChange={setSalonId}
          options={salons.map((s) => ({ id: s.id, name: s.name }))}
          searchable={false}
          className="bod-modal-dropdown"
        />
        <div className="bod-modal-actions">
          <button className="bod-btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="bod-btn-primary"
            onClick={() => salonId && onSelect(salonId)}
            disabled={!salonId}
          >
            Open Salon
          </button>
        </div>
      </div>
    </div>
  );
}

function AttentionRow({ icon, iconBg, iconColor, title, desc, count, onClick }: {
  icon: React.ReactNode; iconBg: string; iconColor: string; title: string; desc: string; count: number; onClick: () => void;
}) {
  return (
    <button className="bod-attention-row" onClick={onClick}>
      <div className="bod-attention-icon" style={{ background: iconBg, color: iconColor }}>{icon}</div>
      <div className="bod-attention-body">
        <div className="bod-attention-title">{title}</div>
        <div className="bod-attention-desc">{desc}</div>
      </div>
      <span className="bod-attention-count">{count}</span>
      <ChevronRight size={14} className="bod-attention-chevron" />
    </button>
  );
}

export default function BranchOwnerDashboardPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { stats, salons, revenueTrend: initialRevenueTrend, inventorySummary: inventory, attention, loading } = useAppSelector((s) => s.branchOwner);
  const [pickerAction, setPickerAction] = useState<null | "booking" | "payment">(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchBranchOwnerDashboardThunk());
  }, [dispatch]);

  // Revenue Overview's Daily/Weekly/Monthly toggle is served by its own
  // endpoint (getRevenueTrend) so switching it doesn't refetch the whole
  // dashboard — the initial "daily" view reuses what the dashboard call
  // already loaded, and only a period change triggers a fresh request.
  const [revenuePeriod, setRevenuePeriod] = useState<RevenuePeriod>("daily");
  const [revenueTrend, setRevenueTrend] = useState<BranchOwnerRevenuePoint[]>(initialRevenueTrend);
  const [priorPeriodRevenue, setPriorPeriodRevenue] = useState<number | null>(null);
  const [revenueTrendLoading, setRevenueTrendLoading] = useState(false);

  useEffect(() => { setRevenueTrend(initialRevenueTrend); }, [initialRevenueTrend]);

  const fetchRevenueTrend = useCallback(async (period: RevenuePeriod) => {
    try {
      setRevenueTrendLoading(true);
      const res = await api.get(BRANCH_OWNER.DASHBOARD_REVENUE_TREND(period));
      const data = res.data?.data ?? { points: [], priorPeriodRevenue: 0 };
      setRevenueTrend(data.points ?? []);
      setPriorPeriodRevenue(Number(data.priorPeriodRevenue ?? 0));
    } catch {
      // non-critical — chart just shows whatever it had before
    } finally {
      setRevenueTrendLoading(false);
    }
  }, []);

  function handleRevenuePeriodChange(key: string) {
    const period = key as RevenuePeriod;
    setRevenuePeriod(period);
    fetchRevenueTrend(period);
  }

  // Real period-over-period comparison: current window's total vs. the prior
  // window of the same length, both computed server-side. Daily's initial
  // paint (before any toggle click) still uses the dashboard payload's own
  // last-7-vs-prior-7 split so there's no need to wait on a second request
  // just to show a comparison badge.
  const revenueTrendPct = useMemo(() => {
    if (priorPeriodRevenue != null) {
      const current = revenueTrend.reduce((s, p) => s + p.revenue, 0);
      if (priorPeriodRevenue === 0) return null;
      return ((current - priorPeriodRevenue) / priorPeriodRevenue) * 100;
    }
    if (revenueTrend.length < 14) return null;
    const lastWeek = revenueTrend.slice(-7).reduce((s, p) => s + p.revenue, 0);
    const prevWeek = revenueTrend.slice(-14, -7).reduce((s, p) => s + p.revenue, 0);
    if (prevWeek === 0) return null;
    return ((lastWeek - prevWeek) / prevWeek) * 100;
  }, [revenueTrend, priorPeriodRevenue]);

  const revenueTrendComparisonLabel = revenuePeriod === "daily" ? "vs prior week" : revenuePeriod === "weekly" ? "vs prior 12 weeks" : "vs prior 12 months";

  async function handleEnterFromPicker(salonId: string) {
    setPickerAction(null);
    setOpeningId(salonId);
    const r = await dispatch(enterSalonThunk(salonId));
    if (enterSalonThunk.fulfilled.match(r)) {
      const { token, isOnboardingComplete = true } = r.payload as any;
      window.open(`${window.location.origin}/oauth/success?token=${token}&isOnboardingComplete=${isOnboardingComplete}`, "_blank");
    }
    setOpeningId(null);
  }

  const quickActions = [
    { key: "add-salon", label: "Add Salon", icon: <Building size={17} />, bg: "#eff6ff", color: "#2563eb", onClick: () => navigate("/branch-owner/settings/branches") },
    { key: "add-staff", label: "Add Staff", icon: <PersonPlusFill size={17} />, bg: "#faf5ff", color: "#7c3aed", onClick: () => navigate("/branch-owner/staff-permissions") },
    { key: "booking", label: "New Booking", icon: <CalendarPlus size={17} />, bg: "#f0fdf4", color: "#16a34a", onClick: () => setPickerAction("booking") },
    { key: "payment", label: "Record Payment", icon: <CashCoin size={17} />, bg: "#fff7ed", color: "#ea580c", onClick: () => setPickerAction("payment") },
  ];

  // Needs Attention — matches the mockup's exact 4 cards, each backed by a
  // real query (see getAttentionMetrics in branch-owner.repository.ts): no
  // fabricated proxies, only genuinely queryable counts.
  const attentionItems = [
    attention && attention.unpaid_invoices_count > 0 && {
      key: "unpaid-invoices", icon: <ReceiptCutoff size={15} />, iconBg: "#fef2f2", iconColor: "#dc2626",
      title: "Unpaid Invoices", desc: `${fmt(attention.unpaid_invoices_amount)} outstanding across ${attention.unpaid_invoices_count} invoice${attention.unpaid_invoices_count !== 1 ? "s" : ""}`,
      count: attention.unpaid_invoices_count, onClick: () => navigate("/branch-owner/payments"),
    },
    inventory && inventory.low_stock_count > 0 && {
      key: "low-stock", icon: <ExclamationTriangleFill size={15} />, iconBg: "#fff7ed", iconColor: "#ea580c",
      title: "Low Stock Items", desc: `${inventory.low_stock_count} product${inventory.low_stock_count !== 1 ? "s" : ""} running low`,
      count: inventory.low_stock_count, onClick: () => navigate("/branch-owner/inventory"),
    },
    attention && attention.pending_bookings > 0 && {
      key: "pending-bookings", icon: <ClockHistory size={15} />, iconBg: "#eff6ff", iconColor: "#2563eb",
      title: "Pending Bookings", desc: `${attention.pending_bookings} booking${attention.pending_bookings !== 1 ? "s" : ""} awaiting confirmation`,
      count: attention.pending_bookings, onClick: () => navigate("/branch-owner/salons"),
    },
    attention && attention.pending_staff_requests > 0 && {
      key: "staff-requests", icon: <PersonPlusFill size={15} />, iconBg: "#faf5ff", iconColor: "#7c3aed",
      title: "Staff Requests", desc: `${attention.pending_staff_requests} pending leave request${attention.pending_staff_requests !== 1 ? "s" : ""}`,
      count: attention.pending_staff_requests, onClick: () => navigate("/branch-owner/staff-permissions"),
    },
  ].filter(Boolean) as { key: string; icon: React.ReactNode; iconBg: string; iconColor: string; title: string; desc: string; count: number; onClick: () => void }[];

  return (
    <div className="bod-page">
      <div className="bod-header">
        <div>
          <h1 className="bod-title">Dashboard</h1>
        </div>
        <div className="bod-salon-count">
          <div className="bod-salon-count__dot" />
          <span className="bod-salon-count__label">{salons.length} salon{salons.length !== 1 ? "s" : ""} under you</span>
        </div>
      </div>

      <div className="bod-grid">

        {/* ── Main column ── */}
        <div className="bod-main-col">
          {/* Top KPI cards */}
          <div className="bod-kpi-row bod-kpi-row--five">
            {loading.stats ? [...Array(5)].map((_, i) => <Shimmer key={i} />) : (<>
              <KpiCard label="Total Salons" value={stats?.total_salons ?? salons.length}
                bg="#eff6ff" icon={<Building size={17} color="#2563eb" />}
              />
              <KpiCard label="Total Revenue" value={fmt(stats?.total_revenue)}
                bg="#f0fdf4" trendPct={revenueTrendPct}
                icon={<CashCoin size={17} color="#16a34a" />}
              />
              <KpiCard label="Total Staff" value={stats?.total_staff ?? "—"}
                bg="#faf5ff" icon={<PersonPlusFill size={17} color="#7c3aed" />}
              />
              <KpiCard label="Total Bookings" value={stats?.total_bookings ?? "—"}
                sub={stats?.bookings_today ? `${stats.bookings_today} today` : undefined}
                bg="#fff7ed" icon={<CalendarPlus size={17} color="#ea580c" />}
              />
              <KpiCard label="Total Customers" value={stats?.total_clients ?? "—"}
                bg="#ecfeff" icon={<People size={17} color="#0891b2" />}
              />
            </>)}
          </div>

          {/* Revenue trend */}
          <div className="bod-card bod-card--padded">
            <div className="bod-chart-head">
              <div>
                <h3 className="bod-chart-title">Revenue Overview</h3>
                <p className="bod-chart-subtitle">{REVENUE_PERIOD_SUBTITLE[revenuePeriod]}</p>
              </div>
              {revenueTrendPct != null && (
                <span className={`bod-chart-trend ${revenueTrendPct >= 0 ? "bod-chart-trend--up" : "bod-chart-trend--down"}`}>
                  {revenueTrendPct >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {Math.abs(revenueTrendPct).toFixed(0)}% {revenueTrendComparisonLabel}
                </span>
              )}
            </div>
            <Tabs
              tabs={REVENUE_PERIOD_TABS}
              activeKey={revenuePeriod}
              onChange={handleRevenuePeriodChange}
              className="bod-chart-period-tabs"
            />
            {loading.stats || revenueTrendLoading ? <Shimmer h={180} /> : revenueTrend.length === 0 ? (
              <div className="bod-empty">No revenue recorded in this window yet.</div>
            ) : (
              <RevenueTrendChart points={revenueTrend} />
            )}
          </div>
        </div>

        {/* ── Right rail ── */}
        <div className="bod-rail">
          {/* Quick Actions — 2-column tile grid, matching the mockup exactly */}
          <div className="bod-card bod-quick-actions-card">
            <h3 className="bod-card-title bod-quick-actions-title">Quick Actions</h3>
            <div className="bod-quick-actions-grid">
              {quickActions.map((a) => (
                <button key={a.key} className="bod-quick-action" onClick={a.onClick}>
                  <div className="bod-quick-action-icon" style={{ background: a.bg, color: a.color }}>
                    {a.icon}
                  </div>
                  <span className="bod-quick-action-label">{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Needs Attention */}
          <div className="bod-card">
            <div className="bod-attention-head">
              <h3 className="bod-card-title">Needs Attention</h3>
              {attentionItems.length > 0 && (
                <button className="bod-attention-viewall" onClick={() => navigate("/branch-owner/payments")}>View all</button>
              )}
            </div>
            {attentionItems.length === 0 ? (
              <div className="bod-attention-empty">Nothing needs your attention right now.</div>
            ) : (
              <div className="bod-attention-list">
                {attentionItems.map((item) => <AttentionRow key={item.key} {...item} />)}
              </div>
            )}
          </div>
        </div>
      </div>

      {pickerAction && (
        <SalonPickerModal
          salons={salons}
          title={pickerAction === "booking" ? "New Booking — choose a salon" : "Record Payment — choose a salon"}
          onSelect={handleEnterFromPicker}
          onClose={() => setPickerAction(null)}
        />
      )}
      {openingId && <div className="bod-toast">Opening salon…</div>}
    </div>
  );
}
