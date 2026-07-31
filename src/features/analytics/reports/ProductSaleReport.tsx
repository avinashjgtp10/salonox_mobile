import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { PRODUCT_RETAIL_REPORT } from "../../../services/api/endpoints";
import Button from "../../../components/ui/Button";
import Select from "../../../components/ui/Select";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import ClientHistoryModal from "../../clients/components/ClientHistoryModal";
import { useCurrency } from "../../../hooks/useCurrency";
import { useProducts } from "../../catalog/hooks/useProducts";
import "./ProductSaleReport.scss";

const REPORT_NAME = "Product Retail";

interface ProductSaleRow {
  date: string;
  invoiceNo: string;
  client: string;
  clientId: string;
  staff: string;
  productName: string;
  category: string;
  brand: string;
  quantity: number;
  bill: number;
  total: number;
  taxAmount: number;
  paymentMethod: string;
  status: string;
}

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

// Maps a row from the independent Product Retail API
// (POST /api/report/product-retail — reads sales/sale_items directly, never
// the Appointment API) to the table's existing ProductSaleRow shape.
function mapRow(row: any): ProductSaleRow {
  return {
    date: row.date ? formatDate(row.date) : "—",
    invoiceNo: row.invoice_no ?? "—",
    client: row.client_name || "Walk-in",
    clientId: row.client_id ? String(row.client_id) : "",
    staff: row.staff_name || "—",
    productName: row.product_name || "Product",
    category: row.category_name || "—",
    brand: row.brand_name || "—",
    quantity: Number(row.quantity) || 0,
    bill: Number(row.price) || 0,
    total: Number(row.total) || 0,
    taxAmount: Number(row.tax_amount) || 0,
    paymentMethod: row.payment_method || "N/A",
    status: row.status || "—",
  };
}

interface FilterOption { id: string; label: string; }

