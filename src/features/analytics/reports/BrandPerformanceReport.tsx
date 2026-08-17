import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { BRAND_PERFORMANCE_REPORT } from "../../../services/api/endpoints";
import { useProducts } from "../../catalog/hooks/useProducts";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination, JiraFilterMenu, DateRangeFilter, getDateRangePresetValue } from "../../../components/ui";
import type { JiraFilterField, DateRangeFilterValue } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import { useCurrency } from "../../../hooks/useCurrency";
import "./BrandPerformanceReport.scss";

const REPORT_NAME = "Brand Performance";

interface BrandRow {
  brandId: string;
  brand: string;
  productCount: number;
  currentStock: number;
  stockValue: number;
  unitsSold: number;
  salesRevenue: number;
  avgSellingPrice: number;
}

function mapRow(row: any): BrandRow {
  return {
    brandId: String(row.brand_id ?? ""),
    brand: row.brand_name || "—",
    productCount: Number(row.product_count) || 0,
    currentStock: Number(row.current_stock) || 0,
    stockValue: Number(row.stock_value) || 0,
    unitsSold: Number(row.units_sold) || 0,
    salesRevenue: Number(row.sales_revenue) || 0,
    avgSellingPrice: Number(row.avg_selling_price) || 0,
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

export default function BrandPerformanceReport({ onBack, category: reportCategory, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const { currencySymbol, formatAmount } = useCurrency();
  // Same Brand source as Catalog → Products, so this report's dropdown
  // matches the Catalog page's options (including brands with no sales yet).
  const { brands, fetchBrands } = useProducts();

  const [search,      setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRangeFilterValue>(() => ({
    preset: "all_time",
    ...getDateRangePresetValue("all_time"),
  }));

  const [rows,        setRows]        = useState<BrandRow[]>([]);
  const [total,       setTotal]       = useState(0);
  const [stats,       setStats]       = useState({ totalBrands: 0, totalUnitsSold: 0, totalSalesRevenue: 0, totalStockValue: 0 });
  const [loading,     setLoading]     = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(10);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { fetchBrands(); }, [fetchBrands]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Real server-side pagination — page/limit are sent on every request, and
  // only that page's rows come back, along with stats computed by the
  // backend over the WHOLE filtered set (not just the current page).
  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const body: Record<string, any> = { page: currentPage, limit: pageSize };
      if (debouncedSearch) body.search = debouncedSearch;
      if (brandFilter.length > 0) body.brand_ids = brandFilter;
      if (dateRange.startDate) body.date_from = dateRange.startDate;
      if (dateRange.endDate) body.date_to = dateRange.endDate;
      const res = await api.post(BRAND_PERFORMANCE_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
      const s = data?.stats ?? {};
      setStats({
        totalBrands: Number(s.total_brands) || 0,
        totalUnitsSold: Number(s.total_units_sold) || 0,
        totalSalesRevenue: Number(s.total_sales_revenue) || 0,
        totalStockValue: Number(s.total_stock_value) || 0,
      });
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
        setStats({ totalBrands: 0, totalUnitsSold: 0, totalSalesRevenue: 0, totalStockValue: 0 });
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [debouncedSearch, brandFilter, dateRange.startDate, dateRange.endDate, currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, brandFilter, dateRange.startDate, dateRange.endDate]);

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "brand", label: "Brand", options: brands.map((b: any) => ({ id: b.id, label: b.name })), searchable: true },
  ], [brands]);

  const filterMenuSelected = useMemo(() => ({
    brand: brandFilter,
  }), [brandFilter]);

  const handleFiltersApply = (next: Record<string, string[]>) => {
    setBrandFilter(next.brand ?? []);
  };

  const HEADERS = ["Brand", "Products", "Current Stock", `Stock Value (${currencySymbol})`, "Units Sold", `Sales Revenue (${currencySymbol})`, `Avg. Selling Price (${currencySymbol})`];
  const exportRows = () => rows.map(r => [
    r.brand, r.productCount, r.currentStock, r.stockValue, r.unitsSold, r.salesRevenue, r.avgSellingPrice,
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
              filename="brand-performance"
              variant="button"
              csv
              dateRangeLabel={dateRange.startDate || dateRange.endDate ? `${dateRange.startDate ? formatDate(dateRange.startDate) : "…"} - ${dateRange.endDate ? formatDate(dateRange.endDate) : "…"}` : undefined}
              filterLines={[
                ...(debouncedSearch ? [`Search: "${debouncedSearch}"`] : []),
                ...(brandFilter.length > 0
                  ? [`Brand: ${brandFilter.map(id => brands.find((b: any) => b.id === id)?.name ?? id).join(", ")}`]
                  : []),
              ]}
              summaryLines={[
                `Total Brands: ${stats.totalBrands}`,
                `Total Units Sold: ${stats.totalUnitsSold}`,
                `Total Sales Revenue: ${formatAmount(stats.totalSalesRevenue)}`,
                `Total Stock Value: ${formatAmount(stats.totalStockValue)}`,
              ]}
            />
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <JiraFilterMenu fields={filterFields} selected={filterMenuSelected} onApply={handleFiltersApply} triggerLabel="Filters" />
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Sales Date</label>
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        </div>
        <div className="rp-detail-filter-actions">
          <ReportRefreshButton onClick={fetchData} loading={loading} />
        </div>
      </div>

      {loading ? <SkeletonStatCards count={4} /> : (
        <div className="rp-sra-summary-row">
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalBrands}</div><div className="rp-sra-summary-label">Total Brands</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalUnitsSold}</div><div className="rp-sra-summary-label">Total Units Sold</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.totalSalesRevenue)}</div><div className="rp-sra-summary-label">Total Sales Revenue</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.totalStockValue)}</div><div className="rp-sra-summary-label">Total Stock Value</div></div>
        </div>
      )}

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input
            type="text"
            className="rp-detail-search-input"
            placeholder="Search brand"
            value={search}
            onChange={e => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table rp-brand-table">
          <thead>
            <tr>
              <th className="rp-brand-col-name">Brand</th>
              <th>Products</th>
              <th>Current Stock</th>
              <th>Stock Value ({currencySymbol})</th>
              <th>Units Sold</th>
              <th>Sales Revenue ({currencySymbol})</th>
              <th>Avg. Selling Price ({currencySymbol})</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={7} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="rp-detail-empty-cell">No data available</td></tr>
            ) : rows.map((r) => (
              <tr key={r.brandId}>
                <td className="fw-semibold rp-brand-name-cell" title={r.brand}>{r.brand}</td>
                <td>{r.productCount}</td>
                <td>{r.currentStock}</td>
                <td>{formatAmount(r.stockValue)}</td>
                <td>{r.unitsSold}</td>
                <td className="fw-semibold rp-brand-revenue">{formatAmount(r.salesRevenue)}</td>
                <td>{r.unitsSold > 0 ? formatAmount(r.avgSellingPrice) : "—"}</td>
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
