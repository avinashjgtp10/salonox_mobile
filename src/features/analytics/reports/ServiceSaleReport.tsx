import { useState, useEffect, useCallback, useRef } from "react";
import { Search, ChevronUp, ChevronDown } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { SERVICE_SALE_REPORT } from "../../../services/api/endpoints";
import Button from "../../../components/ui/Button";
import Select from "../../../components/ui/Select";
import MultiSelectCheckbox from "../../../components/ui/MultiSelectCheckbox";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import ClientHistoryModal from "../../clients/components/ClientHistoryModal";
import { useCurrency } from "../../../hooks/useCurrency";
import { useServices } from "../../catalog/hooks/useServices";
import "./ServiceSaleReport.scss";

const REPORT_NAME = "Service Sale";

interface ServiceSaleRow {
  date: string;
  invoiceNo: string;
  client: string;
  clientId: string;
  staff: string;
  serviceName: string;
  category: string;
  price: number;
  taxAmount: number;
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
    staff: row.staff_name || "—",
    serviceName: row.service_name || "Service",
    category: row.category_name || "—",
    price: Number(row.price) || 0,
    taxAmount: Number(row.tax_amount) || 0,
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
  const today   = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [dateFrom,    setDateFrom]    = useState(monthStart);
  const [dateTo,      setDateTo]      = useState(today);
  const [search,      setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [serviceFilter,  setServiceFilter]  = useState("All");
  const [minPrice,       setMinPrice]       = useState("");
  const [maxPrice,       setMaxPrice]       = useState("");
  const [staffFilterIds, setStaffFilterIds] = useState<string[]>([]);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("All");
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
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
  const [pageSize,    setPageSize]    = useState(25);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  // Service dropdown narrows to the selected category (optional convenience);
  // falls back to the full catalog list when no category is selected.
  const serviceOptionsForCategory = categoryFilter === "All"
    ? services
    : services.filter((sv: any) => String(sv.category_id ?? sv.categoryId) === categoryFilter);

  useEffect(() => {
    if (serviceFilter === "All") return;
    const stillValid = serviceOptionsForCategory.some((sv: any) => String(sv.id) === serviceFilter);
    if (!stillValid) setServiceFilter("All");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter]);

  // Real server-side pagination — page/limit are sent on every request, and
  // only that page's rows come back, along with stats computed by the
  // backend over the WHOLE filtered set (not just the current page).
  const fetchData = useCallback(async () => {
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
      if (categoryFilter !== "All") body.category_id = categoryFilter;
      if (serviceFilter !== "All") body.service_id = serviceFilter;
      if (minPrice !== "") body.min_price = Number(minPrice);
      if (maxPrice !== "") body.max_price = Number(maxPrice);
      if (staffFilterIds.length > 0) body.staff_ids = staffFilterIds;
      if (paymentMethodFilter !== "All") body.payment_method = paymentMethodFilter;
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
  }, [dateFrom, dateTo, debouncedSearch, categoryFilter, serviceFilter, minPrice, maxPrice, staffFilterIds, paymentMethodFilter, sortBy, sortDir, currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filter/search/sort changes go back to page 1 — page/pageSize changes
  // themselves should not reset back to page 1.
  useEffect(() => { setCurrentPage(1); }, [dateFrom, dateTo, debouncedSearch, categoryFilter, serviceFilter, minPrice, maxPrice, staffFilterIds, paymentMethodFilter, sortBy, sortDir]);

  const activeFilterCount = [
    categoryFilter !== "All" ? 1 : 0,
    serviceFilter !== "All" ? 1 : 0,
    minPrice !== "" ? 1 : 0,
    maxPrice !== "" ? 1 : 0,
    staffFilterIds.length > 0 ? 1 : 0,
    paymentMethodFilter !== "All" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const clearFilters = () => {
    setCategoryFilter("All"); setServiceFilter("All");
    setMinPrice(""); setMaxPrice("");
    setStaffFilterIds([]);
    setPaymentMethodFilter("All");
  };

  const handleSortClick = (field: SortField) => {
    if (sortBy !== field) { setSortBy(field); setSortDir("asc"); return; }
    if (sortDir === "asc") { setSortDir("desc"); return; }
    setSortBy("date"); setSortDir("desc");
  };

  const sortIcon = (field: SortField) =>
    sortBy === field ? (sortDir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : null;

  const HEADERS = ["Date", "Invoice No", "Client", "Staff", "Service Name", "Category", `Bill (${currencySymbol})`, `GST (${currencySymbol})`, `Total (${currencySymbol})`, "Payment Method", "Status"];
  // Total column is gross = line base + its own GST.
  const exportRows = () => rows.map(r => [r.date, r.invoiceNo, r.client, r.staff, r.serviceName, r.category, r.price, r.taxAmount, r.price + r.taxAmount, r.paymentMethod, r.status]);

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
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Date</label>
          <div className="rp-detail-date-range">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="rp-detail-date-input" />
            <span className="rp-detail-date-sep">-</span>
            <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   className="rp-detail-date-input" />
          </div>
        </div>
        <button className="rp-ss-filters-btn" onClick={() => setShowFiltersPanel(true)}>
          Filters
          {activeFilterCount > 0 && <span className="rp-ss-filters-badge">{activeFilterCount}</span>}
        </button>
        <div className="rp-detail-filter-actions">
          <Button variant="ghost" className="rp-detail-refresh-btn" onClick={fetchData} loading={loading}>
            Run Report
          </Button>
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
              <th className="rp-ss-sortable" onClick={() => handleSortClick("date")}>Date {sortIcon("date")}</th>
              <th className="rp-ss-sortable" onClick={() => handleSortClick("invoice_no")}>Invoice No {sortIcon("invoice_no")}</th>
              <th>Client</th>
              <th className="rp-ss-sortable" onClick={() => handleSortClick("staff_name")}>Staff {sortIcon("staff_name")}</th>
              <th className="rp-ss-sortable" onClick={() => handleSortClick("service_name")}>Service Name {sortIcon("service_name")}</th>
              <th>Category</th>
              <th className="rp-ss-sortable" onClick={() => handleSortClick("price")}>Bill ({currencySymbol}) {sortIcon("price")}</th>
              <th>GST ({currencySymbol})</th>
              <th className="rp-ss-sortable" onClick={() => handleSortClick("total")}>Total ({currencySymbol}) {sortIcon("total")}</th>
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
                onClick={() => r.clientId && setSelectedClientId(r.clientId)}
              >
                <td>{r.date}</td>
                <td><span className="rp-detail-link">{r.invoiceNo}</span></td>
                <td>{r.client}</td>
                <td>{r.staff}</td>
                <td className="fw-semibold rp-ss-service" title={r.serviceName}>{r.serviceName}</td>
                <td>{r.category}</td>
                <td>{formatAmount(r.price)}</td>
                <td>{formatAmount(r.taxAmount)}</td>
                <td className="fw-semibold">{formatAmount(r.price + r.taxAmount)}</td>
                <td className="rp-ss-payment">{r.paymentMethod}</td>
                <td><span className={`rp-status-badge rp-status-${r.status}`}>{r.status}</span></td>
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

      {showFiltersPanel && (
        <div className="rp-ss-filters-overlay" onClick={() => setShowFiltersPanel(false)}>
          <div className="rp-ss-filters-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Filters</h3>
            </div>

            <div className="rp-ss-filters-body">
              <Select label="Category" containerClass="rp-ss-filter-field" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                <option value="All">All categories</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>

              <Select label="Service" containerClass="rp-ss-filter-field" value={serviceFilter} onChange={e => setServiceFilter(e.target.value)}>
                <option value="All">All services</option>
                {serviceOptionsForCategory.map((sv: any) => <option key={sv.id} value={sv.id}>{sv.name}</option>)}
              </Select>

              <div className="rp-ss-filter-field">
                <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>Price Range</label>
                <div className="rp-ss-price-range">
                  <input type="number" min={0} placeholder="Min" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
                  <span>—</span>
                  <input type="number" min={0} placeholder="Max" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
                </div>
              </div>

              <MultiSelectCheckbox
                label="Staff"
                containerClass="rp-ss-filter-field"
                options={staffOptions}
                selected={staffFilterIds}
                onChange={setStaffFilterIds}
                placeholder="All staff"
              />

              <Select label="Payment Method" containerClass="rp-ss-filter-field" value={paymentMethodFilter} onChange={e => setPaymentMethodFilter(e.target.value)}>
                <option value="All">All payment methods</option>
                {PAYMENT_METHOD_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </Select>
            </div>

            <div className="rp-ss-filters-actions">
              <Button variant="ghost" onClick={() => { clearFilters(); }}>Clear</Button>
              <Button variant="dark" onClick={() => { setShowFiltersPanel(false); fetchData(); }}>Apply</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
