import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useDispatch } from "react-redux";
import { Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { SERVICE_FREQUENCY_REPORT } from "../../../services/api/endpoints";
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
import { useServices } from "../../catalog/hooks/useServices";
import { servicesInCategories } from "./serviceCategoryFilter";
import "./ClientRevenueReport.scss";
import "./ServiceFrequencyReport.scss";

const REPORT_NAME = "Service Frequency";

interface FrequencyRow {
  clientId: string;
  clientName: string;
  contact: string;
  serviceId: string;
  serviceName: string;
  categoryName: string;
  visits: number;
  totalSpend: number;
  firstVisit: string | null;
  lastVisit: string | null;
  daysSinceLastVisit: number;
}

function mapRow(row: any): FrequencyRow {
  return {
    clientId: row.client_id ? String(row.client_id) : "",
    clientName: row.client_name || "—",
    contact: row.contact || "—",
    serviceId: row.service_id ? String(row.service_id) : "",
    serviceName: row.service_name || "—",
    categoryName: row.category_name || "—",
    visits: Number(row.visits) || 0,
    totalSpend: Number(row.total_spend) || 0,
    firstVisit: row.first_visit || null,
    lastVisit: row.last_visit || null,
    daysSinceLastVisit: Number(row.days_since_last_visit) || 0,
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

export default function ServiceFrequencyReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const dispatch = useDispatch<AppDispatch>();
  const { currencySymbol, formatAmount } = useCurrency();
  // Service/category options come from the catalog hook, not the report API —
  // same convention as ServiceSaleReport, so Reports and Catalog > Services
  // always offer an identical list.
  const { services, categories, fetchServices } = useServices();
  const [dateRange, setDateRange] = useState<DateRangeFilterValue>({ preset: "this_month", ...getDateRangePresetValue("this_month") });
  const { startDate: dateFrom, endDate: dateTo } = dateRange;
  const [search,   setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [serviceIds,     setServiceIds]     = useState<string[]>([]);
  const [categoryIds,    setCategoryIds]    = useState<string[]>([]);
  const [staffFilterIds, setStaffFilterIds] = useState<string[]>([]);
  const [staffOptions,   setStaffOptions]   = useState<{ id: string; label: string }[]>([]);
  const [rows,  setRows]  = useState<FrequencyRow[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({
    totalPairs: 0, repeatPairs: 0, totalVisits: 0, totalRevenue: 0,
  });
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(10);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const dateRangeError = dateFrom && dateTo && dateTo < dateFrom
    ? "To Date must be greater than or equal to From Date"
    : "";

  useEffect(() => { fetchServices({ limit: 1000 }); }, [fetchServices]);

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
        page: currentPage, limit: pageSize,
      };
      if (debouncedSearch) body.search = debouncedSearch;
      if (serviceIds.length > 0) body.service_ids = serviceIds;
      if (categoryIds.length > 0) body.category_ids = categoryIds;
      if (staffFilterIds.length > 0) body.staff_ids = staffFilterIds;
      const res = await api.post(SERVICE_FREQUENCY_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
      const s = data?.stats ?? {};
      setStats({
        totalPairs: Number(s.total_pairs) || 0,
        repeatPairs: Number(s.repeat_pairs) || 0,
        totalVisits: Number(s.total_visits) || 0,
        totalRevenue: Number(s.total_revenue) || 0,
      });
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
        setStats({ totalPairs: 0, repeatPairs: 0, totalVisits: 0, totalRevenue: 0 });
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo, debouncedSearch, serviceIds, categoryIds, staffFilterIds, currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [dateFrom, dateTo, debouncedSearch, serviceIds, categoryIds, staffFilterIds]);

  const filterFields: JiraFilterField[] = useMemo(() => [
    {
      key: "service", label: "Service", searchable: true,
      options: services.map((sv: any) => ({ id: String(sv.id), label: String(sv.name) })),
      dependsOn: "category",
      optionsFor: (catIds, ownIds) => servicesInCategories(services as any, catIds, ownIds),
    },
    { key: "category", label: "Category", options: categories.map((c: any) => ({ id: String(c.id), label: String(c.name) })), searchable: true },
    { key: "staff", label: "Staff", options: staffOptions, searchable: true },
  ], [services, categories, staffOptions]);

  const filterMenuSelected = useMemo(() => ({
    service: serviceIds,
    category: categoryIds,
    staff: staffFilterIds,
  }), [serviceIds, categoryIds, staffFilterIds]);

  // Applied in one commit so Service + Category + Staff narrow the result set
  // jointly (AND) rather than a later field replacing an earlier one. Clear
  // passes {}, hence the ?? [] defaults.
  const handleFiltersApply = (next: Record<string, string[]>) => {
    setServiceIds(next.service ?? []);
    setCategoryIds(next.category ?? []);
    setStaffFilterIds(next.staff ?? []);
  };

  const HEADERS = [
    "Client", "Contact", "Service", "Category", "Visits",
    `Total Spend (${currencySymbol})`, "First Visit", "Last Visit",
    "Days Since Last",
  ];
  const exportRows = () => rows.map(r => [
    r.clientName, r.contact, r.serviceName, r.categoryName, r.visits,
    r.totalSpend, formatDate(r.firstVisit), formatDate(r.lastVisit),
    r.daysSinceLastVisit,
  ]);

  const activeFilterLines = [
    ...(serviceIds.length
      ? [`Service: ${services.filter((s: any) => serviceIds.includes(String(s.id))).map((s: any) => s.name).join(", ")}`]
      : []),
    ...(categoryIds.length
      ? [`Category: ${categories.filter((c: any) => categoryIds.includes(String(c.id))).map((c: any) => c.name).join(", ")}`]
      : []),
    ...(staffFilterIds.length
      ? [`Staff: ${staffOptions.filter(o => staffFilterIds.includes(o.id)).map(o => o.label).join(", ")}`]
      : []),
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
              filename={`service-frequency-${dateFrom}-${dateTo}`}
              variant="button"
              csv
              disabled={!!dateRangeError}
              dateRangeLabel={`${formatDate(dateFrom)} - ${formatDate(dateTo)}`}
              filterLines={activeFilterLines}
              summaryLines={[
                `Client-Service Pairs: ${stats.totalPairs}`,
                `Repeat Pairs: ${stats.repeatPairs}`,
                `Total Visits: ${stats.totalVisits}`,
                `Total Revenue: ${formatAmount(stats.totalRevenue)}`,
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
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalPairs}</div><div className="rp-sra-summary-label">Client-Service Pairs</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.repeatPairs}</div><div className="rp-sra-summary-label">Repeat Pairs</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalVisits}</div><div className="rp-sra-summary-label">Total Visits</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.totalRevenue)}</div><div className="rp-sra-summary-label">Total Revenue</div></div>
        </div>
      )}

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input type="text" className="rp-detail-search-input" placeholder="Client, phone or service" value={search} onChange={e => setSearchInput(e.target.value)} />
        </div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>Client</th><th>Contact</th><th>Service</th><th>Category</th>
              <th>Visits</th>
              <th>Total Spend ({currencySymbol})</th>
              <th>First Visit</th><th>Last Visit</th>
              <th>Days Since Last</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={9} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} className="rp-detail-empty-cell">No service history found</td></tr>
            ) : rows.map((r, i) => (
              <tr
                key={i}
                className={r.clientId ? "rp-appt-row" : undefined}
                onClick={() => r.clientId && setSelectedClientId(r.clientId)}
              >
                <td className="fw-semibold">{r.clientName}</td>
                <td>{r.contact}</td>
                <td className="rp-sf-service" title={r.serviceName}>{r.serviceName}</td>
                <td>{r.categoryName}</td>
                <td className="fw-semibold">{r.visits}</td>
                <td>{formatAmount(r.totalSpend)}</td>
                <td>{formatDate(r.firstVisit)}</td>
                <td>{formatDate(r.lastVisit)}</td>
                <td>{r.daysSinceLastVisit}</td>
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
