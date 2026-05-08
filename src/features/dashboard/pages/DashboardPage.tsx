import { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/DashboardPage.scss";
import { useNavigate } from "react-router-dom";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  CalendarCheck,
  CurrencyRupee,
  People,
  Scissors,
  ArrowUpRight,
  ArrowDownRight,
  Lightning,
  ClockHistory,
  PersonPlus,
  CartPlus,
  Megaphone,
  ChevronRight,
  ChevronLeft,
  StarFill,
  CircleFill,
  ExclamationTriangleFill,
  ArrowRepeat,
  ThreeDots,
} from "react-bootstrap-icons";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import {
  fetchDashboardSummaryThunk,
  fetchTodayAppointmentsThunk,
  fetchRevenueChartThunk,
  fetchTopStaffThunk,
} from "../../../middleware/dashboard/dashboard.thunk";
import { fetchServicesThunk } from "../../../middleware/services/services.thunk";
import type { TodayAppointment } from "../../../types/dashboard.types";

// ─── Constants ────────────────────────────────────────────────────────────────



const SVC_CHART_COLORS = [
  "#7c6cf2",
  "#4f46e5",
  "#10b981",
  "#f97316",
  "#60a5fa",
  "#f472b6",
  "#eab308",
  "#ef4444",
];

const quickActions = [
  { label: "New Appointment", icon: <CalendarCheck size={22} />, path: "/dashboard/calendar", color: "#111827" },
  { label: "Add Client",      icon: <PersonPlus size={22} />,    path: "/dashboard/clients/add", color: "#3b82f6" },
  { label: "Quick Sale",      icon: <CartPlus size={22} />,      path: "/dashboard/sales",       color: "#10b981" },
  { label: "Campaign",        icon: <Megaphone size={22} />,     path: "/dashboard/marketing",   color: "#8b5cf6" },
];

const PAGE_SIZE = 5;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

function fmt(n?: number) {
  return n != null ? `₹${n.toLocaleString("en-IN")}` : "—";
}

function fmtChange(n?: number) {
  if (n == null) return null;
  const abs = Math.abs(n).toFixed(1);
  return { label: `${n >= 0 ? "+" : ""}${abs}%`, up: n >= 0 };
}

/** Normalise appointment row regardless of field naming from backend */
function normalise(appt: TodayAppointment) {
  return {
    id:      appt.id,
    client:  appt.clientName  ?? appt.client  ?? "—",
    service: appt.serviceName ?? appt.service ?? "—",
    staff:   appt.staffName   ?? appt.staff   ?? "—",
    time:    appt.startTime   ?? appt.time    ?? "—",
    status:  appt.status,
    amount:  appt.amount      ?? appt.price   ?? 0,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const RevenueTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="db-tooltip">
        <p className="db-tooltip-label">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color, margin: "2px 0", fontSize: 13 }}>
            {p.name}: ₹{p.value?.toLocaleString("en-IN")}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const ApptTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="db-tooltip">
        <p className="db-tooltip-label">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color, margin: "2px 0", fontSize: 13 }}>
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; cls: string }> = {
    completed:    { label: "Completed",   cls: "db-badge-success" },
    "in-progress":{ label: "In Progress", cls: "db-badge-info"    },
    upcoming:     { label: "Upcoming",    cls: "db-badge-warning" },
    cancelled:    { label: "Cancelled",   cls: "db-badge-danger"  },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "" };
  return <span className={`db-badge ${cls}`}>{label}</span>;
};

const SectionError = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="db-section-error">
    <ExclamationTriangleFill size={14} className="me-1" />
    {message}
    <button className="db-retry-btn" onClick={onRetry}>
      <ArrowRepeat size={13} className="me-1" /> Retry
    </button>
  </div>
);

