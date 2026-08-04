import { useState, useEffect, useCallback, useRef } from "react";
import api from "../../../services/api/axios";
import { PRODUCT_MARGIN_REPORT } from "../../../services/api/endpoints";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import DateRangeFields from "../../../components/ui/DateRangeFields";
import { useCurrency } from "../../../hooks/useCurrency";
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
  const today   = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [dateFrom,    setDateFrom]    = useState(monthStart);
  const [dateTo,      setDateTo]      = useState(today);
  const [rows,        setRows]        = useState<MarginRow[]>([]);
  const [total,       setTotal]       = useState(0);
  const [stats,       setStats]       = useState({ totalRevenue: 0, totalCost: 0, totalProfit: 0, avgMargin: 0 });
  const [loading,     setLoading]     = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(25);
  const abortRef = useRef<AbortController | null>(null);

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
  }, [dateFrom, dateTo, currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [dateFrom, dateTo]);

  const HEADERS = ["Product Name", "Quantity Sold", `Revenue (${currencySymbol})`, `Cost (${currencySymbol})`, `Profit (${currencySymbol})`, "Margin (%)"];
  const exportRows = () => rows.map(r => [r.productName, r.quantity, r.revenue, r.cost, r.profit, r.marginPct]);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Breadcrumb current={REPORT_NAME} category={category} categoryKey={categoryKey} onBack={onBack} />
          <div className="rp-detail-view-icons">
            <ReportExportButton title={REPORT_NAME} headers={HEADERS} rows={exportRows} filename={`product-margin-${dateFrom}-${dateTo}`} variant="button" csv />
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <DateRangeFields from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
        <div className="rp-detail-filter-actions">
          <ReportRefreshButton onClick={fetchData} loading={loading} />
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
