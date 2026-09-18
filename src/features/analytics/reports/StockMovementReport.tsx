// Stock movement report — one row per individual stock_ledger transaction,
// never merged/aggregated across entries even for the same product on the
// same day: "at this moment you had X, added/removed Y, so now it's Z".
// Backed by its own independent reporting endpoint (STOCK_MOVEMENT_REPORT,
// reads stock_ledger directly).
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Search } from "react-bootstrap-icons";
import type { AppDispatch, RootState } from "../../../store/store";
import api from "../../../services/api/axios";
import { STOCK_MOVEMENT_REPORT } from "../../../services/api/endpoints";
import { fetchCategoriesThunk, fetchBrandsThunk, searchProductsThunk } from "../../../middleware/catalog/products.thunk";
import { selectProductCategories } from "../../../store/selectors/slices.selectors";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination, JiraFilterMenu, DateRangeFilter } from "../../../components/ui";
import type { JiraFilterField, DateRangeFilterValue } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import "./ProductInventoryReport.scss";

interface MovementRow {
  id: string;
  productId: string;
  product: string;
  category: string;
  measureUnit: string | null;
  bottleSize: number | null;
  date: string;
  opening: number;
  in: number;
  out: number;
  closing: number;
}

function mapRow(row: any): MovementRow {
  return {
    id: String(row.id ?? ""),
    productId: String(row.product_id ?? ""),
    product: row.product_name || "—",
    category: row.category_name || "—",
    measureUnit: row.measure_unit ?? null,
    bottleSize: row.bottle_size ?? null,
    date: row.movement_date,
    opening: Number(row.opening_stock) || 0,
    in: Number(row.stock_in) || 0,
    out: Number(row.stock_out) || 0,
    closing: Number(row.closing_stock) || 0,
  };
}

