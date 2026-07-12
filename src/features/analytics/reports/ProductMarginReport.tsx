import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { BOOKING, PRODUCTS } from "../../../services/api/endpoints";
import Button from "../../../components/ui/Button";
import { PageLoader } from "../../../components/ui/PageLoader";
import { Pagination } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
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

export default function ProductMarginReport({ onBack }: { onBack: () => void }) {
  const today   = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [dateFrom,    setDateFrom]    = useState(monthStart);
  const [dateTo,      setDateTo]      = useState(today);
  const [rows,        setRows]        = useState<MarginRow[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(25);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const [apptRes, prodRes] = await Promise.all([
        api.get(BOOKING.BASE, { params: { start_date: dateFrom, end_date: dateTo, limit: "200" }, signal: ctrl.signal }),
        api.get(PRODUCTS.LIST, { signal: ctrl.signal }),
      ]);
      const products: any[] = prodRes.data?.data?.data ?? prodRes.data?.data ?? [];
      const costMap = new Map<string, number>();
      products.forEach((p: any) => {
        const cost = parseFloat(p.supply_price) || 0;
        if (p.id != null) costMap.set(String(p.id), cost);
        if (p.name)        costMap.set(String(p.name).toLowerCase(), cost);
      });

      const raw = apptRes.data?.data;
      const appts: any[] =
        Array.isArray(raw?.items) ? raw.items :
        Array.isArray(raw?.data)  ? raw.data  :
        Array.isArray(raw)        ? raw        : [];
      const agg = new Map<string, { quantity: number; revenue: number; cost: number }>();
      appts.forEach((appt: any) => {
        (Array.isArray(appt.product_items) ? appt.product_items : []).forEach((it: any) => {
          const name = String(it.name ?? "Product");
          const qty = Number(it.quantity ?? 1) || 1;
          const price = Number(it.price) || 0;
          const unitCost = costMap.get(String(it.product_id ?? "")) ?? costMap.get(name.toLowerCase()) ?? 0;
          const e = agg.get(name) ?? { quantity: 0, revenue: 0, cost: 0 };
          e.quantity += qty;
          e.revenue  += price * qty;
          e.cost     += unitCost * qty;
          agg.set(name, e);
        });
      });

      const result: MarginRow[] = [...agg.entries()].map(([productName, v]) => {
        const profit = v.revenue - v.cost;
        return {
          productName,
          quantity: v.quantity,
          revenue: Math.round(v.revenue),
          cost: Math.round(v.cost),
          profit: Math.round(profit),
          marginPct: v.revenue > 0 ? Math.round((profit / v.revenue) * 1000) / 10 : 0,
        };
      }).sort((a, b) => b.profit - a.profit);
      setRows(result);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") setRows([]);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [rows]);

  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalCost = rows.reduce((s, r) => s + r.cost, 0);
  const totalProfit = rows.reduce((s, r) => s + r.profit, 0);
  const avgMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 1000) / 10 : 0;

  const HEADERS = ["Product Name", "Quantity Sold", "Revenue (₹)", "Cost (₹)", "Profit (₹)", "Margin (%)"];
  const exportRows = () => rows.map(r => [r.productName, r.quantity, r.revenue, r.cost, r.profit, r.marginPct]);
  const paged = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Button variant="ghost" className="rp-detail-back" onClick={onBack}>
            <ChevronLeft size={15} /> {REPORT_NAME}
          </Button>
          <div className="rp-detail-view-icons">
            <ReportExportButton title={REPORT_NAME} headers={HEADERS} rows={exportRows} filename={`product-margin-${dateFrom}-${dateTo}`} variant="button" csv print />
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
        <div className="rp-detail-filter-actions">
          <Button variant="ghost" className="rp-detail-refresh-btn" onClick={fetchData} loading={loading}>
            Run Report
          </Button>
        </div>
      </div>

      <div className="rp-sra-summary-row">
        <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">₹{totalRevenue.toLocaleString()}</div><div className="rp-sra-summary-label">Total Revenue</div></div>
        <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">₹{totalCost.toLocaleString()}</div><div className="rp-sra-summary-label">Total Cost</div></div>
        <div className="rp-sra-summary-card"><div className="rp-sra-summary-val rp-pm-profit">₹{totalProfit.toLocaleString()}</div><div className="rp-sra-summary-label">Total Profit</div></div>
        <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{avgMargin}%</div><div className="rp-sra-summary-label">Avg Margin</div></div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr><th>Product Name</th><th>Quantity Sold</th><th>Revenue (₹)</th><th>Cost (₹)</th><th>Profit (₹)</th><th>Margin (%)</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="rp-detail-loading-cell"><PageLoader /></td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={6} className="rp-detail-empty-cell">No product margin data found</td></tr>
            ) : paged.map((r, i) => (
              <tr key={i}>
                <td className="fw-semibold">{r.productName}</td>
                <td>{r.quantity}</td>
                <td>₹{r.revenue.toLocaleString()}</td>
                <td>₹{r.cost.toLocaleString()}</td>
                <td className={r.profit >= 0 ? "rp-pm-profit" : "rp-pm-loss"}>₹{r.profit.toLocaleString()}</td>
                <td className={r.marginPct >= 0 ? "rp-pm-profit" : "rp-pm-loss"}>{r.marginPct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} pageSize={pageSize} totalItems={rows.length}
        onPageChange={setCurrentPage} onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} />
    </div>
  );
}
