import { useState, useEffect, useCallback, useRef } from "react";
import { Search, X } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { CLIENT_REVENUE_REPORT } from "../../../services/api/endpoints";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { Pagination } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import DateRangeFields from "../../../components/ui/DateRangeFields";
import Select from "../../../components/ui/Select";
import Button from "../../../components/ui/Button";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import ClientHistoryModal from "../../clients/components/ClientHistoryModal";
import { useCurrency } from "../../../hooks/useCurrency";
import "./ClientRevenueReport.scss";

const REPORT_NAME = "Client Revenue";

interface ClientRevenueRow {
  client: string;
  clientId: string;
  contact: string;
  visits: number;
  totalSpend: number;
  avgTicket: number;
  lastVisit: string;
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
  const today   = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [dateFrom,    setDateFrom]    = useState(monthStart);
  const [dateTo,      setDateTo]      = useState(today);
  const [genderFilter, setGenderFilter] = useState("All");
  const [membershipFilter, setMembershipFilter] = useState("All");
  const [lastVisitPreset, setLastVisitPreset] = useState("All");
  const [lastVisitFrom, setLastVisitFrom] = useState("");
  const [lastVisitTo, setLastVisitTo] = useState("");
  const [sortBy, setSortBy] = useState("last_visit");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  // Draft copies of the filter fields, edited while the modal is open. They
  // only overwrite the applied state (above) when Apply is clicked; opening
  // the modal seeds them from the currently-applied values, and closing via
  // the X/overlay discards them without touching the applied state.
  const [draftGender, setDraftGender] = useState("All");
  const [draftMembership, setDraftMembership] = useState("All");
  const [draftLastVisitPreset, setDraftLastVisitPreset] = useState("All");
  const [draftLastVisitFrom, setDraftLastVisitFrom] = useState("");
  const [draftLastVisitTo, setDraftLastVisitTo] = useState("");
  const [search,      setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rows,        setRows]        = useState<ClientRevenueRow[]>([]);
  const [total,       setTotal]       = useState(0);
  const [stats,       setStats]       = useState({ totalClients: 0, totalRevenue: 0, avgSpend: 0, topClient: "—" });
  const [loading,     setLoading]     = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(25);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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
      if (genderFilter !== "All") body.gender = genderFilter.toLowerCase();
      if (membershipFilter !== "All") body.membership_status = membershipFilter;
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
    genderFilter, membershipFilter, lastVisitPreset, lastVisitFrom, lastVisitTo,
    sortBy, sortDir, currentPage, pageSize,
  ]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    setCurrentPage(1);
  }, [
    dateFrom, dateTo, debouncedSearch,
    genderFilter, membershipFilter, lastVisitPreset, lastVisitFrom, lastVisitTo,
    sortBy, sortDir,
  ]);

  const activeFilterCount = [
    genderFilter !== "All" ? 1 : 0,
    membershipFilter !== "All" ? 1 : 0,
    lastVisitPreset !== "All" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const openFiltersPanel = () => {
    setDraftGender(genderFilter);
    setDraftMembership(membershipFilter);
    setDraftLastVisitPreset(lastVisitPreset);
    setDraftLastVisitFrom(lastVisitFrom);
    setDraftLastVisitTo(lastVisitTo);
    setShowFiltersPanel(true);
  };

  const cancelFiltersPanel = () => setShowFiltersPanel(false);

  const clearDraftFilters = () => {
    setDraftGender("All");
    setDraftMembership("All");
    setDraftLastVisitPreset("All");
    setDraftLastVisitFrom("");
    setDraftLastVisitTo("");
  };

  const applyFilters = () => {
    setGenderFilter(draftGender);
    setMembershipFilter(draftMembership);
    setLastVisitPreset(draftLastVisitPreset);
    setLastVisitFrom(draftLastVisitFrom);
    setLastVisitTo(draftLastVisitTo);
    setShowFiltersPanel(false);
  };

  const currentSortLabel = SORT_OPTIONS.find(o => o.sortBy === sortBy && o.sortDir === sortDir)?.label ?? SORT_OPTIONS[0].label;
  const handleSortChange = (label: string) => {
    const opt = SORT_OPTIONS.find(o => o.label === label);
    if (opt) { setSortBy(opt.sortBy); setSortDir(opt.sortDir); }
  };

  const HEADERS = ["Client Name", "Contact", "Total Visits", `Total Spend (${currencySymbol})`, `Average Ticket Size (${currencySymbol})`, "Last Visit"];
  const exportRows = () => rows.map(r => [r.client, r.contact, r.visits, r.totalSpend, r.avgTicket, r.lastVisit ? formatDate(r.lastVisit) : "—"]);

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
                ...(genderFilter !== "All" ? [`Gender: ${genderFilter}`] : []),
                ...(membershipFilter !== "All" ? [`Membership: ${membershipFilter === "member" ? "Member" : "Non-Member"}`] : []),
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
        <DateRangeFields from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
        <button className="rp-cr-filters-btn" onClick={openFiltersPanel}>
          Filters
          {activeFilterCount > 0 && <span className="rp-cr-filters-badge">{activeFilterCount}</span>}
        </button>
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
            <tr><th>Client Name</th><th>Contact</th><th>Total Visits</th><th>Total Spend ({currencySymbol})</th><th>Average Ticket Size ({currencySymbol})</th><th>Last Visit</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={6} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="rp-detail-empty-cell">No client revenue data found</td></tr>
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

      {showFiltersPanel && (
        <div className="rp-cr-filters-overlay" onClick={cancelFiltersPanel}>
          <div className="rp-cr-filters-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Filters</h3>
              <button type="button" className="rp-cr-filters-close" aria-label="Close" onClick={cancelFiltersPanel}>
                <X size={18} />
              </button>
            </div>

            <div className="rp-cr-filters-body">
              <Select label="Gender" containerClass="rp-cr-filter-field" value={draftGender} onChange={e => setDraftGender(e.target.value)}>
                <option value="All">All</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </Select>

              <Select label="Membership Status" containerClass="rp-cr-filter-field" value={draftMembership} onChange={e => setDraftMembership(e.target.value)}>
                <option value="All">All</option>
                <option value="member">Member</option>
                <option value="non_member">Non-Member</option>
              </Select>

              <Select label="Last Visit" containerClass="rp-cr-filter-field" value={draftLastVisitPreset} onChange={e => setDraftLastVisitPreset(e.target.value)}>
                <option value="All">All</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="last7">Last 7 Days</option>
                <option value="last30">Last 30 Days</option>
                <option value="custom">Custom Date Range</option>
              </Select>
              {draftLastVisitPreset === "custom" && (
                <DateRangeFields
                  from={draftLastVisitFrom} to={draftLastVisitTo}
                  onFromChange={setDraftLastVisitFrom} onToChange={setDraftLastVisitTo}
                  hideLabel containerClassName="rp-cr-filter-field"
                />
              )}
            </div>

            <div className="rp-cr-filters-actions">
              <Button variant="ghost" onClick={clearDraftFilters}>Clear</Button>
              <Button variant="dark" onClick={applyFilters}>Apply</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