const SectionSpinner = () => (
  <div className="db-section-spinner">
    <div className="spinner-border spinner-border-sm text-secondary" role="status">
      <span className="visually-hidden">Loading…</span>
    </div>
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate   = useNavigate();
  const dispatch   = useAppDispatch();
  const [apptPage, setApptPage] = useState(1);

  const {
    summary,
    loading: { summary: loadingSummary, appointments: loadingAppts, revenue: loadingRevenue, topStaff: loadingStaff },
    error:   { summary: errSummary,    appointments: errAppts,      revenue: errRevenue,     topStaff: errStaff },
    appointments,
    revenue,
    topStaff,
  } = useAppSelector((s) => s.dashboard);

  const { items: allServices, loading: svcLoading, error: svcError } =
    useAppSelector((s) => s.services);
  const loadingServices = svcLoading.fetchAll;
  const errServices     = svcError;

  const fetchAll = () => {
    dispatch(fetchDashboardSummaryThunk());
    dispatch(fetchTodayAppointmentsThunk());
    dispatch(fetchRevenueChartThunk());
    dispatch(fetchTopStaffThunk());
    dispatch(fetchServicesThunk());
  };

  useEffect(() => { fetchAll(); }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // Reset page when appointments list changes
  useEffect(() => { setApptPage(1); }, [appointments.length]);

  // ── Derived ──────────────────────────────────────────────────────────────

  const normAppts       = appointments.map(normalise);
  const totalApptPages  = Math.max(1, Math.ceil(normAppts.length / PAGE_SIZE));
  const pagedAppts      = normAppts.slice((apptPage - 1) * PAGE_SIZE, apptPage * PAGE_SIZE);

  // Show only active services, cap at 6 for the dashboard card
  const activeServices = allServices.filter((s) => s.is_active).slice(0, 6);

  const kpiCards = [
    {
      label: "Total Revenue",
      value: fmt(summary?.totalRevenue),
      change: fmtChange(summary?.revenueChange),
      sub: "vs last month",
      icon: <CurrencyRupee size={20} />,
      color: "#10b981",
      bg: "#f0fdf4",
    },
    {
      label: "Appointments",
      value: summary?.totalAppointments?.toLocaleString("en-IN") ?? "—",
      change: fmtChange(summary?.appointmentsChange),
      sub: "this month",
      icon: <CalendarCheck size={20} />,
      color: "#3b82f6",
      bg: "#eff6ff",
    },
    {
      label: "Active Clients",
      value: summary?.totalClients?.toLocaleString("en-IN") ?? "—",
      change: fmtChange(summary?.clientsChange),
      sub: "total clients",
      icon: <People size={20} />,
      color: "#8b5cf6",
      bg: "#f5f3ff",
    },
    {
      label: "Today's Revenue",
      value: fmt(summary?.todayRevenue),
      change: fmtChange(summary?.todayRevenueChange),
      sub: `from ${summary?.todayAppointmentsCount ?? normAppts.length} appointments`,
      icon: <CurrencyRupee size={20} />,
      color: "#f59e0b",
      bg: "#fffbeb",
    },
  ];

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="db-home">

      {/* ── HEADER ── */}
      <div className="db-header">
        <div>
          <h1 className="db-title">Good morning, salonox! 👋</h1>
          <p className="db-subtitle">{today} · Here's what's happening today</p>
        </div>
        <div className="db-header-actions">
          {quickActions.map((qa) => (
            <button
              key={qa.label}
              className="db-quick-btn"
              onClick={() => navigate(qa.path)}
              style={{ "--qa-color": qa.color } as React.CSSProperties}
            >
              <span className="db-quick-icon" style={{ background: qa.color + "15", color: qa.color }}>
                {qa.icon}
              </span>
              <span>{qa.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI CARDS ── */}
      <div className="db-kpi-row">
        {kpiCards.map((card) => (
          <div className="db-kpi-card" key={card.label}>
            {loadingSummary ? (
              <SectionSpinner />
            ) : errSummary ? (
              <SectionError message={errSummary} onRetry={() => dispatch(fetchDashboardSummaryThunk())} />
            ) : (
              <>
                <div className="db-kpi-top">
                  <span className="db-kpi-icon" style={{ background: card.bg, color: card.color }}>
                    {card.icon}
                  </span>
                  {card.change && (
                    <span className={`db-kpi-change ${card.change.up ? "up" : "down"}`}>
                      {card.change.up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      {card.change.label}
                    </span>
                  )}
                </div>
                <div className="db-kpi-value">{card.value}</div>
                <div className="db-kpi-label">{card.label}</div>
                <div className="db-kpi-sub">{card.sub}</div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* ── CHARTS ROW ── */}
      <div className="db-charts-row">

        {/* Revenue Area Chart */}
        <div className="db-card db-card-lg">
          <div className="db-card-header">
            <div>
              <h3 className="db-card-title">Revenue Overview</h3>
              <p className="db-card-sub">Monthly revenue vs expenses</p>
            </div>
            <div className="db-legend">
              <span className="db-legend-item"><CircleFill size={8} color="#111827" /> Revenue</span>
              <span className="db-legend-item"><CircleFill size={8} color="#e5e7eb" /> Expenses</span>
            </div>
          </div>
          {loadingRevenue ? (
            <SectionSpinner />
          ) : errRevenue ? (
            <SectionError message={errRevenue} onRetry={() => dispatch(fetchRevenueChartThunk())} />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={revenue} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#111827" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#111827" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#e5e7eb" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#e5e7eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<RevenueTooltip />} />
                <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#d1d5db"
                  strokeWidth={2} fill="url(#expGrad)" />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#111827"
                  strokeWidth={2.5} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Appointments bar chart — weekly summary derived from today's data */}
        <div className="db-card db-card-md">
          <div className="db-card-header">
            <div>
              <h3 className="db-card-title">Today's Summary</h3>
              <p className="db-card-sub">Appointments breakdown</p>
            </div>
          </div>
          {loadingAppts ? (
            <SectionSpinner />
          ) : errAppts ? (
            <SectionError message={errAppts} onRetry={() => dispatch(fetchTodayAppointmentsThunk())} />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={[
                    {
                      label: "Today",
                      completed: normAppts.filter(a => a.status === "completed").length,
                      pending:   normAppts.filter(a => a.status === "upcoming").length,
                      cancelled: normAppts.filter(a => a.status === "cancelled").length,
                    },
                  ]}
                  margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                  barSize={40}
                  barGap={4}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ApptTooltip />} />
                  <Bar dataKey="completed" name="Completed" fill="#111827" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pending"   name="Upcoming"  fill="#d1d5db" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cancelled" name="Cancelled" fill="#fecaca" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="db-bar-legend">
                <span><CircleFill size={8} color="#111827" /> Completed</span>
                <span><CircleFill size={8} color="#d1d5db" /> Upcoming</span>
                <span><CircleFill size={8} color="#fecaca" /> Cancelled</span>
              </div>
            </>
          )}
        </div>

      </div>

      {/* ── TODAY'S APPOINTMENTS ── */}
      <div className="db-appt-section">

        <div className="db-appt-section-header">
          <div>
            <h3 className="db-appt-section-title">Today's Appointments</h3>
            <p className="db-appt-section-sub">
              Live status updates ·{" "}
              <span className="db-appt-section-count">{normAppts.length} total</span>
            </p>
          </div>
          <div className="db-appt-section-chips">
            <span className="db-appt-chip db-appt-chip-success">
              {normAppts.filter(a => a.status === "completed").length} Completed
            </span>
            <span className="db-appt-chip db-appt-chip-info">
              {normAppts.filter(a => a.status === "in-progress").length} In Progress
            </span>
            <span className="db-appt-chip db-appt-chip-warning">
              {normAppts.filter(a => a.status === "upcoming").length} Upcoming
            </span>
            <span className="db-appt-chip db-appt-chip-danger">
              {normAppts.filter(a => a.status === "cancelled").length} Cancelled
            </span>
          </div>
        </div>

        {loadingAppts ? (
          <SectionSpinner />
        ) : errAppts ? (
          <SectionError message={errAppts} onRetry={() => dispatch(fetchTodayAppointmentsThunk())} />
        ) : normAppts.length === 0 ? (
          <div className="db-empty">No appointments scheduled for today.</div>
        ) : (
          <>
            <div className="db-appt-table-wrap">
              <div className="db-appt-table">
                <div className="db-appt-head">
                  <span>Client</span>
                  <span>Service</span>
                  <span>Staff</span>
                  <span>Time</span>
                  <span>Amount</span>
                  <span>Status</span>
                </div>
                {pagedAppts.map((appt) => (
                  <div className="db-appt-row" key={appt.id}>
                    <span className="db-appt-client">
                      <span className="db-avatar">{appt.client.charAt(0)}</span>
                      {appt.client}
                    </span>
                    <span className="db-appt-service">{appt.service}</span>
                    <span className="db-appt-staff">{appt.staff}</span>
                    <span className="db-appt-time">
                      <ClockHistory size={12} className="me-1" />{appt.time}
                    </span>
                    <span className="db-appt-amount">₹{appt.amount.toLocaleString("en-IN")}</span>
                    <StatusBadge status={appt.status} />
                  </div>
                ))}
              </div>
            </div>

            <div className="db-appt-pagination">
              <span className="db-appt-pg-info">
                Showing{" "}
                <strong>{(apptPage - 1) * PAGE_SIZE + 1}–{Math.min(apptPage * PAGE_SIZE, normAppts.length)}</strong>
                {" "}of <strong>{normAppts.length}</strong> appointments
              </span>

              <div className="db-appt-pg-controls">
                <button className="db-pg-btn db-pg-nav" onClick={() => setApptPage(p => p - 1)}
                  disabled={apptPage === 1} aria-label="Previous page">
                  <ChevronLeft size={13} /><span>Prev</span>
                </button>

                <div className="db-pg-numbers">
                  {getPageNumbers(apptPage, totalApptPages).map((page, idx) =>
                    page === "..." ? (
                      <span key={`ellipsis-${idx}`} className="db-pg-ellipsis">…</span>
                    ) : (
                      <button key={page}
                        className={`db-pg-btn${apptPage === page ? " active" : ""}`}
                        onClick={() => setApptPage(page as number)}
                        aria-label={`Page ${page}`}
                        aria-current={apptPage === page ? "page" : undefined}>
                        {page}
                      </button>
                    )
                  )}
                </div>

                <button className="db-pg-btn db-pg-nav" onClick={() => setApptPage(p => p + 1)}
                  disabled={apptPage === totalApptPages} aria-label="Next page">
                  <span>Next</span><ChevronRight size={13} />
                </button>
              </div>
            </div>
          </>
        )}

      </div>

      {/* ── BOTTOM ROW (Service Mix + Top Staff) ── */}
      <div className="db-bottom-row">

        {/* ── Services Catalog Card ── */}
        <div className="db-card db-svc-card">
          <div className="db-card-header">
            <div>
              <h3 className="db-card-title">Services</h3>
              <p className="db-card-sub">
                {loadingServices ? "Loading…" : `${allServices.filter(s => s.is_active).length} active services`}
              </p>
            </div>
            <div className="db-svc-header-actions">
              <button className="db-svc-more-btn"><ThreeDots size={16} /></button>
              <button className="db-svc-view-all-btn" onClick={() => navigate("/dashboard/catalog/services")}>
                View all <ArrowUpRight size={13} />
              </button>
            </div>
          </div>

          {loadingServices ? (
            <SectionSpinner />
          ) : errServices ? (
            <SectionError message={errServices} onRetry={() => dispatch(fetchServicesThunk())} />
          ) : activeServices.length === 0 ? (
            <div className="db-empty">No services found. Add your first service.</div>
          ) : (() => {
            const svcChartData = activeServices.map((svc, i) => ({
              name: svc.name,
              value: parseFloat(String(svc.price ?? 0)),
              color: SVC_CHART_COLORS[i % SVC_CHART_COLORS.length],
              duration: svc.duration ?? 0,
              category: svc.category_name ?? "",
              priceType: svc.price_type,
            }));
            const totalSvcValue = svcChartData.reduce((sum, s) => sum + s.value, 0);
            return (
              <div className="db-svc-donut-layout">
                <div className="db-svc-donut-wrap">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={svcChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={88}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        {svcChartData.map((entry, idx) => (
                          <Cell key={`svc-cell-${idx}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any) => [
                          `₹${(val || 0).toLocaleString("en-IN")}`,
                          "",
                        ]}
                        contentStyle={{ borderRadius: 10, fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="db-svc-donut-center">
                    <span className="db-svc-donut-total">₹{totalSvcValue.toLocaleString("en-IN")}</span>
                    <span className="db-svc-donut-label">total value</span>
                  </div>
                </div>

                <div className="db-svc-donut-list">
                  {svcChartData.map((svc, i) => {
                    const pct = totalSvcValue > 0 ? ((svc.value / totalSvcValue) * 100).toFixed(1) : "0.0";
                    const dur = svc.duration;
                    const durStr = dur >= 60
                      ? `${Math.floor(dur / 60)}h${dur % 60 ? ` ${dur % 60}m` : ""}`
                      : `${dur}m`;
                    return (
                      <div className="db-svc-donut-row" key={i}>
                        <span className="db-svc-donut-dot" style={{ background: svc.color }} />
                        <div className="db-svc-donut-info">
                          <span className="db-svc-donut-name">{svc.name}</span>
                          <span className="db-svc-donut-meta">
                            {durStr}{svc.category ? ` · ${svc.category}` : ""}
                          </span>
                        </div>
                        <div className="db-svc-donut-right">
                          <span className="db-svc-donut-price">
                            {svc.priceType === "free" ? "Free" : `₹${svc.value.toLocaleString("en-IN")}`}
                          </span>
                          <span className="db-svc-donut-pct">{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Top Staff */}
        <div className="db-card">
          <div className="db-card-header">
            <div>
              <h3 className="db-card-title">Top Staff</h3>
              <p className="db-card-sub">Top 3 performers this month</p>
            </div>
            <button className="db-view-all" onClick={() => navigate("/dashboard/team/staff")}>
              View all <ChevronRight size={14} />
            </button>
          </div>
          {loadingStaff ? (
            <SectionSpinner />
          ) : errStaff ? (
            <SectionError message={errStaff} onRetry={() => dispatch(fetchTopStaffThunk())} />
          ) : topStaff.length === 0 ? (
            <div className="db-empty">No staff data available.</div>
          ) : (
            <div className="db-staff-list">
              {topStaff.slice(0, 3).map((s, i) => {
                const initials = s.avatar ?? s.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
                const clients  = s.clientCount ?? s.bookings ?? 0;
                const rev      = s.revenue ?? 0;
                return (
                  <div className="db-staff-item" key={s.id}>
                    <span className="db-rank">#{i + 1}</span>
                    <div className="db-staff-avatar">{initials}</div>
                    <div className="db-staff-info">
                      <div className="db-staff-name">{s.name}</div>
                      <div className="db-staff-role">{s.role ?? "Staff"}</div>
                    </div>
                    <div className="db-staff-stats">
                      <div className="db-staff-rev">
                        {rev >= 1000 ? `₹${(rev / 1000).toFixed(0)}k` : `₹${rev}`}
                      </div>
                      {s.rating != null && (
                        <div className="db-staff-rating">
                          <StarFill size={10} color="#f59e0b" /> {s.rating}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* ── QUICK STATS STRIP ── */}
      <div className="db-stats-strip">
        <div className="db-stat-item">
          <Lightning size={16} color="#f59e0b" />
          <span className="db-stat-label">Top service</span>
          <span className="db-stat-val">
            {activeServices.length > 0 ? activeServices[0].name : "—"}
          </span>
        </div>
        <div className="db-stat-divider" />
        <div className="db-stat-item">
          <Scissors size={16} color="#10b981" />
          <span className="db-stat-label">Active services</span>
          <span className="db-stat-val">{allServices.filter(s => s.is_active).length}</span>
        </div>
        <div className="db-stat-divider" />
        <div className="db-stat-item">
          <People size={16} color="#3b82f6" />
          <span className="db-stat-label">Active clients</span>
          <span className="db-stat-val">
            {summary?.totalClients != null
              ? summary.totalClients.toLocaleString("en-IN")
              : "—"}
          </span>
        </div>
        <div className="db-stat-divider" />
        <div className="db-stat-item">
          <CalendarCheck size={16} color="#8b5cf6" />
          <span className="db-stat-label">Today's appointments</span>
          <span className="db-stat-val">{normAppts.length}</span>
        </div>
        <div className="db-stat-divider" />
        <div className="db-stat-item">
          <CurrencyRupee size={16} color="#ef4444" />
          <span className="db-stat-label">Today's revenue</span>
          <span className="db-stat-val">{fmt(summary?.todayRevenue)}</span>
        </div>
      </div>

    </div>
  );
}
