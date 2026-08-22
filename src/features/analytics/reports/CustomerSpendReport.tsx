import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useDispatch } from "react-redux";
import { useAppSelector } from "../../../hooks/useAppRedux";
import { Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { CUSTOMER_SPEND_REPORT } from "../../../services/api/endpoints";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import type { AppDispatch } from "../../../store/store";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination, JiraFilterMenu, DateRangeFilter, getDateRangePresetValue } from "../../../components/ui";
import type { JiraFilterField, DateRangeFilterValue } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import ClientHistoryModal from "../../clients/components/ClientHistoryModal";
import { useCurrency } from "../../../hooks/useCurrency";
import { maskMobile } from "../../../utils/maskMobile";
import "./ClientRevenueReport.scss";
import "./CustomerSpendReport.scss";

const REPORT_NAME = "VIP Clients";

// Starting points only — every salon's ₹ scale differs, so these exist just
// to make the report render before the owner sets their own.
const DEFAULT_VIP_MIN = 25000;
const DEFAULT_LOW_MAX = 2000;

const SEGMENT_OPTIONS = [
  { id: "vip", label: "VIP" },
  { id: "regular", label: "Regular" },
  { id: "low", label: "Low Spending" },
];

interface SpendRow {
  clientId: string;
  clientName: string;
  contact: string;
  segment: string;
  visits: number;
  totalSpend: number;
  avgTicket: number;
  firstVisit: string | null;
  lastVisit: string | null;
  daysSinceLastVisit: number | null;
}

function mapRow(row: any): SpendRow {
  return {
    clientId: row.client_id ? String(row.client_id) : "",
    clientName: row.client_name || "—",
    contact: row.contact || "—",
    segment: row.spend_segment || "low",
    visits: Number(row.visits) || 0,
    totalSpend: Number(row.total_spend) || 0,
    avgTicket: Number(row.avg_ticket) || 0,
    firstVisit: row.first_visit || null,
    lastVisit: row.last_visit || null,
    daysSinceLastVisit: row.days_since_last_visit === null || row.days_since_last_visit === undefined
      ? null
      : Number(row.days_since_last_visit),
  };
}

