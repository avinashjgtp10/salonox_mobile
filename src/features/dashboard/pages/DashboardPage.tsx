import {
  useEffect,
  useState,
  useMemo,
  useCallback,
  memo,
} from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/DashboardPage.scss";
import SpotlightHighlightCard from "../components/SpotlightHighlightCard";
import { useNavigate } from "react-router-dom";
import {
  AreaChart,
  Area,
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
  ExclamationTriangleFill,
  ArrowRepeat,
  CashStack,
  Cake2,
  CreditCard2Front,
  PersonFill,
  Whatsapp,
  LockFill,
  Wifi,
  Wallet2,
} from "react-bootstrap-icons";
import type { ReactNode } from "react";
import { getInitialsFromFullName } from "../../../utils/initials";
import { formatDateDDMMYYYY } from "../../../utils/dateFormat";
import { buildClientWhatsAppLink } from "../../../utils/whatsapp";
import { formatPaymentMode } from "../../../utils/paymentMode";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import Skeleton from "../../../components/ui/Skeleton";
import {
  fetchDashboardCombined,
  fetchRevenueChart,
} from "../../../middleware/dashboard/dashboard.thunk";
import type { TodayAppointment } from "../../../types/dashboard.types";
import type { DashboardCombinedResponse } from "../../../middleware/dashboard/dashboard.thunk";
import { useTodayAppointments } from "../hooks/useTodayAppointments";
import { useMaskedCurrency } from "../hooks/useMaskedCurrency";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { resendClosedCounterMessage } from "../../cash-management/cashManagement.api";

// ─── Constants ────────────────────────────────────────────────────────────────

// Stable empty-array fallback for the selector below. `?? []` inline would
// create a brand-new array reference every time the selector runs, which
// defeats useAppSelector's reference-equality check and forces the whole
// page to re-render on any unrelated dashboard-slice update for as long as
// `data` stays null.
const EMPTY_REVENUE_CHART: DashboardCombinedResponse["revenueChart"] = [];
const EMPTY_PAYMENT_MODE_BREAKDOWN: DashboardCombinedResponse["paymentModeBreakdown"] = { entries: [], total: 0 };

const PAGE_SIZE = 5;

type RevPeriod = "today" | "weekly" | "monthly" | "yearly";

// ─── Helpers ──────────────────────────────────────────────────────────────────

