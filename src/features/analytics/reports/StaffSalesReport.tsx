import { useState, useEffect, useCallback, useRef } from "react";
import { useDispatch } from "react-redux";
import { ChevronLeft } from "react-bootstrap-icons";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import api from "../../../services/api/axios";
import { STAFF_SALES_REPORT } from "../../../services/api/endpoints";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import type { AppDispatch } from "../../../store/store";
import Button from "../../../components/ui/Button";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import { Pagination } from "../../../components/ui";
import { SkeletonStatCards, SkeletonTableRows, SkeletonChartBlock } from "./ReportSkeleton";
import { useCurrency } from "../../../hooks/useCurrency";
import "./StaffSalesReport.scss";

const REPORT_NAME = "Staff Sales";

type RevPeriodKey = "daily" | "weekly" | "monthly" | "yearly";
interface RevRow { label: string; serviceRevenue: number; productRevenue: number; total: number }

export default function StaffSalesReport({ onBack }: { onBack: () => void }) {
  const dispatch = useDispatch<AppDispatch>();
  const { currencySymbol, formatAmount } = useCurrency();
  const today      = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [dateFrom,       setDateFrom]       = useState(monthStart);
  const [dateTo,         setDateTo]         = useState(today);
  const [revPeriod,      setRevPeriod]      = useState<RevPeriodKey>("daily");
  const [staffFilter,    setStaffFilter]    = useState("All");
  const [staffOptions,   setStaffOptions]   = useState<{ label: string; value: string }[]>([{ label: "All", value: "All" }]);
  const [showStaffDrop,  setShowStaffDrop]  = useState(false);
  const [loading,        setLoading]        = useState(false);
  const [rows,           setRows]           = useState<RevRow[]>([]);
  const [currentPage,    setCurrentPage]    = useState(1);
  const [pageSize,       setPageSize]       = useState(25);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    dispatch(fetchStaffThunk()).unwrap().then((list: any[]) => {
      const opts = list.map((s: any) => ({
        label: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.name || "",
        value: String(s.id ?? ""),
      })).filter((o: any) => o.label && o.value);
      setStaffOptions([{ label: "All", value: "All" }, ...opts]);
    }).catch(() => {});
  }, [dispatch]);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const body: Record<string, any> = { start_date: dateFrom, end_date: dateTo, period: revPeriod };
      if (staffFilter !== "All") body.staff_id = staffFilter;
      const res = await api.post(STAFF_SALES_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const raw: any[] = Array.isArray(res.data?.data?.rows) ? res.data.data.rows : [];
      const result: RevRow[] = raw.map((r: any) => ({
        label: r.label,
        serviceRevenue: Number(r.service_revenue) || 0,
        productRevenue: Number(r.product_revenue) || 0,
        total: Number(r.total) || 0,
      }));
      setRows(result);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") setRows([]);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo, revPeriod, staffFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => { setCurrentPage(1); }, [rows.length]);

  useEffect(() => {
    const close = () => setShowStaffDrop(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const totalSvc  = rows.reduce((s, r) => s + r.serviceRevenue, 0);
  const totalProd = rows.reduce((s, r) => s + r.productRevenue, 0);
  const totalRev  = rows.reduce((s, r) => s + r.total, 0);

  const HEADERS = ["Period", `Service Revenue (${currencySymbol})`, `Product Revenue (${currencySymbol})`, `Total Revenue (${currencySymbol})`];
  const exportRows = () => rows.map(r => [r.label, r.serviceRevenue, r.productRevenue, r.total]);
  const paged = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const selectedStaffLabel = staffOptions.find(o => o.value === staffFilter)?.label ?? "All";

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Button variant="ghost" className="rp-detail-back" onClick={onBack}>
            <ChevronLeft size={15} /> {REPORT_NAME}
          </Button>
          <div className="rp-detail-view-icons">
            <ReportExportButton title={REPORT_NAME} headers={HEADERS} rows={exportRows} filename={`staff-sales-${dateFrom}-${dateTo}`} csv />
          </div>
        </div>
        <div className="rp-detail-tab-bar">
          {(["daily", "weekly", "monthly", "yearly"] as RevPeriodKey[]).map(p => (
            <span key={p} className={`rp-detail-tab rp-ss-period-tab ${revPeriod === p ? "active" : ""}`}
              onClick={() => setRevPeriod(p)}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </span>
          ))}
        </div>
      </div>

      <div className="rp-detail-filters">
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Date Range</label>
          <div className="rp-detail-date-range">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="rp-detail-date-input" />
            <span className="rp-detail-date-sep">-</span>
            <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   className="rp-detail-date-input" />
          </div>
        </div>
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Staff Member</label>
          <button className="rp-detail-select" onClick={() => setShowStaffDrop(v => !v)}>
            {selectedStaffLabel.length > 16 ? selectedStaffLabel.slice(0, 16) + "…" : selectedStaffLabel}
            <span className="rp-detail-caret">▼</span>
          </button>
          {showStaffDrop && (
            <div className="rp-detail-dropdown" onMouseDown={e => e.stopPropagation()}>
              {staffOptions.map(o => (
                <div key={o.value} className={`rp-detail-dropdown-item ${o.value === staffFilter ? "active" : ""}`}
                  onClick={() => { setStaffFilter(o.value); setShowStaffDrop(false); }}>{o.label}</div>
              ))}
            </div>
          )}
        </div>
        <div className="rp-detail-filter-actions">
          <Button variant="ghost" className="rp-detail-refresh-btn" onClick={fetchData} loading={loading}>
            Run Report
          </Button>
        </div>
      </div>

      {loading ? <SkeletonStatCards count={3} /> : (
        <div className="rp-sra-summary-row">
          {[
            { label: "Service Revenue", value: formatAmount(totalSvc), cls: "svc" },
            { label: "Product Revenue", value: formatAmount(totalProd), cls: "prod" },
            { label: "Total Revenue",   value: formatAmount(totalRev),  cls: "total" },
          ].map(c => (
            <div key={c.label} className="rp-sra-summary-card">
              <div className={`rp-sra-summary-val rp-ss-val--${c.cls}`}>{c.value}</div>
              <div className="rp-sra-summary-label">{c.label}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <>
          <SkeletonChartBlock />
          <div className="rp-detail-table-wrap">
            <table className="rp-detail-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Service Revenue ({currencySymbol})</th>
                  <th>Product Revenue ({currencySymbol})</th>
                  <th>Total Revenue ({currencySymbol})</th>
                </tr>
              </thead>
              <tbody>
                <SkeletonTableRows columns={4} />
              </tbody>
            </table>
          </div>
        </>
      ) : rows.length === 0 ? (
        <div className="rp-detail-empty-cell">No revenue data found for selected range</div>
      ) : (
        <>
          <div className="rp-ss-chart-card">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={rows} margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={v => `${currencySymbol}${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => formatAmount(Number(v))} />
                <Bar dataKey="serviceRevenue" name="Service Revenue" fill="#3b82f6" radius={[4,4,0,0]} />
                <Bar dataKey="productRevenue" name="Product Revenue" fill="#10b981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="rp-legend-row">
              <span className="rp-leg-item"><span className="rp-pie-dot rp-ss-dot--svc" />Service Revenue</span>
              <span className="rp-leg-item"><span className="rp-pie-dot rp-ss-dot--prod" />Product Revenue</span>
            </div>
          </div>

          <div className="rp-detail-table-wrap">
            <table className="rp-detail-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Service Revenue ({currencySymbol})</th>
                  <th>Product Revenue ({currencySymbol})</th>
                  <th>Total Revenue ({currencySymbol})</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((r, i) => (
                  <tr key={i}>
                    <td>{r.label}</td>
                    <td>{formatAmount(r.serviceRevenue)}</td>
                    <td>{formatAmount(r.productRevenue)}</td>
                    <td className="fw-semibold">{formatAmount(r.total)}</td>
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
        </>
      )}
    </div>
  );
}