function formatDate(input: string | null): string {
  if (!input) return "—";
  const d = new Date(input);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export default function CustomerSpendReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const dispatch = useDispatch<AppDispatch>();
  // On-screen the contact column is always masked; only the owner/admin role
  // gets the real number in Excel/CSV/PDF exports (staff/manager exports stay
  // masked too) — see maskMobile.
  const role = useAppSelector((s) => s.auth.role);
  const canViewFullContact = role === "salon_owner" || role === "admin";
  const { currencySymbol, formatAmount } = useCurrency();
  const [dateRange, setDateRange] = useState<DateRangeFilterValue>({ preset: "this_month", ...getDateRangePresetValue("this_month") });
  const { startDate: dateFrom, endDate: dateTo } = dateRange;
  // Two-state thresholds: the *Input* pair is the draft being typed inside
  // the Spend Thresholds panel; the plain pair is what's actually applied and
  // sent to the API. Nothing refetches until Apply, so a half-typed "2" en
  // route to "25000" never fires a request.
  const [vipMinInput, setVipMinInput] = useState(String(DEFAULT_VIP_MIN));
  const [vipMin,      setVipMin]      = useState(DEFAULT_VIP_MIN);
  const [lowMaxInput, setLowMaxInput] = useState(String(DEFAULT_LOW_MAX));
  const [lowMax,      setLowMax]      = useState(DEFAULT_LOW_MAX);
  const [segmentFilter,  setSegmentFilter]  = useState<string[]>([]);
  const [staffFilterIds, setStaffFilterIds] = useState<string[]>([]);
  const [staffOptions,   setStaffOptions]   = useState<{ id: string; label: string }[]>([]);
  const [search, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  // Frequent-customer filter — clients with at least this many visits in the
  // date range. Lives inside the Filters dropdown as a custom (non-checkbox)
  // field, so like Segment/Staff it only takes effect on that panel's Apply,
  // not on every keystroke.
  const [minVisits, setMinVisits] = useState<number | undefined>(undefined);
  const [rows,  setRows]  = useState<SpendRow[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({
    vipClients: 0, regularClients: 0, lowClients: 0, totalRevenue: 0, vipRevenueShare: 0,
  });
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(10);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [thresholdsOpen, setThresholdsOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const thresholdsRef = useRef<HTMLDivElement>(null);

  // Close the thresholds panel on outside click / Escape, matching how
  // JiraFilterMenu behaves so the two dropdowns feel the same.
  useEffect(() => {
    if (!thresholdsOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (thresholdsRef.current && !thresholdsRef.current.contains(e.target as Node)) {
        setThresholdsOpen(false);
      }
    };
    const onEscape = (e: KeyboardEvent) => { if (e.key === "Escape") setThresholdsOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEscape);
    };
  }, [thresholdsOpen]);

  const dateRangeError = dateFrom && dateTo && dateTo < dateFrom
    ? "To Date must be greater than or equal to From Date"
    : "";

  useEffect(() => {
    dispatch(fetchStaffThunk()).unwrap().then((list: any[]) => {
      const opts = list.map((s: any) => ({
        label: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.name || "",
        id: String(s.id ?? ""),
      })).filter((o: any) => o.label && o.id);
      setStaffOptions(opts);
    }).catch(() => {});
  }, [dispatch]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchData = useCallback(async () => {
    if (dateRangeError) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const body: Record<string, any> = {
        start_date: dateFrom, end_date: dateTo,
        vip_min_spend: vipMin, low_max_spend: lowMax,
        page: currentPage, limit: pageSize,
      };
      if (debouncedSearch) body.search = debouncedSearch;
      if (segmentFilter.length > 0) body.segments = segmentFilter;
      if (staffFilterIds.length > 0) body.staff_ids = staffFilterIds;
      if (minVisits !== undefined) body.min_visits = minVisits;
      const res = await api.post(CUSTOMER_SPEND_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
      const s = data?.stats ?? {};
      setStats({
        vipClients: Number(s.vip_clients) || 0,
        regularClients: Number(s.regular_clients) || 0,
        lowClients: Number(s.low_clients) || 0,
        totalRevenue: Number(s.total_revenue) || 0,
        vipRevenueShare: Number(s.vip_revenue_share) || 0,
      });
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
        setStats({ vipClients: 0, regularClients: 0, lowClients: 0, totalRevenue: 0, vipRevenueShare: 0 });
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo, vipMin, lowMax, debouncedSearch, segmentFilter, staffFilterIds, minVisits, currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [dateFrom, dateTo, vipMin, lowMax, debouncedSearch, segmentFilter, staffFilterIds, minVisits]);

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "segment", label: "Segment", options: SEGMENT_OPTIONS },
    { key: "staff", label: "Staff", options: staffOptions, searchable: true },
    {
      key: "visits",
      label: "Visits",
      options: [],
      render: (draft, setDraft) => (
        <div className="rp-cs-visits-field">
          <label htmlFor="jfm-min-visits-input">Minimum Visits</label>
          <input
            id="jfm-min-visits-input"
            type="number"
            min={0}
            placeholder="e.g. 5"
            value={draft[0] ?? ""}
            onChange={(e) => setDraft(e.target.value ? [e.target.value] : [])}
          />
          <p className="rp-cs-visits-field__hint">Shows clients with at least this many visits in the date range.</p>
        </div>
      ),
    },
  ], [staffOptions]);

  const filterMenuSelected = useMemo(() => ({
    segment: segmentFilter,
    staff: staffFilterIds,
    visits: minVisits !== undefined ? [String(minVisits)] : [],
  }), [segmentFilter, staffFilterIds, minVisits]);

  // One commit for all three fields so Segment, Staff and Visits narrow the
  // result set jointly (AND). Clear passes {}, hence the ?? [] defaults.
  const handleFiltersApply = (next: Record<string, string[]>) => {
    setSegmentFilter(next.segment ?? []);
    setStaffFilterIds(next.staff ?? []);
    const visitsRaw = next.visits?.[0];
    setMinVisits(visitsRaw ? Math.max(0, parseInt(visitsRaw, 10) || 0) : undefined);
  };

  const segmentLabel = (s: string) => SEGMENT_OPTIONS.find(o => o.id === s)?.label ?? s;

  // Draft/Apply lifecycle for the thresholds dropdown, deliberately local to
  // this report rather than added to the shared JiraFilterMenu (which only
  // renders checkbox lists and is used by ~15 other reports). Editing only
  // touches the draft; nothing refetches until Apply, so a half-typed "2" on
  // the way to "25000" never fires a request.
  const openThresholds = () => {
    setVipMinInput(String(vipMin));
    setLowMaxInput(String(lowMax));
    setThresholdsOpen(true);
  };
  const applyThresholds = () => {
    const v = Math.max(0, parseInt(vipMinInput, 10) || 0);
    const l = Math.max(0, parseInt(lowMaxInput, 10) || 0);
    setVipMin(v);
    setLowMax(l);
    setThresholdsOpen(false);
  };
  const resetThresholds = () => {
    setVipMin(DEFAULT_VIP_MIN);
    setLowMax(DEFAULT_LOW_MAX);
    setThresholdsOpen(false);
  };
  // Mirrors the backend's own clamp so the panel can warn before applying —
  // a Low bound above the VIP bound would overlap and empty the Regular band.
  const thresholdsOverlap = (parseInt(lowMaxInput, 10) || 0) > (parseInt(vipMinInput, 10) || 0);

  const HEADERS = [
    "Client", "Contact", "Segment", "Total Visits",
    `Total Spend (${currencySymbol})`, `Avg Ticket (${currencySymbol})`,
    "First Visit", "Last Visit", "Days Since Last",
  ];
  const exportRows = () => rows.map(r => [
    r.clientName, canViewFullContact ? r.contact : maskMobile(r.contact), segmentLabel(r.segment), r.visits,
    r.totalSpend, r.avgTicket,
    formatDate(r.firstVisit), formatDate(r.lastVisit),
    r.daysSinceLastVisit ?? "",
  ]);

  const activeFilterLines = [
    `VIP at or above: ${formatAmount(vipMin)}`,
    `Low below: ${formatAmount(lowMax)}`,
    ...(segmentFilter.length ? [`Segment: ${segmentFilter.map(segmentLabel).join(", ")}`] : []),
    ...(staffFilterIds.length
      ? [`Staff: ${staffOptions.filter(o => staffFilterIds.includes(o.id)).map(o => o.label).join(", ")}`]
      : []),
    ...(minVisits !== undefined ? [`Visits: ${minVisits}+`] : []),
    ...(debouncedSearch ? [`Search: "${debouncedSearch}"`] : []),
  ];

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Breadcrumb current={REPORT_NAME} category={category} categoryKey={categoryKey} onBack={onBack} />
          <div className="rp-detail-view-icons">
            <ReportExportButton
              title={REPORT_NAME}
              headers={HEADERS}
              rows={exportRows}
              filename={`vip-customers-${dateFrom}-${dateTo}`}
              variant="button"
              csv
              disabled={!!dateRangeError}
              dateRangeLabel={`${formatDate(dateFrom)} - ${formatDate(dateTo)}`}
              filterLines={activeFilterLines}
              summaryLines={[
                `VIP Clients: ${stats.vipClients}`,
                `Regular Clients: ${stats.regularClients}`,
                `Low Spending Clients: ${stats.lowClients}`,
                `Total Revenue: ${formatAmount(stats.totalRevenue)}`,
                `VIP Revenue Share: ${stats.vipRevenueShare}%`,
              ]}
            />
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
        <div className="rp-cs-thresholds" ref={thresholdsRef}>
          <button
            type="button"
            className="rp-cs-thresholds__trigger"
            onClick={() => (thresholdsOpen ? setThresholdsOpen(false) : openThresholds())}
          >
            <span>Spend Thresholds</span>
            <span className="rp-cs-thresholds__summary">
              {formatAmount(vipMin)} / {formatAmount(lowMax)}
            </span>
          </button>

          {thresholdsOpen && (
            <div className="rp-cs-thresholds__panel">
              <div className="rp-cs-thresholds__row">
                <label htmlFor="vip-min-input">VIP at or above ({currencySymbol})</label>
                <input
                  id="vip-min-input"
                  autoFocus
                  type="number"
                  min={0}
                  value={vipMinInput}
                  onChange={e => setVipMinInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") applyThresholds(); }}
                />
              </div>
              <div className="rp-cs-thresholds__row">
                <label htmlFor="low-max-input">Low below ({currencySymbol})</label>
                <input
                  id="low-max-input"
                  type="number"
                  min={0}
                  value={lowMaxInput}
                  onChange={e => setLowMaxInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") applyThresholds(); }}
                />
              </div>
              {thresholdsOverlap && (
                <div className="rp-cs-thresholds__warn">
                  Low bound is above the VIP bound — it will be capped at the VIP value, leaving no Regular segment.
                </div>
              )}
              <div className="rp-cs-thresholds__footer">
                <button type="button" className="rp-cs-thresholds__btn" onClick={resetThresholds}>Reset</button>
                <button type="button" className="rp-cs-thresholds__btn rp-cs-thresholds__btn--apply" onClick={applyThresholds}>Apply</button>
              </div>
            </div>
          )}
        </div>
        <JiraFilterMenu fields={filterFields} selected={filterMenuSelected} onApply={handleFiltersApply} triggerLabel="Filters" />
        <div className="rp-detail-filter-actions">
          <ReportRefreshButton onClick={fetchData} loading={loading} />
        </div>
      </div>

      {loading ? <SkeletonStatCards count={5} /> : (
        <div className="rp-sra-summary-row">
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.vipClients}</div><div className="rp-sra-summary-label">VIP Clients</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.regularClients}</div><div className="rp-sra-summary-label">Regular Clients</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.lowClients}</div><div className="rp-sra-summary-label">Low Spending Clients</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.vipRevenueShare}%</div><div className="rp-sra-summary-label">VIP Revenue Share</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.totalRevenue)}</div><div className="rp-sra-summary-label">Total Revenue</div></div>
        </div>
      )}

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input type="text" className="rp-detail-search-input" placeholder="Client name or phone" value={search} onChange={e => setSearchInput(e.target.value)} />
        </div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>Client</th><th>Contact</th><th>Segment</th><th>Total Visits</th>
              <th>Total Spend ({currencySymbol})</th>
              <th>Avg Ticket ({currencySymbol})</th>
              <th>First Visit</th><th>Last Visit</th><th>Days Since Last</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={9} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} className="rp-detail-empty-cell">No clients found</td></tr>
            ) : rows.map((r, i) => (
              <tr
                key={i}
                className={r.clientId ? "rp-appt-row" : undefined}
                onClick={() => r.clientId && setSelectedClientId(r.clientId)}
              >
                <td className="fw-semibold">{r.clientName}</td>
                <td>{maskMobile(r.contact)}</td>
                <td>
                  <span className={`rp-status-badge rp-cs-segment-${r.segment}`}>{segmentLabel(r.segment)}</span>
                </td>
                <td>{r.visits}</td>
                <td className="fw-semibold">{formatAmount(r.totalSpend)}</td>
                <td>{formatAmount(r.avgTicket)}</td>
                <td>{formatDate(r.firstVisit)}</td>
                <td>{formatDate(r.lastVisit)}</td>
                <td>{r.daysSinceLastVisit === null ? "—" : r.daysSinceLastVisit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} pageSize={pageSize} totalItems={total}
        onPageChange={setCurrentPage} onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} />

      {selectedClientId && (
        <ClientHistoryModal clientId={selectedClientId} onClose={() => setSelectedClientId(null)} />
      )}
    </div>
  );
}
