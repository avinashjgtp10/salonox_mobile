import { useState, useEffect, useCallback, useRef } from "react";
import { useDispatch } from "react-redux";
import { ChevronLeft } from "react-bootstrap-icons";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import api from "../../../services/api/axios";
import { BOOKING } from "../../../services/api/endpoints";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import type { AppDispatch } from "../../../store/store";
import Button from "../../../components/ui/Button";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import { SkeletonStatCards, SkeletonTableRows, SkeletonChartBlock } from "./ReportSkeleton";
import "./StaffSalesReport.scss";

const REPORT_NAME = "Staff Sales";

type RevPeriodKey = "daily" | "weekly" | "monthly" | "yearly";
interface RevRow { label: string; serviceRevenue: number; productRevenue: number; total: number }

export default function StaffSalesReport({ onBack }: { onBack: () => void }) {
  const dispatch = useDispatch<AppDispatch>();
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
      const params = new URLSearchParams({ start_date: dateFrom, end_date: dateTo, limit: "200" });
      const apptRes = await api.get(`${BOOKING.BASE}?${params}`, { signal: ctrl.signal });
      const rawAppt = apptRes.data?.data;
      const appts: any[] =
        Array.isArray(rawAppt?.items) ? rawAppt.items :
        Array.isArray(rawAppt?.data)  ? rawAppt.data  :
        Array.isArray(rawAppt)        ? rawAppt        : [];

      const bucketMap = new Map<string, { serviceRevenue: number; productRevenue: number }>();
      const fmt = (d: string) => {
        const dt = new Date(d);
        if (revPeriod === "daily")   return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
        if (revPeriod === "weekly")  { const w = new Date(dt); w.setDate(dt.getDate() - dt.getDay()); return `W${w.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`; }
        if (revPeriod === "monthly") return dt.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
        return dt.getFullYear().toString();
      };

      appts.forEach((appt: any) => {
        const sid = String(appt.staff_id ?? "");
        if (staffFilter !== "All" && sid !== staffFilter) return;
        const date = String(appt.scheduled_at ?? appt.created_at ?? "").slice(0, 10);
        if (!date) return;
        const label = fmt(date);
        const svcRev  = (Array.isArray(appt.services)      ? appt.services      : []).reduce((s: number, it: any) => s + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0);
        const prodRev = (Array.isArray(appt.product_items) ? appt.product_items : []).reduce((s: number, it: any) => s + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0);
        if (!bucketMap.has(label)) bucketMap.set(label, { serviceRevenue: 0, productRevenue: 0 });
        const b = bucketMap.get(label)!;
        b.serviceRevenue += svcRev;
        b.productRevenue += prodRev;
      });

      const result: RevRow[] = Array.from(bucketMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([label, v]) => ({ label, serviceRevenue: Math.round(v.serviceRevenue), productRevenue: Math.round(v.productRevenue), total: Math.round(v.serviceRevenue + v.productRevenue) }));
      setRows(result);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") setRows([]);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo, revPeriod, staffFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const close = () => setShowStaffDrop(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const totalSvc  = rows.reduce((s, r) => s + r.serviceRevenue, 0);
  const totalProd = rows.reduce((s, r) => s + r.productRevenue, 0);
  const totalRev  = rows.reduce((s, r) => s + r.total, 0);

  const HEADERS = ["Period", "Service Revenue (₹)", "Product Revenue (₹)", "Total Revenue (₹)"];
  const exportRows = () => rows.map(r => [r.label, r.serviceRevenue, r.productRevenue, r.total]);

  const selectedStaffLabel = staffOptions.find(o => o.value === staffFilter)?.label ?? "All";

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Button variant="ghost" className="rp-detail-back" onClick={onBack}>
            <ChevronLeft size={15} /> {REPORT_NAME}
          </Button>
          <div className="rp-detail-view-icons">
            <ReportExportButton title={REPORT_NAME} headers={HEADERS} rows={exportRows} filename={`staff-sales-${dateFrom}-${dateTo}`} csv print />
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
            { label: "Service Revenue", value: `₹${totalSvc.toLocaleString()}`, cls: "svc" },
            { label: "Product Revenue", value: `₹${totalProd.toLocaleString()}`, cls: "prod" },
            { label: "Total Revenue",   value: `₹${totalRev.toLocaleString()}`,  cls: "total" },
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
                  <th>Service Revenue (₹)</th>
                  <th>Product Revenue (₹)</th>
                  <th>Total Revenue (₹)</th>
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
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => `₹${Number(v).toLocaleString()}`} />
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
                  <th>Service Revenue (₹)</th>
                  <th>Product Revenue (₹)</th>
                  <th>Total Revenue (₹)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td>{r.label}</td>
                    <td>₹{r.serviceRevenue.toLocaleString()}</td>
                    <td>₹{r.productRevenue.toLocaleString()}</td>
                    <td className="fw-semibold">₹{r.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