// IST calendar date (YYYY-MM-DD) for "yesterday" — matches how the backend
// (cash-management.repository.ts's closeCounter) dates a counter's own
// close-message collection, so Resend re-sends the SAME day it looks like
// on screen, not whatever the server's own local timezone happens to be.
function yesterdayIsoDateIST(): string {
  const now = new Date();
  const istNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  istNow.setDate(istNow.getDate() - 1);
  const y = istNow.getFullYear();
  const m = String(istNow.getMonth() + 1).padStart(2, "0");
  const d = String(istNow.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

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

// Matches the backend's standard permission-denial message ("You do not
// have permission to perform this action (permKey)") — several dashboard
// sections (Today's Appointments needs view_calendar, Staff Revenue needs
// view_dashboard_staff_performance, etc.) fetch from their own module's API
// rather than the bundled dashboard endpoint, so they can fail independently
// of the page's own view_dashboard/view_dashboard_financials permissions.
// That's an expected, permanent state — not a transient failure — so it
// gets its own honest copy instead of the raw backend string, and no Retry
// button, since retrying can never succeed without a permission change.
const PERMISSION_DENIED_RE = /^You do not have permission to perform this action \(([^)]+)\)/;

const SectionError = memo(function SectionError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  if (PERMISSION_DENIED_RE.test(message)) {
    return (
      <div className="db-section-error db-section-error--perm">
        <LockFill size={13} className="me-1" />
        You don't have permission to view this section. Ask your salon owner to enable it in Settings → Roles &amp; Permissions.
      </div>
    );
  }
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
  const { formatAmount } = useMaskedCurrency();
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

// ─── Section: KPI Cards ───────────────────────────────────────────────────────

type NormSummary = {
  totalRevenue?: number;
  todayRevenue?: number;
  revenueChange?: number | null;
  todayRevenueChange?: number | null;
  todayAppointmentsCount?: number;
  yesterdayAppointmentsCount?: number;
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
  theme, icon, tabLabels, front, back, loading, error, onRetry, defaultTab = 0,
}: {
  theme: string;
  icon: React.ReactNode;
  /** Short labels for the two-way pill toggle, e.g. ["This Month", "Last Month"]. */
  tabLabels: [string, string];
  front: KpiFace;
  back: KpiFace;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  /** Which face is shown before the user touches the toggle. Defaults to front (0). */
  defaultTab?: 0 | 1;
}) {
  // Explicit, static choice — no auto-advancing timer and no flip animation.
  // Both stats are always one click away via the pill toggle, but nothing on
  // the card moves on its own.
  const [activeTab, setActiveTab] = useState<0 | 1>(defaultTab);

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
  const { formatAmount, currencySymbol, currencyCode, canSeeFinancials } = useMaskedCurrency();
  const fmt = (n?: number) => (n != null ? formatAmount(n) : "—");
  // Revenue KPI card only — a whole-rupee figure (no paise) reads cleaner on
  // this tile than the paise-precise amount formatAmount() gives everywhere
  // else (receipts, Sales Summary, etc., which must stay exact to the paisa).
  const fmtRounded = (n?: number) =>
    !canSeeFinancials ? `${currencySymbol}******` : n != null ? `${currencySymbol}${Math.round(n).toLocaleString("en-IN")}` : "—";
  const CurrencyIcon = getCurrencyIcon(currencyCode);
  const cards = [
    {
      theme: "revenue",
      icon:  <CurrencyIcon size={20} />,
      tabLabels: ["This Month", "Last Month"] as [string, string],
      defaultTab: 0 as const,
      front: {
        label:  "Total Revenue",
        value:  fmtRounded(summary?.totalRevenue),
        change: fmtChange(summary?.revenueChange ?? undefined),
        sub:    "this month",
      },
      back: {
        label:  "Last Month's Revenue",
        value:  fmtRounded(summary?.lastMonthRevenue),
        change: null,
        sub:    "last month",
      },
    },
    {
      theme: "appointments",
      icon:  <CalendarCheck size={20} />,
      tabLabels: ["Today", "Yesterday"] as [string, string],
      defaultTab: 0 as const,
      front: {
        label:  "Appointments Today",
        value:  String(summary?.todayAppointmentsCount ?? normApptCount),
        change: null,
        sub:    "today",
      },
      back: {
        label:  "Appointments Yesterday",
        value:  summary?.yesterdayAppointmentsCount?.toLocaleString("en-IN") ?? "—",
        change: null,
        sub:    "yesterday",
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
          defaultTab={card.defaultTab}
        />
      ))}
    </div>
  );
});

// ─── Section: Bottom Stat Cards (Pending Payments / Birthdays / Inactive Clients) ──

