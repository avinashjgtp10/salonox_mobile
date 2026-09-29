import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useSelector } from "react-redux";
import { selectCurrentSalon } from "../../../store/selectors/slices.selectors";
import api from "../../../services/api/axios";
import { ApiError } from "../../../services/api/interceptors";
import { STAFF, COMMISSION_RULES } from "../../../services/api/endpoints";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import {
  Plus, X,
  ListCheck,
  People, Wallet, GraphUpArrow,
  PersonCheck, PersonX, Tools, Bag, Tag, Gift, BoxSeam,
  StarFill, Gear,
  Calculator,
  Pencil, ToggleOn, Trash, ThreeDotsVertical,
  ChevronDown, ClockHistory, Download,
  FileEarmarkExcel, FiletypePdf, HeartFill,
} from "react-bootstrap-icons";
import { useCurrency } from "../../../hooks/useCurrency";
import { getCurrencyIcon } from "../../../utils/currencyIcon";
import { formatDateDDMMYYYY } from "../../../utils/dateFormat";
import "../styles/CommissionsPage.scss";
import { SuccessOverlay, Pagination, Button } from "../../../components/ui";
import DateRangeFilter, {
  type DateRangeFilterValue, DEFAULT_DATE_RANGE_FILTER_VALUE, getDateRangePresetValue,
} from "../../../components/ui/DateRangeFilter";
import RuleWizard from "../components/commission/RuleWizard";
import RuleDetailModal from "../components/commission/RuleDetailModal";
import SettleCommissionModal, { type CommissionSettlementPaymentMethod } from "../components/commission/SettleCommissionModal";
import { SOURCE_META, FREQUENCY_LABELS, groupCommissionRules } from "../components/commission/commissionRuleMeta";
import { exportCommissionsPDF } from "../utils/commissionExport";
import type { CommissionRule, CommissionRuleFormData, CommissionRuleSource, RuleGroup } from "../types/commissionRules.types";
import TipSettleTab from "./TipSettleTab";
import { usePermissions } from "../../../hooks/usePermissions";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { showPermissionDenied } from "../../../store/permissionDialogSlice";

const friendlyPermissionDenied = (permKey: string) =>
  `Your account does not have the "${permKey}" permission. Ask your salon owner to enable it in Settings → Roles & Permissions.`;

// ─── Types ────────────────────────────────────────────────────────────────────

type CommissionCategory = "services" | "products" | "memberships" | "gift_cards" | "cancellation" | "packages";

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

const DEFAULT_TABLE_PAGE_SIZE = 10;