export default function ProductSaleReport({ onBack }: { onBack: () => void }) {
  const { currencySymbol, formatAmount } = useCurrency();
  // Same Brand/Category source as Catalog → Products (fetchBrandsThunk/
  // fetchCategoriesThunk) — the full catalog list, not just brands/categories
  // that happen to appear in sold-product line items, so both pages' filter
  // dropdowns show identical options.
  const { brands, categories, fetchBrands, fetchCategories } = useProducts();
  const today   = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [dateFrom,    setDateFrom]    = useState(monthStart);
  const [dateTo,      setDateTo]      = useState(today);
  const [search,      setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [staffFilter,    setStaffFilter]    = useState("All");
  const [brandFilter,    setBrandFilter]    = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [rows,        setRows]        = useState<ProductSaleRow[]>([]);
  const [total,       setTotal]       = useState(0);
  const [stats,       setStats]       = useState({ totalQty: 0, totalRev: 0, productsSold: 0, totalTransactions: 0 });
  // No separate /staff API call — the product-retail API itself returns
  // filters_available.staff, so options stay complete regardless of the
  // current date/filter selection.
  const [staffOptions,    setStaffOptions]    = useState<FilterOption[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(25);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { fetchBrands(); fetchCategories(); }, [fetchBrands, fetchCategories]);

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
      };
      if (debouncedSearch) body.search = debouncedSearch;
      if (staffFilter !== "All") body.staff_id = staffFilter;
      if (brandFilter !== "All") body.brand_id = brandFilter;
      if (categoryFilter !== "All") body.category_id = categoryFilter;
      const res = await api.post(PRODUCT_RETAIL_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
      const s = data?.stats ?? {};
      setStats({
        totalQty: Number(s.total_quantity) || 0,
        totalRev: Number(s.total_revenue) || 0,
        productsSold: Number(s.unique_products) || 0,
        totalTransactions: Number(s.line_items) || 0,
      });
      const avail = data?.filters_available ?? {};
      if (Array.isArray(avail.staff)) setStaffOptions(avail.staff);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
        setStats({ totalQty: 0, totalRev: 0, productsSold: 0, totalTransactions: 0 });
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo, debouncedSearch, staffFilter, brandFilter, categoryFilter, currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filter/search changes go back to page 1 — page/pageSize changes
  // themselves should not reset back to page 1.
  useEffect(() => { setCurrentPage(1); }, [dateFrom, dateTo, debouncedSearch, staffFilter, brandFilter, categoryFilter]);

  const activeFilterCount = [
    staffFilter !== "All" ? 1 : 0,
    brandFilter !== "All" ? 1 : 0,
    categoryFilter !== "All" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const clearFilters = () => {
    setStaffFilter("All"); setBrandFilter("All"); setCategoryFilter("All");
  };

  const HEADERS = ["Date", "Invoice No", "Client", "Staff", "Product Name", "Category", "Brand", "Quantity", `Bill (${currencySymbol})`, `GST (${currencySymbol})`, `Total (${currencySymbol})`, "Payment Method", "Status"];
  // Total column is gross = line base + its own GST (so ₹399 @ 5% reads ₹418.95).
  const exportRows = () => rows.map(r => [r.date, r.invoiceNo, r.client, r.staff, r.productName, r.category, r.brand, r.quantity, r.bill, r.taxAmount, r.total + r.taxAmount, r.paymentMethod, r.status]);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Button variant="ghost" className="rp-detail-back" onClick={onBack}>
            <ChevronLeft size={15} /> {REPORT_NAME}
          </Button>
          <div className="rp-detail-view-icons">
            <ReportExportButton title={REPORT_NAME} headers={HEADERS} rows={exportRows} filename={`product-retail-${dateFrom}-${dateTo}`} variant="button" csv />
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
        <button className="rp-ps-filters-btn" onClick={() => setShowFiltersPanel(true)}>
          Filters
          {activeFilterCount > 0 && <span className="rp-ps-filters-badge">{activeFilterCount}</span>}
        </button>
        <div className="rp-detail-filter-actions">
          <Button variant="ghost" className="rp-detail-refresh-btn" onClick={fetchData} loading={loading}>
            Run Report
          </Button>
        </div>
      </div>

      {loading ? <SkeletonStatCards count={4} /> : (
        <div className="rp-sra-summary-row">
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalQty}</div><div className="rp-sra-summary-label">Total Quantity Sold</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.totalRev)}</div><div className="rp-sra-summary-label">Total Revenue</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.productsSold}</div><div className="rp-sra-summary-label">Products Sold</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalTransactions}</div><div className="rp-sra-summary-label">Total Transactions</div></div>
        </div>
      )}

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input type="text" className="rp-detail-search-input" placeholder="Product, client or invoice" value={search} onChange={e => setSearchInput(e.target.value)} />
        </div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>Date</th><th>Invoice No</th><th>Client</th><th>Staff</th><th>Product Name</th>
              <th>Category</th><th>Brand</th><th>Quantity</th><th>Bill ({currencySymbol})</th>
              <th>GST ({currencySymbol})</th><th>Total ({currencySymbol})</th><th>Payment Method</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={13} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={13} className="rp-detail-empty-cell">No product sales found</td></tr>
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
                <td className="fw-semibold rp-ps-product" title={r.productName}>{r.productName}</td>
                <td>{r.category}</td>
                <td>{r.brand}</td>
                <td>{r.quantity}</td>
                <td>{formatAmount(r.bill)}</td>
                <td>{formatAmount(r.taxAmount)}</td>
                <td className="fw-semibold">{formatAmount(r.total + r.taxAmount)}</td>
                <td className="rp-ps-payment">{r.paymentMethod}</td>
                <td><span className={`rp-status-badge rp-status-${r.status}`}>{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} pageSize={pageSize} totalItems={total}
        onPageChange={setCurrentPage} onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} />

      {selectedClientId && (
        <ClientHistoryModal clientId={selectedClientId} onClose={() => setSelectedClientId(null)} initialTab="products" />
      )}

      {showFiltersPanel && (
        <div className="rp-ps-filters-overlay" onClick={() => setShowFiltersPanel(false)}>
          <div className="rp-ps-filters-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Filters</h3>
            </div>

            <div className="rp-ps-filters-body">
              <Select label="Staff" containerClass="rp-ps-filter-field" value={staffFilter} onChange={e => setStaffFilter(e.target.value)}>
                <option value="All">All</option>
                {staffOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </Select>
              <Select label="Brand" containerClass="rp-ps-filter-field" value={brandFilter} onChange={e => setBrandFilter(e.target.value)}>
                <option value="All">All brands</option>
                {brands.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
              <Select label="Category" containerClass="rp-ps-filter-field" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                <option value="All">All categories</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>

            <div className="rp-ps-filters-actions">
              <Button variant="ghost" onClick={() => { clearFilters(); }}>Clear</Button>
              <Button variant="dark" onClick={() => { setShowFiltersPanel(false); fetchData(); }}>Apply</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
