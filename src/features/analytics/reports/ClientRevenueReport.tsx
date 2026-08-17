import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useDispatch } from "react-redux";
import { Search, X, StarFill, Star } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { CLIENT_REVENUE_REPORT } from "../../../services/api/endpoints";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import type { AppDispatch } from "../../../store/store";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { Pagination, JiraFilterMenu, DateRangeFilter, getDateRangePresetValue } from "../../../components/ui";
import type { JiraFilterField, DateRangeFilterValue } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import DateRangeFields from "../../../components/ui/DateRangeFields";
import Select from "../../../components/ui/Select";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import ClientHistoryModal from "../../clients/components/ClientHistoryModal";
import { useCurrency } from "../../../hooks/useCurrency";
import "./ClientRevenueReport.scss";

const REPORT_NAME = "Client Revenue";

const GENDER_OPTIONS = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
];

const MEMBERSHIP_OPTIONS = [
  { id: "member", label: "Member" },
  { id: "non_member", label: "Non-Member" },
];

interface ClientRevenueRow {
  client: string;
  clientId: string;
  contact: string;
  visits: number;
  totalSpend: number;
  avgTicket: number;
  lastVisit: string;
  avgRating: number | null;
  reviewCount: number;
}

function StarRating({ value }: { value: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 1, alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map(i =>
        i <= Math.round(value)
          ? <StarFill key={i} size={12} color="#F59E0B" />
          : <Star key={i} size={12} color="#d1d5db" />
      )}
      <span style={{ marginLeft: 4, fontSize: 12, fontWeight: 500 }}>{value.toFixed(1)}</span>
    </span>
  );
}

// Maps a row from the independent Client Revenue API
// (POST /api/report/client-revenue — reads sales/clients directly, never
// the Appointment API) to the table's existing ClientRevenueRow shape.
function mapRow(row: any): ClientRevenueRow {
  return {
    client: row.client_name || "Walk-in",
    clientId: row.client_id ? String(row.client_id) : "",
    contact: row.contact || "—",
    visits: Number(row.visits) || 0,
    totalSpend: Number(row.total_spend) || 0,
    avgTicket: Number(row.avg_ticket) || 0,
    lastVisit: row.last_visit || "",
    avgRating: row.avg_rating != null ? Number(row.avg_rating) : null,
    reviewCount: Number(row.review_count) || 0,
  };
}

function formatDate(input: string): string {
  const d = new Date(input);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

const SORT_OPTIONS: { label: string; sortBy: string; sortDir: "asc" | "desc" }[] = [
  { label: "Latest Visit", sortBy: "last_visit", sortDir: "desc" },
  { label: "Oldest Visit", sortBy: "last_visit", sortDir: "asc" },
  { label: "Highest Revenue", sortBy: "total_spend", sortDir: "desc" },
  { label: "Lowest Revenue", sortBy: "total_spend", sortDir: "asc" },
  { label: "Most Visits", sortBy: "visits", sortDir: "desc" },
  { label: "Least Visits", sortBy: "visits", sortDir: "asc" },
  { label: "Highest Average Ticket", sortBy: "avg_ticket", sortDir: "desc" },
  { label: "Client Name (A–Z)", sortBy: "client_name", sortDir: "asc" },
  { label: "Client Name (Z–A)", sortBy: "client_name", sortDir: "desc" },
];

const LAST_VISIT_PRESET_LABELS: Record<string, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last7: "Last 7 Days",
  last30: "Last 30 Days",
  custom: "Custom Date Range",
};

function lastVisitPresetRange(preset: string): { from: string; to: string } | null {
  const now = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (preset === "today") return { from: iso(now), to: iso(now) };
  if (preset === "yesterday") {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return { from: iso(y), to: iso(y) };
  }
  if (preset === "last7") {
    const s = new Date(now);
    s.setDate(s.getDate() - 6);
    return { from: iso(s), to: iso(now) };
  }
  if (preset === "last30") {
    const s = new Date(now);
    s.setDate(s.getDate() - 29);
    return { from: iso(s), to: iso(now) };
  }
  return null;
}

