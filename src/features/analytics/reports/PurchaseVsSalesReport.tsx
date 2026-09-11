import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { PURCHASE_VS_SALES_REPORT } from "../../../services/api/endpoints";
import { useProducts } from "../../catalog/hooks/useProducts";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination, JiraFilterMenu, DateRangeFilter, getDateRangePresetValue } from "../../../components/ui";
import type { JiraFilterField, DateRangeFilterValue } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import { useCurrency } from "../../../hooks/useCurrency";
import "./PurchaseVsSalesReport.scss";

const REPORT_NAME = "Purchase vs Sales Inventory";

interface PurchaseVsSalesRow {
  productId: string;
  product: string;
  category: string;
  brand: string;
  currentStock: number;
  purchaseQty: number;
  purchaseValue: number;
  salesQty: number;
  salesValue: number;
  consumptionQty: number;
  consumptionValue: number;
  netMovement: number;
  turnoverRatio: number;
}

function mapRow(row: any): PurchaseVsSalesRow {
  return {
    productId: String(row.product_id ?? ""),
    product: row.product_name || "—",
    category: row.category_name || "—",
    brand: row.brand_name || "—",
    currentStock: Number(row.current_stock) || 0,
    purchaseQty: Number(row.purchase_qty) || 0,
    purchaseValue: Number(row.purchase_value) || 0,
    salesQty: Number(row.sales_qty) || 0,
    salesValue: Number(row.sales_value) || 0,
    consumptionQty: Number(row.consumption_qty) || 0,
    consumptionValue: Number(row.consumption_value) || 0,
    netMovement: Number(row.net_movement) || 0,
    turnoverRatio: Number(row.turnover_ratio) || 0,
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

export default function PurchaseVsSalesReport({ onBack, category: reportCategory, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const { currencySymbol, formatAmount } = useCurrency();
  // Same Brand/Category source as Catalog → Products, so this report's
  // dropdowns match the Catalog page's options.
  const { brands, categories, fetchBrands, fetchCategories } = useProducts();

  const [search,      setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [brandFilter,    setBrandFilter]    = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRangeFilterValue>(() => ({
    preset: "this_month",
    ...getDateRangePresetValue("this_month"),
  }));

  const [rows,        setRows]        = useState<PurchaseVsSalesRow[]>([]);
  const [total,       setTotal]       = useState(0);
  const [stats,       setStats]       = useState({
    totalPurchaseValue: 0, totalSalesValue: 0, totalConsumptionValue: 0,
    netInventoryChange: 0, overallTurnoverRatio: 0,
  });
  const [loading,     setLoading]     = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(10);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { fetchBrands(); fetchCategories(); }, [fetchBrands, fetchCategories]);

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
      if (categoryFilter.length > 0) body.category_ids = categoryFilter;
      if (brandFilter.length > 0) body.brand_ids = brandFilter;
      if (dateRange.startDate) body.date_from = dateRange.startDate;
      if (dateRange.endDate) body.date_to = dateRange.endDate;
      const res = await api.post(PURCHASE_VS_SALES_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
      const s = data?.stats ?? {};
      setStats({
        totalPurchaseValue: Number(s.total_purchase_value) || 0,
        totalSalesValue: Number(s.total_sales_value) || 0,
        totalConsumptionValue: Number(s.total_consumption_value) || 0,
        netInventoryChange: Number(s.net_inventory_change) || 0,
        overallTurnoverRatio: Number(s.overall_turnover_ratio) || 0,
      });
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
        setStats({ totalPurchaseValue: 0, totalSalesValue: 0, totalConsumptionValue: 0, netInventoryChange: 0, overallTurnoverRatio: 0 });
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [debouncedSearch, categoryFilter, brandFilter, dateRange.startDate, dateRange.endDate, currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, categoryFilter, brandFilter, dateRange.startDate, dateRange.endDate]);

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

  const HEADERS = [
    "Product", "Category", "Brand", "Current Stock",
    "Purchase Qty", `Purchase Value (${currencySymbol})`,
    "Sales Qty", `Sales Value (${currencySymbol})`,
    "Consumption Qty", `Consumption Value (${currencySymbol})`,
    "Net Movement", "Turnover Ratio",
  ];
  const exportRows = () => rows.map(r => [
    r.product, r.category, r.brand, r.currentStock,
    r.purchaseQty, r.purchaseValue,
    r.salesQty, r.salesValue,
    r.consumptionQty, r.consumptionValue,
    r.netMovement, r.turnoverRatio.toFixed(2),
  ]);

  const movementClass = (n: number) => n > 0 ? "rp-pvs-move--up" : n < 0 ? "rp-pvs-move--down" : "";

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
              reportId="purchase_vs_sales"
              filename="purchase-vs-sales-inventory"
              variant="button"
              csv
              dateRangeLabel={dateRange.startDate || dateRange.endDate ? `${dateRange.startDate ? formatDate(dateRange.startDate) : "…"} - ${dateRange.endDate ? formatDate(dateRange.endDate) : "…"}` : undefined}
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
                `Total Purchase Value: ${formatAmount(stats.totalPurchaseValue)}`,
                `Total Sales Value: ${formatAmount(stats.totalSalesValue)}`,
                `Total Consumption Value: ${formatAmount(stats.totalConsumptionValue)}`,
                `Net Inventory Change: ${formatAmount(stats.netInventoryChange)}`,
                `Overall Turnover Ratio: ${stats.overallTurnoverRatio.toFixed(2)}`,
              ]}
            />
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <JiraFilterMenu fields={filterFields} selected={filterMenuSelected} onApply={handleFiltersApply} triggerLabel="Filters" />
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Date Range</label>
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        </div>
        <div className="rp-detail-filter-actions">
          <ReportRefreshButton onClick={fetchData} loading={loading} />
        </div>
      </div>

      {loading ? <SkeletonStatCards count={5} /> : (
        <div className="rp-sra-summary-row rp-pvs-summary-row">
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.totalPurchaseValue)}</div><div className="rp-sra-summary-label">Total Purchase Value</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.totalSalesValue)}</div><div className="rp-sra-summary-label">Total Sales Value</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.totalConsumptionValue)}</div><div className="rp-sra-summary-label">Stock Consumption</div></div>
          <div className="rp-sra-summary-card">
            <div className={`rp-sra-summary-val ${movementClass(stats.netInventoryChange)}`}>{formatAmount(stats.netInventoryChange)}</div>
            <div className="rp-sra-summary-label">Net Inventory Change</div>
          </div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.overallTurnoverRatio.toFixed(2)}×</div><div className="rp-sra-summary-label">Inventory Turnover</div></div>
        </div>
      )}

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input
            type="text"
            className="rp-detail-search-input"
            placeholder="Search product, brand or category"
            value={search}
            onChange={e => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table rp-pvs-table">
          <thead>
            <tr>
              <th className="rp-pvs-col-product">Product</th>
              <th>Category</th>
              <th>Brand</th>
              <th>Current Stock</th>
              <th>Purchased</th>
              <th>Sold</th>
              <th>Consumed</th>
              <th>Net Movement</th>
              <th>Turnover</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={9} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} className="rp-detail-empty-cell">No data available</td></tr>
            ) : rows.map((r) => (
              <tr key={r.productId}>
                <td className="fw-semibold rp-pvs-product-cell" title={r.product}>{r.product}</td>
                <td>{r.category}</td>
                <td>{r.brand}</td>
                <td>{r.currentStock}</td>
                <td>
                  {r.purchaseQty > 0
                    ? <>{r.purchaseQty} <span className="rp-pvs-sub">· {formatAmount(r.purchaseValue)}</span></>
                    : "—"}
                </td>
                <td>
                  {r.salesQty > 0
                    ? <>{r.salesQty} <span className="rp-pvs-sub">· {formatAmount(r.salesValue)}</span></>
                    : "—"}
                </td>
                <td>
                  {r.consumptionQty > 0
                    ? <>{r.consumptionQty} <span className="rp-pvs-sub">· {formatAmount(r.consumptionValue)}</span></>
                    : "—"}
                </td>
                <td className={movementClass(r.netMovement)}>{r.netMovement > 0 ? `+${r.netMovement}` : r.netMovement}</td>
                <td>{r.purchaseQty > 0 ? `${r.turnoverRatio.toFixed(2)}×` : "—"}</td>
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