const BottomStatCards = memo(function BottomStatCards({
  pendingPayments, birthdays, loading, pendingLoading, onNavigatePendingAppointments, salonName,
}: {
  pendingPayments: { count: number; amount: number } | undefined;
  birthdays: { clients: Array<{ id: string; name: string; phone: string | null; phoneCountryCode: string | null }> } | undefined;
  loading: boolean;
  pendingLoading: boolean;
  onNavigatePendingAppointments: () => void;
  salonName: string;
}) {
  const { formatAmount } = useMaskedCurrency();
  const fmt = (n?: number) => (n != null ? formatAmount(n) : "—");
  const birthdayClients = birthdays?.clients ?? [];

  return (
    <div className="db-mini-stats-row">
      <div className="db-mini-stat-card db-mini-stat-card--danger">
        <div className="db-mini-stat-card__top">
          <span className="db-mini-stat-card__label">Due amount</span>
          <span className="db-mini-stat-card__icon"><CreditCard2Front size={18} /></span>
        </div>
        {pendingLoading ? (
          <Skeleton width="50%" height={26} className="db-mini-stat-card__value-skel" />
        ) : (
          <div className="db-mini-stat-card__value">{fmt(pendingPayments?.amount)}</div>
        )}
        <div className="db-mini-stat-card__sub">
          {pendingPayments?.count ?? 0} client{(pendingPayments?.count ?? 0) !== 1 ? "s" : ""}
        </div>
        <button className="db-mini-stat-card__cta" onClick={onNavigatePendingAppointments}>
          Collect Now <ChevronRight size={11} />
        </button>
      </div>

      <div className="db-mini-stat-card db-mini-stat-card--pink">
        <div className="db-mini-stat-card__top">
          <span className="db-mini-stat-card__label">Today's Birthdays</span>
          <span className="db-mini-stat-card__icon"><Cake2 size={18} /></span>
        </div>
        {loading ? (
          <Skeleton width="50%" height={26} className="db-mini-stat-card__value-skel" />
        ) : birthdayClients.length > 0 ? (
          <div className="db-birthday-list">
            {birthdayClients.map((c) => {
              const waLink = buildClientWhatsAppLink(c.phone, c.phoneCountryCode);
              const text = `Happy Birthday, ${c.name}! 🎉 Wishing you a wonderful day, from all of us at ${salonName}.`;
              return (
                <div key={c.id} className="db-birthday-list__row">
                  <span className="db-birthday-list__name" title={c.name}>{c.name}</span>
                  {waLink ? (
                    <a
                      className="db-birthday-list__wa"
                      href={`${waLink}?text=${encodeURIComponent(text)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Send birthday wishes to ${c.name} on WhatsApp`}
                    >
                      <Whatsapp size={15} />
                    </a>
                  ) : (
                    <span className="db-birthday-list__wa db-birthday-list__wa--disabled" title="No phone number on file">
                      <Whatsapp size={15} />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <>
            <div className="db-mini-stat-card__value">0</div>
            <div className="db-mini-stat-card__sub">None today</div>
          </>
        )}
      </div>
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

const REV_GENDER_OPTIONS: { id: string; label: string }[] = [
  { id: "all", label: "All Genders" },
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
];

const RevenueChartPanel = memo(function RevenueChartPanel({
  revenue,
  chartLoading,
  error,
  revPeriod,
  onPeriodChange,
  revGender,
  onGenderChange,
  onRetry,
}: {
  revenue: Array<{ month: string; fullLabel: string; revenue: number }>;
  chartLoading: boolean;
  error: string | null;
  revPeriod: RevPeriod;
  onPeriodChange: (p: RevPeriod) => void;
  revGender: string;
  onGenderChange: (g: string) => void;
  onRetry: () => void;
}) {
  const { formatAmount, currencySymbol, canSeeFinancials } = useMaskedCurrency();
  const fmt = (n?: number) => (n != null ? formatAmount(n) : "—");
  // When financials are masked, the chart still has to render (container/
  // labels/period toggle all stay visible) but real relative bar/area
  // heights would themselves leak comparative revenue info even with the
  // numbers hidden — a much bigger November bar than October's says
  // something financial without a single digit shown. Flattening every
  // point to the same value keeps the shape present but unreadable.
  const localRevenue = useMemo(
    () => canSeeFinancials ? revenue : revenue.map((pt) => ({ ...pt, revenue: 1 })),
    [revenue, canSeeFinancials]
  );

  // Computed from the real `revenue` prop, not the flattened localRevenue —
  // this drives both the masked-text header total (fmt() hides the number
  // either way) and the "no revenue this period" empty state below, which
  // must still reflect real data even when the chart itself is flattened.
  const periodTotal = useMemo(
    () => revenue.reduce((sum, r) => sum + (Number(r.revenue) || 0), 0),
    [revenue]
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
          <select
            className="db-rev-gender-select"
            value={revGender}
            onChange={(e) => onGenderChange(e.target.value)}
            aria-label="Filter revenue by client gender"
          >
            {REV_GENDER_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
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
              tickFormatter={(v) => !canSeeFinancials ? `${currencySymbol}**` : v >= 1000 ? `${currencySymbol}${(v / 1000).toFixed(0)}k` : `${currencySymbol}${v}`}
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

// ─── Section: Overall Collection (payment mode breakdown) ─────────────────────
// Replaces the old appointment-status "Today's Summary" bar chart — this
// salon runs on cash/UPI collection at the front desk, so a live breakdown of
// how today's money actually came in is more actionable here than another
// view of appointment counts (which the table below already covers).

type CollectionPeriod = "today" | "yesterday" | "week" | "month";

const COLLECTION_PERIOD_LABELS: Record<CollectionPeriod, string> = {
  today: "Today",
  yesterday: "Yesterday",
  week: "This week",
  month: "This month",
};

const PAYMENT_MODE_ICON: Record<string, { icon: ReactNode; bg: string; fg: string }> = {
  cash:   { icon: <CashStack size={16} />,        bg: "#f0fdf4", fg: "#16a34a" },
  upi:    { icon: <Wifi size={16} />,              bg: "#eff6ff", fg: "#3b82f6" },
  card:   { icon: <CreditCard2Front size={16} />,  bg: "#eef2ff", fg: "#6366f1" },
};
const DEFAULT_MODE_ICON = { icon: <Wallet2 size={16} />, bg: "#f8fafc", fg: "#64748b" };

// Requested display order — Cash, UPI, Card always lead regardless of which
// one collected the most; anything else (Wallet, …) falls in after, sorted
// by amount like before. 'split' is excluded entirely server-side (see
// getPaymentModeBreakdown) since it isn't a real collection channel.
const PAYMENT_MODE_ORDER: Record<string, number> = { cash: 0, upi: 1, card: 2 };

const OverallCollectionPanel = memo(function OverallCollectionPanel({
  entries,
  total,
  period,
  onPeriodChange,
  loading,
  error,
  onRetry,
}: {
  entries: Array<{ method: string; amount: number; percentage: number }>;
  total: number;
  period: CollectionPeriod;
  onPeriodChange: (p: CollectionPeriod) => void;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const { formatAmount, canSeeFinancials } = useMaskedCurrency();
  const fmt = (n: number) => (canSeeFinancials ? formatAmount(n) : "₹******");
  const { showSuccess, showError, overlay } = useStatusOverlay();
  const [resending, setResending] = useState(false);

  // Cash/UPI/Card lead in that fixed order regardless of amount; anything
  // else keeps the backend's amount-descending order after them.
  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => {
      const ra = PAYMENT_MODE_ORDER[a.method] ?? 99;
      const rb = PAYMENT_MODE_ORDER[b.method] ?? 99;
      if (ra !== rb) return ra - rb;
      return b.amount - a.amount;
    }),
    [entries]
  );

  const handleResend = async () => {
    setResending(true);
    try {
      const result = await resendClosedCounterMessage(yesterdayIsoDateIST());
      if (result.sent) {
        showSuccess("Yesterday's Close Counter message resent to WhatsApp");
      } else if (result.status === "IN_PROGRESS") {
        showSuccess("Resend queued — it'll arrive on WhatsApp shortly");
      } else {
        showError(result.failure_reason || "Could not resend — no closed counter found for yesterday");
      }
    } catch (err: any) {
      showError(err?.response?.data?.message || "Could not resend the message");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="db-card db-card-md">
      {overlay}
      <div className="db-card-header">
        <div>
          <h3 className="db-card-title">Overall Collection</h3>
          <p className="db-card-sub">{COLLECTION_PERIOD_LABELS[period]}'s payment mode breakdown</p>
        </div>
        {period === "yesterday" && (
          <button
            className="db-collection-resend-btn"
            title="Resend yesterday's Close Counter details to WhatsApp"
            disabled={resending}
            onClick={handleResend}
          >
            {resending ? <ArrowRepeat size={14} className="db-refresh-spin" /> : <Whatsapp size={14} />}
            {resending ? "Resending…" : "Resend"}
          </button>
        )}
      </div>

      <div className="db-rev-filters db-collection-filters">
        {(["today", "yesterday", "week", "month"] as const).map((p) => (
          <button
            key={p}
            className={`db-rev-filter-btn${period === p ? " active" : ""}`}
            onClick={() => onPeriodChange(p)}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <ChartSkeleton />
      ) : error ? (
        <SectionError message={error} onRetry={onRetry} />
      ) : entries.length === 0 ? (
        <div className="db-empty">No payments collected in this period.</div>
      ) : (
        <div className="db-collection-list">
          {sortedEntries.map((e) => {
            const style = PAYMENT_MODE_ICON[e.method] ?? DEFAULT_MODE_ICON;
            return (
              <div key={e.method} className="db-collection-row">
                <span className="db-collection-icon" style={{ background: style.bg, color: style.fg }}>
                  {style.icon}
                </span>
                <div className="db-collection-info">
                  <div className="db-collection-label">{formatPaymentMode(e.method)}</div>
                  <div className="db-collection-amount">{fmt(e.amount)}</div>
                </div>
                <span className="db-collection-pct" style={{ background: style.bg, color: style.fg }}>
                  {e.percentage}%
                </span>
              </div>
            );
          })}
          <div className="db-collection-row db-collection-row--total">
            <span className="db-collection-icon" style={{ background: "#f5f3ff", color: "#7c3aed" }}>
              <CreditCard2Front size={16} />
            </span>
            <div className="db-collection-info">
              <div className="db-collection-label">Payments Received {COLLECTION_PERIOD_LABELS[period]}</div>
              <div className="db-collection-amount">{fmt(total)}</div>
            </div>
            <span className="db-collection-pct" style={{ background: "#f5f3ff", color: "#7c3aed" }}>
              100%
            </span>
          </div>
        </div>
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
  const { formatAmount } = useMaskedCurrency();
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [apptPage,  setApptPage]  = useState(1);
  const [apptStatusFilter, setApptStatusFilter] = useState<ApptStatusFilter>("all");
  const [revPeriod, setRevPeriod] = useState<RevPeriod>("monthly");
  const [revGender, setRevGender] = useState<string>("all");
  const [collectionPeriod, setCollectionPeriod] = useState<CollectionPeriod>("today");

  // ── Granular selectors — each section only re-renders when its own slice changes
  const summary      = useAppSelector((s) => s.dashboard.data?.summary);
  const rawAppointments = useAppSelector((s) => s.dashboard.data?.todayAppointments);
  const { appointments } = useTodayAppointments(rawAppointments);
  const revenueChart = useAppSelector((s) => s.dashboard.data?.revenueChart ?? EMPTY_REVENUE_CHART);
  const paymentModeBreakdown = useAppSelector((s) => s.dashboard.data?.paymentModeBreakdown ?? EMPTY_PAYMENT_MODE_BREAKDOWN);
  const pendingPayments = useAppSelector((s) => s.dashboard.data?.pendingPayments);
  const todaysBirthdays = useAppSelector((s) => s.dashboard.data?.todaysBirthdays);
  const salonName = useAppSelector((s: any) => s.salon?.currentSalon?.business_name) || "our salon";
  const dashLoading  = useAppSelector((s) => s.dashboard.loading);
  const chartLoading = useAppSelector((s) => s.dashboard.chartLoading);
  const chartError   = useAppSelector((s) => s.dashboard.chartError);
  const dashError    = useAppSelector((s) => s.dashboard.error);

  // ── Mount: single combined load ───────────────────────────────────────────
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    dispatch(fetchDashboardCombined({ period: revPeriod, date: today, collectionPeriod }));
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
      dispatch(fetchRevenueChart({ period: p, gender: revGender }));
    },
    [dispatch, revGender]
  );

  // Gender change: same "only re-fetch the chart" treatment as the period toggle.
  const handleGenderChange = useCallback(
    (g: string) => {
      setRevGender(g);
      dispatch(fetchRevenueChart({ period: revPeriod, gender: g }));
    },
    [dispatch, revPeriod]
  );

  // Overall Collection card's Today/Yesterday/Week filter is independent of
  // every other period control on this page. Its filter now travels as part
  // of the same combined fetch as everything else (see fetchDashboardCombined),
  // so changing it re-fetches the whole bundle rather than just this card —
  // heavier per click, but keeps the dashboard down to one endpoint.
  const handleCollectionPeriodChange = useCallback(
    (p: CollectionPeriod) => {
      setCollectionPeriod(p);
      const today = new Date().toISOString().split("T")[0];
      dispatch(fetchDashboardCombined({ period: revPeriod, date: today, collectionPeriod: p }));
    },
    [dispatch, revPeriod]
  );

  const retryPaymentModeBreakdown = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    dispatch(fetchDashboardCombined({ period: revPeriod, date: today, collectionPeriod }));
  }, [dispatch, revPeriod, collectionPeriod]);

  // ── Retry callbacks ────────────────────────────────────────────────────────
  const retryFull = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    dispatch(fetchDashboardCombined({ period: revPeriod, date: today, collectionPeriod }));
  }, [dispatch, revPeriod, collectionPeriod]);

  const handleRefresh = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    // fetchDashboardCombined already returns revenueChart as part of its
    // bundled response — the separate fetchRevenueChart call here was
    // fetching the exact same data a second time on every refresh/tab-focus.
    // Its own chartLoading isn't needed either: the chart's loading prop
    // already ORs in the general dashLoading flag (see
    // chartLoading={dashLoading || chartLoading} below).
    dispatch(fetchDashboardCombined({ period: revPeriod, date: today, collectionPeriod }));
    // fetchDashboardCombined's bundled chart is always all-gender (that
    // combined endpoint has no gender param) — re-apply an active gender
    // filter with its own fetch so Refresh doesn't silently drop back to
    // "All Genders".
    if (revGender !== "all") dispatch(fetchRevenueChart({ period: revPeriod, gender: revGender }));
  }, [dispatch, revPeriod, revGender, collectionPeriod]);

  // Deliberately NO tab-focus/visibilitychange auto-refresh here — the
  // dashboard must stay exactly as it is until the user clicks Refresh,
  // performs an action that itself needs fresh data, or a deliberately
  // configured auto-refresh interval is enabled (none exists today). A
  // client/appointment/sale created elsewhere no longer pushes an update
  // into this page's KPI cards just by switching back to this tab — use
  // the Refresh button instead.

  const retryChart = useCallback(() => {
    dispatch(fetchRevenueChart({ period: revPeriod, gender: revGender }));
  }, [dispatch, revPeriod, revGender]);

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

  const today = useMemo(() => formatDateDDMMYYYY(new Date()), []);

  // Navigate callbacks (stable references for memoized children)
  const goToCalendar  = useCallback(() => navigate("/dashboard/calendar"),        [navigate]);
  const goToClients   = useCallback(() => navigate("/dashboard/clients/add"),     [navigate]);
  const goToSales     = useCallback(() => navigate("/dashboard/sales/quick"),      [navigate]);
  const goToMarketing = useCallback(() => navigate("/dashboard/marketing"),        [navigate]);
  // "Collect Now" on the Pending Payments card — goes to the Pending Payment
  // Report, which lists every bill still carrying a due balance (amount due,
  // days pending, client/staff/method), instead of the Detailed Appointment
  // Report or Sales Summary (neither has a due/pending balance view).
  const goToPendingAppointments = useCallback(
    () => navigate("/reports/payments/pending-payment"),
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
          <h1 className="db-title">salonox</h1>
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

      <SpotlightHighlightCard />

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
          revGender={revGender}
          onGenderChange={handleGenderChange}
          onRetry={retryChart}
        />

        <OverallCollectionPanel
          entries={paymentModeBreakdown.entries}
          total={paymentModeBreakdown.total}
          period={collectionPeriod}
          onPeriodChange={handleCollectionPeriodChange}
          loading={dashLoading}
          error={dashError}
          onRetry={retryPaymentModeBreakdown}
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
        loading={dashLoading}
        error={dashError}
        onPageChange={setApptPage}
        onRetry={retryFull}
      />

      {/* ── PENDING PAYMENTS / BIRTHDAYS ── */}
      <BottomStatCards
        pendingPayments={pendingPayments}
        birthdays={todaysBirthdays}
        loading={dashLoading}
        pendingLoading={dashLoading}
        onNavigatePendingAppointments={goToPendingAppointments}
        salonName={salonName}
      />

    </div>
  );
}
