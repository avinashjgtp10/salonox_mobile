import { useState, useEffect, useCallback, useRef } from "react";
import { Grid3x3Gap, InfoCircle } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { PRODUCTS, CATEGORIES, PRODUCT_INVENTORY_SALES_REPORT } from "../../../services/api/endpoints";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonTableRows } from "./ReportSkeleton";
import { Pagination } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import { useCurrency } from "../../../hooks/useCurrency";
import "./ProductInventoryReport.scss";

const REPORT_NAME = "Product Inventory";

interface InventoryRow {
  product: string;
  category: string;
  sku: string;
  currentStock: number;
  reorderLevel: number;
  unitCost: number;
  totalValue: number;
  status: "In Stock" | "Low Stock" | "Out of Stock";
  createdAt: string;
  unitsSold: number;
  salesRevenue: number;
}

const INV_STATUSES = ["All", "In Stock", "Low Stock", "Out of Stock"];

export default function ProductInventoryReport({ onBack, category: reportCategory, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const { currencySymbol, formatAmount } = useCurrency();
  const [category,        setCategory]        = useState("All");
  const [stockStatus,     setStockStatus]     = useState("All");
  const [dateFrom,        setDateFrom]        = useState("");
  const [dateTo,          setDateTo]          = useState("");
  const [showCatDrop,     setShowCatDrop]     = useState(false);
  const [showStsDrop,     setShowStsDrop]     = useState(false);
  const [rows,            setRows]            = useState<InventoryRow[]>([]);
  const [allRows,         setAllRows]         = useState<InventoryRow[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>(["All"]);
  const [loading,         setLoading]         = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(10);
  useEffect(() => { setCurrentPage(1); }, [rows]);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      // The products list endpoint defaults to 20 rows/page server-side —
      // fetching just the first page silently drops every product past #20
      // from both the table AND the Total Value sum. Page through everything
      // so the report reflects the salon's full inventory, not one page of it.
      const fetchAllProducts = async () => {
        const pageSizeReq = 100;
        let page = 1;
        let all: any[] = [];
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const res = await api.get(PRODUCTS.LIST, { params: { page, limit: pageSizeReq }, signal: ctrl.signal });
          const batch: any[] = res.data?.data?.data ?? res.data?.data ?? [];
          all = all.concat(batch);
          const total = Number(res.data?.data?.total ?? res.data?.total ?? all.length);
          if (batch.length === 0 || all.length >= total) break;
          page += 1;
        }
        return all;
      };

      const salesBody: Record<string, string> = {};
      if (dateFrom) salesBody.start_date = dateFrom;
      if (dateTo) salesBody.end_date = dateTo;

      const [products, catRes, salesRes] = await Promise.all([
        fetchAllProducts(),
        api.get(CATEGORIES.BASE, { signal: ctrl.signal }),
        api.post(PRODUCT_INVENTORY_SALES_REPORT.SUMMARY(), salesBody, { signal: ctrl.signal }),
      ]);
      const cats: any[] = catRes.data?.data ?? [];
      const catMap: Record<string, string> = {};
      cats.forEach((c: any) => { catMap[c.id] = c.name; });
      setCategoryOptions(["All", ...cats.map((c: any) => c.name as string)]);
      const salesByProductId: Record<string, { quantity: number; revenue: number }> = salesRes.data?.data ?? {};
      const mapped: InventoryRow[] = products.map((p: any) => {
        const currentStock = parseFloat(p.amount) || 0;
        const reorderLevel = Number(p.qty_alert) || 0;
        const unitCost = parseFloat(p.supply_price) || parseFloat(p.retail_price) || 0;
        const totalValue = Math.round(currentStock * unitCost * 100) / 100;
        const catName = p.category_id ? (catMap[p.category_id] ?? "Uncategorized") : "Uncategorized";
        let status: InventoryRow["status"] = "In Stock";
        if (currentStock <= 0) status = "Out of Stock";
        else if (reorderLevel > 0 && currentStock <= reorderLevel) status = "Low Stock";
        const sold = salesByProductId[String(p.id)];
        return {
          product: p.name, category: catName, sku: p.barcode ?? "—", currentStock, reorderLevel,
          unitCost, totalValue, status, createdAt: p.created_at,
          unitsSold: sold?.quantity ?? 0, salesRevenue: sold?.revenue ?? 0,
        };
      });
      setAllRows(mapped);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") setAllRows([]);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    let filtered = allRows;
    if (category !== "All") filtered = filtered.filter(r => r.category === category);
    if (stockStatus !== "All") filtered = filtered.filter(r => r.status === stockStatus);
    if (dateFrom) filtered = filtered.filter(r => r.createdAt && r.createdAt.slice(0, 10) >= dateFrom);
    if (dateTo) filtered = filtered.filter(r => r.createdAt && r.createdAt.slice(0, 10) <= dateTo);
    setRows(filtered);
  }, [allRows, category, stockStatus, dateFrom, dateTo]);

  useEffect(() => {
    const close = () => { setShowCatDrop(false); setShowStsDrop(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const HEADERS = ["Product", "Category", "SKU", "Current Stock", "Reorder Level", `Unit Cost (${currencySymbol})`, `Total Value (${currencySymbol})`, "Sales (Qty)", `Sales (${currencySymbol})`, "Status"];
  const exportRows = () => rows.map(r => [r.product, r.category, r.sku, r.currentStock, r.reorderLevel, r.unitCost, r.totalValue, r.unitsSold, r.salesRevenue, r.status]);

  const statusColor = (s: string) =>
    s === "In Stock" ? "#10b981" : s === "Low Stock" ? "#f59e0b" : "#ef4444";

  const money = formatAmount;
  const totalValueSum = rows.reduce((s, r) => s + r.totalValue, 0);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Breadcrumb current={REPORT_NAME} category={reportCategory} categoryKey={categoryKey} onBack={onBack} />
          <div className="rp-detail-view-icons">
            <button className="rp-detail-icon-btn" title="Column view"><Grid3x3Gap size={16} /></button>
            <ReportExportButton title={REPORT_NAME} headers={HEADERS} rows={exportRows} filename={REPORT_NAME} csv />
            <button className="rp-detail-icon-btn" title="Info"><InfoCircle size={16} /></button>
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Category</label>
          <button className="rp-detail-select" onClick={() => { setShowCatDrop(v => !v); setShowStsDrop(false); }}>
            {category} <span className="rp-detail-caret">▼</span>
          </button>
          {showCatDrop && (
            <div className="rp-detail-dropdown" onMouseDown={e => e.stopPropagation()}>
              {categoryOptions.map(c => (
                <div key={c} className={`rp-detail-dropdown-item ${c === category ? "active" : ""}`}
                  onClick={() => { setCategory(c); setShowCatDrop(false); }}>{c}</div>
              ))}
            </div>
          )}
        </div>
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Stock Status</label>
          <button className="rp-detail-select" onClick={() => { setShowStsDrop(v => !v); setShowCatDrop(false); }}>
            {stockStatus} <span className="rp-detail-caret">▼</span>
          </button>
          {showStsDrop && (
            <div className="rp-detail-dropdown" onMouseDown={e => e.stopPropagation()}>
              {INV_STATUSES.map(s => (
                <div key={s} className={`rp-detail-dropdown-item ${s === stockStatus ? "active" : ""}`}
                  onClick={() => { setStockStatus(s); setShowStsDrop(false); }}>{s}</div>
              ))}
            </div>
          )}
        </div>
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Calendar (Date Added)</label>
          <div className="rp-detail-date-range">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="rp-detail-date-input" />
            <span className="rp-detail-date-sep">-</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="rp-detail-date-input" />
          </div>
        </div>
        <div className="rp-detail-filter-actions">
          <ReportRefreshButton onClick={fetchData} loading={loading} />
        </div>
      </div>

      {!loading && (
        <div className="rp-detail-drag-hint">
          {rows.length} product{rows.length !== 1 ? "s" : ""}
          {rows.length > 0 && <>&nbsp;·&nbsp;Total Value: <strong>{money(totalValueSum)}</strong></>}
        </div>
      )}

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table rp-inv-table">
          <thead>
            <tr>
              <th className="rp-inv-col-product">Product</th>
              <th>Category</th>
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
              <SkeletonTableRows columns={9} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} className="rp-detail-empty-cell">No data available</td></tr>
            ) : rows.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((r, i) => (
              <tr key={i}>
                <td className="fw-semibold rp-inv-product-cell" title={r.product}>{r.product}</td>
                <td>{r.category}</td>
                <td><span className="rp-detail-link">{r.sku}</span></td>
                <td>{r.currentStock}</td>
                <td>{r.reorderLevel}</td>
                <td>{money(r.unitCost)}</td>
                <td className="fw-semibold">{money(r.totalValue)}</td>
                <td>
                  {r.unitsSold > 0
                    ? <>{r.unitsSold} unit{r.unitsSold !== 1 ? "s" : ""} <span className="rp-inv-sales-rev">· {money(r.salesRevenue)}</span></>
                    : "—"}
                </td>
                <td><span className={`rp-inv-status rp-inv-status--${statusColor(r.status) === "#10b981" ? "ok" : statusColor(r.status) === "#f59e0b" ? "low" : "out"}`}>{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage} pageSize={pageSize} totalItems={rows.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }}
      />
    </div>
  );
}