// Date-only, used for the export's "From - To" header range.
const fmtDate = (input: string): string => {
  const d = new Date(input);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

// Date+time — every row is its own transaction, so the table needs to tell
// apart two entries for the same product on the same day.
const fmtDateTime = (input: string): string => {
  const d = new Date(input);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

// Bottle-tracked products (bottle_size set) show a derived bottle count
// rather than raw base-unit volume — same rule Stock Ledger/Catalog use.
const fmtQty = (n: number, unit?: string | null, bottleSize?: number | null) => {
  if (bottleSize && bottleSize > 0) {
    return Math.ceil(Math.abs(n) / bottleSize).toLocaleString();
  }
  return `${Math.abs(n).toLocaleString()}${unit ? ` ${unit}` : ""}`;
};

interface StockMovementReportProps {
  onBack: () => void;
  category: string;
  categoryKey: string;
}

const STOCK_STATUS_OPTIONS = [
  { id: "in_stock", label: "In Stock" },
  { id: "low_stock", label: "Low Stock" },
  { id: "out_of_stock", label: "Out of Stock" },
];

const PRODUCT_TYPE_OPTIONS = [
  { id: "retail", label: "Retail" },
  { id: "consumable", label: "Consumable" },
  { id: "both", label: "Both" },
];

export default function StockMovementReport({ onBack, category: reportCategory, categoryKey }: StockMovementReportProps) {
  const dispatch = useDispatch<AppDispatch>();
  const rawCategories = useSelector(selectProductCategories) as { id: string | number; name: string }[];
  const { pickerItems: rawProducts, brands: rawBrands } = useSelector((s: RootState) => s.products);

  const [search, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [productFilter, setProductFilter] = useState<string[]>([]);
  const [brandFilter, setBrandFilter] = useState<string[]>([]);
  const [stockStatusFilter, setStockStatusFilter] = useState<string[]>([]);
  const [productTypeFilter, setProductTypeFilter] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRangeFilterValue>({ preset: "this_month", startDate: "", endDate: "" });
  const { startDate: dateFrom, endDate: dateTo } = dateRange;

  const [rows, setRows] = useState<MovementRow[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ totalProducts: 0, totalStockIn: 0, totalStockOut: 0 });
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const abortRef = useRef<AbortController | null>(null);

  const dateRangeError = dateFrom && dateTo && dateTo < dateFrom
    ? "To Date must be greater than or equal to From Date"
    : "";

  const filterOptionsLoadedRef = useRef(false);
  const loadFilterOptions = useCallback(() => {
    if (filterOptionsLoadedRef.current) return;
    filterOptionsLoadedRef.current = true;
    dispatch(fetchCategoriesThunk());
    dispatch(fetchBrandsThunk());
    // Preloads up to 200 products for the Product filter's dropdown — same
    // "picker" pattern StockLedgerPage/Add Stock use, not the paginated
    // Catalog → Products list (see searchProductsThunk's own comment).
    dispatch(searchProductsThunk({ pageSize: 200 }));
  }, [dispatch]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const categories = useMemo(
    () => rawCategories.map((c) => ({ id: String(c.id), name: c.name })),
    [rawCategories],
  );

  const products = useMemo(
    () => (Array.isArray(rawProducts) ? rawProducts : []).map((p: any) => ({
      id: String(p.id), name: p.name, categoryId: p.category_id !== undefined && p.category_id !== null ? String(p.category_id) : null,
    })),
    [rawProducts],
  );

  const brands = useMemo(
    () => (Array.isArray(rawBrands) ? rawBrands : []).map((b: any) => ({ id: String(b.id), name: b.name })),
    [rawBrands],
  );

  const fetchData = useCallback(async () => {
    if (dateRangeError) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const body: Record<string, any> = { page: currentPage, limit: pageSize };
      if (debouncedSearch) body.search = debouncedSearch;
      if (categoryFilter.length > 0) body.category_ids = categoryFilter;
      if (productFilter[0]) body.product_id = productFilter[0];
      if (brandFilter.length > 0) body.brand_ids = brandFilter;
      // Backend stock_status/product_type are single enums — only send when
      // exactly one is selected, same convention Product Inventory Report uses.
      if (stockStatusFilter.length === 1) body.stock_status = stockStatusFilter[0];
      if (productTypeFilter.length === 1) body.product_type = productTypeFilter[0];
      if (dateFrom) body.date_from = dateFrom;
      if (dateTo) body.date_to = dateTo;
      const res = await api.post(STOCK_MOVEMENT_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
      const s = data?.stats ?? {};
      setStats({
        totalProducts: Number(s.total_products) || 0,
        totalStockIn: Number(s.total_stock_in) || 0,
        totalStockOut: Number(s.total_stock_out) || 0,
      });
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
        setStats({ totalProducts: 0, totalStockIn: 0, totalStockOut: 0 });
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [debouncedSearch, categoryFilter, productFilter, brandFilter, stockStatusFilter, productTypeFilter, dateFrom, dateTo, currentPage, pageSize, dateRangeError]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, categoryFilter, productFilter, brandFilter, stockStatusFilter, productTypeFilter, dateFrom, dateTo]);

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "category", label: "Category", options: categories.map((c) => ({ id: c.id, label: c.name })), searchable: true },
    {
      key: "product", label: "Product", searchable: true,
      options: products.map((p) => ({ id: p.id, label: p.name })),
      dependsOn: "category",
      optionsFor: (catIds, ownIds) => {
        const cats = new Set(catIds);
        const kept = new Set(ownIds);
        return products
          .filter((p) => (p.categoryId && cats.has(p.categoryId)) || kept.has(p.id))
          .map((p) => ({ id: p.id, label: p.name }));
      },
    },
    { key: "brand", label: "Brand", options: brands.map((b) => ({ id: b.id, label: b.name })), searchable: true },
    { key: "stock_status", label: "Stock", options: STOCK_STATUS_OPTIONS },
    { key: "product_type", label: "Product Type", options: PRODUCT_TYPE_OPTIONS },
  ], [categories, products, brands]);

  const filterMenuSelected = useMemo(() => ({
    category: categoryFilter,
    product: productFilter,
    brand: brandFilter,
    stock_status: stockStatusFilter,
    product_type: productTypeFilter,
  }), [categoryFilter, productFilter, brandFilter, stockStatusFilter, productTypeFilter]);

  const handleFiltersApply = (next: Record<string, string[]>) => {
    setCategoryFilter(next.category ?? []);
    setProductFilter(next.product ?? []);
    setBrandFilter(next.brand ?? []);
    setStockStatusFilter(next.stock_status ?? []);
    setProductTypeFilter(next.product_type ?? []);
  };

  const HEADERS = ["Date", "Product", "Category", "Opening Stock", "Added (In)", "Removed (Out)", "Closing Stock"];
  const exportRows = () => rows.map((r) => [
    fmtDateTime(r.date),
    r.product,
    r.category,
    fmtQty(r.opening, r.measureUnit, r.bottleSize),
    fmtQty(r.in, r.measureUnit, r.bottleSize),
    fmtQty(r.out, r.measureUnit, r.bottleSize),
    fmtQty(r.closing, r.measureUnit, r.bottleSize),
  ]);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Breadcrumb current="Stock Movement Report" category={reportCategory} categoryKey={categoryKey} onBack={onBack} />
          <div className="rp-detail-view-icons">
            <ReportExportButton
              title="Stock Movement Report"
              headers={HEADERS}
              rows={exportRows}
              filename="stock-movement-report"
              variant="button"
              csv
              reportId="stock_movement"
              disabled={!!dateRangeError}
              dateRangeLabel={dateFrom || dateTo ? `${dateFrom ? fmtDate(dateFrom) : "…"} - ${dateTo ? fmtDate(dateTo) : "…"}` : undefined}
              filterLines={[
                ...(debouncedSearch ? [`Search: "${debouncedSearch}"`] : []),
                ...(categoryFilter.length > 0
                  ? [`Category: ${categoryFilter.map((id) => categories.find((c) => c.id === id)?.name ?? id).join(", ")}`]
                  : []),
                ...(productFilter.length > 0
                  ? [`Product: ${productFilter.map((id) => products.find((p) => p.id === id)?.name ?? id).join(", ")}`]
                  : []),
                ...(brandFilter.length > 0
                  ? [`Brand: ${brandFilter.map((id) => brands.find((b) => b.id === id)?.name ?? id).join(", ")}`]
                  : []),
                ...(stockStatusFilter.length > 0
                  ? [`Stock: ${stockStatusFilter.map((id) => STOCK_STATUS_OPTIONS.find((o) => o.id === id)?.label ?? id).join(", ")}`]
                  : []),
                ...(productTypeFilter.length > 0
                  ? [`Product Type: ${productTypeFilter.map((id) => PRODUCT_TYPE_OPTIONS.find((o) => o.id === id)?.label ?? id).join(", ")}`]
                  : []),
              ]}
              summaryLines={[
                `Total Products Moved: ${stats.totalProducts}`,
                `Total Added (In): ${stats.totalStockIn.toLocaleString()}`,
                `Total Removed (Out): ${stats.totalStockOut.toLocaleString()}`,
              ]}
            />
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <div onMouseDown={loadFilterOptions} onFocus={loadFilterOptions}>
          <JiraFilterMenu fields={filterFields} selected={filterMenuSelected} onApply={handleFiltersApply} triggerLabel="Filters" />
        </div>
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Date Range</label>
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        </div>
        <div className="rp-detail-filter-actions">
          <ReportRefreshButton onClick={fetchData} loading={loading} />
        </div>
      </div>
      {dateRangeError && <div className="rp-detail-date-error">{dateRangeError}</div>}

      {loading ? <SkeletonStatCards count={3} /> : (
        <div className="rp-sra-summary-row">
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalProducts}</div><div className="rp-sra-summary-label">Products Moved</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">+{stats.totalStockIn.toLocaleString()}</div><div className="rp-sra-summary-label">Total Added</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">-{stats.totalStockOut.toLocaleString()}</div><div className="rp-sra-summary-label">Total Removed</div></div>
        </div>
      )}

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input
            type="text"
            className="rp-detail-search-input"
            placeholder="Search product"
            value={search}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table rp-inv-table">
          <thead>
            <tr>
              <th>Date</th>
              <th className="rp-inv-col-product">Product</th>
              <th>Category</th>
              <th>Opening Stock</th>
              <th>Added (In)</th>
              <th>Removed (Out)</th>
              <th>Closing Stock</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={7} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="rp-detail-empty-cell">No data available</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id}>
                <td>{fmtDateTime(r.date)}</td>
                <td className="fw-semibold rp-inv-product-cell" title={r.product}>{r.product}</td>
                <td>{r.category}</td>
                <td>{fmtQty(r.opening, r.measureUnit, r.bottleSize)}</td>
                <td className={r.in > 0 ? "fw-semibold" : undefined}>{r.in > 0 ? `+${fmtQty(r.in, r.measureUnit, r.bottleSize)}` : "—"}</td>
                <td className={r.out > 0 ? "fw-semibold" : undefined}>{r.out > 0 ? `-${fmtQty(r.out, r.measureUnit, r.bottleSize)}` : "—"}</td>
                <td className="fw-semibold">{fmtQty(r.closing, r.measureUnit, r.bottleSize)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} pageSize={pageSize} totalItems={total}
        onPageChange={setCurrentPage} onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }} />
    </div>
  );
}
