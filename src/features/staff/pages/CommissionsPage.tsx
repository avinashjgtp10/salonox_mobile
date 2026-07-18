import { useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { selectCurrentSalon } from "../../../store/selectors/slices.selectors";
import api from "../../../services/api/axios";
import { STAFF, COMMISSION_RULES } from "../../../services/api/endpoints";
import { toast } from "react-hot-toast";
import {
  Plus, X,
  SquareFill, ListCheck,
  CurrencyRupee, People, Wallet, GraphUpArrow,
  PersonCheck, PersonX, Tools, Bag, Tag, Gift, BoxSeam,
  StarFill, Gear, CheckCircleFill, XCircleFill,
  Calculator, CreditCard2Front,
  ChevronLeft, ChevronRight, ChevronDown, ClockHistory, Download,
  FileEarmarkExcel, FiletypePdf,
} from "react-bootstrap-icons";
import "../styles/CommissionsPage.scss";
import { SuccessOverlay } from "../../../components/ui";
import RuleCard from "../components/commission/RuleCard";
import RuleWizard from "../components/commission/RuleWizard";
import RuleDetailModal from "../components/commission/RuleDetailModal";
import { SOURCE_META, groupCommissionRules } from "../components/commission/commissionRuleMeta";
import { exportCommissionsPDF } from "../utils/commissionExport";
import type { CommissionRule, CommissionRuleFormData, CommissionRuleSource, RuleGroup } from "../types/commissionRules.types";

// ─── Types ────────────────────────────────────────────────────────────────────

type CommissionCategory = "services" | "products" | "memberships" | "gift_cards" | "cancellation" | "packages";
type TabKey             = "overview" | "rules";

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string;
  calendar_color?: string;
  designation?: string;
  is_active?: boolean;
}

// ─── Types (earnings summary) ────────────────────────────────────────────────

interface EarnedByStaff {
  staff_id: string;
  staff_first_name: string;
  staff_last_name: string | null;
  staff_email: string;
  staff_calendar_color: string | null;
  staff_designation: string | null;
  total_revenue: number;
  total_earned: number;
  pending_payout: number;
  paid_out: number;
  transaction_count: number;
  categories: string[];
}

interface EarningSummary {
  total_commission: number;
  total_revenue:    number;
  pending_payout:   number;
  paid_out:         number;
  count:            number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "overview", label: "Overview",         icon: <SquareFill size={13} /> },
  { key: "rules",    label: "Commission Rules", icon: <ListCheck  size={13} /> },
];

const CATEGORIES: {
  key: CommissionCategory;
  label: string;
  icon: React.ReactNode;
  bg: string;
  color: string;
}[] = [
  { key: "services",     label: "Services",     icon: <Tools    size={16} />, bg: "#ede9fe", color: "#7c3aed" },
  { key: "products",     label: "Products",     icon: <Bag      size={16} />, bg: "#dcfce7", color: "#16a34a" },
  { key: "memberships",  label: "Memberships",  icon: <Tag      size={16} />, bg: "#dbeafe", color: "#2563eb" },
  { key: "packages",     label: "Packages",     icon: <BoxSeam  size={16} />, bg: "#ffe4e6", color: "#e11d48" },
  { key: "gift_cards",   label: "Gift Cards",   icon: <Gift     size={16} />, bg: "#fce7f3", color: "#db2777" },
  { key: "cancellation", label: "Cancellation", icon: <StarFill size={16} />, bg: "#fef3c7", color: "#d97706" },
];

const COLOR_MAP: Record<string, string> = {
  light_blue: "#7dd3fc", blue: "#3b82f6", dark_blue: "#1d4ed8",
  purple: "#a855f7", violet: "#7c3aed", pink: "#f472b6",
  hot_pink: "#ec4899", rose: "#f43f5e", orange: "#f97316",
  yellow: "#eab308", lime: "#84cc16", green: "#22c55e",
  teal: "#14b8a6", cyan: "#06b6d4",
};

const GRADIENTS = [
  "linear-gradient(135deg,#6366f1,#8b5cf6)",
  "linear-gradient(135deg,#f59e0b,#ef4444)",
  "linear-gradient(135deg,#10b981,#059669)",
  "linear-gradient(135deg,#3b82f6,#06b6d4)",
  "linear-gradient(135deg,#ec4899,#f43f5e)",
  "linear-gradient(135deg,#8b5cf6,#6366f1)",
  "linear-gradient(135deg,#f97316,#fbbf24)",
];

const STAFF_PAGE_SIZE = 5;

function getAvatar(staff: StaffMember) {
  const initials = `${staff.first_name?.[0] ?? ""}${staff.last_name?.[0] ?? ""}`.toUpperCase();
  const bg = staff.calendar_color
    ? (COLOR_MAP[staff.calendar_color] ?? GRADIENTS[0])
    : GRADIENTS[Math.abs(staff.id.charCodeAt(0)) % GRADIENTS.length];
  return { initials, bg };
}

