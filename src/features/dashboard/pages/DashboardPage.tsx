import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  memo,
} from "react";
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
  CircleFill,
  ExclamationTriangleFill,
  ArrowRepeat,
  ThreeDots,
} from "react-bootstrap-icons";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import {
  fetchDashboardAll,
  fetchRevenueChart,
} from "../../../middleware/dashboard/dashboard.thunk";
import type { TodayAppointment } from "../../../types/dashboard.types";

// ─── Constants ────────────────────────────────────────────────────────────────

const SVC_CHART_COLORS = [
  "#7c6cf2", "#4f46e5", "#10b981", "#f97316",
  "#60a5fa", "#f472b6", "#eab308", "#ef4444",
];


const PAGE_SIZE = 5;

type RevPeriod = "today" | "weekly" | "monthly" | "yearly";

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

// Convert UTC hour labels from revenue chart (e.g. "07AM", "7 AM", "07:00") to local hour labels.
function utcHourLabelToLocal(label: string): string {
  if (!label) return label;
  const s = label.trim();

  // Matches: "07AM", "7AM", "07 AM", "7 AM"
  const shortMatch = s.match(/^(\d{1,2})\s*(AM|PM)$/i);
  // Matches: "07:00", "07:00 AM", "7:00PM"
  const longMatch  = s.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);

  let utcH: number | null = null;

  if (shortMatch) {
    let h = parseInt(shortMatch[1], 10);
    const p = shortMatch[2].toUpperCase();
    if (p === "PM" && h !== 12) h += 12;
    if (p === "AM" && h === 12) h = 0;
    utcH = h;
  } else if (longMatch) {
    let h = parseInt(longMatch[1], 10);
    if (longMatch[3]) {
      const p = longMatch[3].toUpperCase();
      if (p === "PM" && h !== 12) h += 12;
      if (p === "AM" && h === 12) h = 0;
    }
    utcH = h;
  }

  if (utcH === null) return label;

  try {
    const todayUtc = new Date().toISOString().slice(0, 10);
    const dt = new Date(`${todayUtc}T${String(utcH).padStart(2, "0")}:00:00Z`);
    const lh = dt.getHours();
    if (lh === 0)  return "12AM";
    if (lh < 12)   return `${lh}AM`;
    if (lh === 12) return "12PM";
    return `${lh - 12}PM`;
  } catch {
    return label;
  }
}

// Backend returns pre-formatted UTC time strings like "01:30 AM".
// Convert to browser local time so the dashboard matches the calendar.
function utcTimeToLocal(raw: string): string {
  if (!raw || raw === "—") return raw;
  try {
    const match = raw.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return raw;
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const period = match[3].toUpperCase();
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    const todayUtc = new Date().toISOString().slice(0, 10);
    const dt = new Date(`${todayUtc}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00Z`);
    return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
  } catch {
    return raw;
  }
}

function normalise(appt: TodayAppointment) {
  return {
    id:      appt.id,
    client:  appt.clientName  ?? appt.client  ?? "—",
    service: appt.serviceName ?? appt.service ?? "—",
    staff:   appt.staffName   ?? appt.staff   ?? "—",
    time:    utcTimeToLocal(appt.startTime ?? appt.time ?? "—"),
    status:  appt.status,
    amount:  appt.amount      ?? appt.price   ?? 0,
  };
}

// ─── Shared UI atoms ──────────────────────────────────────────────────────────

const SectionError = memo(function SectionError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="db-section-error">
      <ExclamationTriangleFill size={14} className="me-1" />
      {message}
      <button className="db-retry-btn" onClick={onRetry}>
        <ArrowRepeat size={13} className="me-1" /> Retry
      </button>
    </div>
  );
});

const SectionSpinner = memo(function SectionSpinner() {
  return (
    <div className="db-section-spinner">
      <div className="spinner-border spinner-border-sm text-secondary" role="status">
        <span className="visually-hidden">Loading…</span>
      </div>
    </div>
  );
});

const StatusBadge = memo(function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    completed:     { label: "Completed",   cls: "db-badge-success" },
    "in-progress": { label: "In Progress", cls: "db-badge-info"    },
    upcoming:      { label: "Upcoming",    cls: "db-badge-warning" },
    cancelled:     { label: "Cancelled",   cls: "db-badge-danger"  },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "" };
  return <span className={`db-badge ${cls}`}>{label}</span>;
});

// ─── Chart tooltips ───────────────────────────────────────────────────────────

