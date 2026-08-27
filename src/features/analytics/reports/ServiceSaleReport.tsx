import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Search, ChevronUp, ChevronDown } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { SERVICE_SALE_REPORT } from "../../../services/api/endpoints";
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
import { useRowSelection } from "./useRowSelection";
import { SendCampaignBar } from "./SendCampaignBar";
import { SendCampaignModal } from "../../marketing/components";
import "./ServiceSaleReport.scss";

const REPORT_NAME = "Service Sale";

interface ServiceSaleRow {
  date: string;
  invoiceNo: string;
  client: string;
  clientId: string;
  clientPhone: string;
  staff: string;
  serviceName: string;
  category: string;
  price: number;
  taxAmount: number;
  paidAmount: number;
  paymentMethod: string;
  status: string;
}

interface FilterOption { id: string; label: string; }

type SortField = "date" | "invoice_no" | "service_name" | "staff_name" | "price" | "total";
type SortDir = "asc" | "desc";

const PAYMENT_METHOD_OPTIONS: FilterOption[] = [
  { id: "cash", label: "Cash" },
  { id: "card", label: "Card" },
  { id: "upi", label: "UPI" },
  { id: "wallet", label: "Wallet" },
];

// dd/MM/yyyy, consistently across the table and every export (CSV/Excel/PDF
// all read the same r.date via exportRows).
function formatDate(input: string): string {
  const d = new Date(input);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Maps a row from the independent Service Sale API
// (POST /api/report/service-sale — reads sales/sale_items directly, never
// the Appointment API) to the table's existing ServiceSaleRow shape.
function mapRow(row: any): ServiceSaleRow {
  return {
    date: row.date ? formatDate(row.date) : "—",
    invoiceNo: row.invoice_no ?? "—",
    client: row.client_name || "Walk-in",
    clientId: row.client_id ? String(row.client_id) : "",
    clientPhone: row.client_phone || "",
    staff: row.staff_name || "—",
    serviceName: row.service_name || "Service",
    category: row.category_name || "—",
    price: Number(row.price) || 0,
    taxAmount: Number(row.tax_amount) || 0,
    paidAmount: Number(row.paid_amount) || 0,
    paymentMethod: row.payment_method || "N/A",
    status: row.status || "—",
  };
}

export default function ServiceSaleReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const { currencySymbol, formatAmount } = useCurrency();
  // Same Category/Service source as Catalog → Services (fetchServicesThunk/
  // fetchCategoriesThunk) — the full catalog list, not just categories/
  // services that happen to appear in sold line items, so both pages' filter
  // dropdowns show identical options.
  const { services, categories, fetchServices } = useServices();
  const [dateRange, setDateRange] = useState<DateRangeFilterValue>({ preset: "this_month", ...getDateRangePresetValue("this_month") });
  const { startDate: dateFrom, endDate: dateTo } = dateRange;
  const [search,      setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryIds,     setCategoryIds]     = useState<string[]>([]);
  const [serviceIds,      setServiceIds]      = useState<string[]>([]);
  const [minPrice,        setMinPrice]        = useState("");
  const [maxPrice,        setMaxPrice]        = useState("");
  const [staffFilterIds,  setStaffFilterIds]  = useState<string[]>([]);
  const [paymentMethods,  setPaymentMethods]  = useState<string[]>([]);
  const [sortBy,  setSortBy]  = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [rows,        setRows]        = useState<ServiceSaleRow[]>([]);
  const [total,       setTotal]       = useState(0);
  const [stats,       setStats]       = useState<{ servicesSold: number; totalRev: number; avgTicket: number; topService: { name: string; count: number } | null }>({
    servicesSold: 0, totalRev: 0, avgTicket: 0, topService: null,
  });
  // No separate /staff API call — the service-sale API itself returns
  // filters_available.staff, so options stay complete regardless of the
  // current date/filter selection.
  const [staffOptions, setStaffOptions] = useState<FilterOption[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(10);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const selection = useRowSelection();
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { fetchServices({ limit: 1000 }); }, [fetchServices]);

  // Real server-side pagination — page/limit are sent on every request, and
  // only that page's rows come back, along with stats computed by the
  // backend over the WHOLE filtered set (not just the current page).
  const fetchData = useCallback(async () => {
    if (dateTo && dateFrom && dateTo < dateFrom) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const body: Record<string, any> = {
        start_date: dateFrom, end_date: dateTo,
        page: currentPage, limit: pageSize,
        sort_by: sortBy, sort_dir: sortDir,
      };
      if (debouncedSearch) body.search = debouncedSearch;
      if (categoryIds.length > 0) body.category_ids = categoryIds;
      if (serviceIds.length > 0) body.service_ids = serviceIds;
      if (minPrice !== "") body.min_price = Number(minPrice);
      if (maxPrice !== "") body.max_price = Number(maxPrice);
      if (staffFilterIds.length > 0) body.staff_ids = staffFilterIds;
      if (paymentMethods.length > 0) body.payment_methods = paymentMethods;
      const res = await api.post(SERVICE_SALE_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
      const s = data?.stats ?? {};
      setStats({
        servicesSold: Number(s.services_sold) || 0,
        totalRev: Number(s.total_revenue) || 0,
        avgTicket: Number(s.avg_ticket) || 0,
        topService: s.top_service && s.top_service.name
          ? { name: String(s.top_service.name), count: Number(s.top_service.count) || 0 }
          : null,
      });
      const avail = data?.filters_available ?? {};
      if (Array.isArray(avail.staff)) setStaffOptions(avail.staff);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
        setStats({ servicesSold: 0, totalRev: 0, avgTicket: 0, topService: null });
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo, debouncedSearch, categoryIds, serviceIds, minPrice, maxPrice, staffFilterIds, paymentMethods, sortBy, sortDir, currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filter/search/sort changes go back to page 1 — page/pageSize changes
  // themselves should not reset back to page 1.
  useEffect(() => { setCurrentPage(1); }, [dateFrom, dateTo, debouncedSearch, categoryIds, serviceIds, minPrice, maxPrice, staffFilterIds, paymentMethods, sortBy, sortDir]);

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "category", label: "Category", options: categories.map((c: any) => ({ id: String(c.id), label: String(c.name) })), searchable: true },
    {
      key: "service", label: "Service", searchable: true,
      options: services.map((sv: any) => ({ id: String(sv.id), label: String(sv.name) })),
      dependsOn: "category",
      optionsFor: (catIds, ownIds) => servicesInCategories(services as any, catIds, ownIds),
    },
    { key: "staff", label: "Staff", options: staffOptions, searchable: true },
    { key: "payment_method", label: "Payment Method", options: PAYMENT_METHOD_OPTIONS },
  ], [categories, services, staffOptions]);

  const filterMenuSelected = useMemo(() => ({
    category: categoryIds,
    service: serviceIds,
    staff: staffFilterIds,
    payment_method: paymentMethods,
  }), [categoryIds, serviceIds, staffFilterIds, paymentMethods]);

  const handleFiltersApply = (next: Record<string, string[]>) => {
    setCategoryIds(next.category ?? []);
    setServiceIds(next.service ?? []);
    setStaffFilterIds(next.staff ?? []);
    setPaymentMethods(next.payment_method ?? []);
  };

  const handleSortClick = (field: SortField) => {
    if (sortBy !== field) { setSortBy(field); setSortDir("asc"); return; }
    if (sortDir === "asc") { setSortDir("desc"); return; }
    setSortBy("date"); setSortDir("desc");
  };

  const sortIcon = (field: SortField) =>
    sortBy === field ? (sortDir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : null;

  const HEADERS = ["Date", "Invoice No", "Client", "Staff", "Service Name", "Category", `Total (${currencySymbol})`, `Paid Amount (${currencySymbol})`, "Payment Method", "Status"];
  // Total column is gross = line base + its own GST.
  const exportRows = () => rows.map(r => [r.date, r.invoiceNo, r.client, r.staff, r.serviceName, r.category, r.price + r.taxAmount, r.paidAmount, r.paymentMethod, r.status]);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Breadcrumb current={REPORT_NAME} category={category} categoryKey={categoryKey} onBack={onBack} />
          <div className="rp-detail-view-icons">
            <ReportExportButton title={REPORT_NAME} headers={HEADERS} rows={exportRows} filename={`service-sale-${dateFrom}-${dateTo}`} variant="button" csv />
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
        <JiraFilterMenu fields={filterFields} selected={filterMenuSelected} onApply={handleFiltersApply} triggerLabel="Filters" />
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Price Range</label>
          <div className="rp-ss-price-range">
            <input type="number" min={0} placeholder="Min" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
            <span>—</span>
            <input type="number" min={0} placeholder="Max" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
          </div>
        </div>
        <div className="rp-detail-filter-actions">
          <ReportRefreshButton onClick={fetchData} loading={loading} />
        </div>
      </div>

      {loading ? <SkeletonStatCards count={4} /> : (
        <div className="rp-sra-summary-row">
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.servicesSold}</div><div className="rp-sra-summary-label">Services Sold</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.totalRev)}</div><div className="rp-sra-summary-label">Total Revenue</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.avgTicket)}</div><div className="rp-sra-summary-label">Average Ticket</div></div>
          <div className="rp-sra-summary-card">
            <div className="rp-sra-summary-val">{stats.topService ? `${stats.topService.name} (${stats.topService.count})` : "—"}</div>
            <div className="rp-sra-summary-label">Frequently Sold Services</div>
          </div>
        </div>
      )}

      <SendCampaignBar count={selection.selectedIds.size} onSendClick={() => setShowCampaignModal(true)} />

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input type="text" className="rp-detail-search-input" placeholder="Invoice, client, service or staff" value={search} onChange={e => setSearchInput(e.target.value)} />
        </div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th className="rp-row-checkbox-col">
                <input
                  type="checkbox"
                  className="rp-row-checkbox"
                  checked={rows.length > 0 && rows.every((_r, i) => selection.selectedIds.has(String(i)))}
                  onChange={() => selection.toggleAll(rows.map((_r, i) => String(i)))}
                />
              </th>
              <th className="rp-ss-sortable" onClick={() => handleSortClick("date")}>Date {sortIcon("date")}</th>
              <th className="rp-ss-sortable" onClick={() => handleSortClick("invoice_no")}>Invoice No {sortIcon("invoice_no")}</th>
              <th>Client</th>
              <th className="rp-ss-sortable" onClick={() => handleSortClick("staff_name")}>Staff {sortIcon("staff_name")}</th>
              <th className="rp-ss-sortable" onClick={() => handleSortClick("service_name")}>Service Name {sortIcon("service_name")}</th>
              <th>Category</th>
              <th className="rp-ss-sortable" onClick={() => handleSortClick("total")}>Total ({currencySymbol}) {sortIcon("total")}</th>
              <th>Paid Amount ({currencySymbol})</th>
              <th>Payment Method</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={11} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={11} className="rp-detail-empty-cell">No service sales found</td></tr>
            ) : rows.map((r, i) => (
              <tr
                key={i}
                className={r.clientId ? "rp-appt-row" : undefined}
              >
                <td className="rp-row-checkbox-col" onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    className="rp-row-checkbox"
                    checked={selection.selectedIds.has(String(i))}
                    onChange={() => selection.toggleOne(String(i))}
                  />
                </td>
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{r.date}</td>
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}><span className="rp-detail-link">{r.invoiceNo}</span></td>
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{r.client}</td>
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{r.staff}</td>
                <td className="fw-semibold rp-ss-service" title={r.serviceName} onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{r.serviceName}</td>
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{r.category}</td>
                <td className="fw-semibold" onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{formatAmount(r.price + r.taxAmount)}</td>
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{formatAmount(r.paidAmount)}</td>
                <td className="rp-ss-payment" onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{r.paymentMethod}</td>
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}><span className={`rp-status-badge rp-status-${r.status}`}>{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} pageSize={pageSize} totalItems={total}
        onPageChange={setCurrentPage} onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} />

      {selectedClientId && (
        <ClientHistoryModal clientId={selectedClientId} onClose={() => setSelectedClientId(null)} initialTab="services" />
      )}

      <SendCampaignModal
        show={showCampaignModal}
        onClose={() => setShowCampaignModal(false)}
        contacts={rows
          .filter((r, i) => selection.selectedIds.has(String(i)) && r.clientPhone)
          .map(r => ({ phone: r.clientPhone, name: r.client }))}
        defaultCampaignName="Service Sale"
        onSent={selection.clearSelection}
      />

    </div>
  );
}