function getCatMeta(cat: CommissionCategory) {
  return CATEGORIES.find((c) => c.key === cat) ?? CATEGORIES[0];
}

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({
  commissionRules, staffList, onAddRule, commsFetching, earnSummary, earnedByStaff, summaryMonth, onMonthChange, onSettle, settlingId, onOpenHistory,
}: {
  commissionRules: CommissionRule[];
  staffList: StaffMember[];
  onAddRule: (staff?: StaffMember) => void;
  commsFetching: boolean;
  earnSummary: EarningSummary | null;
  earnedByStaff: EarnedByStaff[];
  summaryMonth: string;
  onMonthChange: (month: string) => void;
  onSettle: (staffId: string, name: string, amount: number) => void;
  settlingId: string | null;
  onOpenHistory: (staffId: string) => void;
}): JSX.Element {
  // "Configured" = staff directly targeted by a rule (scope_type='staff', scope_id=their id).
  // Salon-wide/role-scoped rules aren't attributed to individual staff here yet.
  const staffWithComm     = new Set(commissionRules.filter((r) => r.scope_type === "staff").map((r) => r.scope_id));
  const configuredStaff   = staffList.filter((s) => staffWithComm.has(s.id));
  const unconfiguredStaff = staffList.filter((s) => !staffWithComm.has(s.id));

  // Pagination for staff commission status
  const [configPage, setConfigPage]     = useState(1);
  const [unconfigPage, setUnconfigPage] = useState(1);

  const configPages   = Math.ceil(configuredStaff.length / STAFF_PAGE_SIZE);
  const unconfigPages = Math.ceil(unconfiguredStaff.length / STAFF_PAGE_SIZE);

  const pagedConfigured   = configuredStaff.slice((configPage - 1) * STAFF_PAGE_SIZE, configPage * STAFF_PAGE_SIZE);
  const pagedUnconfigured = unconfiguredStaff.slice((unconfigPage - 1) * STAFF_PAGE_SIZE, unconfigPage * STAFF_PAGE_SIZE);

  return (
    <div className="cm-overview">

      {/* ── Stat cards: Total Rules, Total Staff, Configured, No Commission ── */}
      <div className="cm-ov-cards">
        <div className="cm-ov-card">
          <div className="cm-ov-card-icon" style={{ background: "#ede9fe", color: "#7c3aed" }}>
            <ListCheck size={18} />
          </div>
          <div>
            <div className="cm-ov-val">{groupCommissionRules(commissionRules).length}</div>
            <div className="cm-ov-label">Total Rules</div>
          </div>
        </div>
        <div className="cm-ov-card">
          <div className="cm-ov-card-icon" style={{ background: "#dbeafe", color: "#2563eb" }}>
            <People size={18} />
          </div>
          <div>
            <div className="cm-ov-val">{staffList.length}</div>
            <div className="cm-ov-label">Total Staff</div>
          </div>
        </div>
        <div className="cm-ov-card">
          <div className="cm-ov-card-icon" style={{ background: "#dcfce7", color: "#16a34a" }}>
            <PersonCheck size={18} />
          </div>
          <div>
            <div className="cm-ov-val">{configuredStaff.length}</div>
            <div className="cm-ov-label">Configured</div>
          </div>
        </div>
        <div className="cm-ov-card">
          <div className="cm-ov-card-icon" style={{ background: "#fef3c7", color: "#d97706" }}>
            <PersonX size={18} />
          </div>
          <div>
            <div className="cm-ov-val">{unconfiguredStaff.length}</div>
            <div className="cm-ov-label">No Commission</div>
          </div>
        </div>
      </div>

      {/* Background loading indicator */}
      {commsFetching && (
        <div className="cm-comms-loading-bar">
          <div className="cm-comms-loading-inner" />
          <span>Loading commission data…</span>
        </div>
      )}

      {/* ── Earnings row ── */}
      <div className="cm-ov-earn-header">
        <span className="cm-ov-earn-title">This Month</span>
        <input
          type="month"
          className="cm-month-picker"
          value={summaryMonth}
          max={new Date().toISOString().slice(0, 7)}
          onChange={(e) => onMonthChange(e.target.value)}
        />
      </div>
      <div className="cm-ov-earnings">
        <div className="cm-ov-earn-card">
          <div className="cm-ov-earn-icon" style={{ background: "#ede9fe", color: "#7c3aed" }}>
            <GraphUpArrow size={16} />
          </div>
          <div>
            <div className="cm-ov-earn-label">Total Revenue Generated</div>
            <div className="cm-ov-earn-val">
              {earnSummary ? fmt(earnSummary.total_revenue) : <span className="cm-earn-dash">—</span>}
            </div>
            <div className="cm-ov-earn-sub">{earnSummary ? `${earnSummary.count} transactions` : "Loading…"}</div>
          </div>
        </div>
        <div className="cm-ov-earn-card">
          <div className="cm-ov-earn-icon" style={{ background: "#dcfce7", color: "#16a34a" }}>
            <CurrencyRupee size={16} />
          </div>
          <div>
            <div className="cm-ov-earn-label">Commission Paid</div>
            <div className="cm-ov-earn-val">
              {earnSummary ? fmt(earnSummary.paid_out) : <span className="cm-earn-dash">—</span>}
            </div>
            <div className="cm-ov-earn-sub" style={{ color: "#16a34a" }}>Settled</div>
          </div>
        </div>
        <div className="cm-ov-earn-card">
          <div className="cm-ov-earn-icon" style={{ background: "#fef3c7", color: "#d97706" }}>
            <Wallet size={16} />
          </div>
          <div>
            <div className="cm-ov-earn-label">Pending Payout</div>
            <div className="cm-ov-earn-val">
              {earnSummary ? fmt(earnSummary.pending_payout) : <span className="cm-earn-dash">—</span>}
            </div>
            <div className="cm-ov-earn-sub" style={{ color: "#d97706" }}>Awaiting payment</div>
          </div>
        </div>
        <div className="cm-ov-earn-card">
          <div className="cm-ov-earn-icon" style={{ background: "#dbeafe", color: "#2563eb" }}>
            <Calculator size={16} />
          </div>
          <div>
            <div className="cm-ov-earn-label">Total Commission Accrued</div>
            <div className="cm-ov-earn-val">
              {earnSummary ? fmt(earnSummary.total_commission) : <span className="cm-earn-dash">—</span>}
            </div>
            <div className="cm-ov-earn-sub">Paid + Pending</div>
          </div>
        </div>
      </div>

      {/* ── Bottom two-col ── */}
      <div className="cm-ov-bottom">

        {/* Left — Commission Earned by staff */}
        <div className="cm-ov-panel">
          <div className="cm-ov-panel-header">
            <div>
              <div className="cm-ov-panel-title">Commission Earned</div>
              <div className="cm-ov-panel-sub">
                {earnedByStaff.length > 0
                  ? `${earnedByStaff.length} staff earned this month`
                  : "No commissions earned yet"}
              </div>
            </div>
          </div>

          {earnedByStaff.length === 0 ? (
            <div className="cm-ov-empty">
              <CurrencyRupee size={28} />
              <p>No commissions earned this month</p>
              <span className="cm-ov-empty-sub">Commissions appear here after checkouts</span>
            </div>
          ) : (
            <div className="cm-earned-list">
              {earnedByStaff.map((e) => {
                const av = {
                  initials: `${e.staff_first_name?.[0] ?? ""}${e.staff_last_name?.[0] ?? ""}`.toUpperCase(),
                  bg: e.staff_calendar_color
                    ? (COLOR_MAP[e.staff_calendar_color] ?? GRADIENTS[0])
                    : GRADIENTS[Math.abs(e.staff_id.charCodeAt(0)) % GRADIENTS.length],
                };
                const cats = (e.categories ?? []).map((c: string) => getCatMeta(c as any));
                const allPaid = e.pending_payout === 0 && e.total_earned > 0;

                return (
                  <div key={e.staff_id} className={`cm-earned-row ${allPaid ? "cm-earned-row--paid" : ""}`} onClick={() => onOpenHistory(e.staff_id)} style={{ cursor: "pointer" }}>
                    <div className="cm-earned-av" style={{ background: av.bg }}>{av.initials}</div>

                    <div className="cm-earned-info">
                      <div className="cm-earned-name">
                        {e.staff_first_name} {e.staff_last_name ?? ""}
                        {allPaid && <span className="cm-paid-chip"><CheckCircleFill size={10} /> Paid</span>}
                      </div>
                      <div className="cm-earned-cats">
                        {cats.map((c: ReturnType<typeof getCatMeta>) => (
                          <span key={c.key} className="cm-earned-cat-dot"
                            style={{ background: c.bg, color: c.color }} title={c.label}>
                            {c.icon}
                          </span>
                        ))}
                        <span className="cm-earned-txn">{e.transaction_count} transaction{e.transaction_count !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="cm-earned-amounts">
                        <span className="cm-earned-rev">Revenue {fmt(e.total_revenue)}</span>
                        <span className="cm-earned-sep">·</span>
                        <span className="cm-earned-total">Earned <strong>{fmt(e.total_earned)}</strong></span>
                      </div>
                      {/* Pending amount already shown in the badge beside "Settle" — only
                          add this line when there's paid-so-far info not shown elsewhere. */}
                      {e.pending_payout > 0 && e.paid_out > 0 && (
                        <div className="cm-earned-pending">
                          Paid so far: <strong>{fmt(e.paid_out)}</strong>
                        </div>
                      )}
                    </div>

                    <div className="cm-earned-row-end" onClick={(ev) => ev.stopPropagation()}>
                      {e.pending_payout > 0 && (
                        <>
                          <span className="cm-pending-badge">
                            <ClockHistory size={10} /> {fmt(e.pending_payout)} pending
                          </span>
                          <button
                            className="cm-settle-btn"
                            disabled={settlingId === e.staff_id}
                            onClick={() => onSettle(
                              e.staff_id,
                              `${e.staff_first_name} ${e.staff_last_name ?? ""}`.trim(),
                              e.pending_payout
                            )}
                          >
                            {settlingId === e.staff_id ? "Settling…" : "Settle"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right — staff commission status with pagination */}
        <div className="cm-ov-panel">
          <div className="cm-ov-panel-header">
            <div>
              <div className="cm-ov-panel-title">Staff Commission Status</div>
              <div className="cm-ov-panel-sub">
                {configuredStaff.length} configured · {unconfiguredStaff.length} not set
              </div>
            </div>
          </div>

          {/* Configured staff */}
          {configuredStaff.length > 0 && (
            <>
              <div className="cm-ov-staff-section-label">
                <CheckCircleFill size={11} color="#16a34a" /> With commission rules
              </div>
              {pagedConfigured.map((s) => {
                const av       = getAvatar(s);
                const sRules   = commissionRules.filter((r) => r.scope_type === "staff" && r.scope_id === s.id);
                const active   = sRules.filter((r) => r.status === "active").length;
                const sources  = [...new Set(sRules.map((r) => r.source))];
                return (
                  <div key={s.id} className="cm-ov-staff-row cm-ov-staff-row--has">
                    <div className="cm-ov-av" style={{ background: av.bg }}>{av.initials}</div>
                    <div className="cm-ov-staff-info">
                      <div className="cm-ov-staff-name">{s.first_name} {s.last_name ?? ""}</div>
                      <div className="cm-ov-staff-meta">
                        {sources.map((src) => {
                          const m = SOURCE_META[src];
                          return (
                            <span key={src} className="cm-cat-dot"
                              style={{ background: m.bg, color: m.color }} title={m.label}>
                              {m.icon}
                            </span>
                          );
                        })}
                        <span className="cm-ov-staff-count">
                          {active} active rule{active !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <CheckCircleFill size={14} color="#16a34a" />
                  </div>
                );
              })}
              {configPages > 1 && (
                <div className="cm-ov-pagination">
                  <button className="cm-pg-btn" disabled={configPage === 1}
                    onClick={() => setConfigPage((p) => p - 1)}>
                    <ChevronLeft size={13} />
                  </button>
                  <span className="cm-pg-info">{configPage} / {configPages}</span>
                  <button className="cm-pg-btn" disabled={configPage === configPages}
                    onClick={() => setConfigPage((p) => p + 1)}>
                    <ChevronRight size={13} />
                  </button>
                </div>
              )}
            </>
          )}

          {/* Unconfigured staff */}
          {unconfiguredStaff.length > 0 && (
            <>
              <div className="cm-ov-staff-section-label" style={{ marginTop: 14 }}>
                <XCircleFill size={11} color="#dc2626" /> No commission set
              </div>
              {pagedUnconfigured.map((s) => {
                const av = getAvatar(s);
                return (
                  <div key={s.id} className="cm-ov-staff-row cm-ov-staff-row--none">
                    <div className="cm-ov-av" style={{ background: av.bg }}>{av.initials}</div>
                    <div className="cm-ov-staff-info">
                      <div className="cm-ov-staff-name">{s.first_name} {s.last_name ?? ""}</div>
                      <div className="cm-ov-staff-role">{s.designation ?? "Staff"}</div>
                    </div>
                    <button className="cm-ov-add-btn" onClick={() => onAddRule(s)}>
                      <Plus size={11} /> Add Rule
                    </button>
                  </div>
                );
              })}
              {unconfigPages > 1 && (
                <div className="cm-ov-pagination">
                  <button className="cm-pg-btn" disabled={unconfigPage === 1}
                    onClick={() => setUnconfigPage((p) => p - 1)}>
                    <ChevronLeft size={13} />
                  </button>
                  <span className="cm-pg-info">{unconfigPage} / {unconfigPages}</span>
                  <button className="cm-pg-btn" disabled={unconfigPage === unconfigPages}
                    onClick={() => setUnconfigPage((p) => p + 1)}>
                    <ChevronRight size={13} />
                  </button>
                </div>
              )}
            </>
          )}

          {staffList.length === 0 && (
            <div className="cm-ov-empty">
              <People size={28} />
              <p>No staff members found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Commission History Drawer ────────────────────────────────────────────────

function CommissionHistoryDrawer({
  staffId, staffName, summaryMonth, onClose,
}: {
  staffId: string;
  staffName: string;
  summaryMonth: string;
  onClose: () => void;
}): JSX.Element {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);

    const fetchOnce = () => api.get(`${STAFF.BY_ID(staffId)}/commissions/history?month=${summaryMonth}`);

    // One silent auto-retry — the DB connection is prone to occasional
    // transient timeouts, and a single failed attempt would otherwise leave
    // this panel stuck empty even though the data is actually there.
    fetchOnce()
      .catch(() => fetchOnce())
      .then((r) => { if (!cancelled) setHistory(r.data?.data ?? []); })
      .catch(() => { if (!cancelled) setLoadError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [staffId, summaryMonth, retryTick]);

  const totalEarned  = history.reduce((s, h) => s + parseFloat(h.commission_amount), 0);
  const totalRevenue = history.reduce((s, h) => s + parseFloat(h.revenue_amount), 0);

  return (
    <div className="cm-history-overlay" onClick={onClose}>
      <div className="cm-history-drawer" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="cm-history-header">
          <div>
            <div className="cm-history-title">{staffName}</div>
            <div className="cm-history-sub">Commission History · {summaryMonth}</div>
          </div>
          <button className="cm-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Summary strip */}
        <div className="cm-history-summary">
          <div className="cm-history-sum-item">
            <span>Total Revenue</span>
            <strong>{fmt(totalRevenue)}</strong>
          </div>
          <div className="cm-history-sum-div" />
          <div className="cm-history-sum-item">
            <span>Total Earned</span>
            <strong className="cm-history-sum-accent">{fmt(totalEarned)}</strong>
          </div>
          <div className="cm-history-sum-div" />
          <div className="cm-history-sum-item">
            <span>Transactions</span>
            <strong>{history.length}</strong>
          </div>
        </div>

        {/* History list */}
        <div className="cm-history-body">
          {loading ? (
            <div className="cm-loading cm-loading--history">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="cm-skeleton-row">
                  <div className="cm-skel cm-skel--icon" />
                  <div className="cm-skel-info">
                    <div className="cm-skel cm-skel--title" />
                    <div className="cm-skel cm-skel--sub" />
                  </div>
                </div>
              ))}
            </div>
          ) : loadError ? (
            <div className="cm-ov-empty">
              <ClockHistory size={28} />
              <p>Couldn't load commission history — connection issue.</p>
              <button className="cm-btn cm-btn--ghost" onClick={() => setRetryTick((t) => t + 1)}>
                Retry
              </button>
            </div>
          ) : history.length === 0 ? (
            <div className="cm-ov-empty">
              <ClockHistory size={28} />
              <p>No commission history for this month</p>
            </div>
          ) : (
            history.map((h) => {
              const cat     = getCatMeta(h.category as CommissionCategory);
              const isPaid  = h.status === "paid";
              const date    = new Date(h.earned_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
              return (
                <div key={h.id} className="cm-history-row">
                  <div className="cm-history-cat-icon" style={{ "--icon-bg": cat.bg, "--icon-color": cat.color } as React.CSSProperties}>
                    {cat.icon}
                  </div>
                  <div className="cm-history-info">
                    <div className="cm-history-cat">{cat.label}</div>
                    <div className="cm-history-date">{date}</div>
                  </div>
                  <div className="cm-history-amounts">
                    <div className="cm-history-revenue">Revenue {fmt(parseFloat(h.revenue_amount))}</div>
                    <div className="cm-history-earned">
                      {h.commission_kind === "percentage"
                        ? `${h.commission_rate}%`
                        : `Fixed ₹${h.commission_rate}`}
                      {" → "}
                      <strong>{fmt(parseFloat(h.commission_amount))}</strong>
                    </div>
                  </div>
                  <span className={`cm-history-status ${isPaid ? "cm-history-status--paid" : "cm-history-status--pending"}`}>
                    {isPaid ? "Paid" : "Pending"}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CommissionsPage() {
  const currentSalon = useSelector(selectCurrentSalon);
  const salonId      = currentSalon?.id;

  const [activeTab,   setActiveTab]   = useState<TabKey>("overview");
  const [staffList,   setStaffList]   = useState<StaffMember[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [commsFetching,    setCommsFetching]    = useState(false);
  const [earnSummary,      setEarnSummary]      = useState<EarningSummary | null>(null);
  const [earnedByStaff,    setEarnedByStaff]    = useState<EarnedByStaff[]>([]);
  const [summaryMonth,     setSummaryMonth]     = useState(() => new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [historyStaffId,   setHistoryStaffId]   = useState<string | null>(null);
  const [settlingId,  setSettlingId]  = useState<string | null>(null);

  // ── New commission rules engine ─────────────────────────────────────────────
  const [commissionRules, setCommissionRules] = useState<CommissionRule[]>([]);
  const [rulesLoading,    setRulesLoading]    = useState(true);
  const [sourceFilter,    setSourceFilter]    = useState<CommissionRuleSource | "all">("all");
  const [showWizard,      setShowWizard]      = useState(false);
  const [editingGroup,    setEditingGroup]    = useState<RuleGroup | null>(null);
  const [detailGroup,     setDetailGroup]     = useState<RuleGroup | null>(null);
  const [togglingRuleId,  setTogglingRuleId]  = useState<string | null>(null);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOptionsOpen(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const fetchAll = useCallback(async () => {
    if (!salonId) return;
    setLoading(true);

    try {
      const staffRes = await api.get(`${STAFF.BASE}?limit=200&salon_id=${salonId}`);

      // Fetch earning summary + per-staff breakdown (non-blocking)
      Promise.all([
        api.get(`${STAFF.BASE}/commissions/summary?salon_id=${salonId}&month=${summaryMonth}`),
        api.get(`${STAFF.BASE}/commissions/earned?salon_id=${salonId}&month=${summaryMonth}`),
      ]).then(([summaryRes, earnedRes]) => {
        setEarnSummary(summaryRes.data?.data ?? null);
        setEarnedByStaff(earnedRes.data?.data ?? []);
      }).catch(() => {});

      const allStaff: StaffMember[] = staffRes.data?.data?.items ?? [];
      const staff = allStaff.filter((s) => s.is_active !== false);
      setStaffList(staff);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to load commissions");
    } finally {
      setLoading(false);
      setCommsFetching(false);
    }
  }, [salonId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── New commission rules engine ─────────────────────────────────────────────
  const fetchCommissionRules = useCallback(async () => {
    setRulesLoading(true);
    try {
      const res = await api.get(COMMISSION_RULES.BASE);
      setCommissionRules(res.data?.data?.items ?? []);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to load commission rules");
    } finally {
      setRulesLoading(false);
    }
  }, []);

  useEffect(() => { fetchCommissionRules(); }, [fetchCommissionRules]);

  const handleSaveRule = async (data: CommissionRuleFormData) => {
    try {
      if (editingGroup) {
        // Editing a group = delete the old rows and fan out fresh ones with the new
        // values. Simpler and more correct than a bulk-PATCH endpoint: staff added/
        // removed from the selection are handled automatically by the recreate.
        // A row that's already gone (404 — e.g. a stale re-click) is treated as
        // success, not failure: the end goal ("this old row no longer exists") is
        // already true. Only a genuine error (500, network, etc.) should abort.
        await Promise.all(editingGroup.rules.map((r) =>
          api.delete(COMMISSION_RULES.BY_ID(r.id)).catch((err: any) => {
            if (err?.response?.status !== 404) throw err;
          })
        ));
        await api.post(COMMISSION_RULES.BASE, data);
        toast.success("Commission rule updated");
      } else {
        const res = await api.post(COMMISSION_RULES.BASE, data);
        toast.success(res.data?.message ?? "Commission rule created");
      }
      setShowWizard(false);
      setEditingGroup(null);
      fetchCommissionRules();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to save commission rule");
    }
  };

  const handleToggleRuleStatus = async (group: RuleGroup) => {
    setTogglingRuleId(group.key);
    try {
      const nextStatus = group.primary.status === "active" ? "draft" : "active";
      await Promise.all(group.rules.map((r) => api.patch(COMMISSION_RULES.STATUS(r.id), { status: nextStatus })));
      const idsInGroup = new Set(group.rules.map((r) => r.id));
      setCommissionRules((prev) => prev.map((r) => (idsInGroup.has(r.id) ? { ...r, status: nextStatus } : r)));
      setDetailGroup((prev) => (prev?.key === group.key ? null : prev));
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update rule status");
    } finally {
      setTogglingRuleId(null);
    }
  };

  const handleDeleteRule = async (group: RuleGroup) => {
    try {
      await Promise.all(group.rules.map((r) => api.delete(COMMISSION_RULES.BY_ID(r.id))));
      const idsInGroup = new Set(group.rules.map((r) => r.id));
      setCommissionRules((prev) => prev.filter((r) => !idsInGroup.has(r.id)));
      setDetailGroup((prev) => (prev?.key === group.key ? null : prev));
      setShowDeleteSuccess(true);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete commission rule");
    }
  };

  const staffOptions = staffList.map((s) => ({ id: s.id, name: `${s.first_name} ${s.last_name ?? ""}`.trim() }));

  const staffNamesForGroup = (group: RuleGroup): string[] =>
    group.staffIds.map((id) => {
      const staff = staffList.find((s) => s.id === id);
      return staff ? `${staff.first_name} ${staff.last_name ?? ""}`.trim() : "Staff member";
    });

  const ruleGroups = groupCommissionRules(commissionRules);
  const filteredGroups = ruleGroups.filter((g) => sourceFilter === "all" || g.primary.source === sourceFilter);
  const sourceCounts = (Object.keys(SOURCE_META) as CommissionRuleSource[]).reduce((acc, key) => {
    acc[key] = ruleGroups.filter((g) => g.primary.source === key).length;
    return acc;
  }, {} as Record<CommissionRuleSource, number>);

  // Refetch summary when month picker changes
  useEffect(() => {
    if (!salonId) return;
    Promise.all([
      api.get(`${STAFF.BASE}/commissions/summary?salon_id=${salonId}&month=${summaryMonth}`),
      api.get(`${STAFF.BASE}/commissions/earned?salon_id=${salonId}&month=${summaryMonth}`),
    ]).then(([summaryRes, earnedRes]) => {
      setEarnSummary(summaryRes.data?.data ?? null);
      setEarnedByStaff(earnedRes.data?.data ?? []);
    }).catch(() => {});
  }, [summaryMonth, salonId]);

  const handleSettle = async (staffId: string, name: string, amount: number) => {
    setSettlingId(staffId);
    try {
      await api.post(STAFF.SETTLE_COMMISSION(staffId));
      toast.success(`₹${amount.toLocaleString("en-IN")} settled for ${name}`);
      const [summaryRes, earnedRes] = await Promise.all([
        api.get(`${STAFF.BASE}/commissions/summary?salon_id=${salonId}&month=${summaryMonth}`),
        api.get(`${STAFF.BASE}/commissions/earned?salon_id=${salonId}&month=${summaryMonth}`),
      ]);
      setEarnSummary(summaryRes.data?.data ?? null);
      setEarnedByStaff(earnedRes.data?.data ?? []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to settle commission");
    } finally {
      setSettlingId(null);
    }
  };

  return (
    <div className="commissions-page">
      {showDeleteSuccess && (
        <SuccessOverlay message="Commission rule deleted successfully" onDone={() => setShowDeleteSuccess(false)} />
      )}

      <div className="cm-header">
        <div>
          <h2 className="cm-title">Commission Management</h2>
          <p className="cm-subtitle">Create and manage commission rules for your team</p>
        </div>
        <div className="cm-header-actions">
          <div className="cm-options-dropdown" onClick={(e) => e.stopPropagation()}>
            <button className="cm-export-btn" onClick={() => setOptionsOpen((v) => !v)}>
              Options <ChevronDown size={13} />
            </button>
            {optionsOpen && (
              <div className="cm-options-menu">
                <div className="cm-option-label">Export</div>
                <button className="cm-option-item" onClick={async () => {
                  setOptionsOpen(false);
                  try {
                    const res = await api.get(`${STAFF.BASE}/commissions/export?salon_id=${salonId}&month=${summaryMonth}`, { responseType: "blob" });
                    const url = URL.createObjectURL(new Blob([res.data]));
                    const a   = document.createElement("a");
                    a.href    = url;
                    a.download = `commissions_${summaryMonth}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch { toast.error("Export failed"); }
                }}>
                  <Download size={14} /> Export CSV
                </button>
                <button className="cm-option-item" onClick={async () => {
                  setOptionsOpen(false);
                  try {
                    const res = await api.get(`${STAFF.BASE}/commissions/export?salon_id=${salonId}&month=${summaryMonth}&format=excel`, { responseType: "blob" });
                    const url = URL.createObjectURL(new Blob([res.data]));
                    const a   = document.createElement("a");
                    a.href    = url;
                    a.download = `commissions_${summaryMonth}.xlsx`;
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch { toast.error("Export failed"); }
                }}>
                  <FileEarmarkExcel size={14} /> Export Excel
                </button>
                <button className="cm-option-item" onClick={async () => {
                  setOptionsOpen(false);
                  try {
                    const res = await api.get(`${STAFF.BASE}/commissions/export?salon_id=${salonId}&month=${summaryMonth}&format=json`);
                    const rows = res.data?.data ?? [];
                    const blob = exportCommissionsPDF(rows, summaryMonth);
                    const url  = URL.createObjectURL(blob);
                    const a    = document.createElement("a");
                    a.href     = url;
                    a.download = `commissions_${summaryMonth}.pdf`;
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch { toast.error("Export failed"); }
                }}>
                  <FiletypePdf size={14} /> Export PDF
                </button>
              </div>
            )}
          </div>
          <button className="cm-add-btn" onClick={() => { setEditingGroup(null); setShowWizard(true); }}>
            <Plus size={15} /> Add Commission Rule
          </button>
        </div>
      </div>

      <div className="cm-tabs">
        {TABS.map(({ key, label, icon }) => (
          <button key={key}
            className={`cm-tab ${activeTab === key ? "cm-tab--active" : ""}`}
            onClick={() => setActiveTab(key)}>
            {icon} {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="cm-loading">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="cm-skeleton-row">
              <div className="cm-skel cm-skel--icon" />
              <div className="cm-skel-info">
                <div className="cm-skel cm-skel--title" />
                <div className="cm-skel cm-skel--sub" />
              </div>
              <div className="cm-skel cm-skel--tag" />
            </div>
          ))}
        </div>
      ) : activeTab === "overview" ? (
        <OverviewTab
          commissionRules={commissionRules}
          staffList={staffList}
          onAddRule={() => { setEditingGroup(null); setShowWizard(true); }}
          commsFetching={commsFetching}
          earnSummary={earnSummary}
          earnedByStaff={earnedByStaff}
          summaryMonth={summaryMonth}
          onMonthChange={(m) => { setSummaryMonth(m); }}
          onSettle={handleSettle}
          settlingId={settlingId}
          onOpenHistory={(staffId) => setHistoryStaffId(staffId)}
        />
      ) : (
        <div className="cm-body">
          <div className="cm-main">
            <div className="cm-section-header">
              <h3 className="cm-section-title">Commission Rules</h3>
              <p className="cm-section-sub">Set rules for services, products, memberships and packages</p>
            </div>
            <div className="cm-cat-pills">
              <button className={`cm-pill ${sourceFilter === "all" ? "cm-pill--active" : ""}`}
                onClick={() => setSourceFilter("all")}>
                All Rules <span className="cm-pill-count">({ruleGroups.length})</span>
              </button>
              {(Object.keys(SOURCE_META) as CommissionRuleSource[]).map((key) => (
                <button key={key}
                  className={`cm-pill ${sourceFilter === key ? "cm-pill--active" : ""}`}
                  onClick={() => setSourceFilter(key)}>
                  {SOURCE_META[key].label} <span className="cm-pill-count">({sourceCounts[key] ?? 0})</span>
                </button>
              ))}
            </div>
            {rulesLoading ? (
              <div className="cm-loading">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="cm-skeleton-row">
                    <div className="cm-skel cm-skel--icon" />
                    <div className="cm-skel-info">
                      <div className="cm-skel cm-skel--title" />
                      <div className="cm-skel cm-skel--sub" />
                    </div>
                    <div className="cm-skel cm-skel--tag" />
                  </div>
                ))}
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="cm-empty">
                <Gear size={28} />
                <p>No commission rules found</p>
                <button className="cm-add-btn" onClick={() => { setEditingGroup(null); setShowWizard(true); }}>
                  <Plus size={14} /> Add your first rule
                </button>
              </div>
            ) : (
              <div className="rc-grid">
                {filteredGroups.map((group) => (
                  <RuleCard key={group.key} group={group}
                    staffNames={staffNamesForGroup(group)}
                    onOpenDetail={setDetailGroup}
                    onEdit={(g) => { setEditingGroup(g); setShowWizard(true); }}
                    onDelete={handleDeleteRule}
                    onToggleStatus={handleToggleRuleStatus}
                    toggling={togglingRuleId === group.key} />
                ))}
              </div>
            )}
          </div>
          <div className="cm-sidebar">
            <div className="cm-sidebar-block">
              <div className="cm-sidebar-title"><CheckCircleFill size={13} /> How it works?</div>
              {[
                { icon: <Tools size={14} />,           bg: "#ede9fe", ic: "#7c3aed", t: "Set Rules",      d: "Create commission rules per staff member." },
                { icon: <CurrencyRupee size={14} />,    bg: "#dcfce7", ic: "#16a34a", t: "Earn",           d: "Staff earns commission when they hit targets." },
                { icon: <Calculator size={14} />,       bg: "#dbeafe", ic: "#2563eb", t: "Auto Calculate", d: "Commission is calculated automatically." },
                { icon: <CreditCard2Front size={14} />, bg: "#fef3c7", ic: "#d97706", t: "Payout",         d: "Pay commissions with one click." },
              ].map((s, i) => (
                <div key={i} className="cm-step">
                  <div className="cm-step-icon" style={{ "--icon-bg": s.bg, "--icon-color": s.ic } as React.CSSProperties}>{s.icon}</div>
                  <div>
                    <div className="cm-step-title">{s.t}</div>
                    <div className="cm-step-desc">{s.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* History Drawer */}
      {historyStaffId && (
        <CommissionHistoryDrawer
          staffId={historyStaffId}
          staffName={earnedByStaff.find((e) => e.staff_id === historyStaffId)
            ? `${earnedByStaff.find((e) => e.staff_id === historyStaffId)!.staff_first_name} ${earnedByStaff.find((e) => e.staff_id === historyStaffId)!.staff_last_name ?? ""}`
            : "Staff"}
          summaryMonth={summaryMonth}
          onClose={() => setHistoryStaffId(null)}
        />
      )}

      {detailGroup && (
        <RuleDetailModal
          group={detailGroup}
          staffNames={staffNamesForGroup(detailGroup)}
          onClose={() => setDetailGroup(null)}
          onEdit={(g) => { setDetailGroup(null); setEditingGroup(g); setShowWizard(true); }}
          onDelete={handleDeleteRule}
          onToggleStatus={handleToggleRuleStatus}
          toggling={togglingRuleId === detailGroup.key}
        />
      )}

      {showWizard && (
        <RuleWizard
          staffOptions={staffOptions}
          staffLoading={loading}
          editing={editingGroup?.primary ?? null}
          initialStaffIds={editingGroup?.staffIds}
          onClose={() => { setShowWizard(false); setEditingGroup(null); }}
          onSave={handleSaveRule}
        />
      )}
    </div>
  );
}