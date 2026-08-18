// Shared implementation for Slow Moving Products and Fast Moving Products —
// same backend query and columns, only the default sort direction and page
// copy differ, so one component renders both rather than duplicating the
// whole report shell twice. Exported as two named wrappers below.
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { SLOW_MOVING_PRODUCTS_REPORT, FAST_MOVING_PRODUCTS_REPORT } from "../../../services/api/endpoints";
import { useProducts } from "../../catalog/hooks/useProducts";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination, JiraFilterMenu, DateRangeFilter } from "../../../components/ui";
import type { JiraFilterField, DateRangeFilterValue } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import { useCurrency } from "../../../hooks/useCurrency";
import "./ProductInventoryReport.scss";

interface MovementRow {
  productId: string;
  product: string;
  category: string;
  brand: string;
  sku: string;
  currentStock: number;
  unitCost: number;
  stockValue: number;
  unitsSold: number;
  salesRevenue: number;
  lastSaleDate: string | null;
  daysSinceLastSale: number | null;
}

function mapRow(row: any): MovementRow {
  return {
    productId: String(row.product_id ?? ""),
    product: row.product_name || "—",
    category: row.category_name || "—",
    brand: row.brand_name || "—",
    sku: row.sku || "—",
    currentStock: Number(row.current_stock) || 0,
    unitCost: Number(row.unit_cost) || 0,
    stockValue: Number(row.stock_value) || 0,
    unitsSold: Number(row.sales_qty) || 0,
    salesRevenue: Number(row.sales_revenue) || 0,
    lastSaleDate: row.last_sale_date ?? null,
    daysSinceLastSale: row.days_since_last_sale !== null && row.days_since_last_sale !== undefined ? Number(row.days_since_last_sale) : null,
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

interface ProductMovementReportProps {
  onBack: () => void;
  category: string;
  categoryKey: string;
  mode: "slow" | "fast";
}

function ProductMovementReport({ onBack, category: reportCategory, categoryKey, mode }: ProductMovementReportProps) {
  const { currencySymbol, formatAmount } = useCurrency();
  const { brands, categories, fetchBrands, fetchCategories } = useProducts();

  const REPORT_NAME = mode === "slow" ? "Slow Moving Products" : "Fast Moving Products";
  const ENDPOINT = mode === "slow" ? SLOW_MOVING_PRODUCTS_REPORT : FAST_MOVING_PRODUCTS_REPORT;
  const defaultSortDir: "asc" | "desc" = mode === "slow" ? "asc" : "desc";

  const [search, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [brandFilter, setBrandFilter] = useState<string[]>([]);
  // Defaults to "This Month" — unlike Product Inventory Report, "all time"
  // would make Slow Moving nearly meaningless (a product sold once 2 years
  // ago would count as "moving"), so this report needs a real period by
  // default rather than starting unfiltered.
  const [dateRange, setDateRange] = useState<DateRangeFilterValue>({ preset: "this_month", startDate: "", endDate: "" });
  const { startDate: dateFrom, endDate: dateTo } = dateRange;

  const [rows, setRows] = useState<MovementRow[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ totalProducts: 0, productsWithNoSales: 0, totalUnitsSold: 0, totalSalesRevenue: 0 });
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState("sales_qty");
  const [sortDir, setSortDir] = useState<"asc" | "desc">(defaultSortDir);
  const abortRef = useRef<AbortController | null>(null);

  const dateRangeError = dateFrom && dateTo && dateTo < dateFrom
    ? "To Date must be greater than or equal to From Date"
    : "";

  useEffect(() => { fetchBrands(); fetchCategories(); }, [fetchBrands, fetchCategories]);

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
      const body: Record<string, any> = { page: currentPage, limit: pageSize, sort_by: sortBy, sort_dir: sortDir };
      if (debouncedSearch) body.search = debouncedSearch;
      if (categoryFilter.length > 0) body.category_ids = categoryFilter;
      if (brandFilter.length > 0) body.brand_ids = brandFilter;
      if (dateFrom) body.date_from = dateFrom;
      if (dateTo) body.date_to = dateTo;
      const res = await api.post(ENDPOINT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
      const s = data?.stats ?? {};
      setStats({
        totalProducts: Number(s.total_products) || 0,
        productsWithNoSales: Number(s.products_with_no_sales) || 0,
        totalUnitsSold: Number(s.total_units_sold) || 0,
        totalSalesRevenue: Number(s.total_sales_revenue) || 0,
      });
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
        setStats({ totalProducts: 0, productsWithNoSales: 0, totalUnitsSold: 0, totalSalesRevenue: 0 });
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [ENDPOINT, debouncedSearch, categoryFilter, brandFilter, dateFrom, dateTo, currentPage, pageSize, sortBy, sortDir, dateRangeError]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, categoryFilter, brandFilter, dateFrom, dateTo]);

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "category", label: "Category", options: categories.map((c: any) => ({ id: c.id, label: c.name })), searchable: true },
    { key: "brand", label: "Brand", options: brands.map((b: any) => ({ id: b.id, label: b.name })), searchable: true },
  ], [categories, brands]);

  const filterMenuSelected = useMemo(() => ({
    category: categoryFilter,
    brand: brandFilter,
  }), [categoryFilter, brandFilter]);

  const handleFiltersApply = (next: Record<string, string[]>) => {
    setCategoryFilter(next.category ?? []);
    setBrandFilter(next.brand ?? []);
  };

  const toggleSort = (col: string) => {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(col); setSortDir(defaultSortDir); }
    setCurrentPage(1);
  };
  const sortIndicator = (col: string) => (sortBy === col ? (sortDir === "asc" ? " ▲" : " ▼") : "");

  const HEADERS = ["Product", "Category", "Brand", "Barcode", "Current Stock", `Unit Cost (${currencySymbol})`, "Units Sold", `Sales Revenue (${currencySymbol})`, "Last Sale", "Days Since Last Sale"];
  const exportRows = () => rows.map(r => [
    r.product, r.category, r.brand, r.sku,
    r.currentStock, r.unitCost, r.unitsSold, r.salesRevenue,
    r.lastSaleDate ? formatDate(r.lastSaleDate) : "Never sold",
    r.daysSinceLastSale ?? "—",
  ]);

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
              filename={mode === "slow" ? "slow-moving-products" : "fast-moving-products"}
              variant="button"
              csv
              disabled={!!dateRangeError}
              dateRangeLabel={dateFrom || dateTo ? `${dateFrom ? formatDate(dateFrom) : "…"} - ${dateTo ? formatDate(dateTo) : "…"}` : undefined}
              filterLines={[
                ...(debouncedSearch ? [`Search: "${debouncedSearch}"`] : []),
                ...(categoryFilter.length > 0
                  ? [`Category: ${categoryFilter.map(id => categories.find((c: any) => c.id === id)?.name ?? id).join(", ")}`]
                  : []),
                ...(brandFilter.length > 0
                  ? [`Brand: ${brandFilter.map(id => brands.find((b: any) => b.id === id)?.name ?? id).join(", ")}`]
                  : []),
              ]}
              summaryLines={[
                `Total Products: ${stats.totalProducts}`,
                `Products with No Sales in Range: ${stats.productsWithNoSales}`,
                `Total Units Sold: ${stats.totalUnitsSold}`,
                `Total Sales Revenue: ${formatAmount(stats.totalSalesRevenue)}`,
              ]}
            />
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <JiraFilterMenu fields={filterFields} selected={filterMenuSelected} onApply={handleFiltersApply} triggerLabel="Filters" />
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Sales Period</label>
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        </div>
        <div className="rp-detail-filter-actions">
          <ReportRefreshButton onClick={fetchData} loading={loading} />
        </div>
      </div>
      {dateRangeError && <div className="rp-detail-date-error">{dateRangeError}</div>}

      {loading ? <SkeletonStatCards count={4} /> : (
        <div className="rp-sra-summary-row">
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalProducts}</div><div className="rp-sra-summary-label">Total Products</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.productsWithNoSales}</div><div className="rp-sra-summary-label">No Sales in Range</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalUnitsSold}</div><div className="rp-sra-summary-label">Total Units Sold</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.totalSalesRevenue)}</div><div className="rp-sra-summary-label">Total Sales Revenue</div></div>
        </div>
      )}

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input
            type="text"
            className="rp-detail-search-input"
            placeholder="Search product, barcode, brand or category"
            value={search}
            onChange={e => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table rp-inv-table">
          <thead>
            <tr>
              <th className="rp-inv-col-product rp-camp-sortable" onClick={() => toggleSort("product_name")}>Product{sortIndicator("product_name")}</th>
              <th>Category</th>
              <th>Brand</th>
              <th>Barcode</th>
              <th className="rp-camp-sortable" onClick={() => toggleSort("current_stock")}>Current Stock{sortIndicator("current_stock")}</th>
              <th>Unit Cost ({currencySymbol})</th>
              <th className="rp-camp-sortable" onClick={() => toggleSort("sales_qty")}>Units Sold{sortIndicator("sales_qty")}</th>
              <th className="rp-camp-sortable" onClick={() => toggleSort("sales_revenue")}>Sales Revenue ({currencySymbol}){sortIndicator("sales_revenue")}</th>
              <th>Last Sale</th>
              <th className="rp-camp-sortable" onClick={() => toggleSort("days_since_last_sale")}>Days Since Last Sale{sortIndicator("days_since_last_sale")}</th>
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
                <td>{formatAmount(r.unitCost)}</td>
                <td className={r.unitsSold === 0 ? "rp-wac-warn fw-semibold" : "fw-semibold"}>{r.unitsSold}</td>
                <td>{formatAmount(r.salesRevenue)}</td>
                <td>{r.lastSaleDate ? formatDate(r.lastSaleDate) : "Never sold"}</td>
                <td>{r.daysSinceLastSale ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} pageSize={pageSize} totalItems={total}
        onPageChange={setCurrentPage} onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} />
    </div>
  );
}

export function SlowMovingProductsReport(props: { onBack: () => void; category: string; categoryKey: string }) {
  return <ProductMovementReport {...props} mode="slow" />;
}

export function FastMovingProductsReport(props: { onBack: () => void; category: string; categoryKey: string }) {
  return <ProductMovementReport {...props} mode="fast" />;
}
