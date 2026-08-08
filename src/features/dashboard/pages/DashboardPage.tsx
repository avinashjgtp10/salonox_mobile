import {
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
  ReferenceDot,
} from "recharts";
import {
  CalendarCheck,
  CurrencyRupee,
  CurrencyDollar,
  CurrencyEuro,
  CurrencyPound,
  CurrencyYen,
  CurrencyExchange,
  ArrowUpRight,
  ArrowDownRight,
  ClockHistory,
  PersonPlus,
  CartPlus,
  Megaphone,
  ChevronRight,
  ChevronLeft,
  CircleFill,
  ExclamationTriangleFill,
  ArrowRepeat,
  CashStack,
  Cake2,
  BellFill,
  CreditCard2Front,
  PersonFill,
} from "react-bootstrap-icons";
import { getInitialsFromFullName } from "../../../utils/initials";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import Skeleton from "../../../components/ui/Skeleton";
import {
  fetchDashboardAll,
  fetchRevenueChart,
  fetchStaffRevenue,
} from "../../../middleware/dashboard/dashboard.thunk";
import type { TodayAppointment } from "../../../types/dashboard.types";
import type { DashboardAllResponse } from "../../../middleware/dashboard/dashboard.thunk";
import { usePendingPayments } from "../hooks/usePendingPayments";
import { useTodayAppointments } from "../hooks/useTodayAppointments";
import { useCurrency } from "../../../hooks/useCurrency";

// ─── Constants ────────────────────────────────────────────────────────────────

const SVC_CHART_COLORS = [
  "#7c6cf2", "#4f46e5", "#10b981", "#f97316",
  "#60a5fa", "#f472b6", "#eab308", "#ef4444",
];

// Stable empty-array fallbacks for the selectors below. `?? []` inline would
// create a brand-new array reference every time the selector runs, which
// defeats useAppSelector's reference-equality check and forces the whole
// page to re-render on any unrelated dashboard-slice update (e.g. the staff
// revenue filter changing) for as long as `data` stays null.
const EMPTY_REVENUE_CHART: DashboardAllResponse["revenueChart"] = [];
const EMPTY_TOP_STAFF: TopStaffEntry[] = [];
const EMPTY_ACTIVITY: DashboardAllResponse["recentActivity"] = [];


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

// Only a few currencies have their own glyph in react-bootstrap-icons —
// anything else falls back to a neutral currency-exchange icon rather than
// showing a misleading ₹ symbol when e.g. AED or THB is selected.
const CURRENCY_ICON: Record<string, typeof CurrencyRupee> = {
  INR: CurrencyRupee,
  USD: CurrencyDollar,
  EUR: CurrencyEuro,
  GBP: CurrencyPound,
  JPY: CurrencyYen,
};
function getCurrencyIcon(code: string) {
  return CURRENCY_ICON[code] ?? CurrencyExchange;
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
    // Always on the hour (chart buckets are hourly) — ":00" is fixed, not
    // carried over from the input, since only the hour itself ever shifts
    // across a UTC→local conversion.
    if (lh === 0)  return "12:00 AM";
    if (lh < 12)   return `${String(lh).padStart(2, "0")}:00 AM`;
    if (lh === 12) return "12:00 PM";
    return `${String(lh - 12).padStart(2, "0")}:00 PM`;
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
    paidAmount: appt.paidAmount ?? 0,
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

// ─── Skeleton placeholders (shaped like each section's real content) ─────────

const KpiSkeleton = memo(function KpiSkeleton() {
  return (
    <div className="db-skel-kpi">
      <Skeleton width={36} height={36} borderRadius={10} />
      <Skeleton width="55%" height={22} />
      <Skeleton width="70%" height={12} />
      <Skeleton width="45%" height={11} />
    </div>
  );
});

const ChartSkeleton = memo(function ChartSkeleton({ height = 240 }: { height?: number }) {
  return (
    <div className="db-skel-chart" style={{ "--skel-chart-height": `${height}px` } as React.CSSProperties}>
      {[45, 70, 55, 85, 60, 75, 50, 90, 65].map((h, i) => (
        <Skeleton key={i} width="100%" height={`${h}%`} borderRadius="4px 4px 0 0" />
      ))}
    </div>
  );
});

const TableRowsSkeleton = memo(function TableRowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="db-skel-rows">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="db-skel-rows__row">
          <Skeleton width={28} height={28} borderRadius="50%" />
          <Skeleton width="18%" height={12} />
          <Skeleton width="16%" height={12} />
          <Skeleton width="14%" height={12} />
          <Skeleton width="10%" height={12} />
          <Skeleton width="10%" height={12} />
        </div>
      ))}
    </div>
  );
});

const DonutSkeleton = memo(function DonutSkeleton() {
  return (
    <div className="db-skel-donut">
      <Skeleton width={140} height={140} borderRadius="50%" />
      <div className="db-skel-donut__list">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} width={i === 3 ? "50%" : "85%"} height={13} />
        ))}
      </div>
    </div>
  );
});

