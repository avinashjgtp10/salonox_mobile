import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useDispatch } from "react-redux";
import { Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { CUSTOMER_FREQUENCY_REPORT } from "../../../services/api/endpoints";
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
import "./ClientRevenueReport.scss";

const REPORT_NAME = "Customer Frequency";

// Single JiraFilterMenu field, single-select in practice (the UI only ever
// applies one at a time — picking a second option replaces the first, same
// convention as Commission Report's Status dropdown, just hosted inside
// JiraFilterMenu per this report's own spec). 'most_frequent'/'least_frequent'
// are a sort (by visit count) and 'most_spending'/'least_spending' are a
// sort (by total spend) rather than segment buckets; 'new'/'old'/'lost'
// filter to that customer_type segment — see the backend's
// CustomerFrequencyReportFilters for the exact rules.
const CUSTOMER_TYPE_OPTIONS = [
  { id: "most_frequent",  label: "Most Frequent" },
  { id: "least_frequent", label: "Least Frequent" },
  { id: "most_spending",  label: "Most Spending" },
  { id: "least_spending", label: "Least Spending" },
  { id: "new",             label: "New" },
  { id: "old",             label: "Old" },
  { id: "lost",            label: "Lost" },
];

type CustomerType = "most_frequent" | "least_frequent" | "most_spending" | "least_spending" | "new" | "old" | "lost";

interface CustomerRow {
  clientId: string;
  clientName: string;
  contact: string;
  visits: number;
  totalSpend: number;
  firstVisit: string | null;
  lastVisit: string | null;
  visitorType: "new" | "returning";
  customerType: "new" | "old" | "lost";
}

// Maps a row from the independent Customer Frequency API
// (POST /api/report/customer-frequency — reads clients/sales directly,
// never the Appointment API) to the table's CustomerRow shape.
function mapRow(row: any): CustomerRow {
  return {
    clientId: row.client_id ? String(row.client_id) : "",
    clientName: row.client_name || "Walk-in",
    contact: row.contact || "—",
    visits: Number(row.visits) || 0,
    totalSpend: Number(row.total_spend) || 0,
    firstVisit: row.first_visit || null,
    lastVisit: row.last_visit || null,
    visitorType: row.visitor_type === "new" ? "new" : "returning",
    customerType: row.customer_type === "new" || row.customer_type === "lost" ? row.customer_type : "old",
  };
}

function formatDate(input: string | null): string {
  if (!input) return "—";
  const d = new Date(input);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  new: "New",
  old: "Old",
  lost: "Lost",
};

export default function CustomerFrequencyReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const dispatch = useDispatch<AppDispatch>();
  const { currencySymbol, formatAmount } = useCurrency();
  const [dateRange, setDateRange] = useState<DateRangeFilterValue>({ preset: "this_month", ...getDateRangePresetValue("this_month") });
  const { startDate: dateFrom, endDate: dateTo } = dateRange;
  const [staffOptions, setStaffOptions] = useState<{ id: string; label: string }[]>([]);
  const [staffFilterIds, setStaffFilterIds] = useState<string[]>([]);
  const [customerType, setCustomerType] = useState<CustomerType | null>(null);
  const [search,       setSearchInput]  = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rows,         setRows]         = useState<CustomerRow[]>([]);
  const [total,        setTotal]        = useState(0);
  const [stats,        setStats]        = useState({ totalClients: 0, newClients: 0, returningClients: 0, lostClients: 0 });
  const [loading,      setLoading]      = useState(false);
  const [currentPage,  setCurrentPage]  = useState(1);
  const [pageSize,     setPageSize]     = useState(10);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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
      if (staffFilterIds.length > 0) body.staff_ids = staffFilterIds;
      if (customerType) body.customer_type = customerType;
      if (debouncedSearch) body.search = debouncedSearch;
      const res = await api.post(CUSTOMER_FREQUENCY_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
      const s = data?.stats ?? {};
      setStats({
        totalClients: Number(s.total_clients) || 0,
        newClients: Number(s.new_clients) || 0,
        returningClients: Number(s.returning_clients) || 0,
        lostClients: Number(s.lost_clients) || 0,
      });
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
        setStats({ totalClients: 0, newClients: 0, returningClients: 0, lostClients: 0 });
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo, staffFilterIds, customerType, debouncedSearch, currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [dateFrom, dateTo, staffFilterIds, customerType, debouncedSearch]);

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "staff", label: "Staff", options: staffOptions, searchable: true },
    { key: "customer_type", label: "Customer Type", options: CUSTOMER_TYPE_OPTIONS },
  ], [staffOptions]);

  const filterMenuSelected = useMemo(() => ({
    staff: staffFilterIds,
    customer_type: customerType ? [customerType] : [],
  }), [staffFilterIds, customerType]);

  // Customer Type behaves as single-select even though JiraFilterMenu's
  // checkbox list is multi-capable — picking a second option replaces the
  // first rather than combining them, since "Most Frequent" and "Lost" (for
  // instance) aren't a meaningful combined filter.
  const handleFiltersApply = (next: Record<string, string[]>) => {
    setStaffFilterIds(next.staff ?? []);
    const picked = next.customer_type ?? [];
    setCustomerType((picked[picked.length - 1] as CustomerType) ?? null);
  };

  const HEADERS = ["Client Name", "Contact", "Total Visits", `Total Spend (${currencySymbol})`, "First Visit", "Last Visit", "Visitor Type", "Customer Type"];
  const exportRows = () => rows.map(r => [
    r.clientName, r.contact, r.visits, r.totalSpend,
    formatDate(r.firstVisit), formatDate(r.lastVisit),
    r.visitorType === "new" ? "New" : "Returning",
    CUSTOMER_TYPE_LABELS[r.customerType] ?? r.customerType,
  ]);

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
              filename={`customer-frequency-${dateFrom}-${dateTo}`}
              variant="button"
              csv
              disabled={!!dateRangeError}
              dateRangeLabel={`${formatDate(dateFrom)} - ${formatDate(dateTo)}`}
              filterLines={[
                ...(debouncedSearch ? [`Search: "${debouncedSearch}"`] : []),
                ...(customerType ? [`Customer Type: ${CUSTOMER_TYPE_OPTIONS.find(o => o.id === customerType)?.label ?? customerType}`] : []),
              ]}
              summaryLines={[
                `Total Clients: ${stats.totalClients}`,
                `New Clients: ${stats.newClients}`,
                `Returning Clients: ${stats.returningClients}`,
                `Lost Clients: ${stats.lostClients}`,
              ]}
            />
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
        <JiraFilterMenu fields={filterFields} selected={filterMenuSelected} onApply={handleFiltersApply} triggerLabel="Filters" />
        <div className="rp-detail-filter-actions">
          <ReportRefreshButton onClick={fetchData} loading={loading} />
        </div>
      </div>

      {loading ? <SkeletonStatCards count={4} /> : (
        <div className="rp-sra-summary-row">
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalClients}</div><div className="rp-sra-summary-label">Total Clients</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.newClients}</div><div className="rp-sra-summary-label">New Clients</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.returningClients}</div><div className="rp-sra-summary-label">Returning Clients</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.lostClients}</div><div className="rp-sra-summary-label">Lost Clients</div></div>
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
              <th>Client Name</th><th>Contact</th><th>Total Visits</th>
              <th>Total Spend ({currencySymbol})</th>
              <th>First Visit</th><th>Last Visit</th>
              <th>Visitor Type</th><th>Customer Type</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={8} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="rp-detail-empty-cell">No customer data found</td></tr>
            ) : rows.map((r, i) => (
              <tr
                key={i}
                className={r.clientId ? "rp-appt-row" : undefined}
                onClick={() => r.clientId && setSelectedClientId(r.clientId)}
              >
                <td className="fw-semibold">{r.clientName}</td>
                <td>{r.contact}</td>
                <td>{r.visits}</td>
                <td className="fw-semibold">{formatAmount(r.totalSpend)}</td>
                <td>{formatDate(r.firstVisit)}</td>
                <td>{formatDate(r.lastVisit)}</td>
                <td>
                  <span className={`rp-status-badge rp-status-${r.visitorType === "new" ? "active" : "completed"}`}>
                    {r.visitorType === "new" ? "New" : "Returning"}
                  </span>
                </td>
                <td>
                  <span className={`rp-status-badge rp-status-${r.customerType === "new" ? "active" : r.customerType === "lost" ? "cancelled" : "completed"}`}>
                    {CUSTOMER_TYPE_LABELS[r.customerType] ?? r.customerType}
                  </span>
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