function getCatMeta(cat: CommissionCategory) {
  return CATEGORIES.find((c) => c.key === cat) ?? CATEGORIES[0];
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

// Commission Settle body — a compact stats bar (Membership-page style: one
// bordered strip, icon + label + value per stat, no individual cards) over a
// plain paginated table. Replaces what used to be a stat-card grid, a
// second earnings-card row, and a card-list of staff rows with an avatar/
// category-dot/pending-badge each — all real information, but spread across
// far more visual furniture than a settle action needs. Rule-configuration
// counts (Total Rules/Configured/etc.) moved to the Commission Rules tab,
// which is what they actually describe.
function OverviewTab({
  earnSummary, earnedByStaff, dateRange, onDateRangeChange, onSettle, settlingId, onOpenHistory,
}: {
  earnSummary: EarningSummary | null;
  earnedByStaff: EarnedByStaff[];
  dateRange: DateRangeFilterValue;
  onDateRangeChange: (v: DateRangeFilterValue) => void;
  onSettle: (staffId: string, name: string, amount: number) => void;
  settlingId: string | null;
  onOpenHistory: (staffId: string) => void;
}): JSX.Element {
  const { formatAmount: fmt, currencyCode } = useCurrency();
  const CurrencyIcon = getCurrencyIcon(currencyCode);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const pagedStaff = earnedByStaff.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="cm-overview">
      <div className="tc-stats">
        <div className="tc-stat">
          <span className="tc-stat-icon tc-stat-icon--indigo"><GraphUpArrow size={16} /></span>
          <span className="tc-stat-label">Total Revenue</span>
          <strong className="tc-stat-val">{earnSummary ? fmt(earnSummary.total_revenue) : "—"}</strong>
        </div>
        <div className="tc-stat-div" />
        <div className="tc-stat">
          <span className="tc-stat-icon tc-stat-icon--green"><CurrencyIcon size={15} /></span>
          <span className="tc-stat-label">Commission Paid</span>
          <strong className="tc-stat-val">{earnSummary ? fmt(earnSummary.paid_out) : "—"}</strong>
        </div>
        <div className="tc-stat-div" />
        <div className="tc-stat">
          <span className="tc-stat-icon tc-stat-icon--amber"><Wallet size={15} /></span>
          <span className="tc-stat-label">Pending Payout</span>
          <strong className="tc-stat-val">{earnSummary ? fmt(earnSummary.pending_payout) : "—"}</strong>
        </div>
        <div className="tc-stat-div" />
        <div className="tc-stat">
          <span className="tc-stat-icon tc-stat-icon--violet"><Calculator size={15} /></span>
          <span className="tc-stat-label">Total Accrued</span>
          <strong className="tc-stat-val">{earnSummary ? fmt(earnSummary.total_commission) : "—"}</strong>
        </div>
      </div>

      <div className="tc-toolbar">
        <span className="tc-toolbar-title">Commission Summary</span>
        <DateRangeFilter value={dateRange} onChange={onDateRangeChange} />
      </div>

      <div className="tc-table-block">
        <div className="tc-table-wrap">
          {earnedByStaff.length === 0 ? (
            <div className="cm-ov-empty">
              <CurrencyIcon size={28} />
              <p>No commissions earned in this date range</p>
              <span className="cm-ov-empty-sub">Commissions appear here after checkouts</span>
            </div>
          ) : (
            <table className="tc-table">
              <thead>
                <tr>
                  <th>#</th><th>Staff Name</th><th>Total Sales ({currencyCode})</th>
                  <th>Commission Accrued ({currencyCode})</th><th>Commission Paid ({currencyCode})</th>
                  <th>Pending Payout ({currencyCode})</th><th>Status</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pagedStaff.map((e, i) => {
                  const name = `${e.staff_first_name} ${e.staff_last_name ?? ""}`.trim();
                  const status = e.pending_payout > 0 && e.paid_out > 0 ? "Partial" : e.pending_payout > 0 ? "Pending" : "Settled";
                  return (
                    <tr key={e.staff_id} onClick={() => onOpenHistory(e.staff_id)}>
                      <td>{(page - 1) * pageSize + i + 1}</td>
                      <td className="tc-table__name">{name}</td>
                      <td>{fmt(e.total_revenue)}</td>
                      <td>{fmt(e.total_earned)}</td>
                      <td>{fmt(e.paid_out)}</td>
                      <td>{fmt(e.pending_payout)}</td>
                      <td><span className={`tc-status tc-status--${status.toLowerCase()}`}>{status}</span></td>
                      <td onClick={(ev) => ev.stopPropagation()}>
                        {e.pending_payout > 0 ? (
                          <button
                            className="tc-settle-btn"
                            disabled={settlingId === e.staff_id}
                            onClick={() => onSettle(e.staff_id, name, e.pending_payout)}
                          >
                            {settlingId === e.staff_id ? "Settling…" : "Settle"}
                          </button>
                        ) : (
                          <span className="tc-view-btn" onClick={() => onOpenHistory(e.staff_id)}>View</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <Pagination
          className="tc-pagination"
          currentPage={page}
          pageSize={pageSize}
          totalItems={earnedByStaff.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        />
      </div>
    </div>
  );
}

// Commission Rules body — same stats-bar + table + pagination shape as
// OverviewTab above, replacing what used to be a card grid (RuleCard) plus a
// purely decorative "How it works?" sidebar. Category filter pills are kept
// (a real, used control) but row actions are now inline icon buttons instead
// of a per-card floating menu.
function RulesTable({
  commissionRules, staffList, ruleGroups, filteredGroups, sourceFilter, setSourceFilter, sourceCounts,
  rulesLoading, staffNamesForGroup, onOpenDetail, onEdit, onDelete, onToggleStatus, togglingRuleId, onAddFirstRule,
}: {
  commissionRules: CommissionRule[];
  staffList: StaffMember[];
  ruleGroups: RuleGroup[];
  filteredGroups: RuleGroup[];
  sourceFilter: CommissionRuleSource | "all";
  setSourceFilter: (s: CommissionRuleSource | "all") => void;
  sourceCounts: Record<string, number>;
  rulesLoading: boolean;
  staffNamesForGroup: (group: RuleGroup) => string[];
  onOpenDetail: (group: RuleGroup) => void;
  onEdit: (group: RuleGroup) => void;
  onDelete: (group: RuleGroup) => void;
  onToggleStatus: (group: RuleGroup) => void;
  togglingRuleId: string | null;
  onAddFirstRule: () => void;
}): JSX.Element {
  const { formatAmount: fmtMoney } = useCurrency();

  // "Configured" = staff directly targeted by a rule (scope_type='staff', scope_id=their id).
  // Salon-wide/role-scoped rules aren't attributed to individual staff here yet.
  const staffWithComm   = new Set(commissionRules.filter((r) => r.scope_type === "staff").map((r) => r.scope_id));
  const configuredCount = staffList.filter((s) => staffWithComm.has(s.id)).length;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const pagedGroups = filteredGroups.slice((page - 1) * pageSize, page * pageSize);

  // Row actions live behind a single kebab menu (Edit/Activate/Delete) —
  // same portal-based pattern as MembershipsListPage's row menu, so it
  // can't be clipped by this table's own horizontal scroll container.
  // Position is computed from the trigger button's rect at open time,
  // right-aligned to it via `right` so the menu's width doesn't need to be
  // known up front.
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
  const [kebabPos, setKebabPos] = useState<{ top: number; right: number } | null>(null);
  const kebabPortalRef = useRef<HTMLUListElement>(null);
  const tableWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openRowMenuId) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(".tc-kebab-trigger")) return;
      if (kebabPortalRef.current?.contains(target)) return;
      setOpenRowMenuId(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openRowMenuId]);

  useEffect(() => {
    if (!openRowMenuId) return;
    const closeOnScroll = () => setOpenRowMenuId(null);
    const wrap = tableWrapRef.current;
    wrap?.addEventListener("scroll", closeOnScroll);
    window.addEventListener("scroll", closeOnScroll, true);
    return () => {
      wrap?.removeEventListener("scroll", closeOnScroll);
      window.removeEventListener("scroll", closeOnScroll, true);
    };
  }, [openRowMenuId]);

  return (
    <div className="cm-overview">
      <div className="tc-stats">
        <div className="tc-stat">
          <span className="tc-stat-icon tc-stat-icon--indigo"><ListCheck size={16} /></span>
          <span className="tc-stat-label">Total Rules</span>
          <strong className="tc-stat-val">{ruleGroups.length}</strong>
        </div>
        <div className="tc-stat-div" />
        <div className="tc-stat">
          <span className="tc-stat-icon tc-stat-icon--indigo"><People size={16} /></span>
          <span className="tc-stat-label">Total Staff</span>
          <strong className="tc-stat-val">{staffList.length}</strong>
        </div>
        <div className="tc-stat-div" />
        <div className="tc-stat">
          <span className="tc-stat-icon tc-stat-icon--green"><PersonCheck size={16} /></span>
          <span className="tc-stat-label">Configured</span>
          <strong className="tc-stat-val">{configuredCount}</strong>
        </div>
        <div className="tc-stat-div" />
        <div className="tc-stat">
          <span className="tc-stat-icon tc-stat-icon--amber"><PersonX size={16} /></span>
          <span className="tc-stat-label">No Commission</span>
          <strong className="tc-stat-val">{staffList.length - configuredCount}</strong>
        </div>
      </div>

      <div className="tc-toolbar tc-toolbar--wrap">
        <span className="tc-toolbar-title">Commission Rules</span>
        <div className="cm-cat-pills">
          <button
            className={`cm-pill ${sourceFilter === "all" ? "cm-pill--active" : ""}`}
            title={`Show all commission rules (${ruleGroups.length})`}
            onClick={() => setSourceFilter("all")}
          >
            All Rules <span className="cm-pill-count">({ruleGroups.length})</span>
          </button>
          {(Object.keys(SOURCE_META) as CommissionRuleSource[]).map((key) => (
            <button
              key={key}
              className={`cm-pill ${sourceFilter === key ? "cm-pill--active" : ""}`}
              title={`Filter by ${SOURCE_META[key].label} rules (${sourceCounts[key] ?? 0})`}
              onClick={() => setSourceFilter(key)}
            >
              {SOURCE_META[key].label} <span className="cm-pill-count">({sourceCounts[key] ?? 0})</span>
            </button>
          ))}
        </div>
      </div>

      <div className="tc-table-block">
        <div className="tc-table-wrap" ref={tableWrapRef}>
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
          <div className="cm-ov-empty">
            <Gear size={28} />
            <p>No commission rules found</p>
            <button className="cm-add-btn cm-add-btn--sm" onClick={onAddFirstRule}>
              <Plus size={14} /> Add your first rule
            </button>
          </div>
        ) : (
          <table className="tc-table">
            <thead>
              <tr>
                <th>#</th><th>Rule Name</th><th>Source</th><th>Frequency</th>
                <th>Scope</th><th>Value</th><th>Status</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pagedGroups.map((group, i) => {
                const rule = group.primary;
                const source = SOURCE_META[rule.source];
                const names = staffNamesForGroup(group);
                const scope =
                  rule.scope_type === "salon" ? "Entire Salon"
                  : rule.scope_type === "role" ? (rule.scope_id ?? "Role")
                  : names.length === 0 ? "Staff member"
                  : names.length === 1 ? names[0]
                  : `${names.length} staff`;
                const value = rule.type === "percentage" ? `${Number(rule.rate)}%`
                  : rule.type === "tiered_target" ? `${Number(rule.rate)}% → ${Number(rule.rate_after_target)}%`
                  : fmtMoney(Number(rule.rate));
                return (
                  <tr key={group.key} onClick={() => onOpenDetail(group)}>
                    <td>{(page - 1) * pageSize + i + 1}</td>
                    <td className="tc-table__name">{rule.name}</td>
                    <td>{source.label}</td>
                    <td>{FREQUENCY_LABELS[rule.frequency]}</td>
                    <td>{scope}</td>
                    <td>{value}</td>
                    <td><span className={`tc-status tc-status--${rule.status === "active" ? "settled" : "pending"}`}>{rule.status === "active" ? "Active" : "Inactive"}</span></td>
                    <td onClick={(ev) => ev.stopPropagation()}>
                      <button
                        className="tc-icon-btn tc-kebab-trigger"
                        title="Actions"
                        onClick={(e) => {
                          const isOpen = openRowMenuId === group.key;
                          setOpenRowMenuId(isOpen ? null : group.key);
                          if (!isOpen) {
                            const r = e.currentTarget.getBoundingClientRect();
                            setKebabPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
                          }
                        }}
                      >
                        <ThreeDotsVertical size={16} />
                      </button>
                      {openRowMenuId === group.key && kebabPos && createPortal(
                        <ul
                          ref={kebabPortalRef}
                          className="tc-kebab-menu"
                          style={{ position: "fixed", top: kebabPos.top, right: kebabPos.right, zIndex: 9999 }}
                        >
                          <li>
                            <button onClick={() => { setOpenRowMenuId(null); onEdit(group); }}>
                              <Pencil size={13} /> Edit
                            </button>
                          </li>
                          <li>
                            <button
                              disabled={togglingRuleId === group.key}
                              onClick={() => { setOpenRowMenuId(null); onToggleStatus(group); }}
                            >
                              <ToggleOn size={14} /> {rule.status === "active" ? "Deactivate" : "Activate"}
                            </button>
                          </li>
                          <li>
                            <button className="tc-kebab-menu__danger" onClick={() => { setOpenRowMenuId(null); onDelete(group); }}>
                              <Trash size={13} /> Delete
                            </button>
                          </li>
                        </ul>,
                        document.body
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

        {filteredGroups.length > 0 && (
          <Pagination
            className="tc-pagination"
            currentPage={page}
            pageSize={pageSize}
            totalItems={filteredGroups.length}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          />
        )}
      </div>
    </div>
  );
}

// ─── Commission History Drawer ────────────────────────────────────────────────

function CommissionHistoryDrawer({
  staffId, staffName, month, onClose,
}: {
  staffId: string;
  staffName: string;
  // Still month-only — this backend endpoint (unlike Summary/Table above)
  // was never extended to accept a date range, so it's fed the current
  // range's start month rather than the range itself (see exportMonth).
  month: string;
  onClose: () => void;
}): JSX.Element {
  const { formatAmount: fmt, currencySymbol } = useCurrency();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);

    const fetchOnce = () => api.get(`${STAFF.BY_ID(staffId)}/commissions/history?month=${month}`);

    // One silent auto-retry — the DB connection is prone to occasional
    // transient timeouts, and a single failed attempt would otherwise leave
    // this panel stuck empty even though the data is actually there.
    fetchOnce()
      .catch(() => fetchOnce())
      .then((r) => { if (!cancelled) setHistory(r.data?.data?.items ?? []); })
      .catch(() => { if (!cancelled) setLoadError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [staffId, month, retryTick]);

  const totalEarned  = history.reduce((s, h) => s + parseFloat(h.commission_amount), 0);
  const totalRevenue = history.reduce((s, h) => s + parseFloat(h.revenue_amount), 0);
  const formatPaymentMethod = (method?: string | null) => method ? method.toUpperCase() : "—";

  return (
    <div className="cm-history-overlay" onClick={onClose}>
      <div className="cm-history-drawer" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="cm-history-header">
          <div>
            <div className="cm-history-title">{staffName}</div>
            <div className="cm-history-sub">Commission History · {month}</div>
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
              const isPaid = h.status === "paid";
              const isPartial = h.status === "partial";
              const hasSettlement = isPaid || isPartial;
              const date    = formatDateDDMMYYYY(new Date(h.earned_at));
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
                        : `Fixed ${currencySymbol}${h.commission_rate}`}
                      {" → "}
                      <strong>{fmt(parseFloat(h.commission_amount))}</strong>
                    </div>
                    {hasSettlement && (
                      <div className="cm-history-payment">
                        Payment Method: <strong>{formatPaymentMethod(h.payment_method)}</strong>
                      </div>
                    )}
                  </div>
                  <span className={`cm-history-status ${hasSettlement ? "cm-history-status--paid" : "cm-history-status--pending"}`}>
                    {isPaid ? "Paid" : isPartial ? "Partial" : "Pending"}
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

// `view` replaces what used to be an internal Overview/Rules sub-tab —
// Commission Settle and Commission Rules are now peer top-level tabs (see
// CommissionsPage below), so this component renders ONE view per mount and
// is remounted (full refetch) when the outer tab switches, same as
// TipSettleTab already does for its own tab. All the fetching/state/handlers
// stay in this one component regardless of view — splitting those apart too
// would mean either duplicating them or prop-drilling across two new files,
// for a distinction that's purely about navigation UI, not data ownership.
function CommissionSettleTab({ view }: { view: "settle" | "rules" }) {
  const currentSalon = useSelector(selectCurrentSalon);
  const salonId      = currentSalon?.id;
  const { formatAmount } = useCurrency();

  const [staffList,   setStaffList]   = useState<StaffMember[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [earnSummary,      setEarnSummary]      = useState<EarningSummary | null>(null);
  const [earnedByStaff,    setEarnedByStaff]    = useState<EarnedByStaff[]>([]);
  // The Summary/Table below fully support an arbitrary date range (the
  // backend's summary/earned endpoints take start_date/end_date) — Export
  // and the per-staff History drawer don't, they're still month-only on the
  // backend, so exportMonth below derives a single YYYY-MM from whatever
  // range is selected rather than silently pretending those two also
  // support a real range.
  const [dateRange, setDateRange] = useState<DateRangeFilterValue>(() => ({
    ...DEFAULT_DATE_RANGE_FILTER_VALUE,
    preset: "this_month",
    ...getDateRangePresetValue("this_month"),
  }));
  const exportMonth = dateRange.startDate ? dateRange.startDate.slice(0, 7) : new Date().toISOString().slice(0, 7);
  const [historyStaffId,   setHistoryStaffId]   = useState<string | null>(null);
  const [settlingId,  setSettlingId]  = useState<string | null>(null);
  const [settleTarget, setSettleTarget] = useState<{ staffId: string; name: string; pending: number } | null>(null);

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
  const { showSuccess, showError, overlay } = useStatusOverlay();
  const { can } = usePermissions();
  const dispatch = useAppDispatch();
  const denyPerm = (permKey: string) => dispatch(showPermissionDenied(friendlyPermissionDenied(permKey)));

  useEffect(() => {
    const handler = () => setOptionsOpen(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const fetchAll = useCallback(async () => {
    if (!salonId) return;
    setLoading(true);

    try {
      const staffRes = await api.get(`${STAFF.BASE}?limit=200`);

      // Fetch earning summary + per-staff breakdown (non-blocking)
      // salon_id deliberately omitted — the commissions endpoints derive it
      // solely from the authenticated JWT (staff.controller.ts's getSalonId),
      // so a client-supplied value here was already inert.
      Promise.all([
        api.get(`${STAFF.BASE}/commissions/summary?start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`),
        api.get(`${STAFF.BASE}/commissions/earned?start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`),
      ]).then(([summaryRes, earnedRes]) => {
        setEarnSummary(summaryRes.data?.data ?? null);
        setEarnedByStaff(earnedRes.data?.data ?? []);
      }).catch(() => {});

      const allStaff: StaffMember[] = staffRes.data?.data?.items ?? [];
      const staff = allStaff.filter((s) => s.is_active !== false);
      setStaffList(staff);
    } catch (err: any) {
      // A permission-denial 403 already pops the global "Permission
      // Required" dialog via the axios interceptor — showing this too would
      // stack a second, raw-message popup on top of it for the same denial.
      if (!(err instanceof ApiError && err.status === 403)) {
        showError(err?.message ?? "Failed to load commissions");
      }
    } finally {
      setLoading(false);
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
      if (!(err instanceof ApiError && err.status === 403)) {
        showError(err?.message ?? "Failed to load commission rules");
      }
    } finally {
      setRulesLoading(false);
    }
  }, []);

  useEffect(() => { fetchCommissionRules(); }, [fetchCommissionRules]);

  const handleSaveRule = async (data: CommissionRuleFormData) => {
    const permKey = editingGroup ? "edit_commission_rule" : "add_commission_rule";
    if (!can(permKey)) { denyPerm(permKey); return; }
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
        showSuccess("Commission rule updated");
      } else {
        const res = await api.post(COMMISSION_RULES.BASE, data);
        showSuccess(res.data?.message ?? "Commission rule created");
      }
      setShowWizard(false);
      setEditingGroup(null);
      fetchCommissionRules();
    } catch (err: any) {
      showError(err?.response?.data?.message ?? "Failed to save commission rule");
    }
  };

  const handleToggleRuleStatus = async (group: RuleGroup) => {
    if (!can("edit_commission_rule")) { denyPerm("edit_commission_rule"); return; }
    setTogglingRuleId(group.key);
    try {
      const nextStatus = group.primary.status === "active" ? "draft" : "active";
      await Promise.all(group.rules.map((r) => api.patch(COMMISSION_RULES.STATUS(r.id), { status: nextStatus })));
      const idsInGroup = new Set(group.rules.map((r) => r.id));
      setCommissionRules((prev) => prev.map((r) => (idsInGroup.has(r.id) ? { ...r, status: nextStatus } : r)));
      setDetailGroup((prev) => (prev?.key === group.key ? null : prev));
    } catch (err: any) {
      showError(err?.message ?? "Failed to update rule status");
    } finally {
      setTogglingRuleId(null);
    }
  };

  const handleDeleteRule = async (group: RuleGroup) => {
    if (!can("delete_commission_rule")) { denyPerm("delete_commission_rule"); return; }
    try {
      await Promise.all(group.rules.map((r) => api.delete(COMMISSION_RULES.BY_ID(r.id))));
      const idsInGroup = new Set(group.rules.map((r) => r.id));
      setCommissionRules((prev) => prev.filter((r) => !idsInGroup.has(r.id)));
      setDetailGroup((prev) => (prev?.key === group.key ? null : prev));
      setShowDeleteSuccess(true);
    } catch (err: any) {
      showError(err?.message ?? "Failed to delete commission rule");
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

  // Refetch summary when the date range filter changes
  useEffect(() => {
    if (!salonId) return;
    Promise.all([
      api.get(`${STAFF.BASE}/commissions/summary?start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`),
      api.get(`${STAFF.BASE}/commissions/earned?start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`),
    ]).then(([summaryRes, earnedRes]) => {
      setEarnSummary(summaryRes.data?.data ?? null);
      setEarnedByStaff(earnedRes.data?.data ?? []);
    }).catch(() => {});
  }, [dateRange.startDate, dateRange.endDate, salonId]);

  const handleSettle = async (
    staffId: string,
    name: string,
    amount: number,
    paymentMethod: CommissionSettlementPaymentMethod,
  ) => {
    if (!can("manage_commissions")) { denyPerm("manage_commissions"); return; }
    setSettlingId(staffId);
    try {
      // `amount` is sent to the backend so a partial entry only settles that
      // much — the remainder stays pending (status becomes "partial" there).
      await api.post(STAFF.SETTLE_COMMISSION(staffId), {
        amount,
        payment_method: paymentMethod,
      });
      showSuccess(`${formatAmount(amount)} settled for ${name}`);
      setSettleTarget(null);
      const [summaryRes, earnedRes] = await Promise.all([
        api.get(`${STAFF.BASE}/commissions/summary?start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`),
        api.get(`${STAFF.BASE}/commissions/earned?start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`),
      ]);
      setEarnSummary(summaryRes.data?.data ?? null);
      setEarnedByStaff(earnedRes.data?.data ?? []);
    } catch (err: any) {
      showError(err?.response?.data?.message ?? "Failed to settle commission");
    } finally {
      setSettlingId(null);
    }
  };

  return (
    <div className="commissions-page">
      {overlay}
      {showDeleteSuccess && (
        <SuccessOverlay message="Commission rule deleted successfully" onDone={() => setShowDeleteSuccess(false)} />
      )}

      <div className="cm-header">
        <div>
          <h2 className="cm-title">{view === "settle" ? "Commission Settle" : "Commission Rules"}</h2>
          <p className="cm-subtitle">
            {view === "settle" ? "Review and settle staff commission payouts" : "Create and manage commission rules for your staff"}
          </p>
        </div>
        <div className="cm-header-actions">
          {view === "settle" ? (
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
                      const res = await api.get(`${STAFF.BASE}/commissions/export?month=${exportMonth}`, { responseType: "blob" });
                      const url = URL.createObjectURL(new Blob([res.data]));
                      const a   = document.createElement("a");
                      a.href    = url;
                      a.download = `commissions_${exportMonth}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    } catch (err: any) {
                    // A permission denial (403) already shows the global
                    // "Permission Required" popup (see interceptors.ts and
                    // staff.routes.ts's requireExportFormatPermission) —
                    // showing this overlay too would stack a second, jarring
                    // centered popup on top of it for that one case.
                    if (!(err instanceof ApiError && err.status === 403)) showError("Export failed");
                  }
                  }}>
                    <Download size={14} /> Export CSV
                  </button>
                  <button className="cm-option-item" onClick={async () => {
                    setOptionsOpen(false);
                    try {
                      const res = await api.get(`${STAFF.BASE}/commissions/export?month=${exportMonth}&format=excel`, { responseType: "blob" });
                      const url = URL.createObjectURL(new Blob([res.data]));
                      const a   = document.createElement("a");
                      a.href    = url;
                      a.download = `commissions_${exportMonth}.xlsx`;
                      a.click();
                      URL.revokeObjectURL(url);
                    } catch (err: any) {
                    // A permission denial (403) already shows the global
                    // "Permission Required" popup (see interceptors.ts and
                    // staff.routes.ts's requireExportFormatPermission) —
                    // showing this overlay too would stack a second, jarring
                    // centered popup on top of it for that one case.
                    if (!(err instanceof ApiError && err.status === 403)) showError("Export failed");
                  }
                  }}>
                    <FileEarmarkExcel size={14} /> Export Excel
                  </button>
                  <button className="cm-option-item" onClick={async () => {
                    setOptionsOpen(false);
                    try {
                      const res = await api.get(`${STAFF.BASE}/commissions/export?month=${exportMonth}&format=json`);
                      const rows = res.data?.data ?? [];
                      const blob = exportCommissionsPDF(rows, exportMonth);
                      const url  = URL.createObjectURL(blob);
                      const a    = document.createElement("a");
                      a.href     = url;
                      a.download = `commissions_${exportMonth}.pdf`;
                      a.click();
                      URL.revokeObjectURL(url);
                    } catch (err: any) {
                    // A permission denial (403) already shows the global
                    // "Permission Required" popup (see interceptors.ts and
                    // staff.routes.ts's requireExportFormatPermission) —
                    // showing this overlay too would stack a second, jarring
                    // centered popup on top of it for that one case.
                    if (!(err instanceof ApiError && err.status === 403)) showError("Export failed");
                  }
                  }}>
                    <FiletypePdf size={14} /> Export PDF
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              className="cm-add-btn"
              style={!can("add_commission_rule") ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
              onClick={() => {
                if (!can("add_commission_rule")) { denyPerm("add_commission_rule"); return; }
                setEditingGroup(null); setShowWizard(true);
              }}
            >
              <Plus size={15} /> Add Commission Rule
            </button>
          )}
        </div>
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
      ) : view === "settle" ? (
        <OverviewTab
          earnSummary={earnSummary}
          earnedByStaff={earnedByStaff}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          onSettle={(staffId, name, pending) => setSettleTarget({ staffId, name, pending })}
          settlingId={settlingId}
          onOpenHistory={(staffId) => setHistoryStaffId(staffId)}
        />
      ) : (
        <RulesTable
          commissionRules={commissionRules}
          staffList={staffList}
          ruleGroups={ruleGroups}
          filteredGroups={filteredGroups}
          sourceFilter={sourceFilter}
          setSourceFilter={setSourceFilter}
          sourceCounts={sourceCounts}
          rulesLoading={rulesLoading}
          staffNamesForGroup={staffNamesForGroup}
          onOpenDetail={setDetailGroup}
          onEdit={(g) => { setEditingGroup(g); setShowWizard(true); }}
          onDelete={handleDeleteRule}
          onToggleStatus={handleToggleRuleStatus}
          togglingRuleId={togglingRuleId}
          onAddFirstRule={() => { setEditingGroup(null); setShowWizard(true); }}
        />
      )}

      {/* History Drawer */}
      {historyStaffId && (
        <CommissionHistoryDrawer
          staffId={historyStaffId}
          staffName={earnedByStaff.find((e) => e.staff_id === historyStaffId)
            ? `${earnedByStaff.find((e) => e.staff_id === historyStaffId)!.staff_first_name} ${earnedByStaff.find((e) => e.staff_id === historyStaffId)!.staff_last_name ?? ""}`
            : "Staff"}
          month={exportMonth}
          onClose={() => setHistoryStaffId(null)}
        />
      )}

      {settleTarget && (
        <SettleCommissionModal
          staffName={settleTarget.name}
          totalUnpaid={settleTarget.pending}
          formatAmount={formatAmount}
          onConfirm={(amount, paymentMethod) => handleSettle(settleTarget.staffId, settleTarget.name, amount, paymentMethod)}
          onClose={() => setSettleTarget(null)}
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

// ─── Tip & Commission — outer shell ────────────────────────────────────────
// Two main tabs — Commission and Tip. Commission holds two sub-tabs
// (Commission Settle / Commission Rule, both CommissionSettleTab mounted
// with a different `view` — unchanged functionality, just regrouped under
// one parent tab instead of sitting as peers of Tip). Tip has no sub-tabs
// of its own — a tip has nothing like a rule or a category to configure,
// just an amount to settle (see TipSettleTab.tsx) — so it renders directly.
type MainTab = "commission" | "tip";
type CommissionSubTab = "settle" | "rules";

const MAIN_TABS: { key: MainTab; label: string; icon: React.ReactNode }[] = [
  { key: "commission", label: "Commission", icon: <Calculator size={14} /> },
  { key: "tip",         label: "Tip",        icon: <HeartFill  size={14} /> },
];

const COMMISSION_SUB_TABS: { key: CommissionSubTab; label: string; icon: React.ReactNode }[] = [
  { key: "settle", label: "Commission Settle", icon: <Calculator size={13} /> },
  { key: "rules",  label: "Commission Rule",   icon: <ListCheck  size={13} /> },
];

// Tab-level permission gate — only Tip currently has one (the Commission tab
// has no equivalent request to gate it the same way). Kept as a lookup so a
// future ask to gate Commission too is a one-line addition, not a rewrite.
const MAIN_TAB_PERM: Partial<Record<MainTab, string>> = { tip: "view_tips" };

export default function CommissionsPage() {
  const [mainTab, setMainTab] = useState<MainTab>("commission");
  const [commissionSubTab, setCommissionSubTab] = useState<CommissionSubTab>("settle");
  const { can } = usePermissions();
  const dispatch = useAppDispatch();
  const denyPerm = (permKey: string) => dispatch(showPermissionDenied(friendlyPermissionDenied(permKey)));

  return (
    <div className="tc-shell">
      <div className="tc-main-tabs">
        {MAIN_TABS.map(({ key, label, icon }) => {
          const permKey = MAIN_TAB_PERM[key];
          const allowed = !permKey || can(permKey);
          return (
            <button
              key={key}
              type="button"
              className={`tc-main-tab ${mainTab === key ? "tc-main-tab--active" : ""}`}
              style={!allowed ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
              onClick={() => {
                if (!allowed) { denyPerm(permKey!); return; }
                setMainTab(key);
              }}
            >
              {icon}
              {label}
            </button>
          );
        })}
      </div>

      {mainTab === "commission" && (
        <div className="tc-shell-tabs tc-shell-tabs--sub">
          {COMMISSION_SUB_TABS.map(({ key, label, icon }) => (
            <Button
              key={key}
              variant={commissionSubTab === key ? "dark" : "light"}
              size="sm"
              pill
              iconLeft={icon}
              onClick={() => setCommissionSubTab(key)}
            >
              {label}
            </Button>
          ))}
        </div>
      )}

      {mainTab === "commission"
        ? <CommissionSettleTab view={commissionSubTab === "settle" ? "settle" : "rules"} />
        : <TipSettleTab />}
    </div>
  );
}