const StaffListSkeleton = memo(function StaffListSkeleton() {
  return (
    <div className="db-skel-staff-list">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="db-skel-staff-list__row">
          <Skeleton width={36} height={36} borderRadius="50%" />
          <div className="db-skel-staff-list__info">
            <Skeleton width="55%" height={13} />
            <Skeleton width="35%" height={11} />
          </div>
          <Skeleton width={50} height={13} />
        </div>
      ))}
    </div>
  );
});

const StatusBadge = memo(function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    completed:     { label: "Completed",   cls: "db-badge-success" },
    upcoming:      { label: "Upcoming",    cls: "db-badge-warning" },
    partial:       { label: "Partial",     cls: "db-badge-partial" },
    cancelled:     { label: "Cancelled",   cls: "db-badge-danger"  },
    "no-show":     { label: "No Show",     cls: "db-badge-noshow"  },
    deleted:       { label: "Deleted",     cls: "db-badge-neutral" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "" };
  return <span className={`db-badge ${cls}`}>{label}</span>;
});

// ─── Chart tooltips ───────────────────────────────────────────────────────────

const RevenueTooltip = memo(function RevenueTooltip({ active, payload, label }: any) {
  const { formatAmount } = useCurrency();
  if (!active || !payload?.length) return null;
  const rev = payload.find((p: any) => p.dataKey === "revenue");
  // fullLabel carries the complete date/time context ("Tue, 28 Jul 2026" for
  // weekly, "28 Jul 2026" for monthly, "Jul 2026" for yearly) — the axis
  // label alone (`label`, e.g. just "Tue" or "28") is deliberately short so
  // it stays readable across many ticks. Falls back to `label` for any older
  // payload shape that hasn't been re-fetched with fullLabel yet.
  const fullLabel = payload[0]?.payload?.fullLabel ?? label;
  return (
    <div className="db-tooltip">
      <p className="db-tooltip-label">{fullLabel}</p>
      {rev && (
        <p className="db-tooltip-value">
          {formatAmount(rev.value || 0)}
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
        <p key={p.name} className={`db-tooltip-series db-tooltip-series--${p.dataKey ?? "default"}`}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
});

// ─── Section: KPI Cards ───────────────────────────────────────────────────────

type NormSummary = {
  totalRevenue?: number;
  allTimeRevenue?: number;
  todayRevenue?: number;
  totalAppointments?: number;
  totalClients?: number;
  revenueChange?: number | null;
  todayRevenueChange?: number | null;
  appointmentsChange?: number | null;
  clientsChange?: number | null;
  todayAppointmentsCount?: number;
  avgBillValue?: number;
  avgBillValueChange?: number | null;
  lastMonthRevenue?: number;
  yesterdayRevenue?: number;
  newClientsToday?: number;
  newClientsThisMonth?: number;
};

interface KpiFace {
  label: string;
  value: string;
  change: { label: string; up: boolean } | null;
  sub: string;
}

const TabKpiCard = memo(function TabKpiCard({
  theme, icon, tabLabels, front, back, loading, error, onRetry,
}: {
  theme: string;
  icon: React.ReactNode;
  /** Short labels for the two-way pill toggle, e.g. ["All Time", "This Month"]. */
  tabLabels: [string, string];
  front: KpiFace;
  back: KpiFace;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  // Explicit, static choice — no auto-advancing timer and no flip animation.
  // Both stats are always one click away via the pill toggle, but nothing on
  // the card moves on its own.
  const [activeTab, setActiveTab] = useState<0 | 1>(0);

  if (loading) {
    return (
      <div className="db-kpi-card">
        <KpiSkeleton />
      </div>
    );
  }
  if (error) {
    return (
      <div className="db-kpi-card">
        <SectionError message={error} onRetry={onRetry} />
      </div>
    );
  }

  const f = activeTab === 0 ? front : back;

  return (
    <div className="db-kpi-card">
      <div className="db-kpi-top">
        <span className={`db-kpi-icon db-kpi-icon--${theme}`}>{icon}</span>
        {f.change && (
          <span className={`db-kpi-change ${f.change.up ? "up" : "down"}`}>
            {f.change.up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {f.change.label}
          </span>
        )}
      </div>
      <div className="db-kpi-value">{f.value}</div>
      <div className="db-kpi-label">{f.label}</div>
      <div className="db-kpi-toggle" role="tablist">
        {tabLabels.map((label, i) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={activeTab === i}
            className={`db-kpi-toggle__btn${activeTab === i ? " db-kpi-toggle__btn--active" : ""}`}
            onClick={() => setActiveTab(i as 0 | 1)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="db-kpi-sub">{f.sub}</div>
    </div>
  );
});

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
  const { formatAmount, currencyCode } = useCurrency();
  const fmt = (n?: number) => (n != null ? formatAmount(n) : "—");
  const CurrencyIcon = getCurrencyIcon(currencyCode);
  const cards = [
    {
      theme: "revenue",
      icon:  <CurrencyIcon size={20} />,
      tabLabels: ["All Time", "This Month"] as [string, string],
      front: {
        label:  "Total Revenue",
        value:  fmt(summary?.allTimeRevenue),
        change: null,
        sub:    "",
      },
      back: {
        label:  "This Month's Revenue",
        value:  fmt(summary?.totalRevenue),
        change: null,
        sub:    "",
      },
    },
    {
      theme: "appointments",
      icon:  <CalendarCheck size={20} />,
      tabLabels: ["This Month", "Today"] as [string, string],
      front: {
        label:  "Appointments",
        value:  summary?.totalAppointments?.toLocaleString("en-IN") ?? "—",
        change: fmtChange(summary?.appointmentsChange ?? undefined),
        sub:    "this month",
      },
      back: {
        label:  "Appointments Today",
        value:  String(summary?.todayAppointmentsCount ?? normApptCount),
        change: null,
        sub:    "today",
      },
    },
    {
      theme: "today-revenue",
      icon:  <CurrencyIcon size={20} />,
      tabLabels: ["Today", "Yesterday"] as [string, string],
      front: {
        label:  "Today's Revenue",
        value:  fmt(summary?.todayRevenue),
        change: fmtChange(summary?.todayRevenueChange ?? undefined),
        sub:    `from ${summary?.todayAppointmentsCount ?? normApptCount} appointments`,
      },
      back: {
        label:  "Yesterday's Revenue",
        value:  fmt(summary?.yesterdayRevenue),
        change: null,
        sub:    "previous day",
      },
    },
    {
      theme: "new-clients",
      icon:  <PersonPlus size={20} />,
      tabLabels: ["Today", "This Month"] as [string, string],
      front: {
        label:  "New Clients Today",
        value:  String(summary?.newClientsToday ?? 0),
        change: null,
        sub:    "first visit today",
      },
      back: {
        label:  "New Clients This Month",
        value:  String(summary?.newClientsThisMonth ?? 0),
        change: null,
        sub:    "first visit this month",
      },
    },
  ];

  return (
    <div className="db-kpi-row">
      {cards.map((card) => (
        <TabKpiCard
          key={card.theme}
          theme={card.theme}
          icon={card.icon}
          tabLabels={card.tabLabels}
          front={card.front}
          back={card.back}
          loading={loading}
          error={error}
          onRetry={onRetry}
        />
      ))}
    </div>
  );
});

// ─── Section: Recent Activity ──────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}

const ACTIVITY_ICON: Record<string, React.ReactNode> = {
  appointment: <CalendarCheck size={14} color="#4f46e5" />,
  payment:     <CashStack size={14} color="#16a34a" />,
  client:      <PersonPlus size={14} color="#2563eb" />,
  campaign:    <Megaphone size={14} color="#d97706" />,
};

const RecentActivityCard = memo(function RecentActivityCard({
  activity, loading, error,
}: {
  activity: Array<{ id: string; type: string; title: string; body: string | null; createdAt: string }>;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="db-card">
      <div className="db-card-header">
        <h3 className="db-card-title">Recent Activity</h3>
      </div>
      {loading ? (
        <TableRowsSkeleton rows={4} />
      ) : error ? (
        <div className="db-empty">Couldn't load recent activity.</div>
      ) : activity.length === 0 ? (
        <div className="db-empty">No recent activity yet.</div>
      ) : (
        <div className="db-activity-list">
          {activity.map((a) => (
            <div key={a.id} className="db-activity-row">
              <span className="db-activity-row__icon">{ACTIVITY_ICON[a.type] ?? <BellFill size={14} color="#6b7280" />}</span>
              <div className="db-activity-row__body">
                <div className="db-activity-row__title">{a.title}</div>
                {a.body && <div className="db-activity-row__sub">{a.body}</div>}
              </div>
              <span className="db-activity-row__time">{timeAgo(a.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

// ─── Section: Bottom Stat Cards (Pending Payments / Birthdays / Inactive Clients) ──

const BottomStatCards = memo(function BottomStatCards({
  pendingPayments, birthdays, loading, pendingLoading, onNavigateWhatsApp, onNavigatePendingAppointments,
}: {
  pendingPayments: { count: number; amount: number } | undefined;
  birthdays: { count: number; clients: Array<{ id: string; name: string }> } | undefined;
  loading: boolean;
  pendingLoading: boolean;
  onNavigateWhatsApp: () => void;
  onNavigatePendingAppointments: () => void;
}) {
  const { formatAmount } = useCurrency();
  const fmt = (n?: number) => (n != null ? formatAmount(n) : "—");
  const cards = [
    {
      label: "Pending Payments",
      value: fmt(pendingPayments?.amount),
      sub: `${pendingPayments?.count ?? 0} client${(pendingPayments?.count ?? 0) !== 1 ? "s" : ""}`,
      icon: <CreditCard2Front size={18} />,
      tone: "danger",
      cta: "Collect Now",
      onClick: onNavigatePendingAppointments,
      loading: pendingLoading,
    },
    {
      label: "Today's Birthdays",
      value: String(birthdays?.count ?? 0),
      sub: (birthdays?.count ?? 0) > 0 ? "Clients" : "None today",
      icon: <Cake2 size={18} />,
      tone: "pink",
      cta: "Send Wishes",
      onClick: onNavigateWhatsApp,
      loading,
    },
  ];
  return (
    <div className="db-mini-stats-row">
      {cards.map((c) => (
        <div key={c.label} className={`db-mini-stat-card db-mini-stat-card--${c.tone}`}>
          <div className="db-mini-stat-card__top">
            <span className="db-mini-stat-card__label">{c.label}</span>
            <span className="db-mini-stat-card__icon">{c.icon}</span>
          </div>
          {c.loading ? (
            <Skeleton width="50%" height={26} className="db-mini-stat-card__value-skel" />
          ) : (
            <div className="db-mini-stat-card__value">{c.value}</div>
          )}
          <div className="db-mini-stat-card__sub">{c.sub}</div>
          <button className="db-mini-stat-card__cta" onClick={c.onClick}>
            {c.cta} <ChevronRight size={11} />
          </button>
        </div>
      ))}
    </div>
  );
});

// ─── Section: Revenue Chart ───────────────────────────────────────────────────

const PeakDotLabel = memo(function PeakDotLabel(props: any) {
  const { x, y, value, isFirst, isLast } = props;
  if (x == null || y == null) return null;

  let textAnchor: "start" | "middle" | "end" = "middle";
  let dx = 0;

  // If peak is at the first point, anchor to start and offset right so label doesn't bleed into Y-axis ticks
  if (isFirst) {
    textAnchor = "start";
    dx = 8;
  } else if (isLast) {
    // If peak is at the last point, anchor to end and offset left so label doesn't get clipped on the right edge
    textAnchor = "end";
    dx = -8;
  }

  // If point is near top of chart area, shift label below dot to prevent top clipping
  const dy = y < 35 ? 16 : -10;

  return (
    <text
      x={x + dx}
      y={y + dy}
      fill="#4f46e5"
      fontSize={11}
      fontWeight={700}
      textAnchor={textAnchor}
      className="db-peak-label"
    >
      {value}
    </text>
  );
});

const RevenueChartPanel = memo(function RevenueChartPanel({
  revenue,
  chartLoading,
  error,
  revPeriod,
  onPeriodChange,
  onRetry,
}: {
  revenue: Array<{ month: string; fullLabel: string; revenue: number; expenses: number }>;
  chartLoading: boolean;
  error: string | null;
  revPeriod: RevPeriod;
  onPeriodChange: (p: RevPeriod) => void;
  onRetry: () => void;
}) {
  const { formatAmount, currencySymbol } = useCurrency();
  const fmt = (n?: number) => (n != null ? formatAmount(n) : "—");
  const localRevenue = revenue;

  const periodTotal = useMemo(
    () => localRevenue.reduce((sum, r) => sum + (Number(r.revenue) || 0), 0),
    [localRevenue]
  );

  // Highlight the single best-performing point on the chart and track its index position
  const peakInfo = useMemo(() => {
    if (!localRevenue.length) return null;
    let maxIdx = 0;
    for (let i = 1; i < localRevenue.length; i++) {
      if (localRevenue[i].revenue > localRevenue[maxIdx].revenue) {
        maxIdx = i;
      }
    }
    const peakItem = localRevenue[maxIdx];
    return {
      peak: peakItem,
      isFirst: maxIdx === 0,
      isLast: maxIdx === localRevenue.length - 1,
    };
  }, [localRevenue]);

  // Hourly/daily buckets can run past a couple dozen points — thin the
  // x-axis ticks out so labels don't collide.
  const tickInterval = localRevenue.length > 10 ? Math.ceil(localRevenue.length / 8) - 1 : 0;

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
        <div className="db-rev-header-right">
          <div className="db-rev-total">
            <span className="db-rev-total__value">{fmt(periodTotal)}</span>
            <span className="db-rev-total__label">total</span>
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
      </div>

      {chartLoading ? (
        <ChartSkeleton />
      ) : error ? (
        <SectionError message={error} onRetry={onRetry} />
      ) : periodTotal === 0 ? (
        <div className="db-empty">
          {revPeriod === "today"   && "No revenue for today."}
          {revPeriod === "weekly"  && "No revenue in the last 7 days."}
          {revPeriod === "monthly" && "No revenue this month."}
          {revPeriod === "yearly"  && "No revenue in the last 12 months."}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={localRevenue} margin={{ top: 25, right: 35, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#4f46e5" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              interval={tickInterval}
            />
            <YAxis
              width={60}
              tick={{ fontSize: 11, fill: "#9ca3af", dx: -4 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v >= 1000 ? `${currencySymbol}${(v / 1000).toFixed(0)}k` : `${currencySymbol}${v}`}
            />
            <Tooltip content={<RevenueTooltip />} />
            <Area
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke="#4f46e5"
              strokeWidth={2.5}
              fill="url(#revGrad)"
              dot={false}
              activeDot={{ r: 5, fill: "#4f46e5", stroke: "#fff", strokeWidth: 2 }}
            />
            {peakInfo && peakInfo.peak.revenue > 0 && (
              <ReferenceDot
                x={peakInfo.peak.month}
                y={peakInfo.peak.revenue}
                r={5}
                fill="#4f46e5"
                stroke="#fff"
                strokeWidth={2}
                label={
                  <PeakDotLabel
                    value={fmt(peakInfo.peak.revenue)}
                    isFirst={peakInfo.isFirst}
                    isLast={peakInfo.isLast}
                  />
                }
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
});

// ─── Section: Appointment Summary Bar Chart ───────────────────────────────────

type ApptChartEntry = { label: string; completed: number; pending: number; partial: number; cancelled: number; noShow: number };

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
        <ChartSkeleton />
      ) : (
        <>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={apptChartData}
              margin={{ top: 15, right: 15, left: 0, bottom: 0 }}
              barSize={22}
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis width={35} tick={{ fontSize: 12, fill: "#9ca3af", dx: -4 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ApptTooltip />} />
              <Bar dataKey="completed" name="Completed" fill="#111827" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pending"   name="Upcoming"  fill="#d1d5db" radius={[4, 4, 0, 0]} />
              <Bar dataKey="partial"   name="Partial"   fill="#93c5fd" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cancelled" name="Cancelled" fill="#fecaca" radius={[4, 4, 0, 0]} />
              <Bar dataKey="noShow"    name="No Show"   fill="#c4b5fd" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="db-bar-legend">
            <span><CircleFill size={8} color="#111827" /> Completed</span>
            <span><CircleFill size={8} color="#d1d5db" /> Upcoming</span>
            <span><CircleFill size={8} color="#93c5fd" /> Partial</span>
            <span><CircleFill size={8} color="#fecaca" /> Cancelled</span>
            <span><CircleFill size={8} color="#c4b5fd" /> No Show</span>
          </div>
        </>
      )}
    </div>
  );
});

// ─── Section: Today's Appointments Table ──────────────────────────────────────

type NormAppt = ReturnType<typeof normalise>;
type ApptStatusFilter = "all" | "completed" | "upcoming" | "partial" | "cancelled" | "no-show" | "deleted";

const AppointmentsTable = memo(function AppointmentsTable({
  normAppts,
  filteredCount,
  pagedAppts,
  apptPage,
  totalApptPages,
  statusFilter,
  onStatusFilterChange,
  loading,
  error,
  onPageChange,
  onRetry,
}: {
  normAppts: NormAppt[];
  /** Count after the active status filter is applied — may differ from normAppts.length. */
  filteredCount: number;
  pagedAppts: NormAppt[];
  apptPage: number;
  totalApptPages: number;
  statusFilter: ApptStatusFilter;
  onStatusFilterChange: (status: ApptStatusFilter) => void;
  loading: boolean;
  error: string | null;
  onPageChange: (p: number) => void;
  onRetry: () => void;
}) {
  const { formatAmount } = useCurrency();
  // Chip counts always reflect the FULL day's list regardless of which filter
  // is active — only the table rows below narrow down, so a chip never
  // changes its own count out from under the user when they click it.
  const chips: Array<{ status: Exclude<ApptStatusFilter, "all">; label: string; cls: string }> = [
    { status: "completed", label: "Completed", cls: "db-appt-chip-success" },
    { status: "upcoming",  label: "Upcoming",  cls: "db-appt-chip-warning" },
    { status: "partial",   label: "Partial",   cls: "db-appt-chip-partial" },
    { status: "cancelled", label: "Cancelled", cls: "db-appt-chip-danger" },
    { status: "no-show",   label: "No Show",   cls: "db-appt-chip-noshow" },
    { status: "deleted",   label: "Deleted",   cls: "db-appt-chip-neutral" },
  ];

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
          {chips.map((c) => (
            <button
              key={c.status}
              type="button"
              className={`db-appt-chip ${c.cls}${statusFilter === c.status ? " db-appt-chip--active" : ""}`}
              onClick={() => onStatusFilterChange(c.status)}
              aria-pressed={statusFilter === c.status}
              title={`Show only ${c.label.toLowerCase()} appointments`}
            >
              {normAppts.filter(a => a.status === c.status).length} {c.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <TableRowsSkeleton />
      ) : error ? (
        <SectionError message={error} onRetry={onRetry} />
      ) : normAppts.length === 0 ? (
        <div className="db-empty">No appointments scheduled for today.</div>
      ) : filteredCount === 0 ? (
        <div className="db-empty">
          No {statusFilter === "no-show" ? "no-show" : statusFilter} appointments today.{" "}
          <button type="button" className="db-appt-clear-filter" onClick={() => onStatusFilterChange("all")}>
            Clear filter
          </button>
        </div>
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
                <div
                  className={`db-appt-row${appt.status === "deleted" ? " db-appt-row--deleted" : ""}`}
                  key={appt.id}
                >
                  <span className="db-appt-client">
                    <span className="db-avatar">
                      {(() => { const ini = getInitialsFromFullName(appt.client); return ini ? ini : <PersonFill size={12} />; })()}
                    </span>
                    {appt.client}
                  </span>
                  <span className="db-appt-service">{appt.service}</span>
                  <span className="db-appt-staff">{appt.staff}</span>
                  <span className="db-appt-time">
                    <ClockHistory size={12} className="me-1" />{appt.time}
                  </span>
                  <span className="db-appt-amount">
                    {appt.status === "partial" ? (
                      <>
                        {formatAmount(appt.paidAmount)}
                        <span className="db-appt-amount-due"> of {formatAmount(appt.amount)}</span>
                      </>
                    ) : (
                      formatAmount(appt.amount)
                    )}
                  </span>
                  <StatusBadge status={appt.status} />
                </div>
              ))}
            </div>
          </div>

          <div className="db-appt-pagination">
            <span className="db-appt-pg-info">
              Showing{" "}
              <strong>{(apptPage - 1) * PAGE_SIZE + 1}–{Math.min(apptPage * PAGE_SIZE, filteredCount)}</strong>
              {" "}of <strong>{filteredCount}</strong> appointments
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
                      aria-current={apptPage === page ? 'page' : undefined}
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

// ─── Section: Staff Revenue Donut Card ────────────────────────────────────────
// Replaces the old Services donut — same visual layout, but shows how much
// revenue each staff member generated, with its own period filter (independent
// of the Revenue Trend chart above).

type StaffRevSlice = {
  id: string;
  name: string;
  role: string;
  value: number;
  color: string;
  colorIndex: number;
};

const StaffRevenueCard = memo(function StaffRevenueCard({
  entries,
  period,
  onPeriodChange,
  loading,
  error,
  onRetry,
}: {
  entries: Array<{ id: string; name: string; role: string; revenue: number }>;
  period: RevPeriod;
  onPeriodChange: (p: RevPeriod) => void;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const { formatAmount } = useCurrency();
  const slices: StaffRevSlice[] = useMemo(
    () => entries.map((e, i) => ({
      id: e.id, name: e.name, role: e.role, value: e.revenue,
      color: SVC_CHART_COLORS[i % SVC_CHART_COLORS.length],
      colorIndex: i % SVC_CHART_COLORS.length,
    })),
    [entries]
  );

  const totalValue = useMemo(
    () => slices.reduce((sum, s) => sum + s.value, 0),
    [slices]
  );

  return (
    <div className="db-card db-svc-card">
      <div className="db-card-header">
        <div>
          <h3 className="db-card-title">Staff Revenue</h3>
          <p className="db-card-sub">How much revenue each staff member generated</p>
        </div>
        <div className="db-rev-filters">
          {(["today", "weekly", "monthly", "yearly"] as const).map((p) => (
            <button
              key={p}
              className={`db-rev-filter-btn${period === p ? " active" : ""}`}
              onClick={() => onPeriodChange(p)}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <DonutSkeleton />
      ) : error ? (
        <SectionError message={error} onRetry={onRetry} />
      ) : slices.length === 0 ? (
        <div className="db-empty">No staff revenue in this period yet.</div>
      ) : (
        <div className="db-svc-donut-layout">
          <div className="db-svc-donut-wrap">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={slices}
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={88}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {slices.map((entry, idx) => (
                    <Cell key={`staff-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [formatAmount(val || 0), ""]}
                  contentStyle={{ borderRadius: 10, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="db-svc-donut-center">
              <span className="db-svc-donut-total">{formatAmount(totalValue)}</span>
              <span className="db-svc-donut-label">total revenue</span>
            </div>
          </div>

          <div className="db-svc-donut-list">
            {slices.map((s) => {
              const pct = totalValue > 0 ? ((s.value / totalValue) * 100).toFixed(1) : "0.0";
              return (
                <div className="db-svc-donut-row" key={s.id}>
                  <span className={`db-svc-donut-dot db-svc-donut-dot--${s.colorIndex}`} />
                  <div className="db-svc-donut-info">
                    <span className="db-svc-donut-name">{s.name}</span>
                    <span className="db-svc-donut-meta">{s.role}</span>
                  </div>
                  <div className="db-svc-donut-right">
                    <span className="db-svc-donut-price">{formatAmount(s.value)}</span>
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
  const { currencySymbol } = useCurrency();
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
        <StaffListSkeleton />
      ) : error ? (
        <SectionError message={error} onRetry={onRetry} />
      ) : topStaff.length === 0 ? (
        <div className="db-empty">No staff data available.</div>
      ) : (
        <div className="db-staff-list">
          {topStaff.slice(0, 3).map((s, i) => {
            const initials = (s.avatar || getInitialsFromFullName(s.name)).trim();
            const rev      = s.revenue ?? 0;
            return (
              <div className="db-staff-item" key={s.id}>
                <span className="db-rank">#{i + 1}</span>
                <div className="db-staff-avatar">{initials ? initials.slice(0, 2).toUpperCase() : <PersonFill size={14} />}</div>
                <div className="db-staff-info">
                  <div className="db-staff-name">{s.name}</div>
                  <div className="db-staff-role">{s.role ?? "Staff"}</div>
                </div>
                <div className="db-staff-stats">
                  <div className="db-staff-rev">
                    {rev >= 1000 ? `${currencySymbol}${(rev / 1000).toFixed(0)}k` : `${currencySymbol}${rev}`}
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [apptPage,  setApptPage]  = useState(1);
  const [apptStatusFilter, setApptStatusFilter] = useState<ApptStatusFilter>("all");
  const [revPeriod, setRevPeriod] = useState<RevPeriod>("monthly");
  const [staffRevPeriod, setStaffRevPeriod] = useState<RevPeriod>("monthly");

  // ── Granular selectors — each section only re-renders when its own slice changes
  const summary      = useAppSelector((s) => s.dashboard.data?.summary);
  const { appointments, loading: apptsLoading, error: apptsError, refetch: refetchAppts } = useTodayAppointments();
  const revenueChart = useAppSelector((s) => s.dashboard.data?.revenueChart ?? EMPTY_REVENUE_CHART);
  const topStaff     = useAppSelector((s) => s.dashboard.data?.topStaff ?? EMPTY_TOP_STAFF) as TopStaffEntry[];
  const staffRevenue        = useAppSelector((s) => s.dashboard.staffRevenue);
  const staffRevenueLoading = useAppSelector((s) => s.dashboard.staffRevenueLoading);
  const staffRevenueError   = useAppSelector((s) => s.dashboard.staffRevenueError);
  const { pendingPayments, pendingLoading, refetchPending } = usePendingPayments();
  const todaysBirthdays = useAppSelector((s) => s.dashboard.data?.todaysBirthdays);
  const recentActivity  = useAppSelector((s) => s.dashboard.data?.recentActivity ?? EMPTY_ACTIVITY);
  const dashLoading  = useAppSelector((s) => s.dashboard.loading);
  const chartLoading = useAppSelector((s) => s.dashboard.chartLoading);
  const chartError   = useAppSelector((s) => s.dashboard.chartError);
  const dashError    = useAppSelector((s) => s.dashboard.error);

  // ── Mount: full load once ─────────────────────────────────────────────────
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    dispatch(fetchDashboardAll({ period: revPeriod, date: today }));
    dispatch(fetchStaffRevenue({ period: staffRevPeriod }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset appointment page when list or the active status filter changes
  useEffect(() => {
    setApptPage(1);
  }, [appointments.length, apptStatusFilter]);

  // Clicking an already-active status chip clears the filter back to "all" —
  // otherwise there'd be no way to get back without a page reload.
  const handleApptStatusFilterChange = useCallback((status: ApptStatusFilter) => {
    setApptStatusFilter((prev) => (prev === status ? "all" : status));
  }, []);

  // ── Period change: only re-fetch the chart, nothing else ─────────────────
  const handlePeriodChange = useCallback(
    (p: RevPeriod) => {
      setRevPeriod(p);
      dispatch(fetchRevenueChart({ period: p }));
    },
    [dispatch]
  );

  // Staff Revenue card's period filter is independent of the Revenue Trend chart's.
  const handleStaffRevPeriodChange = useCallback(
    (p: RevPeriod) => {
      setStaffRevPeriod(p);
      dispatch(fetchStaffRevenue({ period: p }));
    },
    [dispatch]
  );

  const retryStaffRevenue = useCallback(() => {
    dispatch(fetchStaffRevenue({ period: staffRevPeriod }));
  }, [dispatch, staffRevPeriod]);

  // ── Retry callbacks ────────────────────────────────────────────────────────
  const retryFull = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    dispatch(fetchDashboardAll({ period: revPeriod, date: today }));
    refetchAppts();
    refetchPending();
  }, [dispatch, revPeriod, refetchAppts, refetchPending]);

  const handleRefresh = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    // fetchDashboardAll already returns revenueChart as part of its bundled
    // response (see salon-dashboard.repository.ts's getAll()) — the separate
    // fetchRevenueChart call here was fetching the exact same data a second
    // time on every refresh/tab-focus. Its own chartLoading isn't needed
    // either: the chart's loading prop already ORs in the general dashLoading
    // flag (see chartLoading={dashLoading || chartLoading} below).
    dispatch(fetchDashboardAll({ period: revPeriod, date: today }));
    dispatch(fetchStaffRevenue({ period: staffRevPeriod }));
    refetchAppts();
    refetchPending();
  }, [dispatch, revPeriod, staffRevPeriod, refetchAppts, refetchPending]);

  // A client/appointment/sale created elsewhere (Clients page, Calendar,
  // Quick Sale) never pushes an update into this page's KPI cards (New
  // Clients, Today's Revenue, etc.) — they only ever loaded once, on mount.
  // Refresh whenever the tab regains focus/visibility (i.e. you actually
  // come back to look at it), so "add a client, come back to Dashboard"
  // reflects without needing the manual Refresh button. Deliberately NOT a
  // recurring timer — this used to also poll every 60s in the background
  // regardless of whether the dashboard was even being looked at.
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") handleRefresh(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", handleRefresh);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", handleRefresh);
    };
  }, [handleRefresh]);

  const retryChart = useCallback(() => {
    dispatch(fetchRevenueChart({ period: revPeriod }));
  }, [dispatch, revPeriod]);

  // ── Memoized derived state ─────────────────────────────────────────────────
  const normAppts = useMemo(
    () => appointments.map(normalise),
    [appointments]
  );

  // Status-chip filter — counts on the chips themselves always reflect the
  // FULL day's list (see AppointmentsTable), only the table rows/pagination
  // below narrow to the selected status.
  const filteredAppts = useMemo(
    () => apptStatusFilter === "all" ? normAppts : normAppts.filter(a => a.status === apptStatusFilter),
    [normAppts, apptStatusFilter]
  );

  const totalApptPages = useMemo(
    () => Math.max(1, Math.ceil(filteredAppts.length / PAGE_SIZE)),
    [filteredAppts.length]
  );

  const pagedAppts = useMemo(
    () => filteredAppts.slice((apptPage - 1) * PAGE_SIZE, apptPage * PAGE_SIZE),
    [filteredAppts, apptPage]
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
      return [{ label: "Today", completed: 0, pending: 0, partial: 0, cancelled: 0, noShow: 0 }];
    }

    const hourSet = new Set<number>();
    normAppts.forEach(a => { const h = parseHour(a.time); if (h !== null) hourSet.add(h); });

    if (hourSet.size === 0) {
      return [{
        label: "Today",
        completed: normAppts.filter(a => a.status === "completed").length,
        pending:   normAppts.filter(a => a.status === "upcoming").length,
        partial:   normAppts.filter(a => a.status === "partial").length,
        cancelled: normAppts.filter(a => a.status === "cancelled").length,
        noShow:    normAppts.filter(a => a.status === "no-show").length,
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
        pending:   slot.filter(a => a.status === "upcoming").length,
        partial:   slot.filter(a => a.status === "partial").length,
        cancelled: slot.filter(a => a.status === "cancelled").length,
        noShow:    slot.filter(a => a.status === "no-show").length,
      };
    });
  }, [normAppts]);

  // Revenue Overview must reflect actual completed sales, not quoted/booked
  // appointment amounts (which include upcoming and cancelled appointments
  // and don't match the final billed total). The backend's "today" chart is
  // bucketed by UTC hour, so both labels need shifting to local time —
  // fullLabel equals month for "today" (the hour IS the full context), so it
  // needs the identical conversion or the tooltip would show the raw UTC
  // hour while the axis correctly shows local time.
  const displayRevenueChart = useMemo(() => {
    if (revPeriod !== "today") return revenueChart;
    return revenueChart.map((pt) => ({
      ...pt,
      month: utcHourLabelToLocal(pt.month),
      fullLabel: utcHourLabelToLocal(pt.fullLabel),
    }));
  }, [revenueChart, revPeriod]);

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
  const goToStaff     = useCallback(() => navigate("/dashboard/team/members"),     [navigate]);
  const goToQuickWhatsApp = useCallback(() => navigate("/dashboard/marketing/quick-whatsapp"), [navigate]);
  // "Collect Now" on the Pending Payments card — goes to the Detailed
  // Appointment Report pre-filtered to unpaid/partially-paid appointments,
  // not the Sales Summary report (which has no pending/unpaid status).
  const goToPendingAppointments = useCallback(
    () => navigate("/reports/appointments/appointment-detail?status=booked,partial"),
    [navigate]
  );

  const quickActionsWithHandlers = useMemo(() => [
    { label: "New Appointment", icon: <CalendarCheck size={22} />, onClick: goToCalendar,  tone: "neutral" },
    { label: "Add Client",      icon: <PersonPlus size={22} />,    onClick: goToClients,   tone: "info" },
    { label: "Quick Sale",      icon: <CartPlus size={22} />,      onClick: goToSales,     tone: "success" },
    { label: "Campaign",        icon: <Megaphone size={22} />,     onClick: goToMarketing, tone: "accent" },
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
              className={`db-quick-btn db-quick-btn--${qa.tone}`}
              onClick={qa.onClick}
            >
              <span className="db-quick-icon">
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
            <span className="db-quick-icon">
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

      {/* ── REVENUE OVERVIEW + TODAY'S SUMMARY ── */}
      <div className="db-overview-row">

        {/* Revenue chart — only re-renders when chart data or chartLoading changes */}
        <RevenueChartPanel
          revenue={displayRevenueChart}
          chartLoading={dashLoading || chartLoading}
          error={chartError ?? dashError}
          revPeriod={revPeriod}
          onPeriodChange={handlePeriodChange}
          onRetry={retryChart}
        />

        <AppointmentSummaryPanel
          apptChartData={apptChartData}
          loading={dashLoading}
        />

      </div>

      {/* ── TODAY'S APPOINTMENTS TABLE ── */}
      <AppointmentsTable
        normAppts={normAppts}
        filteredCount={filteredAppts.length}
        pagedAppts={pagedAppts}
        apptPage={apptPage}
        totalApptPages={totalApptPages}
        statusFilter={apptStatusFilter}
        onStatusFilterChange={handleApptStatusFilterChange}
        loading={dashLoading || apptsLoading}
        error={apptsError || dashError}
        onPageChange={setApptPage}
        onRetry={retryFull}
      />

      {/* ── PENDING PAYMENTS / BIRTHDAYS ── */}
      <BottomStatCards
        pendingPayments={pendingPayments}
        birthdays={todaysBirthdays}
        loading={dashLoading}
        pendingLoading={pendingLoading}
        onNavigateWhatsApp={goToQuickWhatsApp}
        onNavigatePendingAppointments={goToPendingAppointments}
      />

      {/* ── STAFF REVENUE / TOP STAFF / RECENT ACTIVITY ── */}
      <div className="db-bottom-row db-bottom-row--triple">
        <StaffRevenueCard
          entries={staffRevenue}
          period={staffRevPeriod}
          onPeriodChange={handleStaffRevPeriodChange}
          loading={staffRevenueLoading}
          error={staffRevenueError}
          onRetry={retryStaffRevenue}
        />
        <TopStaffCard
          topStaff={topStaff}
          loading={dashLoading}
          error={dashError}
          onNavigate={goToStaff}
          onRetry={retryFull}
        />
        <RecentActivityCard
          activity={recentActivity}
          loading={dashLoading}
          error={dashError}
        />
      </div>

    </div>
  );
}
