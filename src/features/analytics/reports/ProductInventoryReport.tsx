import { useState, useEffect, useCallback, useRef } from "react";
import { Search, X } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { PRODUCT_INVENTORY_REPORT } from "../../../services/api/endpoints";
import { useProducts } from "../../catalog/hooks/useProducts";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import DateRangeFields from "../../../components/ui/DateRangeFields";
import Select from "../../../components/ui/Select";
import Button from "../../../components/ui/Button";
import { useCurrency } from "../../../hooks/useCurrency";
import "./ProductInventoryReport.scss";

const REPORT_NAME = "Product Inventory";

interface InventoryRow {
  productId: string;
  product: string;
  category: string;
  brand: string;
  sku: string;
  dateAdded: string;
  currentStock: number;
  reorderLevel: number;
  unitCost: number;
  totalValue: number;
  status: "in_stock" | "low_stock" | "out_of_stock";
  unitsSold: number;
  salesRevenue: number;
}

const STATUS_LABELS: Record<string, string> = {
  in_stock: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
};

function mapRow(row: any): InventoryRow {
  return {
    productId: String(row.product_id ?? ""),
    product: row.product_name || "—",
    category: row.category_name || "—",
    brand: row.brand_name || "—",
    sku: row.sku || "—",
    dateAdded: row.date_added || "",
    currentStock: Number(row.current_stock) || 0,
    reorderLevel: Number(row.reorder_level) || 0,
    unitCost: Number(row.unit_cost) || 0,
    totalValue: Number(row.total_value) || 0,
    status: row.status || "in_stock",
    unitsSold: Number(row.sales_qty) || 0,
    salesRevenue: Number(row.sales_revenue) || 0,
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

export default function ProductInventoryReport({ onBack, category: reportCategory, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const { currencySymbol, formatAmount } = useCurrency();
  // Same Brand/Category source as Catalog → Products — the full catalog
  // list, not just brands/categories that happen to appear in stocked
  // products, so this report's dropdowns match the Catalog page's options.
  const { brands, categories, fetchBrands, fetchCategories } = useProducts();

  const [search,      setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [brandFilter,    setBrandFilter]    = useState("All");
  const [stockStatusFilter, setStockStatusFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // Draft copies edited while the modal is open; only committed to the
  // applied filter state above when Apply is clicked. Closing via the X or
  // the overlay discards them, matching the Client Revenue/Commission
  // filter modal pattern.
  const [draftCategory, setDraftCategory] = useState("All");
  const [draftBrand,    setDraftBrand]    = useState("All");
  const [draftStockStatus, setDraftStockStatus] = useState("All");
  const [draftDateFrom, setDraftDateFrom] = useState("");
  const [draftDateTo,   setDraftDateTo]   = useState("");

  const [rows,        setRows]        = useState<InventoryRow[]>([]);
  const [total,       setTotal]       = useState(0);
  const [stats,       setStats]       = useState({ totalProducts: 0, totalStockValue: 0, lowStockItems: 0, outOfStockItems: 0 });
  const [loading,     setLoading]     = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(25);
  const abortRef = useRef<AbortController | null>(null);

  const dateRangeError = dateFrom && dateTo && dateTo < dateFrom
    ? "To Date must be greater than or equal to From Date"
    : "";

  useEffect(() => { fetchBrands(); fetchCategories(); }, [fetchBrands, fetchCategories]);

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
      const body: Record<string, any> = { page: currentPage, limit: pageSize };
      if (debouncedSearch) body.search = debouncedSearch;
      if (categoryFilter !== "All") body.category_id = categoryFilter;
      if (brandFilter !== "All") body.brand_id = brandFilter;
      if (stockStatusFilter !== "All") body.stock_status = stockStatusFilter;
      if (dateFrom) body.date_from = dateFrom;
      if (dateTo) body.date_to = dateTo;
      const res = await api.post(PRODUCT_INVENTORY_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
      const s = data?.stats ?? {};
      setStats({
        totalProducts: Number(s.total_products) || 0,
        totalStockValue: Number(s.total_stock_value) || 0,
        lowStockItems: Number(s.low_stock_items) || 0,
        outOfStockItems: Number(s.out_of_stock_items) || 0,
      });
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
        setStats({ totalProducts: 0, totalStockValue: 0, lowStockItems: 0, outOfStockItems: 0 });
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [debouncedSearch, categoryFilter, brandFilter, stockStatusFilter, dateFrom, dateTo, currentPage, pageSize, dateRangeError]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, categoryFilter, brandFilter, stockStatusFilter, dateFrom, dateTo]);

  const activeFilterCount = [
    categoryFilter !== "All" ? 1 : 0,
    brandFilter !== "All" ? 1 : 0,
    stockStatusFilter !== "All" ? 1 : 0,
    dateFrom || dateTo ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const openFiltersPanel = () => {
    setDraftCategory(categoryFilter);
    setDraftBrand(brandFilter);
    setDraftStockStatus(stockStatusFilter);
    setDraftDateFrom(dateFrom);
    setDraftDateTo(dateTo);
    setShowFiltersPanel(true);
  };

  const cancelFiltersPanel = () => setShowFiltersPanel(false);

  const clearDraftFilters = () => {
    setDraftCategory("All");
    setDraftBrand("All");
    setDraftStockStatus("All");
    setDraftDateFrom("");
    setDraftDateTo("");
  };

  const applyFilters = () => {
    setCategoryFilter(draftCategory);
    setBrandFilter(draftBrand);
    setStockStatusFilter(draftStockStatus);
    setDateFrom(draftDateFrom);
    setDateTo(draftDateTo);
    setShowFiltersPanel(false);
  };

  const draftDateRangeError = draftDateFrom && draftDateTo && draftDateTo < draftDateFrom
    ? "To Date must be greater than or equal to From Date"
    : "";

  const HEADERS = ["Product", "Category", "Brand", "SKU", "Current Stock", "Reorder Level", `Unit Cost (${currencySymbol})`, `Total Value (${currencySymbol})`, "Sales", "Status"];
  const exportRows = () => rows.map(r => [
    r.product, r.category, r.brand, r.sku,
    r.currentStock, r.reorderLevel, r.unitCost, r.totalValue,
    r.unitsSold > 0 ? `${r.unitsSold} unit${r.unitsSold !== 1 ? "s" : ""} · ${formatAmount(r.salesRevenue)}` : "—",
    STATUS_LABELS[r.status] ?? r.status,
  ]);

  const statusClass = (s: InventoryRow["status"]) =>
    s === "in_stock" ? "rp-inv-status--ok" : s === "low_stock" ? "rp-inv-status--low" : "rp-inv-status--out";

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Breadcrumb current={REPORT_NAME} category={reportCategory} categoryKey={categoryKey} onBack={onBack} />
          <div className="rp-detail-view-icons">
            <ReportExportButton
              title={REPORT_NAME}
              headers={HEADERS}
              rows={exportRows}
              filename="product-inventory"
              variant="button"
              csv
              disabled={!!dateRangeError}
              dateRangeLabel={dateFrom || dateTo ? `${dateFrom ? formatDate(dateFrom) : "…"} - ${dateTo ? formatDate(dateTo) : "…"}` : undefined}
              filterLines={[
                ...(debouncedSearch ? [`Search: "${debouncedSearch}"`] : []),
                ...(categoryFilter !== "All" ? [`Category: ${categories.find((c: any) => c.id === categoryFilter)?.name ?? categoryFilter}`] : []),
                ...(brandFilter !== "All" ? [`Brand: ${brands.find((b: any) => b.id === brandFilter)?.name ?? brandFilter}`] : []),
                ...(stockStatusFilter !== "All" ? [`Stock Status: ${STATUS_LABELS[stockStatusFilter] ?? stockStatusFilter}`] : []),
              ]}
              summaryLines={[
                `Total Products: ${stats.totalProducts}`,
                `Total Stock Value: ${formatAmount(stats.totalStockValue)}`,
                `Low Stock Items: ${stats.lowStockItems}`,
                `Out of Stock Items: ${stats.outOfStockItems}`,
              ]}
            />
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
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
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalProducts}</div><div className="rp-sra-summary-label">Total Products</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.totalStockValue)}</div><div className="rp-sra-summary-label">Total Stock Value</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.lowStockItems}</div><div className="rp-sra-summary-label">Low Stock Items</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.outOfStockItems}</div><div className="rp-sra-summary-label">Out of Stock Items</div></div>
        </div>
      )}

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input
            type="text"
            className="rp-detail-search-input"
            placeholder="Search product, SKU, barcode, brand or category"
            value={search}
            onChange={e => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table rp-inv-table">
          <thead>
            <tr>
              <th className="rp-inv-col-product">Product</th>
              <th>Category</th>
              <th>Brand</th>
              <th>SKU</th>
              <th>Current Stock</th>
              <th>Reorder Level</th>
              <th>Unit Cost ({currencySymbol})</th>
              <th>Total Value ({currencySymbol})</th>
              <th>Sales</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={10} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={10} className="rp-detail-empty-cell">No data available</td></tr>
            ) : rows.map((r) => (
              <tr key={r.productId}>
                <td className="fw-semibold rp-inv-product-cell" title={r.product}>{r.product}</td>
                <td>{r.category}</td>
                <td>{r.brand}</td>
                <td><span className="rp-detail-link">{r.sku}</span></td>
                <td>{r.currentStock}</td>
                <td>{r.reorderLevel}</td>
                <td>{formatAmount(r.unitCost)}</td>
                <td className="fw-semibold">{formatAmount(r.totalValue)}</td>
                <td>
                  {r.unitsSold > 0
                    ? <>{r.unitsSold} unit{r.unitsSold !== 1 ? "s" : ""} <span className="rp-inv-sales-rev">· {formatAmount(r.salesRevenue)}</span></>
                    : "—"}
                </td>
                <td><span className={`rp-inv-status ${statusClass(r.status)}`}>{STATUS_LABELS[r.status] ?? r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} pageSize={pageSize} totalItems={total}
        onPageChange={setCurrentPage} onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} />

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
              <Select label="Category" containerClass="rp-cr-filter-field" value={draftCategory} onChange={e => setDraftCategory(e.target.value)}>
                <option value="All">All</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>

              <Select label="Brand" containerClass="rp-cr-filter-field" value={draftBrand} onChange={e => setDraftBrand(e.target.value)}>
                <option value="All">All</option>
                {brands.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>

              <Select label="Stock Status" containerClass="rp-cr-filter-field" value={draftStockStatus} onChange={e => setDraftStockStatus(e.target.value)}>
                <option value="All">All</option>
                <option value="in_stock">In Stock</option>
                <option value="low_stock">Low Stock</option>
                <option value="out_of_stock">Out of Stock</option>
              </Select>

              <div className="rp-cr-filter-field">
                <label className="rp-detail-filter-label">Date Added</label>
                <DateRangeFields
                  from={draftDateFrom} to={draftDateTo}
                  onFromChange={setDraftDateFrom} onToChange={setDraftDateTo}
                  hideLabel bare
                />
              </div>
            </div>

            <div className="rp-cr-filters-actions">
              <Button variant="ghost" onClick={clearDraftFilters}>Clear</Button>
              <Button variant="dark" onClick={applyFilters} disabled={!!draftDateRangeError}>Apply</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