const RevenueTooltip = memo(function RevenueTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const rev = payload.find((p: any) => p.dataKey === "revenue");
  return (
    <div className="db-tooltip">
      <p className="db-tooltip-label">{label}</p>
      {rev && (
        <p style={{ margin: "4px 0 0", fontSize: 13, fontWeight: 600, color: "#111827" }}>
          ₹{rev.value?.toLocaleString("en-IN")}
        </p>
      )}
    </div>
  );
});

const ApptTooltip = memo(function ApptTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
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
});

// ─── Section: KPI Cards ───────────────────────────────────────────────────────

type NormSummary = {
  totalRevenue?: number;
  todayRevenue?: number;
  totalAppointments?: number;
  totalClients?: number;
  revenueChange?: number | null;
  todayRevenueChange?: number | null;
  appointmentsChange?: number | null;
  clientsChange?: number | null;
  todayAppointmentsCount?: number;
};

const KpiCardsGrid = memo(function KpiCardsGrid({
  summary,
  normApptCount,
  loading,
  error,
  onRetry,
}: {
  summary: NormSummary | undefined;
  normApptCount: number;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const cards = [
    {
      label:  "Total Revenue",
      value:  fmt(summary?.totalRevenue),
      change: fmtChange(summary?.revenueChange ?? undefined),
      sub:    "vs last month",
      icon:   <CurrencyRupee size={20} />,
      color:  "#10b981",
      bg:     "#f0fdf4",
    },
    {
      label:  "Appointments",
      value:  summary?.totalAppointments?.toLocaleString("en-IN") ?? "—",
      change: fmtChange(summary?.appointmentsChange ?? undefined),
      sub:    "this month",
      icon:   <CalendarCheck size={20} />,
      color:  "#3b82f6",
      bg:     "#eff6ff",
    },
    {
      label:  "Active Clients",
      value:  summary?.totalClients?.toLocaleString("en-IN") ?? "—",
      change: fmtChange(summary?.clientsChange ?? undefined),
      sub:    "total clients",
      icon:   <People size={20} />,
      color:  "#8b5cf6",
      bg:     "#f5f3ff",
    },
    {
      label:  "Today's Revenue",
      value:  fmt(summary?.todayRevenue),
      change: fmtChange(summary?.todayRevenueChange ?? undefined),
      sub:    `from ${summary?.todayAppointmentsCount ?? normApptCount} appointments`,
      icon:   <CurrencyRupee size={20} />,
      color:  "#f59e0b",
      bg:     "#fffbeb",
    },
  ];

  return (
    <div className="db-kpi-row">
      {cards.map((card) => (
        <div className="db-kpi-card" key={card.label}>
          {loading ? (
            <SectionSpinner />
          ) : error ? (
            <SectionError message={error} onRetry={onRetry} />
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
  );
});

// ─── Section: Revenue Chart ───────────────────────────────────────────────────

const RevenueChartPanel = memo(function RevenueChartPanel({
  revenue,
  chartLoading,
  error,
  revPeriod,
  onPeriodChange,
  onRetry,
}: {
  revenue: Array<{ month: string; revenue: number; expenses: number }>;
  chartLoading: boolean;
  error: string | null;
  revPeriod: RevPeriod;
  onPeriodChange: (p: RevPeriod) => void;
  onRetry: () => void;
}) {
  const localRevenue = revenue;

  return (
    <div className="db-card db-card-lg">
      <div className="db-card-header">
        <div>
          <h3 className="db-card-title">Revenue Overview</h3>
          <p className="db-card-sub">
            {revPeriod === "today"   && "Hourly revenue — today"}
            {revPeriod === "weekly"  && "Daily revenue — last 7 days"}
            {revPeriod === "monthly" && "Daily revenue — this month"}
            {revPeriod === "yearly"  && "Monthly revenue — last 12 months"}
          </p>
        </div>
        <div className="db-rev-filters">
          {(["today", "weekly", "monthly", "yearly"] as const).map((p) => (
            <button
              key={p}
              className={`db-rev-filter-btn${revPeriod === p ? " active" : ""}`}
              onClick={() => onPeriodChange(p)}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {chartLoading ? (
        <SectionSpinner />
      ) : error ? (
        <SectionError message={error} onRetry={onRetry} />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={localRevenue} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#111827" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#111827" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              interval={revPeriod === "monthly" ? 2 : 0}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`}
            />
            <Tooltip content={<RevenueTooltip />} />
            <Area
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke="#111827"
              strokeWidth={2.5}
              fill="url(#revGrad)"
              dot={{ r: 3, fill: "#111827", strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "#111827" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
});

// ─── Section: Appointment Summary Bar Chart ───────────────────────────────────

type ApptChartEntry = { label: string; completed: number; pending: number; cancelled: number };

const AppointmentSummaryPanel = memo(function AppointmentSummaryPanel({
  apptChartData,
  loading,
}: {
  apptChartData: ApptChartEntry[];
  loading: boolean;
}) {
  return (
    <div className="db-card db-card-md">
      <div className="db-card-header">
        <div>
          <h3 className="db-card-title">Today's Summary</h3>
          <p className="db-card-sub">Appointment status breakdown</p>
        </div>
      </div>
      {loading ? (
        <SectionSpinner />
      ) : (
        <>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={apptChartData}
              margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
              barSize={22}
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
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
  );
});

// ─── Section: Today's Appointments Table ──────────────────────────────────────

type NormAppt = ReturnType<typeof normalise>;

const AppointmentsTable = memo(function AppointmentsTable({
  normAppts,
  pagedAppts,
  apptPage,
  totalApptPages,
  loading,
  error,
  onPageChange,
  onRetry,
}: {
  normAppts: NormAppt[];
  pagedAppts: NormAppt[];
  apptPage: number;
  totalApptPages: number;
  loading: boolean;
  error: string | null;
  onPageChange: (p: number) => void;
  onRetry: () => void;
}) {
  return (
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

      {loading ? (
        <SectionSpinner />
      ) : error ? (
        <SectionError message={error} onRetry={onRetry} />
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
              <button
                className="db-pg-btn db-pg-nav"
                onClick={() => onPageChange(apptPage - 1)}
                disabled={apptPage === 1}
                aria-label="Previous page"
              >
                <ChevronLeft size={13} /><span>Prev</span>
              </button>
              <div className="db-pg-numbers">
                {getPageNumbers(apptPage, totalApptPages).map((page, idx) =>
                  page === "..." ? (
                    <span key={`e-${idx}`} className="db-pg-ellipsis">…</span>
                  ) : (
                    <button
                      key={page}
                      className={`db-pg-btn${apptPage === page ? " active" : ""}`}
                      onClick={() => onPageChange(page as number)}
                      aria-label={`Page ${page}`}
                      aria-current={apptPage === page ? "page" : undefined}
                    >
                      {page}
                    </button>
                  )
                )}
              </div>
              <button
                className="db-pg-btn db-pg-nav"
                onClick={() => onPageChange(apptPage + 1)}
                disabled={apptPage === totalApptPages}
                aria-label="Next page"
              >
                <span>Next</span><ChevronRight size={13} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
});

// ─── Section: Services Donut Card ─────────────────────────────────────────────

type SvcEntry = {
  name: string;
  value: number;
  color: string;
  duration: number;
  category: string;
  priceType: "fixed" | "from" | "free" | undefined;
};

const ServicesCard = memo(function ServicesCard({
  svcChartData,
  allServicesCount,
  loading,
  error,
  onNavigate,
  onRetry,
}: {
  svcChartData: SvcEntry[];
  allServicesCount: number;
  loading: boolean;
  error: string | null;
  onNavigate: () => void;
  onRetry: () => void;
}) {
  const totalSvcValue = useMemo(
    () => svcChartData.reduce((sum, s) => sum + s.value, 0),
    [svcChartData]
  );

  return (
    <div className="db-card db-svc-card">
      <div className="db-card-header">
        <div>
          <h3 className="db-card-title">Services</h3>
          <p className="db-card-sub">
            {loading ? "Loading…" : `${allServicesCount} active services`}
          </p>
        </div>
        <div className="db-svc-header-actions">
          <button className="db-svc-more-btn"><ThreeDots size={16} /></button>
          <button className="db-svc-view-all-btn" onClick={onNavigate}>
            View all <ArrowUpRight size={13} />
          </button>
        </div>
      </div>

      {loading ? (
        <SectionSpinner />
      ) : error ? (
        <SectionError message={error} onRetry={onRetry} />
      ) : svcChartData.length === 0 ? (
        <div className="db-empty">No services found. Add your first service.</div>
      ) : (
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
                    <Cell key={`svc-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`₹${(val || 0).toLocaleString("en-IN")}`, ""]}
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
              const pct = totalSvcValue > 0
                ? ((svc.value / totalSvcValue) * 100).toFixed(1)
                : "0.0";
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
      )}
    </div>
  );
});

// ─── Section: Top Staff Card ──────────────────────────────────────────────────

type TopStaffEntry = {
  id: string;
  name: string;
  role: string;
  avatar: string;
  clientCount: number;
  revenue: number;
  bookings: number;
};

const TopStaffCard = memo(function TopStaffCard({
  topStaff,
  loading,
  error,
  onNavigate,
  onRetry,
}: {
  topStaff: TopStaffEntry[];
  loading: boolean;
  error: string | null;
  onNavigate: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="db-card">
      <div className="db-card-header">
        <div>
          <h3 className="db-card-title">Top Staff</h3>
          <p className="db-card-sub">Top 3 performers this month</p>
        </div>
        <button className="db-view-all" onClick={onNavigate}>
          View all <ChevronRight size={14} />
        </button>
      </div>
      {loading ? (
        <SectionSpinner />
      ) : error ? (
        <SectionError message={error} onRetry={onRetry} />
      ) : topStaff.length === 0 ? (
        <div className="db-empty">No staff data available.</div>
      ) : (
        <div className="db-staff-list">
          {topStaff.slice(0, 3).map((s, i) => {
            const initials = s.avatar ?? s.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
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
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

// ─── Section: Quick Stats Strip ───────────────────────────────────────────────

const QuickStatsStrip = memo(function QuickStatsStrip({
  summary,
  topServiceName,
  activeServicesCount,
  normApptCount,
}: {
  summary: NormSummary | undefined;
  topServiceName: string;
  activeServicesCount: number;
  normApptCount: number;
}) {
  return (
    <div className="db-stats-strip">
      <div className="db-stat-item">
        <Lightning size={16} color="#f59e0b" />
        <span className="db-stat-label">Top service</span>
        <span className="db-stat-val">{topServiceName}</span>
      </div>
      <div className="db-stat-divider" />
      <div className="db-stat-item">
        <Scissors size={16} color="#10b981" />
        <span className="db-stat-label">Active services</span>
        <span className="db-stat-val">{activeServicesCount}</span>
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
        <span className="db-stat-val">{normApptCount}</span>
      </div>
      <div className="db-stat-divider" />
      <div className="db-stat-item">
        <CurrencyRupee size={16} color="#ef4444" />
        <span className="db-stat-label">Today's revenue</span>
        <span className="db-stat-val">{fmt(summary?.todayRevenue)}</span>
      </div>
    </div>
  );
});

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [apptPage,  setApptPage]  = useState(1);
  const [revPeriod, setRevPeriod] = useState<RevPeriod>("monthly");

  // ── Granular selectors — each section only re-renders when its own slice changes
  const summary      = useAppSelector((s) => s.dashboard.data?.summary);
  const appointments = useAppSelector((s) => s.dashboard.data?.todayAppointments ?? []) as TodayAppointment[];
  const revenueChart = useAppSelector((s) => s.dashboard.data?.revenueChart ?? []);
  const topStaff     = useAppSelector((s) => s.dashboard.data?.topStaff ?? []) as TopStaffEntry[];
  const allServices  = useAppSelector((s) => s.dashboard.data?.services ?? []);
  const dashLoading  = useAppSelector((s) => s.dashboard.loading);
  const chartLoading = useAppSelector((s) => s.dashboard.chartLoading);
  const chartError   = useAppSelector((s) => s.dashboard.chartError);
  const dashError    = useAppSelector((s) => s.dashboard.error);

  // ── Mount: full load once ─────────────────────────────────────────────────
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    dispatch(fetchDashboardAll({ period: revPeriod, date: today }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset appointment page when list changes
  useEffect(() => {
    setApptPage(1);
  }, [appointments.length]);

  // ── Period change: only re-fetch the chart, nothing else ─────────────────
  const handlePeriodChange = useCallback(
    (p: RevPeriod) => {
      setRevPeriod(p);
      dispatch(fetchRevenueChart({ period: p }));
    },
    [dispatch]
  );

  // ── Retry callbacks ────────────────────────────────────────────────────────
  const retryFull = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    dispatch(fetchDashboardAll({ period: revPeriod, date: today }));
  }, [dispatch, revPeriod]);

  const handleRefresh = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    dispatch(fetchDashboardAll({ period: revPeriod, date: today }));
    dispatch(fetchRevenueChart({ period: revPeriod }));
  }, [dispatch, revPeriod]);

  const retryChart = useCallback(() => {
    dispatch(fetchRevenueChart({ period: revPeriod }));
  }, [dispatch, revPeriod]);

  // ── Memoized derived state ─────────────────────────────────────────────────
  const normAppts = useMemo(
    () => appointments.map(normalise),
    [appointments]
  );

  const totalApptPages = useMemo(
    () => Math.max(1, Math.ceil(normAppts.length / PAGE_SIZE)),
    [normAppts.length]
  );

  const pagedAppts = useMemo(
    () => normAppts.slice((apptPage - 1) * PAGE_SIZE, apptPage * PAGE_SIZE),
    [normAppts, apptPage]
  );

  const apptChartData = useMemo<ApptChartEntry[]>(() => {
    const parseHour = (timeStr: string): number | null => {
      if (!timeStr || timeStr === "—") return null;
      const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (!match) return null;
      let h = parseInt(match[1], 10);
      const period = match[3].toUpperCase();
      if (period === "PM" && h !== 12) h += 12;
      if (period === "AM" && h === 12) h = 0;
      return h;
    };

    if (normAppts.length === 0) {
      return [{ label: "Today", completed: 0, pending: 0, cancelled: 0 }];
    }

    const hourSet = new Set<number>();
    normAppts.forEach(a => { const h = parseHour(a.time); if (h !== null) hourSet.add(h); });

    if (hourSet.size === 0) {
      return [{
        label: "Today",
        completed: normAppts.filter(a => a.status === "completed").length,
        pending:   normAppts.filter(a => a.status === "upcoming" || a.status === "in-progress").length,
        cancelled: normAppts.filter(a => a.status === "cancelled").length,
      }];
    }

    const minH = Math.min(...hourSet);
    const maxH = Math.max(...hourSet);
    return Array.from({ length: maxH - minH + 1 }, (_, i) => {
      const h = minH + i;
      const slot = normAppts.filter(a => parseHour(a.time) === h);
      const label = h === 0 ? "12AM" : h < 12 ? `${h}AM` : h === 12 ? "12PM" : `${h - 12}PM`;
      return {
        label,
        completed: slot.filter(a => a.status === "completed").length,
        pending:   slot.filter(a => a.status === "upcoming" || a.status === "in-progress").length,
        cancelled: slot.filter(a => a.status === "cancelled").length,
      };
    });
  }, [normAppts]);

  // Compute today's hourly revenue from actual appointments (local time, correct amounts).
  // Used instead of the backend's UTC-based revenueChart when period is "today".
  const todayHourlyRevenue = useMemo(() => {
    const parseHour = (ts: string): number | null => {
      if (!ts || ts === "—") return null;
      const match = ts.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (!match) return null;
      let h = parseInt(match[1], 10);
      const p = match[3].toUpperCase();
      if (p === "PM" && h !== 12) h += 12;
      if (p === "AM" && h === 12) h = 0;
      return h;
    };
    if (!normAppts.length) return [] as Array<{ month: string; revenue: number; expenses: number }>;
    const hourSet = new Set<number>();
    normAppts.forEach(a => { const h = parseHour(a.time); if (h !== null) hourSet.add(h); });
    if (!hourSet.size) return [] as Array<{ month: string; revenue: number; expenses: number }>;
    const minH = Math.min(...hourSet);
    const maxH = Math.max(...hourSet);
    return Array.from({ length: maxH - minH + 1 }, (_, i) => {
      const h = minH + i;
      const label = h === 0 ? "12AM" : h < 12 ? `${h}AM` : h === 12 ? "12PM" : `${h - 12}PM`;
      const slot = normAppts.filter(a => parseHour(a.time) === h);
      return {
        month:    label,
        revenue:  slot.reduce((s, a) => s + (Number(a.amount) || 0), 0),
        expenses: 0,
      };
    });
  }, [normAppts]);

  const activeServices = useMemo(
    () => allServices.filter((s) => s.is_active).slice(0, 6),
    [allServices]
  );

  const svcChartData = useMemo<SvcEntry[]>(
    () => activeServices.map((svc, i) => ({
      name:      svc.name,
      value:     parseFloat(String(svc.price ?? 0)),
      color:     SVC_CHART_COLORS[i % SVC_CHART_COLORS.length],
      duration:  svc.duration ?? 0,
      category:  svc.category_name ?? "",
      priceType: svc.price_type,
    })),
    [activeServices]
  );

  const topServiceName = useMemo(
    () => activeServices.length > 0 ? activeServices[0].name : "—",
    [activeServices]
  );

  const today = useMemo(
    () => new Date().toLocaleDateString("en-IN", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    }),
    []
  );

  // Navigate callbacks (stable references for memoized children)
  const goToCalendar  = useCallback(() => navigate("/dashboard/calendar"),        [navigate]);
  const goToClients   = useCallback(() => navigate("/dashboard/clients/add"),     [navigate]);
  const goToSales     = useCallback(() => navigate("/dashboard/sales/quick"),      [navigate]);
  const goToMarketing = useCallback(() => navigate("/dashboard/marketing"),        [navigate]);
  const goToServices  = useCallback(() => navigate("/dashboard/catalog/services"), [navigate]);
  const goToStaff     = useCallback(() => navigate("/dashboard/team/staff"),       [navigate]);

  const quickActionsWithHandlers = useMemo(() => [
    { label: "New Appointment", icon: <CalendarCheck size={22} />, onClick: goToCalendar,  color: "#111827" },
    { label: "Add Client",      icon: <PersonPlus size={22} />,    onClick: goToClients,   color: "#3b82f6" },
    { label: "Quick Sale",      icon: <CartPlus size={22} />,      onClick: goToSales,     color: "#10b981" },
    { label: "Campaign",        icon: <Megaphone size={22} />,     onClick: goToMarketing, color: "#8b5cf6" },
  ], [goToCalendar, goToClients, goToSales, goToMarketing]);

  return (
    <div className="db-home">

      {/* ── HEADER ── */}
      <div className="db-header">
        <div>
          <h1 className="db-title">salonox!</h1>
          <p className="db-subtitle">{today} · Here's what's happening today</p>
        </div>
        <div className="db-header-actions">
          {quickActionsWithHandlers.map((qa) => (
            <button
              key={qa.label}
              className="db-quick-btn"
              onClick={qa.onClick}
              style={{ "--qa-color": qa.color } as React.CSSProperties}
            >
              <span className="db-quick-icon" style={{ background: qa.color + "15", color: qa.color }}>
                {qa.icon}
              </span>
              <span>{qa.label}</span>
            </button>
          ))}
          <button
            className="db-quick-btn db-quick-btn--refresh"
            onClick={handleRefresh}
            disabled={dashLoading}
          >
            <span className="db-quick-icon" style={{ background: "#f59e0b15", color: "#f59e0b" }}>
              <ArrowRepeat size={22} className={dashLoading ? "db-refresh-spin" : ""} />
            </span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── KPI CARDS — only re-render when summary or dashLoading changes ── */}
      <KpiCardsGrid
        summary={summary}
        normApptCount={normAppts.length}
        loading={dashLoading}
        error={dashError}
        onRetry={retryFull}
      />

      {/* ── CHARTS ROW ── */}
      <div className="db-charts-row">

        {/* Revenue chart — only re-renders when chart data or chartLoading changes */}
        <RevenueChartPanel
          revenue={revPeriod === "today" ? todayHourlyRevenue : revenueChart}
          chartLoading={dashLoading || chartLoading}
          error={chartError ?? dashError}
          revPeriod={revPeriod}
          onPeriodChange={handlePeriodChange}
          onRetry={retryChart}
        />

        {/* Appointments summary — only re-renders when appointments change */}
        <AppointmentSummaryPanel
          apptChartData={apptChartData}
          loading={dashLoading}
        />

      </div>

      {/* ── TODAY'S APPOINTMENTS TABLE ── */}
      <AppointmentsTable
        normAppts={normAppts}
        pagedAppts={pagedAppts}
        apptPage={apptPage}
        totalApptPages={totalApptPages}
        loading={dashLoading}
        error={dashError}
        onPageChange={setApptPage}
        onRetry={retryFull}
      />

      {/* ── BOTTOM ROW ── */}
      <div className="db-bottom-row">
        <ServicesCard
          svcChartData={svcChartData}
          allServicesCount={allServices.filter(s => s.is_active).length}
          loading={dashLoading}
          error={dashError}
          onNavigate={goToServices}
          onRetry={retryFull}
        />
        <TopStaffCard
          topStaff={topStaff}
          loading={dashLoading}
          error={dashError}
          onNavigate={goToStaff}
          onRetry={retryFull}
        />
      </div>

      {/* ── QUICK STATS STRIP ── */}
      <QuickStatsStrip
        summary={summary}
        topServiceName={topServiceName}
        activeServicesCount={allServices.filter(s => s.is_active).length}
        normApptCount={normAppts.length}
      />

    </div>
  );
}