export default function ClientRevenueReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const { currencySymbol, formatAmount } = useCurrency();
  const [dateRange, setDateRange] = useState<DateRangeFilterValue>({ preset: "this_month", ...getDateRangePresetValue("this_month") });
  const { startDate: dateFrom, endDate: dateTo } = dateRange;
  const dispatch = useDispatch<AppDispatch>();
  const [genderFilter, setGenderFilter] = useState<string[]>([]);
  const [membershipFilter, setMembershipFilter] = useState<string[]>([]);
  const [staffFilterIds, setStaffFilterIds] = useState<string[]>([]);
  const [staffOptions, setStaffOptions] = useState<{ id: string; label: string }[]>([]);
  const [lastVisitPreset, setLastVisitPreset] = useState("All");
  const [lastVisitFrom, setLastVisitFrom] = useState("");
  const [lastVisitTo, setLastVisitTo] = useState("");
  const [sortBy, setSortBy] = useState("last_visit");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [search,      setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rows,        setRows]        = useState<ClientRevenueRow[]>([]);
  const [total,       setTotal]       = useState(0);
  const [stats,       setStats]       = useState({ totalClients: 0, totalRevenue: 0, avgSpend: 0, topClient: "—" });
  const [loading,     setLoading]     = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(10);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    dispatch(fetchStaffThunk()).unwrap().then((list: any[]) => {
      const opts = list.map((s: any) => ({
        label: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.name || "",
        id: String(s.id ?? ""),
      })).filter((o: any) => o.label && o.id);
      setStaffOptions(opts);
    }).catch(() => {});
  }, [dispatch]);

  const dateRangeError = dateFrom && dateTo && dateTo < dateFrom
    ? "To Date must be greater than or equal to From Date"
    : "";

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Real server-side pagination — page/limit are sent on every request, and
  // only that page's rows come back, along with stats computed by the
  // backend over the WHOLE filtered set (not just the current page).
  const fetchData = useCallback(async () => {
    if (dateRangeError) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const body: Record<string, any> = {
        start_date: dateFrom, end_date: dateTo,
        page: currentPage, limit: pageSize,
      };
      if (debouncedSearch) body.search = debouncedSearch;
      // Backend's gender/membership_status knobs are single values —
      // checking exactly one option narrows normally; checking both (or
      // neither) means "no filter", so nothing is sent (same pattern used
      // for Reward Status / Ewallet Balance Status).
      if (genderFilter.length === 1) body.gender = genderFilter[0];
      if (membershipFilter.length === 1) body.membership_status = membershipFilter[0];
      if (staffFilterIds.length > 0) body.staff_ids = staffFilterIds;
      const lv = lastVisitPreset === "custom"
        ? (lastVisitFrom && lastVisitTo ? { from: lastVisitFrom, to: lastVisitTo } : null)
        : lastVisitPresetRange(lastVisitPreset);
      if (lv) { body.last_visit_from = lv.from; body.last_visit_to = lv.to; }
      body.sort_by = sortBy;
      body.sort_dir = sortDir;
      const res = await api.post(CLIENT_REVENUE_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
      const s = data?.stats ?? {};
      setStats({
        totalClients: Number(s.total_clients) || 0,
        totalRevenue: Number(s.total_revenue) || 0,
        avgSpend: Number(s.avg_spend_per_client) || 0,
        topClient: s.top_client || "—",
      });
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
        setStats({ totalClients: 0, totalRevenue: 0, avgSpend: 0, topClient: "—" });
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [
    dateFrom, dateTo, debouncedSearch,
    genderFilter, membershipFilter, staffFilterIds, lastVisitPreset, lastVisitFrom, lastVisitTo,
    sortBy, sortDir, currentPage, pageSize,
  ]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    setCurrentPage(1);
  }, [
    dateFrom, dateTo, debouncedSearch,
    genderFilter, membershipFilter, staffFilterIds, lastVisitPreset, lastVisitFrom, lastVisitTo,
    sortBy, sortDir,
  ]);

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "gender", label: "Gender", options: GENDER_OPTIONS },
    { key: "membership", label: "Membership Status", options: MEMBERSHIP_OPTIONS },
    { key: "staff", label: "Staff", options: staffOptions, searchable: true },
  ], [staffOptions]);

  const filterMenuSelected = useMemo(() => ({
    gender: genderFilter,
    membership: membershipFilter,
    staff: staffFilterIds,
  }), [genderFilter, membershipFilter, staffFilterIds]);

  const handleFiltersApply = (next: Record<string, string[]>) => {
    setGenderFilter(next.gender ?? []);
    setMembershipFilter(next.membership ?? []);
    setStaffFilterIds(next.staff ?? []);
  };

  const currentSortLabel = SORT_OPTIONS.find(o => o.sortBy === sortBy && o.sortDir === sortDir)?.label ?? SORT_OPTIONS[0].label;
  const handleSortChange = (label: string) => {
    const opt = SORT_OPTIONS.find(o => o.label === label);
    if (opt) { setSortBy(opt.sortBy); setSortDir(opt.sortDir); }
  };

  const HEADERS = ["Client Name", "Contact", "Total Visits", `Total Spend (${currencySymbol})`, `Average Ticket Size (${currencySymbol})`, "Last Visit", "Marketing Feedback"];
  const exportRows = () => rows.map(r => [r.client, r.contact, r.visits, r.totalSpend, r.avgTicket, r.lastVisit ? formatDate(r.lastVisit) : "—", r.avgRating != null ? `${r.avgRating} ★ (${r.reviewCount})` : "—"]);

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
              filename={`client-revenue-${dateFrom}-${dateTo}`}
              variant="button"
              csv
              disabled={!!dateRangeError}
              dateRangeLabel={`${formatDate(dateFrom)} - ${formatDate(dateTo)}`}
              filterLines={[
                ...(debouncedSearch ? [`Search: "${debouncedSearch}"`] : []),
                ...(genderFilter.length === 1 ? [`Gender: ${genderFilter[0]}`] : []),
                ...(membershipFilter.length === 1 ? [`Membership: ${membershipFilter[0] === "member" ? "Member" : "Non-Member"}`] : []),
                ...(staffFilterIds.length > 0
                  ? [`Staff: ${staffOptions.filter(o => staffFilterIds.includes(o.id)).map(o => o.label).join(", ")}`]
                  : []),
                ...(lastVisitPreset !== "All" ? [`Last Visit: ${LAST_VISIT_PRESET_LABELS[lastVisitPreset] ?? lastVisitPreset}`] : []),
                `Sort: ${currentSortLabel}`,
              ]}
              summaryLines={[
                `Total Clients: ${stats.totalClients}`,
                `Total Revenue: ${formatAmount(stats.totalRevenue)}`,
                `Average Spend / Client: ${formatAmount(stats.avgSpend)}`,
                `Top Client: ${stats.topClient}`,
              ]}
            />
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
        <JiraFilterMenu fields={filterFields} selected={filterMenuSelected} onApply={handleFiltersApply} triggerLabel="Filters" />
        <Select containerClass="rp-cr-filter-field" value={lastVisitPreset} onChange={e => setLastVisitPreset(e.target.value)}>
          <option value="All">Last Visit: All</option>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="last7">Last 7 Days</option>
          <option value="last30">Last 30 Days</option>
          <option value="custom">Custom Date Range</option>
        </Select>
        {lastVisitPreset === "custom" && (
          <DateRangeFields
            from={lastVisitFrom} to={lastVisitTo}
            onFromChange={setLastVisitFrom} onToChange={setLastVisitTo}
            hideLabel containerClassName="rp-cr-filter-field"
          />
        )}
        <div className="rp-detail-filter-actions">
          <ReportRefreshButton onClick={fetchData} loading={loading} />
        </div>
      </div>

      {loading ? <SkeletonStatCards count={4} /> : (
        <div className="rp-sra-summary-row">
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalClients}</div><div className="rp-sra-summary-label">Total Clients</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.totalRevenue)}</div><div className="rp-sra-summary-label">Total Revenue</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.avgSpend)}</div><div className="rp-sra-summary-label">Average Spend / Client</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val rp-cr-top">{stats.topClient}</div><div className="rp-sra-summary-label">Top Client</div></div>
        </div>
      )}

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input type="text" className="rp-detail-search-input" placeholder="Client name or phone" value={search} onChange={e => setSearchInput(e.target.value)} />
        </div>
        <Select containerClass="rp-cr-sort-field" value={currentSortLabel} onChange={e => handleSortChange(e.target.value)}>
          {SORT_OPTIONS.map(o => <option key={o.label} value={o.label}>{o.label}</option>)}
        </Select>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr><th>Client Name</th><th>Contact</th><th>Total Visits</th><th>Total Spend ({currencySymbol})</th><th>Average Ticket Size ({currencySymbol})</th><th>Last Visit</th><th>Marketing Feedback</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={7} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="rp-detail-empty-cell">No client revenue data found</td></tr>
            ) : rows.map((r, i) => (
              <tr
                key={i}
                className={r.clientId ? "rp-appt-row" : undefined}
                onClick={() => r.clientId && setSelectedClientId(r.clientId)}
              >
                <td className="fw-semibold">{r.client}</td>
                <td>{r.contact}</td>
                <td>{r.visits}</td>
                <td className="fw-semibold">{formatAmount(r.totalSpend)}</td>
                <td>{formatAmount(r.avgTicket)}</td>
                <td>{r.lastVisit ? formatDate(r.lastVisit) : "—"}</td>
                <td>
                  {r.avgRating != null ? (
                    <StarRating value={r.avgRating} />
                  ) : (
                    <span style={{ color: "#9ca3af" }}>No feedback</span>
                  )}
                </td>
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
