import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { PRODUCT_MARGIN_REPORT } from "../../../services/api/endpoints";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination, JiraFilterMenu, DateRangeFilter, getDateRangePresetValue } from "../../../components/ui";
import type { JiraFilterField, DateRangeFilterValue } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import { useCurrency } from "../../../hooks/useCurrency";
import { useProducts } from "../../catalog/hooks/useProducts";
import { formatDateDDMMYYYY } from "../../../utils/dateFormat";
import "./ProductMarginReport.scss";

const REPORT_NAME = "Product Margin";

interface MarginRow {
  productName: string;
  quantity: number;
  revenue: number;
  cost: number;
  profit: number;
  marginPct: number;
}

// Maps a row from the independent Product Margin API
// (POST /api/report/product-margin — reads sale_items/products directly,
// never the Appointment API) to the table's existing MarginRow shape.
function mapRow(row: any): MarginRow {
  return {
    productName: row.product_name || "Product",
    quantity: Number(row.quantity) || 0,
    revenue: Number(row.revenue) || 0,
    cost: Number(row.cost) || 0,
    profit: Number(row.profit) || 0,
    marginPct: Number(row.margin_pct) || 0,
  };
}

export default function ProductMarginReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const { currencySymbol, formatAmount } = useCurrency();
  // Same Brand/Category source as Catalog → Products and the Product Retail
  // report — the full catalog list, not just brands/categories that happen
  // to appear in sold line items.
  const { brands, categories, fetchBrands, fetchCategories } = useProducts();
  const [dateRange, setDateRange] = useState<DateRangeFilterValue>({ preset: "this_month", ...getDateRangePresetValue("this_month") });
  const { startDate: dateFrom, endDate: dateTo } = dateRange;
  const [search,      setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [brandIds,    setBrandIds]    = useState<string[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [rows,        setRows]        = useState<MarginRow[]>([]);
  const [total,       setTotal]       = useState(0);
  const [stats,       setStats]       = useState({ totalRevenue: 0, totalCost: 0, totalProfit: 0, avgMargin: 0 });
  const [loading,     setLoading]     = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(10);
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
    if (dateTo && dateFrom && dateTo < dateFrom) return;
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
      if (brandIds.length > 0) body.brand_ids = brandIds;
      if (categoryIds.length > 0) body.category_ids = categoryIds;
      const res = await api.post(PRODUCT_MARGIN_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
      const s = data?.stats ?? {};
      setStats({
        totalRevenue: Number(s.total_revenue) || 0,
        totalCost: Number(s.total_cost) || 0,
        totalProfit: Number(s.total_profit) || 0,
        avgMargin: Number(s.avg_margin_pct) || 0,
      });
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
        setStats({ totalRevenue: 0, totalCost: 0, totalProfit: 0, avgMargin: 0 });
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo, debouncedSearch, brandIds, categoryIds, currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [dateFrom, dateTo, debouncedSearch, brandIds, categoryIds]);

  // Brand/Category weren't in the original filter set (there was no filter
  // beyond Date Range at all) — added since the report already reads
  // products.brand_id/category_id for cost lookup, so filtering by them is
  // a natural, low-risk extension of what the query already joins.
  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "brand", label: "Brand", options: brands.map((b: any) => ({ id: String(b.id), label: String(b.name) })), searchable: true },
    { key: "category", label: "Category", options: categories.map((c: any) => ({ id: String(c.id), label: String(c.name) })), searchable: true },
  ], [brands, categories]);

  const filterMenuSelected = useMemo(() => ({
    brand: brandIds,
    category: categoryIds,
  }), [brandIds, categoryIds]);

  const handleFiltersApply = (next: Record<string, string[]>) => {
    setBrandIds(next.brand ?? []);
    setCategoryIds(next.category ?? []);
  };

  const HEADERS = ["Product Name", "Quantity Sold", `Revenue (${currencySymbol})`, `Cost (${currencySymbol})`, `Profit (${currencySymbol})`, "Margin (%)"];
  const exportRows = () => rows.map(r => [r.productName, r.quantity, r.revenue, r.cost, r.profit, r.marginPct]);

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
              filename={`product-margin-${dateFrom}-${dateTo}`}
              variant="button"
              csv
              dateRangeLabel={dateFrom && dateTo ? `${formatDateDDMMYYYY(dateFrom)} to ${formatDateDDMMYYYY(dateTo)}` : undefined}
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

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input
            type="text"
            className="rp-detail-search-input"
            placeholder="Search product name"
            value={search}
            onChange={e => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      {loading ? <SkeletonStatCards count={4} /> : (
        <div className="rp-sra-summary-row">
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.totalRevenue)}</div><div className="rp-sra-summary-label">Total Revenue</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.totalCost)}</div><div className="rp-sra-summary-label">Total Cost</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val rp-pm-profit">{formatAmount(stats.totalProfit)}</div><div className="rp-sra-summary-label">Total Profit</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.avgMargin}%</div><div className="rp-sra-summary-label">Avg Margin</div></div>
        </div>
      )}

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr><th>Product Name</th><th>Quantity Sold</th><th>Revenue ({currencySymbol})</th><th>Cost ({currencySymbol})</th><th>Profit ({currencySymbol})</th><th>Margin (%)</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={6} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="rp-detail-empty-cell">No product margin data found</td></tr>
            ) : rows.map((r, i) => (
              <tr key={i}>
                <td className="fw-semibold">{r.productName}</td>
                <td>{r.quantity}</td>
                <td>{formatAmount(r.revenue)}</td>
                <td>{formatAmount(r.cost)}</td>
                <td className={r.profit >= 0 ? "rp-pm-profit" : "rp-pm-loss"}>{formatAmount(r.profit)}</td>
                <td className={r.marginPct >= 0 ? "rp-pm-profit" : "rp-pm-loss"}>{r.marginPct}%</td>
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
