import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Search, Star, ChevronLeft, ArrowRepeat as Refresh, Grid3x3Gap, InfoCircle } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { BOOKING, STAFF, SALE, REPORT, SERVICES, CLIENT, PRODUCTS, CATEGORIES } from "../../../services/api/endpoints";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import type { AppDispatch, RootState } from "../../../store/store";
import { selectCurrentSalon } from "../../../store/selectors/slices.selectors";
import { clearReportError } from "../../../store/reportSlice";
import {
  fetchRevenueReportThunk,
  fetchAppointmentsReportThunk,
  fetchClientsReportThunk,
  fetchStaffReportThunk,
  fetchServicesReportThunk,
  exportReportThunk,
  fetchReportsDashboardThunk,
} from "../../../middleware/report/report.thunk";
import type { ReportPeriod, ReportTab } from "../../../types/report.types";
import Button from "../../../components/ui/Button";
import { PageLoader } from "../../../components/ui/PageLoader";
import { Pagination } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import "../styles/ReportsPage.scss";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ReferenceLine,
} from "recharts";
import {
  ArrowUpRight, ArrowDownRight, Funnel,
  Calendar3, CurrencyRupee, CalendarCheck, People,
  Scissors, GraphUpArrow, FileEarmarkBarGraph,
  StarFill, ChevronUp, ChevronDown, ArrowRepeat,
  FileEarmarkArrowDown,
} from "react-bootstrap-icons";

// ─── Constants ────────────────────────────────────────────────────────────────

const CHART_COLORS = ["#111827", "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444"];
const TOP3_AVATAR_COLORS = ["#111827", "#374151", "#6b7280"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rp-tooltip">
      <p className="rp-tt-label">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="rp-tt-row" style={{ color: p.color }}>
          <span className="rp-tt-dot" style={{ background: p.color }} />
          <span>{p.name}:</span>
          <span className="ms-auto fw-semibold">
            {typeof p.value === "number" && p.name?.toLowerCase().includes("revenue")
              ? `₹${p.value.toLocaleString()}`
              : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const EmptyChart = ({ height = 280, message = "No data available for this period" }: { height?: number; message?: string }) => (
  <div style={{ height, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 14, gap: 8 }}>
    <FileEarmarkBarGraph size={32} style={{ opacity: 0.3 }} />
    <span>{message}</span>
  </div>
);


// ─── Tab content components ───────────────────────────────────────────────────

interface RevenueTrendPoint { label: string; revenue: number; target: number; prev: number; }
interface ServiceItem { name: string; bookings: number; revenue: number; avgTicket: number; growth: number; color?: string; }

// ── Fill missing dates so the full period always shows (backend only returns rows with data) ──
const _DAY   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const _MON   = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const _pad2  = (n: number) => String(n).padStart(2, "0");

function buildRevenueSeries(period: string, existing: RevenueTrendPoint[]): RevenueTrendPoint[] {
  const now = new Date();
  const map = new Map(existing.map(d => [d.label.trim(), d]));
  const pts: RevenueTrendPoint[] = [];

  if (period === "7d") {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const label = _DAY[d.getDay()];
      pts.push(map.get(label) ?? { label, revenue: 0, target: 0, prev: 0 });
    }
  } else if (period === "30d") {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const label = `${_pad2(d.getDate())} ${_MON[d.getMonth()]}`;
      pts.push(map.get(label) ?? { label, revenue: 0, target: 0, prev: 0 });
    }
  } else if (period === "90d") {
    for (let i = 12; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i * 7);
      const label = `${_pad2(d.getDate())} ${_MON[d.getMonth()]}`;
      pts.push(map.get(label) ?? { label, revenue: 0, target: 0, prev: 0 });
    }
  } else if (period === "12m") {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now); d.setMonth(d.getMonth() - i);
      const label = _MON[d.getMonth()];
      pts.push(map.get(label) ?? { label, revenue: 0, target: 0, prev: 0 });
    }
  }

  return pts.length > 1 ? pts : existing;
}

// Custom active dot — glowing rings on hover
const GlowDot = (props: any) => {
  const { cx, cy } = props;
  return (
    <g>
      <circle cx={cx} cy={cy} r={12} fill="#6366f1" fillOpacity={0.08} />
      <circle cx={cx} cy={cy} r={7}  fill="#6366f1" fillOpacity={0.18} />
      <circle cx={cx} cy={cy} r={4}  fill="#6366f1" />
      <circle cx={cx} cy={cy} r={2}  fill="#fff" />
    </g>
  );
};

// Smart tooltip — shows revenue, target %, progress bar
const RevenueTrendTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const revenue = payload.find((p: any) => p.dataKey === "revenue")?.value ?? 0;
  const target  = payload.find((p: any) => p.dataKey === "target")?.value  ?? 0;
  const prev    = payload.find((p: any) => p.dataKey === "prev")?.value    ?? 0;
  const pct     = target > 0 ? Math.min((revenue / target) * 100, 200) : 0;
  const isAbove = revenue >= target;
  return (
    <div className="rp-rev-tooltip">
      <div className="rp-rev-tt-label">{label?.toUpperCase()}</div>
      <div className="rp-rev-tt-row">
        <span className="rp-rev-tt-dot" style={{ background: "#6366f1" }} />
        <span>Revenue</span>
        <span className="rp-rev-tt-val">₹{Number(revenue).toLocaleString()}</span>
      </div>
      {target > 0 && (
        <div className="rp-rev-tt-row">
          <span className="rp-rev-tt-dot" style={{ background: "#3b82f6" }} />
          <span>Target</span>
          <span className="rp-rev-tt-val">₹{Number(target).toLocaleString()}</span>
        </div>
      )}
      {prev > 0 && (
        <div className="rp-rev-tt-row">
          <span className="rp-rev-tt-dot" style={{ background: "#d1d5db" }} />
          <span>Previous</span>
          <span className="rp-rev-tt-val">₹{Number(prev).toLocaleString()}</span>
        </div>
      )}
      {target > 0 && (
        <div className="rp-rev-tt-progress">
          <div className="rp-rev-tt-prog-track">
            <div className="rp-rev-tt-prog-fill" style={{
              width: `${Math.min(pct, 100)}%`,
              background: isAbove ? "linear-gradient(90deg,#10b981,#34d399)" : "linear-gradient(90deg,#f59e0b,#fcd34d)",
            }} />
          </div>
          <span style={{ color: isAbove ? "#10b981" : "#f59e0b", fontWeight: 700, fontSize: 11 }}>
            {pct.toFixed(0)}% of target
          </span>
        </div>
      )}
    </div>
  );
};

const RevenueTab = ({
  trend,
  services,
  period,
}: {
  trend: RevenueTrendPoint[];
  services: ServiceItem[];
  period: string;
}) => {
  const [showTarget, setShowTarget] = useState(true);
  const [showPrev, setShowPrev]     = useState(true);

  // X-axis: show fewer ticks for dense periods
  const xInterval = period === "30d" ? 6 : period === "90d" ? 1 : 0;

  // Week boundary reference lines — every 7 data points for 30d
  const weekLines = period === "30d"
    ? trend.filter((_, i) => i > 0 && i % 7 === 0)
    : period === "7d"
    ? trend.filter(d => d.label === "Sat" || d.label === "Sun")
    : [];

  return (
    <div className="rp-tab-body">
      <div className="rp-main-chart-card">
        <div className="rp-chart-header">
          <div>
            <h4 className="rp-chart-title">Revenue Trend</h4>
            <p className="rp-chart-sub">Revenue vs Target vs Previous Period</p>
          </div>
          {trend.length > 0 && (
            <div className="rp-toggles">
              <Button variant="ghost" className={`rp-toggle ${showTarget ? "active" : ""}`} onClick={() => setShowTarget(v => !v)}>
                <span className="rp-tog-dot" style={{ background: "#3b82f6" }} /> Target
              </Button>
              <Button variant="ghost" className={`rp-toggle ${showPrev ? "active" : ""}`} onClick={() => setShowPrev(v => !v)}>
                <span className="rp-tog-dot" style={{ background: "#d1d5db" }} /> Previous
              </Button>
            </div>
          )}
        </div>
        {trend.length === 0 ? <EmptyChart height={280} /> : (() => {
          const avgRev = trend.reduce((s, d) => s + d.revenue, 0) / trend.length;
          return (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trend} margin={{ top: 14, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  {/* Vertical gradient fill under revenue line */}
                  <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.22} />
                    <stop offset="50%"  stopColor="#818cf8" stopOpacity={0.10} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  {/* Horizontal gradient for the revenue stroke */}
                  <linearGradient id="revLineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%"   stopColor="#6366f1" />
                    <stop offset="60%"  stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                  <linearGradient id="gTgt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#3b82f6" stopOpacity={0.08} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} interval={xInterval} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                  tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} width={48} />
                <Tooltip content={<RevenueTrendTooltip />} cursor={{ stroke: "#6366f1", strokeWidth: 1, strokeDasharray: "4 4" }} />
                {/* Week boundary lines */}
                {weekLines.map((d, wi) => (
                  <ReferenceLine key={d.label} x={d.label} stroke="#e5e7eb" strokeWidth={1}
                    label={{ value: period === "30d" ? `W${wi + 2}` : d.label, position: "insideTopLeft", fontSize: 9, fill: "#c4b5fd" }} />
                ))}
                {/* Average reference line */}
                <ReferenceLine y={avgRev} stroke="#10b981" strokeDasharray="6 3" strokeWidth={1.5}
                  label={{ value: "Avg", position: "insideTopRight", fontSize: 10, fill: "#10b981" }} />
                {showPrev && (
                  <Area type="monotone" dataKey="prev" name="Previous" stroke="#d1d5db"
                    strokeWidth={1.5} strokeDasharray="4 4" fill="none" dot={false} />
                )}
                {showTarget && (
                  <Area type="monotone" dataKey="target" name="Target" stroke="#3b82f6"
                    strokeWidth={1.5} strokeDasharray="5 3" fill="url(#gTgt)" dot={false} />
                )}
                <Area type="monotone" dataKey="revenue" name="Revenue"
                  stroke="url(#revLineGrad)" strokeWidth={3}
                  fill="url(#gRev)" dot={false}
                  activeDot={<GlowDot />} />
              </AreaChart>
            </ResponsiveContainer>
          );
        })()}
      </div>

      <div className="rp-two-col">
        {(() => {
          const sorted     = [...services].sort((a, b) => b.revenue - a.revenue);
          const top3       = sorted.slice(0, 3);
          const othersRev  = sorted.slice(3).reduce((s, x) => s + x.revenue, 0);
          const totalRev   = services.reduce((s, x) => s + x.revenue, 0);
          const pieData: ServiceItem[] = [
            ...top3,
            ...(othersRev > 0 ? [{ name: "Others", revenue: othersRev, bookings: 0, avgTicket: 0, growth: 0, color: "#e5e7eb" }] : []),
          ];

          const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value }: any) => {
            if (totalRev === 0 || value === 0) return null;
            const pct = ((value / totalRev) * 100);
            if (pct < 5) return null;
            const RADIAN = Math.PI / 180;
            const r = innerRadius + (outerRadius - innerRadius) * 0.52;
            const x = cx + r * Math.cos(-midAngle * RADIAN);
            const y = cy + r * Math.sin(-midAngle * RADIAN);
            return (
              <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
                {pct.toFixed(0)}%
              </text>
            );
          };

          return (
            <>
              <div className="rp-chart-card">
                <h4 className="rp-chart-title">Revenue by Service</h4>
                <p className="rp-chart-sub">Top 3 by contribution</p>
                {top3.length === 0 ? <EmptyChart height={220} /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={top3} layout="vertical" margin={{ top: 0, right: 52, left: 0, bottom: 0 }} barSize={14}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                        tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#374151" }} axisLine={false} tickLine={false} width={80} />
                      <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString()}`, "Revenue"]} />
                      <Bar dataKey="revenue" name="Revenue" radius={[0, 4, 4, 0]}
                        label={{ position: "right", formatter: (v: any) => totalRev > 0 ? `${((v / totalRev) * 100).toFixed(0)}%` : "", fontSize: 11, fill: "#6b7280" }}>
                        {top3.map((s, i) => <Cell key={s.name} fill={s.color ?? CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="rp-chart-card">
                <h4 className="rp-chart-title">Revenue Distribution</h4>
                <p className="rp-chart-sub">Top 3 service share</p>
                {pieData.length === 0 ? <EmptyChart height={220} /> : (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={82}
                          paddingAngle={2} dataKey="revenue" labelLine={false} label={renderPieLabel}>
                          {pieData.map((s, i) => <Cell key={s.name} fill={s.color ?? CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString()}`, "Revenue"]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="rp-pie-legend">
                      {pieData.map((s, i) => {
                        const pct = totalRev > 0 ? ((s.revenue / totalRev) * 100).toFixed(0) : "0";
                        return (
                          <div key={s.name} className="rp-pie-row">
                            <span className="rp-pie-dot" style={{ background: s.color ?? CHART_COLORS[i % CHART_COLORS.length] }} />
                            <span style={{ flex: 1 }}>{s.name}</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{pct}%</span>
                            <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 6 }}>₹{(s.revenue/1000).toFixed(1)}k</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
};

interface ApptVolumePoint { label: string; completed: number; cancelled: number; noShow: number; }
interface PeakHour { hour: string; count: number; }

const AppointmentsTab = ({ volume, peakHours }: { volume: ApptVolumePoint[]; peakHours: PeakHour[] }) => (
  <div className="rp-tab-body">
    <div className="rp-main-chart-card">
      <div className="rp-chart-header">
        <div>
          <h4 className="rp-chart-title">Appointment Volume</h4>
          <p className="rp-chart-sub">Completed · Cancelled · No-Show breakdown</p>
        </div>
        <div className="rp-legend-row">
          {[["#111827","Completed"],["#d1d5db","Cancelled"],["#fecaca","No-Show"]].map(([c,l]) => (
            <span key={l} className="rp-leg-item"><span className="rp-pie-dot" style={{ background: c }} />{l}</span>
          ))}
        </div>
      </div>
      {volume.length === 0 ? <EmptyChart height={280} /> : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={volume} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={14} barGap={3}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="completed" name="Completed" fill="#111827" radius={[4,4,0,0]} stackId="a" />
            <Bar dataKey="cancelled" name="Cancelled" fill="#d1d5db" radius={[0,0,0,0]} stackId="a" />
            <Bar dataKey="noShow"    name="No-Show"   fill="#fecaca" radius={[4,4,0,0]} stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>

    <div className="rp-two-col">
      <div className="rp-chart-card">
        <h4 className="rp-chart-title">Peak Hours</h4>
        <p className="rp-chart-sub">Busiest time slots</p>
        {peakHours.length === 0 ? <EmptyChart height={220} message="No peak hours data available" /> : (() => {
          const max = Math.max(...peakHours.map(h => h.count), 1);
          return (
            <div className="rp-heatmap">
              {peakHours.map(({ hour, count }) => {
                const pct = Math.round((count / max) * 100);
                return (
                  <div key={hour} className="rp-heat-row">
                    <span className="rp-heat-label">{hour}</span>
                    <div className="rp-heat-bar-track">
                      <div className="rp-heat-bar" style={{ width: `${pct}%`, opacity: 0.4 + pct / 200 }} />
                    </div>
                    <span className="rp-heat-val">{count}</span>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
      <div className="rp-chart-card">
        <h4 className="rp-chart-title">Booking Source</h4>
        <p className="rp-chart-sub">Walk-in · Online · Phone</p>
        <EmptyChart height={200} message="Booking source data coming soon" />
      </div>
    </div>
  </div>
);

interface ClientGrowthPoint { label: string; new: number; returning: number; churned: number; }
interface TopClientItem { id: string | number; name: string; visits: number; spend: number; }

const ClientsTab = ({
  growth,
  topClients,
}: {
  growth: ClientGrowthPoint[];
  topClients: TopClientItem[];
}) => (
  <div className="rp-tab-body">
    <div className="rp-main-chart-card">
      <div className="rp-chart-header">
        <div>
          <h4 className="rp-chart-title">Client Growth</h4>
          <p className="rp-chart-sub">New · Returning · Churned</p>
        </div>
      </div>
      {growth.length === 0 ? <EmptyChart height={280} /> : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={growth} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              {[["gNew","#10b981"],["gRet","#3b82f6"],["gChu","#ef4444"]].map(([id,c]) => (
                <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={c} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={c} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="churned"   name="Churned"   stroke="#ef4444" strokeWidth={2} fill="url(#gChu)" dot={false} />
            <Area type="monotone" dataKey="new"       name="New"       stroke="#10b981" strokeWidth={2} fill="url(#gNew)" dot={false} />
            <Area type="monotone" dataKey="returning" name="Returning" stroke="#3b82f6" strokeWidth={2} fill="url(#gRet)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
    <div className="rp-two-col">
      <div className="rp-chart-card">
        <h4 className="rp-chart-title">Retention Funnel</h4>
        <p className="rp-chart-sub">Client visit frequency</p>
        <EmptyChart height={220} message="Retention data coming soon" />
      </div>
      <div className="rp-chart-card">
        <h4 className="rp-chart-title">Top Clients</h4>
        <p className="rp-chart-sub">By total spend</p>
        {topClients.length === 0 ? <EmptyChart height={220} message="No client data available" /> : (
          <div className="rp-rank-list">
            {topClients.map((c, i) => {
              const initials = c.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
              return (
                <div key={c.id ?? c.name} className="rp-rank-row">
                  <span className="rp-rank-num">#{i + 1}</span>
                  <div className="rp-rank-av">{initials}</div>
                  <div className="rp-rank-info">
                    <div className="rp-rank-name">{c.name}</div>
                    <div className="rp-rank-sub">{c.visits} visits</div>
                  </div>
                  <span className="rp-rank-val">₹{c.spend.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  </div>
);


interface StaffItem {
  id?: string | number;
  name: string;
  bookings: number;
  revenue: number;
  serviceRevenue: number;
  productRevenue: number;
  servicesSold: number;
  productsSold: number;
  customerCount: number;
  avgTicket: number;
  color?: string;
}

type StaffSortKey = "revenue" | "servicesSold" | "productsSold" | "bookings" | "avgTicket";

// Helper: convert period key to start/end dates
function periodToDates(period: ReportPeriod, filterFrom?: string, filterTo?: string): { from: string; to: string } {
  if (filterFrom && filterTo) return { from: filterFrom, to: filterTo };
  const to  = new Date().toISOString().slice(0, 10);
  const days = period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : 365;
  const from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  return { from, to };
}

const StaffTab = ({
  radarStaff: _radarStaff,
  period,
  filterFrom,
  filterTo,
}: {
  radarStaff: Array<{ metric: string; [key: string]: string | number }>;
  period: ReportPeriod;
  filterFrom?: string;
  filterTo?: string;
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const currentSalon = useSelector(selectCurrentSalon);
  const salonId = currentSalon?.id;
  const reduxStaff = useSelector((state: RootState) => (state.staff as any).items as any[]);
  // Report endpoint already joins staff names server-side — use it for the Top 3 card and revenue chart
  const reportPerformance = useSelector((state: RootState) => ((state as any).report?.staff?.performance ?? []) as any[]);

  const [sortBy,      setSortBy]     = useState<StaffSortKey>("revenue");
  const [staffData,   setStaffData]  = useState<StaffItem[]>([]);
  const [loading,     setLoading]    = useState(false);
  const [lbPage,      setLbPage]     = useState(1);
  const [lbPageSize,  setLbPageSize] = useState(10);
  const abortRef = useRef<AbortController | null>(null);

  // ── Fetch appointments + quick sales, aggregate by staff ──────────────────
  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const { from, to } = periodToDates(period, filterFrom, filterTo);
      const apptParams = new URLSearchParams({ start_date: from, end_date: to, limit: "500" });
      const saleParams = new URLSearchParams({ start_date: from, end_date: to, limit: "500" });

      const staffParams = new URLSearchParams();
      if (salonId) staffParams.set("salon_id", String(salonId));

      const [apptRes, saleRes, staffRes] = await Promise.all([
        api.get(`${BOOKING.BASE}?${apptParams}`, { signal: ctrl.signal }),
        api.get(`${SALE.BASE}?${saleParams}`,    { signal: ctrl.signal }),
        api.get(`${STAFF.BASE}?${staffParams}`,  { signal: ctrl.signal }),
      ]);

      // Merge direct API staff + Redux staff cache (two sources → more IDs covered)
      const staffApiData = staffRes.data?.data;
      const staffApiList: any[] = Array.isArray(staffApiData?.items) ? staffApiData.items
        : Array.isArray(staffApiData) ? staffApiData : [];
      const reduxStaffList: any[] = Array.isArray(reduxStaff) ? reduxStaff : [];
      const staffByIdMap = new Map<string, any>();
      [...reduxStaffList, ...staffApiList].forEach(s => staffByIdMap.set(String(s.id), s));
      const staffList: any[] = Array.from(staffByIdMap.values());

      // Build staff name map — key by EVERY id/uuid field the appointment may use.
      // Also scan ALL string/number values on each staff object so we catch
      // whichever field the backend uses as the auth UUID (user_id, uuid, auth_id, etc.)
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const staffNameMap = new Map<string, string>();
      // canonical name → staff.id (used later to merge unknown entries)
      const nameToId     = new Map<string, string>();

      staffList.forEach((s: any) => {
        const name = `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.fullName || s.name || "";
        if (!name) return;
        // Named explicit fields first
        [s.id, s.user_id, s.uuid, s.staff_id, s.staff_uuid, s.userId, s.staffId, s.auth_id, s.auth_user_id, s.user?.id]
          .filter(Boolean)
          .forEach(uid => staffNameMap.set(String(uid), name));
        // Then scan ALL values on the object — catches any field the API uses as auth UUID
        Object.values(s).forEach(val => {
          if (typeof val === "string" && (UUID_RE.test(val) || /^\d+$/.test(val))) {
            staffNameMap.set(val, name);
          } else if (typeof val === "number") {
            staffNameMap.set(String(val), name);
          }
        });
        nameToId.set(name.toLowerCase().trim(), String(s.id));
      });

      // Helper: resolve name from map → inline appt fields → "Unknown Staff"
      const resolveName = (sid: string, appt?: any): string => {
        if (staffNameMap.has(sid)) return staffNameMap.get(sid)!;
        if (appt) {
          const inline =
            `${appt.staff_first_name ?? ""} ${appt.staff_last_name ?? ""}`.trim()
            || appt.staff_name
            || appt.staff?.name
            || appt.staff?.full_name
            || `${appt.staff?.first_name ?? ""} ${appt.staff?.last_name ?? ""}`.trim();
          if (inline) {
            staffNameMap.set(sid, inline); // cache so next appt for same sid resolves too
            return inline;
          }
        }
        return "Unknown Staff";
      };

      interface Agg {
        name: string; bookings: number; revenue: number;
        serviceRevenue: number; productRevenue: number;
        servicesSold: number; productsSold: number; customerIds: Set<string>;
        color?: string;
      }
      const agg = new Map<string, Agg>();

      const getOrCreate = (sid: string, name: string): Agg => {
        if (!agg.has(sid)) agg.set(sid, { name, bookings: 0, revenue: 0, serviceRevenue: 0, productRevenue: 0, servicesSold: 0, productsSold: 0, customerIds: new Set() });
        // Update name if we now have a real name (not UUID / "Unknown Staff")
        else if (agg.get(sid)!.name === "Unknown Staff" && name !== "Unknown Staff") {
          agg.get(sid)!.name = name;
        }
        return agg.get(sid)!;
      };

      // ── Process appointments ──────────────────────────────────────────────
      const rawAppt = apptRes.data?.data;
      const appts: any[] =
        Array.isArray(rawAppt?.items) ? rawAppt.items :
        Array.isArray(rawAppt?.data)  ? rawAppt.data  :
        Array.isArray(rawAppt)        ? rawAppt        : [];
      appts.forEach((appt: any) => {
        const sid = String(appt.staff_id ?? appt.staffId ?? "");
        if (!sid || sid === "undefined" || sid === "null") return;
        const name = resolveName(sid, appt);
        const e = getOrCreate(sid, name);

        const svcItems:  any[] = Array.isArray(appt.services)      ? appt.services      : [];
        const prodItems: any[] = Array.isArray(appt.product_items) ? appt.product_items : [];
        const pkgItems:  any[] = Array.isArray(appt.package_items) ? appt.package_items : [];

        const svcRev  = svcItems.reduce( (s: number, it: any) => s + (parseFloat(String(it.price ?? 0)) || 0), 0);
        const prodRev = prodItems.reduce((s: number, it: any) => s + (parseFloat(String(it.price ?? 0)) || 0) * (Number(it.quantity ?? it.qty ?? 1) || 1), 0);
        const pkgRev  = pkgItems.reduce( (s: number, it: any) => s + (parseFloat(String(it.price ?? 0)) || 0), 0);
        const computedTotal = svcRev + prodRev + pkgRev;
        const total = parseFloat(String(appt.grand_total ?? appt.total_amount ?? appt.grandTotal ?? 0)) || computedTotal;

        e.bookings       += 1;
        e.revenue        += total;
        e.serviceRevenue += svcRev + pkgRev;
        e.productRevenue += prodRev;
        e.servicesSold   += svcItems.length + pkgItems.length || 1;
        e.productsSold   += prodItems.reduce((s: number, it: any) => s + (Number(it.quantity ?? it.qty ?? 1) || 1), 0);
        const cid = String(appt.client_id ?? appt.customer_id ?? appt.clientId ?? "");
        if (cid && cid !== "undefined" && cid !== "null") e.customerIds.add(cid);
      });

      // ── Process quick sales ───────────────────────────────────────────────
      const rawSales = saleRes.data?.data;
      const sales: any[] =
        Array.isArray(rawSales?.items) ? rawSales.items :
        Array.isArray(rawSales?.data)  ? rawSales.data  :
        Array.isArray(rawSales)        ? rawSales        : [];
      sales.forEach((sale: any) => {
        const items: any[] = Array.isArray(sale.items) ? sale.items : [];
        items.forEach((it: any) => {
          const sid = String(it.staff_id ?? "");
          if (!sid || sid === "undefined" || sid === "null") return;
          const name = staffNameMap.get(sid) || it.staff_name || "Unknown Staff";
          const e = getOrCreate(sid, name);

          const qty   = Number(it.quantity ?? 1) || 1;
          const price = parseFloat(String(it.total_price ?? it.unit_price ?? 0)) || 0;
          const type  = String(it.item_type ?? "");

          e.revenue += price;
          if (type === "service") { e.serviceRevenue += price; e.servicesSold += qty; }
          else if (type === "product") { e.productRevenue += price; e.productsSold += qty; }
          else { e.serviceRevenue += price; e.servicesSold += qty; }

          const cid = String(sale.client_id ?? "");
          if (cid && cid !== "undefined" && cid !== "null") e.customerIds.add(cid);
        });
      });

      // Ensure every staff member appears and names are resolved.
      // Match existing agg entries by: any known ID field OR by name (for entries
      // whose name was resolved from inline appointment fields).
      staffList.forEach((s: any) => {
        const name = `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.fullName || s.name || "—";
        const knownKeys = [s.id, s.user_id, s.uuid, s.staff_id, s.staff_uuid, s.userId, s.auth_id, s.auth_user_id, s.user?.id]
          .filter(Boolean).map(String);
        // Also collect all UUID-like values on the staff object
        Object.values(s).forEach(val => {
          if (typeof val === "string" && (UUID_RE.test(val) || /^\d+$/.test(val))) knownKeys.push(val);
          else if (typeof val === "number") knownKeys.push(String(val));
        });

        let existingKey = knownKeys.find(k => agg.has(k));

        // Fallback: match by resolved name (covers inline-resolved "Unknown" entries)
        if (!existingKey) {
          for (const [k, v] of agg.entries()) {
            if (v.name.toLowerCase().trim() === name.toLowerCase().trim()) {
              existingKey = k;
              break;
            }
          }
        }

        if (existingKey) {
          const e = agg.get(existingKey)!;
          if (e.name === "Unknown Staff" || !e.name) e.name = name;
        } else {
          agg.set(String(s.id), { name, bookings: 0, revenue: 0, serviceRevenue: 0, productRevenue: 0, servicesSold: 0, productsSold: 0, customerIds: new Set() });
        }
      });

      // Remove any remaining "Unknown Staff" duplicates that were superseded by named entries
      // (can happen when agg has both an auth-UUID key and an s.id key for same person)
      const seenNames = new Set<string>();
      for (const [k, v] of Array.from(agg.entries())) {
        const nameLc = v.name.toLowerCase().trim();
        if (nameLc === "unknown staff") continue;
        if (seenNames.has(nameLc)) {
          // Duplicate named entry — keep the one with more data (higher revenue)
          const canonicalKey = nameToId.get(nameLc);
          if (canonicalKey && k !== canonicalKey && agg.has(canonicalKey)) {
            const canon = agg.get(canonicalKey)!;
            const dup   = agg.get(k)!;
            // Merge dup into canon if dup has more data
            if (dup.revenue > canon.revenue) {
              canon.bookings      += dup.bookings;
              canon.revenue       += dup.revenue;
              canon.serviceRevenue+= dup.serviceRevenue;
              canon.productRevenue+= dup.productRevenue;
              canon.servicesSold  += dup.servicesSold;
              canon.productsSold  += dup.productsSold;
              dup.customerIds.forEach(id => canon.customerIds.add(id));
            }
            agg.delete(k);
          }
        } else {
          seenNames.add(nameLc);
        }
      }

      // ── Last-resort: fetch individual staff by ID for any still-unknown entries ──
      // Works when staff_id in appointments is the staff entity's primary-key ID.
      const unknownSids = Array.from(agg.entries())
        .filter(([, v]) => (v.name === "Unknown Staff" || !v.name) && (v.bookings > 0 || v.revenue > 0))
        .map(([k]) => k)
        .filter(sid => sid && sid !== "undefined" && sid !== "null")
        .slice(0, 20); // safety cap

      if (unknownSids.length > 0 && !ctrl.signal.aborted) {
        const lookups = await Promise.allSettled(
          unknownSids.map(sid =>
            api.get(STAFF.BY_ID(sid), { signal: ctrl.signal })
              .then((r: any) => ({ sid, staff: r.data?.data }))
              .catch(() => ({ sid, staff: null }))
          )
        );
        lookups.forEach(r => {
          if (r.status === "fulfilled" && r.value.staff) {
            const s = r.value.staff;
            const name = `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim()
              || s.fullName || s.full_name || s.name || "";
            if (name) {
              const e = agg.get(r.value.sid);
              if (e) e.name = name;
              staffNameMap.set(r.value.sid, name);
            }
          }
        });
      }

      const result: StaffItem[] = Array.from(agg.values()).map((e, i) => ({
        name:           e.name,
        bookings:       e.bookings,
        revenue:        Math.round(e.revenue),
        serviceRevenue: Math.round(e.serviceRevenue),
        productRevenue: Math.round(e.productRevenue),
        servicesSold:   e.servicesSold,
        productsSold:   e.productsSold,
        customerCount:  e.customerIds.size,
        avgTicket:      e.bookings > 0 ? Math.round(e.revenue / e.bookings) : 0,
        color:          CHART_COLORS[i % CHART_COLORS.length],
      }));

      setStaffData(result);
    } catch (err: any) {
      if (err?.code !== "ERR_CANCELED" && err?.name !== "CanceledError") setStaffData([]);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [period, filterFrom, filterTo, salonId, reduxStaff, dispatch]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sorted = useMemo(
    () => [...staffData].sort((a, b) => (b[sortBy] ?? 0) - (a[sortBy] ?? 0)),
    [staffData, sortBy],
  );

  // Reset to page 1 whenever sort or underlying data changes
  useEffect(() => { setLbPage(1); }, [sortBy, staffData]);

  const lbTotalPages = Math.ceil(sorted.length / lbPageSize);
  const lbRows = sorted.slice((lbPage - 1) * lbPageSize, lbPage * lbPageSize);

  const SORT_OPTIONS: { key: StaffSortKey; label: string }[] = [
    { key: "revenue",      label: "Highest Revenue"    },
    { key: "servicesSold", label: "Most Services Sold" },
    { key: "productsSold", label: "Most Products Sold" },
    { key: "bookings",     label: "Most Bookings"      },
    { key: "avgTicket",    label: "Highest Avg Ticket" },
  ];

  // helper: human-readable short label for a staff entry (works even if name unresolved)
  const staffLabel = (s: StaffItem, rank: number): string => {
    if (!s.name || s.name === "Unknown Staff" || s.name === "—") return `Staff #${rank}`;
    const parts = s.name.trim().split(/\s+/);
    return parts.length >= 2 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
  };


  const derivedKpis = useMemo(() => {
    const active = sorted.filter(s => s.bookings > 0 || s.revenue > 0);
    const totalRevenue  = sorted.reduce((sum, s) => sum + s.revenue, 0);
    const totalBookings = sorted.reduce((sum, s) => sum + s.bookings, 0);
    const totalServices = sorted.reduce((sum, s) => sum + s.servicesSold, 0);
    const totalProducts = sorted.reduce((sum, s) => sum + s.productsSold, 0);
    const topStaff = [...sorted].sort((a, b) => b.revenue - a.revenue)[0];
    return { totalRevenue, totalBookings, totalServices, totalProducts, activeCount: active.length, topStaff };
  }, [sorted]);

  const top3ByRevenue = useMemo(() =>
    [...sorted]
      .sort((a, b) => b.revenue - a.revenue)
      .filter(s => s.revenue > 0 || s.bookings > 0)
      .slice(0, 3),
  [sorted]);

  const revenueByStaffData = useMemo(() =>
    [...sorted]
      .sort((a, b) => b.revenue - a.revenue)
      .filter(s => s.revenue > 0)
      .slice(0, 6)
      // eslint-disable-next-line react-hooks/exhaustive-deps
      .map((s, i) => ({ name: staffLabel(s, i + 1), revenue: s.revenue })),
  [sorted]);

  // Use report endpoint data (server-joined names) for Top 3 card and revenue chart
  const fmtReportName = (name: string): string => {
    if (!name) return "—";
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
  };

  const top3FromReport = useMemo(() =>
    [...reportPerformance]
      .filter((s: any) => (s.revenue ?? 0) > 0 || (s.bookings ?? 0) > 0)
      .sort((a: any, b: any) => (b.revenue ?? 0) - (a.revenue ?? 0))
      .slice(0, 3),
  [reportPerformance]);

  const revenueByStaffFromReport = useMemo(() =>
    [...reportPerformance]
      .filter((s: any) => (s.revenue ?? 0) > 0)
      .sort((a: any, b: any) => (b.revenue ?? 0) - (a.revenue ?? 0))
      .slice(0, 6)
      .map((s: any) => ({ name: fmtReportName(s.name), revenue: s.revenue ?? 0 })),
  [reportPerformance]);

  const fmtRev = (v: number) =>
    v >= 10000000 ? `₹${(v/10000000).toFixed(1)}Cr`
    : v >= 100000  ? `₹${(v/100000).toFixed(1)}L`
    : v >= 1000    ? `₹${(v/1000).toFixed(0)}k`
    : `₹${v}`;

  return (
  <div className="rp-tab-body">

    <div className="rp-two-col">
      {/* ── Top 3 Staff Performers ── */}
      <div className="rp-chart-card rp-top3-card">
        <div className="rp-top3-header">
          <div className="rp-top3-title-row">
            <span className="rp-top3-trophy">🏆</span>
            <h4 className="rp-chart-title mb-0">Top 3 Staff Performers</h4>
          </div>
        </div>
        {top3FromReport.length === 0
          ? <EmptyChart height={220} message={loading ? "Loading…" : "No data yet"} />
          : (
          <>
            {top3FromReport.map((s: any, i: number) => {
              const initials = (s.name ?? "").trim().split(/\s+/).filter(Boolean)
                .map((w: string) => w[0]).join("").toUpperCase().slice(0, 2) || String(i + 1);
              return (
                <div key={`top3-${i}`} className="rp-top3-row">
                  <div className="rp-top3-avatar" style={{ background: TOP3_AVATAR_COLORS[i] }}>
                    {initials}
                  </div>
                  <div className="rp-top3-info">
                    <div className="rp-top3-name">{fmtReportName(s.name ?? "")}</div>
                    <div className="rp-top3-stats">
                      <div className="rp-top3-stat">
                        <span className="rp-top3-stat-label">Revenue</span>
                        <span className="rp-top3-stat-val rp-top3-stat-val--rev">{fmtRev(s.revenue ?? 0)}</span>
                      </div>
                      <div className="rp-top3-stat">
                        <span className="rp-top3-stat-label">Bookings</span>
                        <span className="rp-top3-stat-val">{s.bookings ?? 0}</span>
                      </div>
                      <div className="rp-top3-stat">
                        <span className="rp-top3-stat-label">Avg Ticket</span>
                        <span className="rp-top3-stat-val">{fmtRev(s.avgTicket ?? 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="rp-top3-footer">
              <span className="rp-top3-footer-text">Showing top earners this period</span>
            </div>
          </>
        )}
      </div>

      {/* ── Revenue by Staff (vertical bars, one color per staff) ── */}
      <div className="rp-chart-card rp-chart-card-tall">
        <div className="rp-chart-head-row">
          <div>
            <h4 className="rp-chart-title mb-0">Revenue by Staff</h4>
            <p className="rp-chart-sub mb-0">Top earners this period</p>
          </div>
        </div>
        {revenueByStaffFromReport.length === 0
          ? <EmptyChart height={260} message={loading ? "Loading…" : "No revenue data yet"} />
          : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={revenueByStaffFromReport} margin={{ top: 28, right: 8, left: 0, bottom: 0 }} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={48}
                tickFormatter={v => v >= 100000 ? `₹${(v/100000).toFixed(0)}L` : v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : v > 0 ? `₹${v}` : "₹0"} />
              <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString("en-IN")}`, "Revenue"]} />
              <Bar dataKey="revenue" radius={[4, 4, 0, 0]} fill="#111827"
                label={{ position: "top", formatter: (v: any) => `₹${Number(v).toLocaleString("en-IN")}`, fontSize: 10, fill: "#374151" }} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>

    {/* ── Leaderboard ── */}
    <div className="rp-staff-table-card">
      <div className="rp-staff-leaderboard-header">
        <div>
          <h4 className="rp-chart-title mb-0">Staff Leaderboard</h4>
          <p className="rp-chart-sub mb-0">{loading ? "Loading…" : `${sorted.length} staff member${sorted.length !== 1 ? "s" : ""}`}</p>
        </div>
        <div className="rp-staff-sort-bar">
          {SORT_OPTIONS.map(o => (
            <button key={o.key}
              className={`rp-sort-pill ${sortBy === o.key ? "active" : ""}`}
              onClick={() => setSortBy(o.key)}
            >{o.label}</button>
          ))}
        </div>
      </div>

      {loading ? <div style={{ padding: "40px 0", textAlign: "center" }}><PageLoader /></div>
       : sorted.length === 0 ? <EmptyChart height={200} message="No staff data available" />
       : (
        <>
        <div className="rp-leaderboard-scroll">
          <table className="rp-leaderboard-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Bookings</th>
                <th>Services Sold</th>
                <th>Products Sold</th>
                <th>Service Revenue</th>
                <th>Product Revenue</th>
                <th>Total Revenue</th>
                <th>Avg Ticket</th>
                <th>Customers</th>
              </tr>
            </thead>
            <tbody>
              {lbRows.map((s, i) => {
                const globalIdx = (lbPage - 1) * lbPageSize + i;
                const color = s.color ?? CHART_COLORS[globalIdx % CHART_COLORS.length];
                const initials = s.name.split(/\s+/).filter(Boolean).map(w => w[0]).join("").toUpperCase().slice(0, 2);
                return (
                  <tr key={`${s.name}-${globalIdx}`} className={globalIdx === 0 ? "rp-lb-top" : ""}>
                    <td className="rp-lb-rank">#{globalIdx + 1}</td>
                    <td>
                      <div className="rp-lb-name-cell">
                        <span className="rp-sm-av" style={{ background: color }}>{initials}</span>
                        <span className="rp-lb-name">{s.name}</span>
                      </div>
                    </td>
                    <td>{s.bookings}</td>
                    <td>{s.servicesSold ?? 0}</td>
                    <td>{s.productsSold ?? 0}</td>
                    <td>₹{(s.serviceRevenue ?? 0).toLocaleString("en-IN")}</td>
                    <td>₹{(s.productRevenue ?? 0).toLocaleString("en-IN")}</td>
                    <td className="rp-lb-total">₹{s.revenue.toLocaleString("en-IN")}</td>
                    <td>₹{s.avgTicket.toLocaleString("en-IN")}</td>
                    <td>{s.customerCount ?? s.bookings}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {lbTotalPages > 1 && (
          <Pagination
            currentPage={lbPage}
            pageSize={lbPageSize}
            totalItems={sorted.length}
            onPageChange={setLbPage}
            onPageSizeChange={(sz) => { setLbPageSize(sz); setLbPage(1); }}
            pageSizeOptions={[10, 25, 50]}
          />
        )}
        </>
      )}
    </div>
  </div>
  );
};

const ServicesTab = ({ services }: { services: ServiceItem[] }) => {
  const [sort, setSort] = useState<"revenue"|"bookings">("revenue");
  const sorted = useMemo(() =>
    [...services].sort((a,b) => b[sort] - a[sort]), [services, sort]);

  return (
    <div className="rp-tab-body">
      <div className="rp-main-chart-card">
        <div className="rp-chart-header">
          <div>
            <h4 className="rp-chart-title">Service Performance</h4>
            <p className="rp-chart-sub">Revenue and booking count per service</p>
          </div>
          {services.length > 0 && (
            <div className="rp-toggles">
              <Button variant="ghost" className={`rp-toggle ${sort==="revenue" ? "active":""}`} onClick={() => setSort("revenue")}>By Revenue</Button>
              <Button variant="ghost" className={`rp-toggle ${sort==="bookings"? "active":""}`} onClick={() => setSort("bookings")}>By Bookings</Button>
            </div>
          )}
        </div>
        {services.length === 0 ? <EmptyChart height={260} /> : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={sorted} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                tickFormatter={v => sort==="revenue" ? `₹${(v/1000).toFixed(0)}k` : `${v}`} />
              <Tooltip formatter={(v: any, n?: string | number) =>
                n==="Revenue" ? `₹${Number(v).toLocaleString()}` : v} />
              <Bar dataKey={sort} name={sort==="revenue"?"Revenue":"Bookings"} radius={[6,6,0,0]}>
                {sorted.map((s, i) => <Cell key={s.name} fill={s.color ?? CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      {services.length > 0 && (
        <div className="rp-services-grid">
          {services.map((s, i) => (
            <div key={s.name} className="rp-svc-card">
              <div className="rp-svc-top">
                <span className="rp-svc-dot" style={{ background: s.color ?? CHART_COLORS[i % CHART_COLORS.length] }} />
                <span className="rp-svc-name">{s.name}</span>
                <span className={`rp-svc-badge ${s.growth >= 0 ? "up" : "down"}`}>
                  {s.growth >= 0 ? <ArrowUpRight size={11}/> : <ArrowDownRight size={11}/>}
                  {Math.abs(s.growth)}%
                </span>
              </div>
              <div className="rp-svc-rev">₹{(s.revenue/1000).toFixed(0)}k</div>
              <div className="rp-svc-meta">
                <span>{s.bookings} bookings</span>
                <span>₹{s.avgTicket} avg</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Appointment report detail ────────────────────────────────────────────────

interface AppointmentRow {
  id: string;
  appointmentDate: string;
  time: string;
  bookedDate: string;
  clientName: string;
  serviceName: string;
  staffName: string;
  status: string;
  duration: number;
  amount: number;
  paymentMethod: string;
  paymentStatus: string;
}


const DATE_TYPE_OPTIONS  = ["Appointment Date", "Booking Date"];
const APPT_STATUSES      = ["All", "booked", "confirmed", "in_progress", "completed", "cancelled", "no_show"];
const fmtStatusLabel = (s: string) =>
  s === "All" ? "All" : s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

const AppsNavButton = () => {
  const navigate = useNavigate();
  return (
    <button className="rp-detail-icon-btn" title="Apps" onClick={() => navigate("/dashboard/apps")}>
      <Grid3x3Gap size={16} />
    </button>
  );
};

const AppointmentReportDetail = ({ report, onBack }: { report: ReportItem; onBack: () => void }) => {
  const today     = new Date().toISOString().slice(0, 10);
  const monthAgo  = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const navigate = useNavigate();
  const abortRef = useRef<AbortController | null>(null);
  const [dateType,          setDateType]          = useState(DATE_TYPE_OPTIONS[0]);
  const [showDtDrop,        setShowDtDrop]        = useState(false);
  const [dateFrom,          setDateFrom]          = useState(monthAgo);
  const [dateTo,            setDateTo]            = useState(today);
  const [selectedStatuses,  setSelectedStatuses]  = useState<string[]>(APPT_STATUSES);
  const [statusSearch,      setStatusSearch]      = useState("");
  const [showStatusDrop,    setShowStatusDrop]    = useState(false);
  const [rows,              setRows]              = useState<AppointmentRow[]>([]);
  const [loading,           setLoading]           = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(10);
  const [selectedRow,       setSelectedRow]       = useState<AppointmentRow | null>(null);
  useEffect(() => { setCurrentPage(1); }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        dateType: dateType === "Appointment Date" ? "appointment" : "booking",
        from: dateFrom,
        to: dateTo,
        statuses: selectedStatuses.filter(s => s !== "All").join(","),
      });
      const res = await api.get<{ data: AppointmentRow[] }>(
        REPORT.DETAIL("appointments", params.toString()),
        { signal: ctrl.signal },
      );
      if (res.data?.data) setRows(res.data.data);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") setRows([]);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateType, dateFrom, dateTo, selectedStatuses]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const close = () => {
      setShowDtDrop(false);
      setShowStatusDrop(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const handleRefresh = () => { fetchData(); };

  const APPT_HEADERS = ["Appointment Date", "Time", "Booked Date", "Client Name", "Service Name", "Staff Name", "Status", "Duration (min)", "Amount (₹)", "Payment Method", "Payment Status"];
  const apptRows = () => rows.map(r => [r.appointmentDate, r.time, r.bookedDate, r.clientName, r.serviceName, r.staffName, r.status, r.duration, r.amount, r.paymentMethod, r.paymentStatus]);

  const toggleStatus = (s: string) => {
    if (s === "All") {
      setSelectedStatuses(selectedStatuses.length === APPT_STATUSES.length ? [] : [...APPT_STATUSES]);
    } else {
      setSelectedStatuses(prev =>
        prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
      );
    }
  };

  const statusLabel = selectedStatuses.length === APPT_STATUSES.length
    ? `All selected (${APPT_STATUSES.length - 1})`
    : selectedStatuses.length === 0 ? "None selected"
    : `${selectedStatuses.filter(s => s !== "All").length} selected`;

  const filteredStatuses = APPT_STATUSES.filter(s =>
    fmtStatusLabel(s).toLowerCase().includes(statusSearch.toLowerCase())
  );

  return (
    <div className="rp-detail-view">

      {/* ── Detail header ── */}
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Button variant="ghost" className="rp-detail-back" onClick={onBack}>
            <ChevronLeft size={15} /> {report.name}
          </Button>
          <div className="rp-detail-view-icons">
            <button className="rp-detail-icon-btn" title="Column view"><Grid3x3Gap size={16} /></button>
            <ReportExportButton
                title={report.name}
                headers={APPT_HEADERS}
                rows={apptRows}
                filename={`${report.name}-${dateFrom}-${dateTo}`}
              />
            <button className="rp-detail-icon-btn" title="Info"><InfoCircle size={16} /></button>
          </div>
        </div>
        <div className="rp-detail-tab-bar">
          <span className="rp-detail-tab active">Default Vi...</span>
        </div>
      </div>

      {/* ── Filters row 1 ── */}
      <div className="rp-detail-filters">
        {/* Date Type */}
        <div className="rp-detail-filter-group" style={{ position: "relative" }}>
          <label className="rp-detail-filter-label">Date Type</label>
          <button className="rp-detail-select" onClick={() => { setShowDtDrop(v => !v); setShowStatusDrop(false); }}>
            {dateType.length > 14 ? dateType.slice(0, 14) + "..." : dateType}
            <span className="rp-detail-caret">▼</span>
          </button>
          {showDtDrop && (
            <div className="rp-detail-dropdown" onMouseDown={e => e.stopPropagation()}>
              {DATE_TYPE_OPTIONS.map(opt => (
                <div key={opt} className={`rp-detail-dropdown-item ${opt === dateType ? "active" : ""}`}
                  onClick={() => { setDateType(opt); setShowDtDrop(false); }}>
                  {opt}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Date range */}
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Date</label>
          <div className="rp-detail-date-range">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="rp-detail-date-input" />
            <span className="rp-detail-date-sep">-</span>
            <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   className="rp-detail-date-input" />
          </div>
        </div>

        {/* Appointment Status — multi-select with search */}
        <div className="rp-detail-filter-group" style={{ position: "relative" }}>
          <label className="rp-detail-filter-label">Appointment Status</label>
          <button className="rp-detail-select" onClick={() => { setShowStatusDrop(v => !v); setShowDtDrop(false); }}>
            {statusLabel} <span className="rp-detail-caret">▼</span>
          </button>
          {showStatusDrop && (
            <div className="rp-detail-dropdown rp-detail-dropdown-wide" onMouseDown={e => e.stopPropagation()}>
              {/* Search */}
              <div className="rp-status-search-wrap">
                <Search size={12} className="rp-status-search-ic" />
                <input
                  type="text"
                  className="rp-status-search-input"
                  placeholder="Search"
                  value={statusSearch}
                  onChange={e => setStatusSearch(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  autoFocus
                />
                {statusSearch && (
                  <button className="rp-status-search-clear" onClick={() => setStatusSearch("")}>✕</button>
                )}
              </div>
              {/* Options */}
              {filteredStatuses.map(opt => (
                <div key={opt} className="rp-detail-checkbox-item" onClick={() => toggleStatus(opt)}>
                  <span className={`rp-detail-checkbox ${selectedStatuses.includes(opt) ? "checked" : ""}`}>
                    {selectedStatuses.includes(opt) && "✓"}
                  </span>
                  {fmtStatusLabel(opt)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="rp-detail-filter-actions">
          <Button variant="ghost" className="rp-detail-refresh-btn" onClick={handleRefresh} loading={loading}>
            <Refresh size={13} /> Refresh
          </Button>
          <Button variant="ghost" className="rp-detail-save-btn">Save View</Button>
        </div>
      </div>



      <div className="rp-detail-drag-hint">
        {rows.length} appointment{rows.length !== 1 ? "s" : ""} found
      </div>

      {/* ── Table ── */}
      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>Appointment Date <span className="rp-th-sort">↕</span></th>
              <th>Time</th>
              <th>Booked Date <span className="rp-th-sort">↕</span></th>
              <th>Client Name</th>
              <th>Service Name</th>
              <th>Staff Name</th>
              <th>Status</th>
              <th>Duration</th>
              <th>Amount</th>
              <th>Payment Method</th>
              <th>Payment Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} className="rp-detail-loading-cell"><PageLoader /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={11} className="rp-detail-empty-cell">No data available</td></tr>
            ) : (
              rows.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((row, i) => (
                <tr
                  key={i}
                  className={`rp-appt-row${selectedRow?.id === row.id ? " rp-appt-row--selected" : ""}`}
                  onClick={() => setSelectedRow(prev => prev?.id === row.id ? null : row)}
                >
                  <td>{row.appointmentDate}</td>
                  <td>{row.time}</td>
                  <td>{row.bookedDate}</td>
                  <td>{row.clientName || "—"}</td>
                  <td>{row.serviceName}</td>
                  <td>{row.staffName || "—"}</td>
                  <td><span className={`rp-status-badge rp-status-${row.status}`}>{row.status}</span></td>
                  <td>{row.duration ? `${row.duration} min` : "—"}</td>
                  <td>{row.amount > 0 ? `₹${Number(row.amount).toLocaleString("en-IN")}` : "—"}</td>
                  <td>{row.paymentMethod || "—"}</td>
                  <td><span className={`rp-status-badge rp-status-${row.paymentStatus}`}>{row.paymentStatus}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage} pageSize={pageSize} totalItems={rows.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }}
      />

      {/* ── Appointment Detail Drawer ── */}
      {selectedRow && (
        <div className="rp-appt-drawer-overlay" onClick={() => setSelectedRow(null)}>
          <div className="rp-appt-drawer" onClick={e => e.stopPropagation()}>

            {/* Close */}
            <button className="rp-appt-drawer-close" onClick={() => setSelectedRow(null)}>✕</button>

            {/* Hero: client avatar + name + status */}
            <div className="rp-appt-drawer-hero">
              <div className="rp-appt-drawer-avatar">
                {(selectedRow.clientName || "?").charAt(0).toUpperCase()}
              </div>
              <div className="rp-appt-drawer-hero-info">
                <div className="rp-appt-drawer-client">{selectedRow.clientName || "Walk-in Client"}</div>
                <span className={`rp-status-badge rp-status-${selectedRow.status}`}>{selectedRow.status}</span>
              </div>
            </div>

            {/* Date + Time card */}
            <div className="rp-appt-drawer-datetime-card">
              <div className="rp-appt-drawer-datetime-item">
                <span className="rp-appt-drawer-datetime-icon">📅</span>
                <div>
                  <div className="rp-appt-drawer-datetime-label">Date</div>
                  <div className="rp-appt-drawer-datetime-val">{selectedRow.appointmentDate}</div>
                </div>
              </div>
              <div className="rp-appt-drawer-datetime-divider" />
              <div className="rp-appt-drawer-datetime-item">
                <span className="rp-appt-drawer-datetime-icon">🕐</span>
                <div>
                  <div className="rp-appt-drawer-datetime-label">Time</div>
                  <div className="rp-appt-drawer-datetime-val">{selectedRow.time}</div>
                </div>
              </div>
              <div className="rp-appt-drawer-datetime-divider" />
              <div className="rp-appt-drawer-datetime-item">
                <span className="rp-appt-drawer-datetime-icon">⏱</span>
                <div>
                  <div className="rp-appt-drawer-datetime-label">Duration</div>
                  <div className="rp-appt-drawer-datetime-val">{selectedRow.duration ? `${selectedRow.duration} min` : "—"}</div>
                </div>
              </div>
            </div>

            <div className="rp-appt-drawer-body">

              {/* Service & Staff */}
              <div className="rp-appt-drawer-section-title">Service & Staff</div>
              <div className="rp-appt-drawer-chip-row">
                <div className="rp-appt-drawer-chip">
                  <span className="rp-appt-drawer-chip-icon">✂</span>
                  <div>
                    <div className="rp-appt-drawer-chip-label">Service</div>
                    <div className="rp-appt-drawer-chip-val">{selectedRow.serviceName}</div>
                  </div>
                </div>
                <div className="rp-appt-drawer-chip">
                  <span className="rp-appt-drawer-chip-icon">👤</span>
                  <div>
                    <div className="rp-appt-drawer-chip-label">Staff</div>
                    <div className="rp-appt-drawer-chip-val">{selectedRow.staffName || "—"}</div>
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div className="rp-appt-drawer-section-title" style={{ marginTop: 18 }}>Payment</div>
              <div className="rp-appt-drawer-payment-card">
                <div className="rp-appt-drawer-payment-amount">
                  {selectedRow.amount > 0 ? `₹${Number(selectedRow.amount).toLocaleString("en-IN")}` : "₹0"}
                  <span className="rp-appt-drawer-payment-method">{selectedRow.paymentMethod || "Not collected"}</span>
                </div>
                <span className={`rp-status-badge rp-status-${selectedRow.paymentStatus}`}>{selectedRow.paymentStatus}</span>
              </div>

              {/* Meta */}
              <div className="rp-appt-drawer-section-title" style={{ marginTop: 18 }}>Booking Info</div>
              <div className="rp-appt-drawer-meta-row">
                <span className="rp-appt-drawer-meta-label">Booked On</span>
                <span className="rp-appt-drawer-meta-val">{selectedRow.bookedDate}</span>
              </div>
              <div className="rp-appt-drawer-meta-row">
                <span className="rp-appt-drawer-meta-label">Appointment ID</span>
                <span className="rp-appt-drawer-meta-val rp-appt-drawer-id">{selectedRow.id.slice(0, 8)}…</span>
              </div>
            </div>

            {/* Footer */}
            <div className="rp-appt-drawer-footer">
              <button
                className="rp-appt-drawer-edit-btn"
                onClick={() => navigate("/dashboard/calendar", { state: { openAppointmentId: selectedRow.id } })}
              >
                ✏ Edit Appointment
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

// ─── Finance (Collections) Report Detail ─────────────────────────────────────

interface FinanceRow {
  date: string;
  ticketNo: string;
  clientName: string;
  service: string;
  amount: number;
  paymentMethod: string;
  staff: string;
  center: string;
}

const PAYMENT_METHODS = [
  { label: "All",          value: "All"           },
  { label: "Cash",         value: "cash"          },
  { label: "Card",         value: "card"          },
  { label: "UPI",          value: "upi"           },
  { label: "Wallet",       value: "wallet"        },
  { label: "Gift Card",    value: "gift_card"     },
  { label: "Split",        value: "split"         },
  { label: "Bank Transfer",value: "bank_transfer" },
];

const FinanceReportDetail = ({ report, onBack }: { report: ReportItem; onBack: () => void }) => {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [dateFrom,        setDateFrom]        = useState(monthStart);
  const [dateTo,          setDateTo]          = useState(today);
  const [paymentMethod,   setPaymentMethod]   = useState("All");
  const [showMethodDrop,  setShowMethodDrop]  = useState(false);
  const [allRows,         setAllRows]         = useState<FinanceRow[]>([]);
  const [loading,         setLoading]         = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(10);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const params = new URLSearchParams({ start_date: dateFrom, end_date: dateTo });
      const res = await api.get(`${SALE.BASE}?${params}`, { signal: ctrl.signal });
      const sales: any[] = res.data?.data ?? [];
      const mapped: FinanceRow[] = sales.map((s: any) => ({
        date: s.created_at
          ? new Date(s.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
          : "—",
        ticketNo: String(s.id ?? "—"),
        clientName: s.client_name ?? "Walk-in",
        service: Array.isArray(s.items) && s.items.length
          ? s.items.map((i: any) => i.name).filter(Boolean).join(", ")
          : "—",
        amount: parseFloat(s.total_amount ?? "0") || 0,
        paymentMethod: s.payment_method ?? "N/A",
        staff: Array.isArray(s.items) && s.items.length
          ? (s.items[0]?.staff_name ?? "—")
          : "—",
        center: "—",
      }));
      setAllRows(mapped);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") setAllRows([]);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo]);

  // client-side filter by payment method
  const rows = useMemo(() => {
    if (paymentMethod === "All") return allRows;
    return allRows.filter(r => (r.paymentMethod ?? "").toLowerCase() === paymentMethod.toLowerCase());
  }, [allRows, paymentMethod]);

  useEffect(() => { setCurrentPage(1); }, [rows]);
  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const close = () => { setShowMethodDrop(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const HEADERS = ["Date", "Ticket No", "Client Name", "Service", "Amount (₹)", "Payment Method", "Staff", "Center"];
  const exportRows = () => rows.map(r => [r.date, r.ticketNo, r.clientName, r.service, r.amount, r.paymentMethod, r.staff, r.center]);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Button variant="ghost" className="rp-detail-back" onClick={onBack}>
            <ChevronLeft size={15} /> {report.name}
          </Button>
          <div className="rp-detail-view-icons">
            <button className="rp-detail-icon-btn" title="Column view"><Grid3x3Gap size={16} /></button>
            <ReportExportButton
                title={report.name}
                headers={HEADERS}
                rows={exportRows}
                filename={`${report.name}-${dateFrom}-${dateTo}`}
              />
            <button className="rp-detail-icon-btn" title="Info"><InfoCircle size={16} /></button>
          </div>
        </div>
        <div className="rp-detail-tab-bar"><span className="rp-detail-tab active">Default View</span></div>
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
        <div className="rp-detail-filter-group" style={{ position: "relative" }}>
          <label className="rp-detail-filter-label">Payment Method</label>
          <button className="rp-detail-select" onClick={() => setShowMethodDrop(v => !v)}>
            {PAYMENT_METHODS.find(m => m.value === paymentMethod)?.label ?? "All"} <span className="rp-detail-caret">▼</span>
          </button>
          {showMethodDrop && (
            <div className="rp-detail-dropdown" onMouseDown={e => e.stopPropagation()}>
              {PAYMENT_METHODS.map(m => (
                <div key={m.value} className={`rp-detail-dropdown-item ${m.value === paymentMethod ? "active" : ""}`}
                  onClick={() => { setPaymentMethod(m.value); setShowMethodDrop(false); }}>{m.label}</div>
              ))}
            </div>
          )}
        </div>
        <div className="rp-detail-filter-actions">
          <Button variant="ghost" className="rp-detail-refresh-btn" onClick={fetchData} loading={loading}>
            <Refresh size={13} /> Refresh
          </Button>
          <Button variant="ghost" className="rp-detail-save-btn">Save View</Button>
        </div>
      </div>


      <div className="rp-detail-drag-hint">
        {rows.length} transaction{rows.length !== 1 ? "s" : ""}
        {rows.length > 0 && <>&nbsp;·&nbsp;Total: <strong>₹{rows.reduce((s, r) => s + r.amount, 0).toLocaleString()}</strong></>}
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>Date <span className="rp-th-sort">↕</span></th>
              <th>Ticket No <span className="rp-th-sort">↕</span></th>
              <th>Client Name</th>
              <th>Service</th>
              <th>Amount (₹) <span className="rp-th-sort">↕</span></th>
              <th>Payment Method</th>
              <th>Staff</th>
              <th>Center</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="rp-detail-loading-cell"><PageLoader /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="rp-detail-empty-cell">No data available</td></tr>
            ) : rows.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((r, i) => (
              <tr key={i}>
                <td>{r.date}</td>
                <td><span className="rp-detail-link">{r.ticketNo}</span></td>
                <td><span className="rp-detail-link">{r.clientName}</span></td>
                <td>{r.service}</td>
                <td className="fw-semibold">₹{r.amount.toLocaleString()}</td>
                <td>{r.paymentMethod}</td>
                <td>{r.staff}</td>
                <td>{r.center}</td>
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
};

// ─── Inventory (Current Stock) Report Detail ──────────────────────────────────

interface InventoryRow {
  product: string;
  category: string;
  sku: string;
  currentStock: number;
  reorderLevel: number;
  unitCost: number;
  totalValue: number;
  status: "In Stock" | "Low Stock" | "Out of Stock";
}

const INV_STATUSES   = ["All", "In Stock", "Low Stock", "Out of Stock"];

const InventoryReportDetail = ({ report, onBack }: { report: ReportItem; onBack: () => void }) => {
  const [category,        setCategory]        = useState("All");
  const [stockStatus,     setStockStatus]     = useState("All");
  const [showCatDrop,     setShowCatDrop]     = useState(false);
  const [showStsDrop,     setShowStsDrop]     = useState(false);
  const [rows,            setRows]            = useState<InventoryRow[]>([]);
  const [allRows,         setAllRows]         = useState<InventoryRow[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>(["All"]);
  const [loading,         setLoading]         = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(10);
  useEffect(() => { setCurrentPage(1); }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get(PRODUCTS.LIST, { signal: ctrl.signal }),
        api.get(CATEGORIES.BASE, { signal: ctrl.signal }),
      ]);
      const products: any[] = prodRes.data?.data?.data ?? prodRes.data?.data ?? [];
      const cats: any[] = catRes.data?.data ?? [];
      const catMap: Record<string, string> = {};
      cats.forEach((c: any) => { catMap[c.id] = c.name; });
      setCategoryOptions(["All", ...cats.map((c: any) => c.name as string)]);
      const mapped: InventoryRow[] = products.map((p: any) => {
        const currentStock = parseFloat(p.amount) || 0;
        const reorderLevel = Number(p.qty_alert) || 0;
        const unitCost = parseFloat(p.supply_price) || parseFloat(p.retail_price) || 0;
        const totalValue = Math.round(currentStock * unitCost * 100) / 100;
        const catName = p.category_id ? (catMap[p.category_id] ?? "Uncategorized") : "Uncategorized";
        let status: InventoryRow["status"] = "In Stock";
        if (currentStock <= 0) status = "Out of Stock";
        else if (reorderLevel > 0 && currentStock <= reorderLevel) status = "Low Stock";
        return { product: p.name, category: catName, sku: p.barcode ?? "—", currentStock, reorderLevel, unitCost, totalValue, status };
      });
      setAllRows(mapped);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") setAllRows([]);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    let filtered = allRows;
    if (category !== "All") filtered = filtered.filter(r => r.category === category);
    if (stockStatus !== "All") filtered = filtered.filter(r => r.status === stockStatus);
    setRows(filtered);
  }, [allRows, category, stockStatus]);

  useEffect(() => {
    const close = () => { setShowCatDrop(false); setShowStsDrop(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const HEADERS = ["Product", "Category", "SKU", "Current Stock", "Reorder Level", "Unit Cost (₹)", "Total Value (₹)", "Status"];
  const exportRows = () => rows.map(r => [r.product, r.category, r.sku, r.currentStock, r.reorderLevel, r.unitCost, r.totalValue, r.status]);

  const statusColor = (s: string) =>
    s === "In Stock" ? "#10b981" : s === "Low Stock" ? "#f59e0b" : "#ef4444";

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Button variant="ghost" className="rp-detail-back" onClick={onBack}>
            <ChevronLeft size={15} /> {report.name}
          </Button>
          <div className="rp-detail-view-icons">
            <button className="rp-detail-icon-btn" title="Column view"><Grid3x3Gap size={16} /></button>
            <ReportExportButton
                title={report.name}
                headers={HEADERS}
                rows={exportRows}
                filename={report.name}
              />
            <button className="rp-detail-icon-btn" title="Info"><InfoCircle size={16} /></button>
          </div>
        </div>
        <div className="rp-detail-tab-bar"><span className="rp-detail-tab active">Default View</span></div>
      </div>

      <div className="rp-detail-filters">
        <div className="rp-detail-filter-group" style={{ position: "relative" }}>
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
        <div className="rp-detail-filter-group" style={{ position: "relative" }}>
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
        <div className="rp-detail-filter-actions">
          <Button variant="ghost" className="rp-detail-refresh-btn" onClick={fetchData} loading={loading}>
            <Refresh size={13} /> Refresh
          </Button>
          <Button variant="ghost" className="rp-detail-save-btn">Save View</Button>
        </div>
      </div>


      <div className="rp-detail-drag-hint">
        {rows.length} product{rows.length !== 1 ? "s" : ""}
        {rows.length > 0 && <>&nbsp;·&nbsp;Total Value: <strong>₹{rows.reduce((s, r) => s + r.totalValue, 0).toLocaleString()}</strong></>}
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>SKU</th>
              <th>Current Stock <span className="rp-th-sort">↕</span></th>
              <th>Reorder Level</th>
              <th>Unit Cost (₹) <span className="rp-th-sort">↕</span></th>
              <th>Total Value (₹) <span className="rp-th-sort">↕</span></th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="rp-detail-loading-cell"><PageLoader /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="rp-detail-empty-cell">No data available</td></tr>
            ) : rows.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((r, i) => (
              <tr key={i}>
                <td className="fw-semibold">{r.product}</td>
                <td>{r.category}</td>
                <td><span className="rp-detail-link">{r.sku}</span></td>
                <td>{r.currentStock}</td>
                <td>{r.reorderLevel}</td>
                <td>₹{r.unitCost.toLocaleString()}</td>
                <td className="fw-semibold">₹{r.totalValue.toLocaleString()}</td>
                <td><span style={{ color: statusColor(r.status), fontWeight: 600, fontSize: 12 }}>{r.status}</span></td>
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
};

// ─── Payments Report Detail ───────────────────────────────────────────────────

interface PaymentRow {
  date: string;
  transactionId: string;
  clientName: string;
  amount: number;
  gateway: string;
  method: string;
  referenceNo: string;
  status: "Success" | "Pending" | "Failed" | "Refunded";
}

const PAY_STATUSES = ["All", "Success", "Pending", "Failed", "Refunded"];
const PAY_METHODS  = ["All", "Cash", "UPI", "Card"];

const PaymentReportDetail = ({ report, onBack }: { report: ReportItem; onBack: () => void }) => {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [dateFrom,        setDateFrom]        = useState(monthStart);
  const [dateTo,          setDateTo]          = useState(today);
  const [payStatus,       setPayStatus]       = useState("All");
  const [payMethod,       setPayMethod]       = useState("All");
  const [showPsDrop,      setShowPsDrop]      = useState(false);
  const [showMtDrop,      setShowMtDrop]      = useState(false);
  const [rows,            setRows]            = useState<PaymentRow[]>([]);
  const [loading,         setLoading]         = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(10);
  useEffect(() => { setCurrentPage(1); }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const params = new URLSearchParams({ from: dateFrom, to: dateTo });
      if (payStatus !== "All") params.set("status", payStatus);
      const res = await api.get(REPORT.DETAIL("payments", params.toString()), { signal: ctrl.signal });
      const raw: any[] = res.data?.data ?? res.data ?? [];
      const parsed: PaymentRow[] = (Array.isArray(raw) ? raw : []).map((r: any) => ({
        date:          r.date ?? r.created_at?.slice(0, 10) ?? "",
        transactionId: r.transactionId ?? r.transaction_id ?? r.id ?? "",
        clientName:    r.clientName ?? r.client_name ?? r.client?.name ?? "—",
        amount:        parseFloat(String(r.amount ?? r.total_amount ?? 0)) || 0,
        gateway:       r.gateway ?? r.payment_gateway ?? "—",
        method:        r.method ?? r.payment_method ?? "—",
        referenceNo:   r.referenceNo ?? r.reference_no ?? r.reference ?? r.transactionId ?? r.transaction_id ?? "",
        status:        r.status ?? "—",
      }));
      setRows(parsed);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") setRows([]);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo, payStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const close = () => { setShowPsDrop(false); setShowMtDrop(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const displayRows = useMemo(() => {
    if (payMethod === "All") return rows;
    return rows.filter(r => r.method.toLowerCase() === payMethod.toLowerCase());
  }, [rows, payMethod]);

  const HEADERS = ["Date", "Transaction ID", "Client Name", "Amount (₹)", "Method", "Reference No", "Status"];
  const exportRows = () => displayRows.map(r => [r.date, r.transactionId, r.clientName, r.amount.toFixed(2), r.method, r.referenceNo, r.status]);

  const statusColor = (s: string) =>
    s === "Success" ? "#10b981" : s === "Pending" ? "#f59e0b" : s === "Refunded" ? "#3b82f6" : "#ef4444";

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Button variant="ghost" className="rp-detail-back" onClick={onBack}>
            <ChevronLeft size={15} /> {report.name}
          </Button>
          <div className="rp-detail-view-icons">
            <button className="rp-detail-icon-btn" title="Column view"><Grid3x3Gap size={16} /></button>
            <ReportExportButton
                title={report.name}
                headers={HEADERS}
                rows={exportRows}
                filename={`${report.name}-${dateFrom}-${dateTo}`}
              />
            <button className="rp-detail-icon-btn" title="Info"><InfoCircle size={16} /></button>
          </div>
        </div>
        <div className="rp-detail-tab-bar"><span className="rp-detail-tab active">Default View</span></div>
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
        <div className="rp-detail-filter-group" style={{ position: "relative" }}>
          <label className="rp-detail-filter-label">Method</label>
          <button className="rp-detail-select" onClick={() => { setShowMtDrop(v => !v); setShowPsDrop(false); }}>
            {payMethod} <span className="rp-detail-caret">▼</span>
          </button>
          {showMtDrop && (
            <div className="rp-detail-dropdown" onMouseDown={e => e.stopPropagation()}>
              {PAY_METHODS.map(m => (
                <div key={m} className={`rp-detail-dropdown-item ${m === payMethod ? "active" : ""}`}
                  onClick={() => { setPayMethod(m); setShowMtDrop(false); }}>{m}</div>
              ))}
            </div>
          )}
        </div>
        <div className="rp-detail-filter-group" style={{ position: "relative" }}>
          <label className="rp-detail-filter-label">Status</label>
          <button className="rp-detail-select" onClick={() => { setShowPsDrop(v => !v); setShowMtDrop(false); }}>
            {payStatus} <span className="rp-detail-caret">▼</span>
          </button>
          {showPsDrop && (
            <div className="rp-detail-dropdown" onMouseDown={e => e.stopPropagation()}>
              {PAY_STATUSES.map(s => (
                <div key={s} className={`rp-detail-dropdown-item ${s === payStatus ? "active" : ""}`}
                  onClick={() => { setPayStatus(s); setShowPsDrop(false); }}>{s}</div>
              ))}
            </div>
          )}
        </div>
        <div className="rp-detail-filter-actions">
          <Button variant="ghost" className="rp-detail-refresh-btn" onClick={fetchData} loading={loading}>
            <Refresh size={13} /> Refresh
          </Button>
          <Button variant="ghost" className="rp-detail-save-btn">Save View</Button>
        </div>
      </div>


      {/* Summary strip */}
      {displayRows.length > 0 && (() => {
        const total    = displayRows.reduce((s, r) => s + r.amount, 0);
        const success  = displayRows.filter(r => r.status === "Success").reduce((s, r) => s + r.amount, 0);
        const pending  = displayRows.filter(r => r.status === "Pending").reduce((s, r) => s + r.amount, 0);
        const failed   = displayRows.filter(r => r.status === "Failed").reduce((s, r)  => s + r.amount, 0);
        const refunded = displayRows.filter(r => r.status === "Refunded").reduce((s, r) => s + r.amount, 0);
        const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        return (
          <div className="rp-detail-drag-hint" style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
            <span>{displayRows.length} payment{displayRows.length !== 1 ? "s" : ""}</span>
            <span>Total: <strong>{fmt(total)}</strong></span>
            {success  > 0 && <span style={{ color: "#10b981" }}>Success: <strong>{fmt(success)}</strong></span>}
            {pending  > 0 && <span style={{ color: "#f59e0b" }}>Pending: <strong>{fmt(pending)}</strong></span>}
            {failed   > 0 && <span style={{ color: "#ef4444" }}>Failed: <strong>{fmt(failed)}</strong></span>}
            {refunded > 0 && <span style={{ color: "#3b82f6" }}>Refunded: <strong>{fmt(refunded)}</strong></span>}
          </div>
        );
      })()}

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>Date <span className="rp-th-sort">↕</span></th>
              <th>Transaction ID</th>
              <th>Client Name</th>
              <th>Amount (₹) <span className="rp-th-sort">↕</span></th>
              <th>Method</th>
              <th>Reference No</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="rp-detail-loading-cell"><PageLoader /></td></tr>
            ) : displayRows.length === 0 ? (
              <tr><td colSpan={7} className="rp-detail-empty-cell">No data available</td></tr>
            ) : displayRows.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((r, i) => (
              <tr key={i}>
                <td>{r.date}</td>
                <td style={{ fontSize: 12, color: "#6366f1" }}>{r.transactionId}</td>
                <td>{r.clientName}</td>
                <td className="fw-semibold">₹{r.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td>{r.method}</td>
                <td style={{ fontSize: 12 }}>{r.referenceNo}</td>
                <td><span style={{ color: statusColor(r.status), fontWeight: 600, fontSize: 12 }}>{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage} pageSize={pageSize} totalItems={displayRows.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }}
      />
    </div>
  );
};

// ─── Daily Sales Report Detail ───────────────────────────────────────────────

interface DailyRow {
  time: string;
  ticketNo: string;
  clientName: string;
  service: string;
  staff: string;
  amount: number;
  paymentMethod: string;
}

const DailyReportDetail = ({ report, onBack, staffNames }: { report: ReportItem; onBack: () => void; staffNames: string[] }) => {
  const today = new Date().toISOString().slice(0, 10);
  const [date,            setDate]            = useState(today);
  const [serviceFilter,   setServiceFilter]   = useState("All");
  const [serviceOptions,  setServiceOptions]  = useState<string[]>(["All"]);
  const [staffFilter,     setStaffFilter]     = useState("All");
  const [showSvcDrop,     setShowSvcDrop]     = useState(false);
  const [showStfDrop,     setShowStfDrop]     = useState(false);
  const [rows,            setRows]            = useState<DailyRow[]>([]);
  const [loading,         setLoading]         = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(10);
  useEffect(() => { setCurrentPage(1); }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    api.get(SERVICES.BASE).then(res => {
      const list: any[] = res.data?.data?.data ?? res.data?.data ?? [];
      const names = list.map((s: any) => s.name as string).filter(Boolean);
      setServiceOptions(["All", ...names]);
    }).catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const params = new URLSearchParams({ date });
      if (serviceFilter !== "All") params.set("service", serviceFilter);
      if (staffFilter   !== "All") params.set("staff", staffFilter);
      const res = await api.get(REPORT.DETAIL("daily", params.toString()), { signal: ctrl.signal });
      const raw: any[] = res.data?.data?.data ?? res.data?.data ?? [];
      const mapped: DailyRow[] = raw.map((r: any) => {
        // time: prefer pre-formatted field, else parse created_at to local time
        let time = r.time ?? r.startTime ?? r.start_time ?? "";
        if (!time && (r.created_at ?? r.createdAt)) {
          time = new Date(r.created_at ?? r.createdAt)
            .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
        }
        // service: join item names if present
        const itemNames: string = Array.isArray(r.items) && r.items.length
          ? r.items.map((i: any) => i.name ?? i.service_name ?? "").filter(Boolean).join(", ")
          : (r.service ?? r.serviceName ?? r.service_name ?? "—");
        // staff: first item's staff or top-level
        const staffName: string = Array.isArray(r.items) && r.items.length
          ? (r.items[0].staff_name ?? r.items[0].staffName ?? "")
          : (r.staff ?? r.staffName ?? r.staff_name ?? "—");
        return {
          time,
          ticketNo:      r.ticketNo      ?? r.ticket_no      ?? r.sale_number ?? String(r.id ?? "—"),
          clientName:    r.clientName    ?? r.client_name    ?? r.client?.name ?? "Walk-in",
          service:       itemNames,
          staff:         staffName || "—",
          amount:        parseFloat(r.amount ?? r.total_amount ?? r.totalAmount ?? "0") || 0,
          paymentMethod: r.paymentMethod ?? r.payment_method ?? "N/A",
        };
      });
      setRows(mapped);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") setRows([]);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [date, serviceFilter, staffFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const close = () => { setShowSvcDrop(false); setShowStfDrop(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const totalRevenue = rows.reduce((sum, r) => sum + r.amount, 0);
  const HEADERS = ["Time", "Ticket No", "Client Name", "Service", "Staff", "Amount (₹)", "Payment Method"];
  const exportRows = () => rows.map(r => [r.time, r.ticketNo, r.clientName, r.service, r.staff, r.amount, r.paymentMethod]);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Button variant="ghost" className="rp-detail-back" onClick={onBack}>
            <ChevronLeft size={15} /> {report.name}
          </Button>
          <div className="rp-detail-view-icons">
            <button className="rp-detail-icon-btn" title="Column view"><Grid3x3Gap size={16} /></button>
            <ReportExportButton
                title={report.name}
                headers={HEADERS}
                rows={exportRows}
                filename={`${report.name}-${date}`}
              />
            <button className="rp-detail-icon-btn" title="Info"><InfoCircle size={16} /></button>
          </div>
        </div>
        <div className="rp-detail-tab-bar"><span className="rp-detail-tab active">Default View</span></div>
      </div>

      <div className="rp-detail-filters">
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="rp-detail-date-input"
            style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "7px 10px" }}
          />
        </div>
        <div className="rp-detail-filter-group" style={{ position: "relative" }}>
          <label className="rp-detail-filter-label">Service</label>
          <button className="rp-detail-select" onClick={() => { setShowSvcDrop(v => !v); setShowStfDrop(false); }}>
            {serviceFilter} <span className="rp-detail-caret">▼</span>
          </button>
          {showSvcDrop && (
            <div className="rp-detail-dropdown" onMouseDown={e => e.stopPropagation()}>
              {serviceOptions.map(s => (
                <div key={s} className={`rp-detail-dropdown-item ${s === serviceFilter ? "active" : ""}`}
                  onClick={() => { setServiceFilter(s); setShowSvcDrop(false); }}>{s}</div>
              ))}
            </div>
          )}
        </div>
        <div className="rp-detail-filter-group" style={{ position: "relative" }}>
          <label className="rp-detail-filter-label">Staff</label>
          <button className="rp-detail-select" onClick={() => { setShowStfDrop(v => !v); setShowSvcDrop(false); }}>
            {staffFilter} <span className="rp-detail-caret">▼</span>
          </button>
          {showStfDrop && (
            <div className="rp-detail-dropdown" onMouseDown={e => e.stopPropagation()}>
              {["All", ...staffNames].map(s => (
                <div key={s} className={`rp-detail-dropdown-item ${s === staffFilter ? "active" : ""}`}
                  onClick={() => { setStaffFilter(s); setShowStfDrop(false); }}>{s}</div>
              ))}
            </div>
          )}
        </div>
        <div className="rp-detail-filter-actions">
          <Button variant="ghost" className="rp-detail-refresh-btn" onClick={fetchData} loading={loading}>
            <Refresh size={13} /> Refresh
          </Button>
          <Button variant="ghost" className="rp-detail-save-btn">Save View</Button>
        </div>
      </div>

      <div className="rp-detail-drag-hint">
        <span className="rp-detail-drag-check" />
        Daily Total: <strong style={{ color: "#111827", marginLeft: 6 }}>₹{totalRevenue.toLocaleString()}</strong>
        &nbsp;· {rows.length} transactions
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>Time <span className="rp-th-sort">↕</span></th>
              <th>Ticket No</th>
              <th>Client Name</th>
              <th>Service</th>
              <th>Staff</th>
              <th>Amount (₹) <span className="rp-th-sort">↕</span></th>
              <th>Payment Method</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="rp-detail-loading-cell"><PageLoader /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="rp-detail-empty-cell">No data available</td></tr>
            ) : rows.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((r, i) => (
              <tr key={i}>
                <td>{r.time || "—"}</td>
                <td>
                  <span className="rp-detail-link" title={r.ticketNo}>
                    {r.ticketNo.length > 12 ? r.ticketNo.slice(0, 8).toUpperCase() + "…" : r.ticketNo}
                  </span>
                </td>
                <td><span className="rp-detail-link">{r.clientName || "Walk-in"}</span></td>
                <td>{r.service}</td>
                <td>{r.staff}</td>
                <td className="fw-semibold">₹{r.amount.toLocaleString("en-IN")}</td>
                <td style={{ textTransform: "capitalize" }}>{r.paymentMethod}</td>
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
};

// ─── Marketing Report Detail ──────────────────────────────────────────────────

interface MarketingRow {
  clientName: string;
  email: string;
  phone: string;
  visits: number;
  spend: number;
  lastVisit: string;
  status: "Active" | "Inactive";
}

const MKT_STATUSES = ["All", "Active", "Inactive", "Expired"];

const ClientAcquisitionReportDetail = ({ report, onBack }: { report: ReportItem; onBack: () => void }) => {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [dateFrom,        setDateFrom]        = useState(monthStart);
  const [dateTo,          setDateTo]          = useState(today);
  const [clientSearch,    setClientSearch]    = useState("");
  const [mktStatus,       setMktStatus]       = useState("All");
  const [showStsDrop,     setShowStsDrop]     = useState(false);
  const [rows,            setRows]            = useState<MarketingRow[]>([]);
  const [allRows,         setAllRows]         = useState<MarketingRow[]>([]);
  const [loading,         setLoading]         = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(10);
  useEffect(() => { setCurrentPage(1); }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const res = await api.get(CLIENT.BASE, { signal: ctrl.signal });
      const clients: any[] = res.data?.data?.data ?? res.data?.data ?? [];
      const mapped: MarketingRow[] = clients.map((c: any) => {
        const name = [c.first_name, c.last_name].filter(Boolean).join(" ") || c.name || "—";
        return {
          clientName: name,
          email:     c.email ?? "—",
          phone:     c.mobile_number ?? c.phone ?? "—",
          visits:    c.total_visits ?? c.visit_count ?? 0,
          spend:     parseFloat(c.total_spend ?? c.lifetime_spend ?? "0") || 0,
          lastVisit: (c.last_visit ?? c.last_visit_date ?? c.last_appointment_date ?? "").slice(0, 10) || "—",
          status:    (c.status === "active" || c.is_active === true) ? "Active" : "Inactive",
        };
      });
      setAllRows(mapped);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") setAllRows([]);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    let filtered = allRows;
    if (dateFrom) filtered = filtered.filter(r => r.lastVisit !== "—" && r.lastVisit >= dateFrom);
    if (dateTo)   filtered = filtered.filter(r => r.lastVisit !== "—" && r.lastVisit <= dateTo);
    if (mktStatus !== "All") filtered = filtered.filter(r => r.status === mktStatus);
    if (clientSearch.trim()) {
      const q = clientSearch.toLowerCase();
      filtered = filtered.filter(r =>
        r.clientName.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.phone.includes(clientSearch)
      );
    }
    setRows(filtered);
  }, [allRows, dateFrom, dateTo, mktStatus, clientSearch]);

  useEffect(() => {
    const close = () => { setShowStsDrop(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const HEADERS = ["Client Name", "Email", "Phone", "Visits", "Spend (₹)", "Last Visit", "Status"];
  const exportRows = () => rows.map(r => [r.clientName, r.email, r.phone, r.visits, r.spend, r.lastVisit, r.status]);
  const statusColor = (s: string) =>
    s === "Active" ? "#10b981" : "#9ca3af";

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Button variant="ghost" className="rp-detail-back" onClick={onBack}>
            <ChevronLeft size={15} /> {report.name}
          </Button>
          <div className="rp-detail-view-icons">
            <button className="rp-detail-icon-btn" title="Column view"><Grid3x3Gap size={16} /></button>
            <ReportExportButton
                title={report.name}
                headers={HEADERS}
                rows={exportRows}
                filename={`${report.name}-${dateFrom}-${dateTo}`}
              />
            <button className="rp-detail-icon-btn" title="Info"><InfoCircle size={16} /></button>
          </div>
        </div>
        <div className="rp-detail-tab-bar"><span className="rp-detail-tab active">Default View</span></div>
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
          <label className="rp-detail-filter-label">Client Search</label>
          <div className="rp-detail-date-range">
            <Search size={13} style={{ color: "#9ca3af", flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search client..."
              value={clientSearch}
              onChange={e => setClientSearch(e.target.value)}
              className="rp-detail-date-input"
            />
          </div>
        </div>
        <div className="rp-detail-filter-group" style={{ position: "relative" }}>
          <label className="rp-detail-filter-label">Status</label>
          <button className="rp-detail-select" onClick={() => setShowStsDrop(v => !v)}>
            {mktStatus} <span className="rp-detail-caret">▼</span>
          </button>
          {showStsDrop && (
            <div className="rp-detail-dropdown" onMouseDown={e => e.stopPropagation()}>
              {MKT_STATUSES.map(s => (
                <div key={s} className={`rp-detail-dropdown-item ${s === mktStatus ? "active" : ""}`}
                  onClick={() => { setMktStatus(s); setShowStsDrop(false); }}>{s}</div>
              ))}
            </div>
          )}
        </div>
        <div className="rp-detail-filter-actions">
          <Button variant="ghost" className="rp-detail-refresh-btn" onClick={fetchData} loading={loading}>
            <Refresh size={13} /> Refresh
          </Button>
          <Button variant="ghost" className="rp-detail-save-btn">Save View</Button>
        </div>
      </div>


      <div className="rp-detail-drag-hint">
        {rows.length} client{rows.length !== 1 ? "s" : ""}
        {rows.length > 0 && <>&nbsp;·&nbsp;Total Spend: <strong>₹{rows.reduce((s, r) => s + r.spend, 0).toLocaleString()}</strong></>}
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>Client Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Visits <span className="rp-th-sort">↕</span></th>
              <th>Spend (₹) <span className="rp-th-sort">↕</span></th>
              <th>Last Visit <span className="rp-th-sort">↕</span></th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="rp-detail-loading-cell"><PageLoader /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="rp-detail-empty-cell">No data available</td></tr>
            ) : rows.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((r, i) => (
              <tr key={i}>
                <td><span className="rp-detail-link">{r.clientName}</span></td>
                <td>{r.email}</td>
                <td>{r.phone}</td>
                <td>{r.visits}</td>
                <td className="fw-semibold">₹{r.spend.toLocaleString()}</td>
                <td>{r.lastVisit ?? "—"}</td>
                <td><span style={{ color: statusColor(r.status), fontWeight: 600, fontSize: 12 }}>{r.status}</span></td>
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
};

// ─── Campaign Performance Report Detail ──────────────────────────────────────

interface CampaignPerfRow {
  id: string;
  name: string;
  templateName: string;
  status: string;
  totalContacts: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  blocked: number;
  createdAt: string;
}

const CAMP_STATUSES = ["All", "COMPLETED", "RUNNING", "PAUSED", "SCHEDULED", "FAILED", "DRAFT"];

const CampaignPerformanceReportDetail = ({ report, onBack }: { report: ReportItem; onBack: () => void }) => {
  const [rows,           setRows]           = useState<CampaignPerfRow[]>([]);
  const [allRows,        setAllRows]        = useState<CampaignPerfRow[]>([]);
  const [statusFilter,   setStatusFilter]   = useState("All");
  const [search,         setSearch]         = useState("");
  const [showStatusDrop, setShowStatusDrop] = useState(false);
  const [loading,        setLoading]        = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(10);
  useEffect(() => { setCurrentPage(1); }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const res = await api.get("/api/v1/campaigns", { signal: ctrl.signal });
      const campaigns: any[] = res.data?.data?.data ?? res.data?.data ?? res.data?.campaigns ?? [];
      const mapped: CampaignPerfRow[] = campaigns.map((c: any) => ({
        id:            String(c.id ?? ""),
        name:          c.name ?? "—",
        templateName:  c.template_name ?? c.templateName ?? "—",
        status:        c.status ?? "—",
        totalContacts: c.total_contacts ?? c.totalContacts ?? 0,
        sent:          c.sent_count ?? c.sent ?? 0,
        delivered:     c.delivered_count ?? c.delivered ?? 0,
        read:          c.read_count ?? c.read ?? 0,
        failed:        c.failed_count ?? c.failed ?? 0,
        blocked:       c.blocked_count ?? c.blocked ?? 0,
        createdAt:     (c.created_at ?? c.createdAt ?? "").slice(0, 10),
      }));
      setAllRows(mapped);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") setAllRows([]);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    let filtered = allRows;
    if (statusFilter !== "All") filtered = filtered.filter(r => r.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(r =>
        r.name.toLowerCase().includes(q) || r.templateName.toLowerCase().includes(q)
      );
    }
    setRows(filtered);
  }, [allRows, statusFilter, search]);

  useEffect(() => {
    const close = () => setShowStatusDrop(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const pct = (n: number, total: number) => total > 0 ? `${Math.round((n / total) * 100)}%` : "0%";
  const campStatusColor = (s: string) =>
    s === "COMPLETED" ? "#10b981" : s === "RUNNING" ? "#3b82f6" : s === "PAUSED" ? "#f59e0b" : s === "FAILED" ? "#ef4444" : "#9ca3af";

  const totalSent      = rows.reduce((s, r) => s + r.sent, 0);
  const totalDelivered = rows.reduce((s, r) => s + r.delivered, 0);

  const CAMP_HEADERS = ["Campaign", "Template", "Status", "Contacts", "Sent", "Delivered", "Delivered%", "Read", "Read%", "Failed", "Blocked", "Date"];
  const campExportRows = () => rows.map(r => [r.name, r.templateName, r.status, r.totalContacts, r.sent, r.delivered, pct(r.delivered, r.sent), r.read, pct(r.read, r.sent), r.failed, r.blocked, r.createdAt]);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Button variant="ghost" className="rp-detail-back" onClick={onBack}>
            <ChevronLeft size={15} /> {report.name}
          </Button>
          <div className="rp-detail-view-icons">
            <button className="rp-detail-icon-btn" title="Column view"><Grid3x3Gap size={16} /></button>
            <ReportExportButton title={report.name} headers={CAMP_HEADERS} rows={campExportRows} filename={report.name} />
            <button className="rp-detail-icon-btn" title="Info"><InfoCircle size={16} /></button>
          </div>
        </div>
        <div className="rp-detail-tab-bar"><span className="rp-detail-tab active">Default View</span></div>
      </div>

      <div className="rp-detail-filters">
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Search</label>
          <div className="rp-detail-date-range">
            <Search size={13} style={{ color: "#9ca3af", flexShrink: 0 }} />
            <input type="text" placeholder="Search campaign..." value={search} onChange={e => setSearch(e.target.value)} className="rp-detail-date-input" />
          </div>
        </div>
        <div className="rp-detail-filter-group" style={{ position: "relative" }}>
          <label className="rp-detail-filter-label">Status</label>
          <button className="rp-detail-select" onClick={() => setShowStatusDrop(v => !v)}>
            {statusFilter} <span className="rp-detail-caret">▼</span>
          </button>
          {showStatusDrop && (
            <div className="rp-detail-dropdown" onMouseDown={e => e.stopPropagation()}>
              {CAMP_STATUSES.map(s => (
                <div key={s} className={`rp-detail-dropdown-item ${s === statusFilter ? "active" : ""}`}
                  onClick={() => { setStatusFilter(s); setShowStatusDrop(false); }}>{s}</div>
              ))}
            </div>
          )}
        </div>
        <div className="rp-detail-filter-actions">
          <Button variant="ghost" className="rp-detail-refresh-btn" onClick={fetchData} loading={loading}>
            <Refresh size={13} /> Refresh
          </Button>
          <Button variant="ghost" className="rp-detail-save-btn">Save View</Button>
        </div>
      </div>

      <div className="rp-detail-drag-hint">
        {rows.length} campaign{rows.length !== 1 ? "s" : ""}
        {rows.length > 0 && (
          <>&nbsp;·&nbsp;Total Sent: <strong>{totalSent.toLocaleString()}</strong>
          &nbsp;·&nbsp;Avg Delivery: <strong>{pct(totalDelivered, totalSent)}</strong></>
        )}
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>Campaign <span className="rp-th-sort">↕</span></th>
              <th>Template</th>
              <th>Status</th>
              <th>Contacts</th>
              <th>Sent</th>
              <th>Delivered</th>
              <th>Read</th>
              <th>Failed</th>
              <th>Blocked</th>
              <th>Date <span className="rp-th-sort">↕</span></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="rp-detail-loading-cell"><PageLoader /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={10} className="rp-detail-empty-cell">No data available</td></tr>
            ) : rows.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((r, i) => (
              <tr key={i}>
                <td className="fw-semibold">{r.name}</td>
                <td><span className="rp-detail-link">{r.templateName}</span></td>
                <td><span style={{ color: campStatusColor(r.status), fontWeight: 600, fontSize: 12 }}>{r.status}</span></td>
                <td>{r.totalContacts}</td>
                <td>{r.sent}</td>
                <td>
                  <span>{r.delivered}</span>
                  <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 4 }}>({pct(r.delivered, r.sent)})</span>
                </td>
                <td>
                  <span>{r.read}</span>
                  <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 4 }}>({pct(r.read, r.sent)})</span>
                </td>
                <td style={{ color: r.failed > 0 ? "#ef4444" : undefined }}>{r.failed}</td>
                <td style={{ color: r.blocked > 0 ? "#f59e0b" : undefined }}>{r.blocked}</td>
                <td>{r.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} pageSize={pageSize} totalItems={rows.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} />
    </div>
  );
};

// ─── Template Performance Report Detail ──────────────────────────────────────

interface TemplatePerfRow {
  id: string;
  name: string;
  type: string;
  language: string;
  status: string;
  timesUsed: number;
  totalSent: number;
  totalDelivered: number;
  avgReadRate: number;
}

const TMPL_TYPES_FILTER  = ["All", "MARKETING", "UTILITY", "AUTHENTICATION"];
const TMPL_STATUS_FILTER = ["All", "APPROVED", "PENDING", "REJECTED"];

const TemplatePerformanceReportDetail = ({ report, onBack }: { report: ReportItem; onBack: () => void }) => {
  const [rows,         setRows]         = useState<TemplatePerfRow[]>([]);
  const [allRows,      setAllRows]      = useState<TemplatePerfRow[]>([]);
  const [typeFilter,   setTypeFilter]   = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showTypeDrop, setShowTypeDrop] = useState(false);
  const [showStsDrop,  setShowStsDrop]  = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(10);
  useEffect(() => { setCurrentPage(1); }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const [tmplRes, statsRes] = await Promise.all([
        api.get("/api/v1/templates", { signal: ctrl.signal }),
        api.get("/api/v1/marketing/dashboard/stats", { signal: ctrl.signal }),
      ]);
      const templates: any[]    = tmplRes.data?.data?.data ?? tmplRes.data?.data ?? [];
      const topTemplates: any[] = statsRes.data?.data?.topTemplates ?? statsRes.data?.topTemplates ?? [];
      const perfMap: Record<string, any> = {};
      topTemplates.forEach((t: any) => { perfMap[t.template_name ?? t.name ?? ""] = t; });
      const mapped: TemplatePerfRow[] = templates.map((t: any) => {
        const perf = perfMap[t.name] ?? {};
        return {
          id:            String(t.id ?? ""),
          name:          t.name ?? "—",
          type:          t.category ?? t.type ?? "—",
          language:      t.language ?? "—",
          status:        t.status ?? "—",
          timesUsed:     perf.times_used ?? perf.timesUsed ?? 0,
          totalSent:     perf.total_sent ?? perf.totalSent ?? 0,
          totalDelivered:perf.total_delivered ?? perf.totalDelivered ?? 0,
          avgReadRate:   parseFloat(perf.avg_read_rate ?? perf.avgReadRate ?? "0") || 0,
        };
      });
      setAllRows(mapped);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") setAllRows([]);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    let filtered = allRows;
    if (typeFilter   !== "All") filtered = filtered.filter(r => r.type   === typeFilter);
    if (statusFilter !== "All") filtered = filtered.filter(r => r.status === statusFilter);
    setRows(filtered);
  }, [allRows, typeFilter, statusFilter]);

  useEffect(() => {
    const close = () => { setShowTypeDrop(false); setShowStsDrop(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const tmplStatusColor = (s: string) =>
    s === "APPROVED" ? "#10b981" : s === "PENDING" ? "#f59e0b" : "#ef4444";

  const TMPL_HEADERS = ["Template Name", "Type", "Language", "Status", "Campaigns Used", "Total Sent", "Total Delivered", "Avg Read Rate"];
  const tmplExportRows = () => rows.map(r => [r.name, r.type, r.language, r.status, r.timesUsed, r.totalSent, r.totalDelivered, `${r.avgReadRate}%`]);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Button variant="ghost" className="rp-detail-back" onClick={onBack}>
            <ChevronLeft size={15} /> {report.name}
          </Button>
          <div className="rp-detail-view-icons">
            <button className="rp-detail-icon-btn" title="Column view"><Grid3x3Gap size={16} /></button>
            <ReportExportButton title={report.name} headers={TMPL_HEADERS} rows={tmplExportRows} filename={report.name} />
            <button className="rp-detail-icon-btn" title="Info"><InfoCircle size={16} /></button>
          </div>
        </div>
        <div className="rp-detail-tab-bar"><span className="rp-detail-tab active">Default View</span></div>
      </div>

      <div className="rp-detail-filters">
        <div className="rp-detail-filter-group" style={{ position: "relative" }}>
          <label className="rp-detail-filter-label">Type</label>
          <button className="rp-detail-select" onClick={() => { setShowTypeDrop(v => !v); setShowStsDrop(false); }}>
            {typeFilter} <span className="rp-detail-caret">▼</span>
          </button>
          {showTypeDrop && (
            <div className="rp-detail-dropdown" onMouseDown={e => e.stopPropagation()}>
              {TMPL_TYPES_FILTER.map(t => (
                <div key={t} className={`rp-detail-dropdown-item ${t === typeFilter ? "active" : ""}`}
                  onClick={() => { setTypeFilter(t); setShowTypeDrop(false); }}>{t}</div>
              ))}
            </div>
          )}
        </div>
        <div className="rp-detail-filter-group" style={{ position: "relative" }}>
          <label className="rp-detail-filter-label">Status</label>
          <button className="rp-detail-select" onClick={() => { setShowStsDrop(v => !v); setShowTypeDrop(false); }}>
            {statusFilter} <span className="rp-detail-caret">▼</span>
          </button>
          {showStsDrop && (
            <div className="rp-detail-dropdown" onMouseDown={e => e.stopPropagation()}>
              {TMPL_STATUS_FILTER.map(s => (
                <div key={s} className={`rp-detail-dropdown-item ${s === statusFilter ? "active" : ""}`}
                  onClick={() => { setStatusFilter(s); setShowStsDrop(false); }}>{s}</div>
              ))}
            </div>
          )}
        </div>
        <div className="rp-detail-filter-actions">
          <Button variant="ghost" className="rp-detail-refresh-btn" onClick={fetchData} loading={loading}>
            <Refresh size={13} /> Refresh
          </Button>
          <Button variant="ghost" className="rp-detail-save-btn">Save View</Button>
        </div>
      </div>

      <div className="rp-detail-drag-hint">
        {rows.length} template{rows.length !== 1 ? "s" : ""}
        {rows.length > 0 && <>&nbsp;·&nbsp;Total Sent: <strong>{rows.reduce((s, r) => s + r.totalSent, 0).toLocaleString()}</strong></>}
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>Template Name</th>
              <th>Type</th>
              <th>Language</th>
              <th>Status</th>
              <th>Campaigns Used <span className="rp-th-sort">↕</span></th>
              <th>Total Sent <span className="rp-th-sort">↕</span></th>
              <th>Delivered <span className="rp-th-sort">↕</span></th>
              <th>Avg Read Rate <span className="rp-th-sort">↕</span></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="rp-detail-loading-cell"><PageLoader /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="rp-detail-empty-cell">No data available</td></tr>
            ) : rows.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((r, i) => (
              <tr key={i}>
                <td className="fw-semibold">{r.name}</td>
                <td><span className="rp-report-tag" style={{ fontSize: 11 }}>{r.type}</span></td>
                <td>{r.language}</td>
                <td><span style={{ color: tmplStatusColor(r.status), fontWeight: 600, fontSize: 12 }}>{r.status}</span></td>
                <td>{r.timesUsed > 0 ? r.timesUsed : "—"}</td>
                <td>{r.totalSent > 0 ? r.totalSent.toLocaleString() : "—"}</td>
                <td>{r.totalDelivered > 0 ? r.totalDelivered.toLocaleString() : "—"}</td>
                <td>{r.avgReadRate > 0 ? `${r.avgReadRate}%` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} pageSize={pageSize} totalItems={rows.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} />
    </div>
  );
};

// ─── Message Spend Report Detail ─────────────────────────────────────────────

interface SpendRow {
  date: string;
  marketing: number;
  utility: number;
  authentication: number;
  service: number;
  total: number;
  estimatedCost: number;
}

const MSG_SPEND_PERIODS = [
  { label: "7D",  days: 7  },
  { label: "15D", days: 15 },
  { label: "30D", days: 30 },
  { label: "60D", days: 60 },
  { label: "90D", days: 90 },
];

const MessageSpendReportDetail = ({ report, onBack }: { report: ReportItem; onBack: () => void }) => {
  const [rows,       setRows]       = useState<SpendRow[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [periodDays, setPeriodDays] = useState(30);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(10);
  const [kpis, setKpis] = useState({ totalMessages: 0, totalCost: 0, marketing: 0, utility: 0 });
  useEffect(() => { setCurrentPage(1); }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const endDate   = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - periodDays);
      const start = startDate.toISOString().slice(0, 10);
      const end   = endDate.toISOString().slice(0, 10);
      const res = await api.get(`/api/v1/marketing/analytics?start=${start}&end=${end}&granularity=DAILY`, { signal: ctrl.signal });
      const data = res.data?.data ?? res.data ?? {};
      const daily: any[] = data.daily ?? [];
      const mapped: SpendRow[] = daily.map((d: any) => ({
        date:           d.date ?? "",
        marketing:      d.marketing ?? 0,
        utility:        d.utility ?? 0,
        authentication: d.authentication ?? 0,
        service:        d.service ?? 0,
        total:          d.totalMessages ?? d.total_messages ?? ((d.marketing ?? 0) + (d.utility ?? 0) + (d.authentication ?? 0) + (d.service ?? 0)),
        estimatedCost:  parseFloat(d.estimatedCost ?? d.estimated_cost ?? "0") || 0,
      }));
      setRows(mapped);
      setKpis({
        totalMessages: data.totalMessages ?? data.total_messages ?? 0,
        totalCost:     parseFloat(data.totalEstimatedCost ?? data.total_estimated_cost ?? "0") || 0,
        marketing:     data.byCategory?.marketing ?? 0,
        utility:       data.byCategory?.utility ?? 0,
      });
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") setRows([]);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [periodDays]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const SPEND_HEADERS = ["Date", "Marketing", "Utility", "Authentication", "Service (Free)", "Total", "Est. Cost (₹)"];
  const spendExportRows = () => rows.map(r => [r.date, r.marketing, r.utility, r.authentication, r.service, r.total, r.estimatedCost.toFixed(2)]);

  const spendKpiCards = [
    { label: "Total Messages",  value: kpis.totalMessages.toLocaleString(), color: "#3b82f6" },
    { label: "Estimated Spend", value: `₹${kpis.totalCost.toFixed(2)}`,     color: "#10b981" },
    { label: "Marketing Msgs",  value: kpis.marketing.toLocaleString(),      color: "#8b5cf6" },
    { label: "Utility Msgs",    value: kpis.utility.toLocaleString(),        color: "#f59e0b" },
  ];

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Button variant="ghost" className="rp-detail-back" onClick={onBack}>
            <ChevronLeft size={15} /> {report.name}
          </Button>
          <div className="rp-detail-view-icons">
            <button className="rp-detail-icon-btn" title="Column view"><Grid3x3Gap size={16} /></button>
            <ReportExportButton title={report.name} headers={SPEND_HEADERS} rows={spendExportRows} filename={report.name} />
            <button className="rp-detail-icon-btn" title="Info"><InfoCircle size={16} /></button>
          </div>
        </div>
        <div className="rp-detail-tab-bar"><span className="rp-detail-tab active">Default View</span></div>
      </div>

      <div className="rp-detail-filters">
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Period</label>
          <div style={{ display: "flex", gap: 6 }}>
            {MSG_SPEND_PERIODS.map(p => (
              <button key={p.days} className={`rp-detail-select${periodDays === p.days ? " active" : ""}`}
                style={{ minWidth: 44 }} onClick={() => setPeriodDays(p.days)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="rp-detail-filter-actions">
          <Button variant="ghost" className="rp-detail-refresh-btn" onClick={fetchData} loading={loading}>
            <Refresh size={13} /> Refresh
          </Button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, margin: "16px 0" }}>
        {spendKpiCards.map(k => (
          <div key={k.label} style={{ background: "#fff", border: "1px solid #f3f4f6", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.color, marginTop: 4 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {rows.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #f3f4f6", borderRadius: 10, padding: "16px", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 12 }}>Daily Message Volume</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={rows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="marketing"      name="Marketing"      fill="#8b5cf6" stackId="a" />
              <Bar dataKey="utility"        name="Utility"        fill="#3b82f6" stackId="a" />
              <Bar dataKey="authentication" name="Authentication" fill="#10b981" stackId="a" />
              <Bar dataKey="service"        name="Service (Free)" fill="#d1d5db" stackId="a" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
            {([["#8b5cf6","Marketing"],["#3b82f6","Utility"],["#10b981","Authentication"],["#d1d5db","Service (Free)"]] as [string,string][]).map(([c,l]) => (
              <span key={l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#6b7280" }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: c, flexShrink: 0 }} />{l}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="rp-detail-drag-hint">
        {rows.length} day{rows.length !== 1 ? "s" : ""}
        {rows.length > 0 && <>&nbsp;·&nbsp;Total Cost: <strong>₹{rows.reduce((s, r) => s + r.estimatedCost, 0).toFixed(2)}</strong></>}
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>Date <span className="rp-th-sort">↕</span></th>
              <th>Marketing</th>
              <th>Utility</th>
              <th>Authentication</th>
              <th>Service (Free)</th>
              <th>Total <span className="rp-th-sort">↕</span></th>
              <th>Est. Cost (₹) <span className="rp-th-sort">↕</span></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="rp-detail-loading-cell"><PageLoader /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="rp-detail-empty-cell">No data available</td></tr>
            ) : rows.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((r, i) => (
              <tr key={i}>
                <td>{r.date}</td>
                <td>{r.marketing > 0 ? r.marketing : "—"}</td>
                <td>{r.utility > 0 ? r.utility : "—"}</td>
                <td>{r.authentication > 0 ? r.authentication : "—"}</td>
                <td>{r.service > 0 ? r.service : "—"}</td>
                <td className="fw-semibold">{r.total}</td>
                <td>₹{r.estimatedCost.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} pageSize={pageSize} totalItems={rows.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} />
    </div>
  );
};

// ─── Employee Report Detail ───────────────────────────────────────────────────

interface EmployeeRow {
  name: string;
  role: string;
  department: string;
  servicesPerformed: number;
  productsSold: number;
  serviceRevenue: number;
  productRevenue: number;
  revenue: number;
  avgTicket: number;
  bookings: number;
  customerCount: number;
}

const EMP_TYPES = [
  { label: "All",       value: "All"       },
  { label: "Full-time", value: "full_time" },
  { label: "Part-time", value: "part_time" },
  { label: "Contract",  value: "contract"  },
  { label: "Freelance", value: "freelance" },
];

const EmployeeReportDetail = ({ report, onBack }: { report: ReportItem; onBack: () => void }) => {
  const dispatch = useDispatch<AppDispatch>();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [dateFrom,        setDateFrom]        = useState(monthStart);
  const [dateTo,          setDateTo]          = useState(today);
  const [employee,        setEmployee]        = useState("All");
  const [employeeOptions, setEmployeeOptions] = useState<{ label: string; value: string }[]>([{ label: "All", value: "All" }]);
  const [empType,         setEmpType]         = useState("All");
  const [activity,        setActivity]        = useState("all");
  const [showEmpDrop,     setShowEmpDrop]     = useState(false);
  const [showDeptDrop,    setShowDeptDrop]    = useState(false);
  const [showActDrop,     setShowActDrop]     = useState(false);

  useEffect(() => {
    dispatch(fetchStaffThunk()).unwrap().then(staffList => {
      const opts = staffList.map((s: any) => ({
        label: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.fullName || s.name || "",
        value: String(s.id ?? ""),
      })).filter((o: any) => o.label && o.value);
      setEmployeeOptions([{ label: "All", value: "All" }, ...opts]);
    }).catch(() => {});
  }, []);
  const [allRows,         setAllRows]         = useState<EmployeeRow[]>([]);
  const [loading,         setLoading]         = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(10);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const apptParams = new URLSearchParams({ start_date: dateFrom, end_date: dateTo, limit: "500" });
      const saleParams = new URLSearchParams({ start_date: dateFrom, end_date: dateTo, limit: "500" });
      const [apptRes, saleRes, staffList] = await Promise.all([
        api.get(`${BOOKING.BASE}?${apptParams}`, { signal: ctrl.signal }),
        api.get(`${SALE.BASE}?${saleParams}`,    { signal: ctrl.signal }),
        dispatch(fetchStaffThunk()).unwrap(),
      ]);

      const normalizeEmpType = (v: string) => (v ?? "").toLowerCase().replace(/[-\s]+/g, "_");

      const staffInfoMap = new Map<string, { name: string; role: string; department: string; empType: string }>();
      staffList.forEach((s: any) => {
        const name = `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.fullName || s.name || "—";
        const info = {
          name,
          role:       s.role ?? s.position ?? "Staff",
          department: s.department ?? s.dept ?? "General",
          empType:    normalizeEmpType(s.employment_type ?? s.employmentType ?? ""),
        };
        // Map by every ID field the appointment may use as staff_id
        [s.id, s.user_id, s.uuid, s.staff_id, s.staff_uuid, s.userId, s.staffId]
          .filter(Boolean)
          .forEach(uid => staffInfoMap.set(String(uid), info));
      });

      // Parse appointment list
      const rawAppt = apptRes.data?.data;
      const appts: any[] = Array.isArray(rawAppt?.data) ? rawAppt.data : (Array.isArray(rawAppt) ? rawAppt : []);

      const aggMap = new Map<string, {
        name: string; role: string; department: string; empType: string;
        bookings: number; revenue: number; services: number;
        productsSold: number; serviceRevenue: number; productRevenue: number;
        customerIds: Set<string>;
      }>();

      const ensureEntry = (staffId: string) => {
        if (!aggMap.has(staffId)) {
          const info = staffInfoMap.get(staffId) ?? { name: staffId, role: "Staff", department: "General", empType: "" };
          aggMap.set(staffId, { ...info, bookings: 0, revenue: 0, services: 0, productsSold: 0, serviceRevenue: 0, productRevenue: 0, customerIds: new Set() });
        }
        return aggMap.get(staffId)!;
      };

      // ── Appointments ──────────────────────────────────────────────────────
      appts.forEach((appt: any) => {
        const staffId = String(appt.staff_id ?? appt.staffId ?? "");
        if (!staffId || staffId === "undefined" || staffId === "null") return;
        const svcItems  = Array.isArray(appt.services)      ? appt.services      : [];
        const prodItems = Array.isArray(appt.product_items) ? appt.product_items : [];
        const pkgItems  = Array.isArray(appt.package_items) ? appt.package_items : [];
        const svcRev  = svcItems.reduce((s: number, it: any)  => s + (parseFloat(String(it.price ?? 0)) || 0) * (Number(it.quantity ?? it.qty ?? 1) || 1), 0);
        const prodRev = prodItems.reduce((s: number, it: any) => s + (parseFloat(String(it.price ?? 0)) || 0) * (Number(it.quantity ?? it.qty ?? 1) || 1), 0);
        const pkgRev  = pkgItems.reduce((s: number, it: any)  => s + (parseFloat(String(it.price ?? 0)) || 0) * (Number(it.quantity ?? it.qty ?? 1) || 1), 0);
        const computedTotal = svcRev + prodRev + pkgRev;
        const revenue = parseFloat(String(appt.grand_total ?? appt.total_amount ?? appt.grandTotal ?? 0)) || computedTotal;
        const svcCount  = svcItems.length || 1;
        const prodCount = prodItems.reduce((s: number, it: any) => s + (Number(it.quantity ?? it.qty ?? 1) || 1), 0);
        // Resolve name from inline appt fields when not in staffInfoMap
        if (!staffInfoMap.has(staffId)) {
          const inlineName =
            `${appt.staff_first_name ?? ""} ${appt.staff_last_name ?? ""}`.trim()
            || appt.staff_name
            || appt.staff?.name
            || `${appt.staff?.first_name ?? ""} ${appt.staff?.last_name ?? ""}`.trim()
            || "Unknown Staff";
          staffInfoMap.set(staffId, { name: inlineName, role: "Staff", department: "General", empType: "" });
        }
        const customerId = String(appt.client_id ?? appt.customer_id ?? appt.clientId ?? "");
        const e = ensureEntry(staffId);
        e.bookings       += 1;
        e.revenue        += revenue;
        e.services       += svcCount;
        e.productsSold   += prodCount;
        e.serviceRevenue += svcRev + pkgRev;
        e.productRevenue += prodRev;
        if (customerId && customerId !== "undefined" && customerId !== "null") e.customerIds.add(customerId);
      });

      // ── Quick Sales ───────────────────────────────────────────────────────
      const rawSales = saleRes.data?.data;
      const sales: any[] = Array.isArray(rawSales?.data) ? rawSales.data : (Array.isArray(rawSales) ? rawSales : []);
      sales.forEach((sale: any) => {
        const items: any[] = Array.isArray(sale.items) ? sale.items : [];
        items.forEach((it: any) => {
          const staffId = String(it.staff_id ?? "");
          if (!staffId || staffId === "undefined" || staffId === "null") return;
          // Resolve inline name from sale item when not in staffInfoMap
          if (!staffInfoMap.has(staffId) && it.staff_name) {
            staffInfoMap.set(staffId, { name: it.staff_name, role: "Staff", department: "General", empType: "" });
          }
          const e = ensureEntry(staffId);
          const qty   = Number(it.quantity ?? 1) || 1;
          const price = parseFloat(String(it.total_price ?? it.unit_price ?? 0)) || 0;
          const type  = String(it.item_type ?? "");
          e.revenue += price;
          if (type === "product") { e.productRevenue += price; e.productsSold += qty; }
          else                    { e.serviceRevenue += price; e.services     += qty; }
          const cid = String(sale.client_id ?? "");
          if (cid && cid !== "undefined" && cid !== "null") e.customerIds.add(cid);
        });
      });

      // Fallback: include staff with 0 activity so they still appear
      staffList.forEach((s: any) => {
        const sid = String(s.id);
        if (!aggMap.has(sid)) {
          const info = staffInfoMap.get(sid) ?? {
            name: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.fullName || s.name || "—",
            role: s.role ?? "Staff",
            department: s.department ?? "General",
            empType: normalizeEmpType(s.employment_type ?? s.employmentType ?? ""),
          };
          aggMap.set(sid, { ...info, bookings: 0, revenue: 0, services: 0, productsSold: 0, serviceRevenue: 0, productRevenue: 0, customerIds: new Set() });
        }
      });

      const normalizedFilter = normalizeEmpType(empType);
      let mapped: EmployeeRow[] = Array.from(aggMap.values())
        .filter(e => empType === "All" || normalizeEmpType(e.empType) === normalizedFilter)
        .map(e => ({
          name:              e.name,
          role:              e.role,
          department:        e.department,
          servicesPerformed: e.services,
          productsSold:      e.productsSold,
          serviceRevenue:    e.serviceRevenue,
          productRevenue:    e.productRevenue,
          revenue:           e.revenue,
          avgTicket:         e.bookings > 0 ? Math.round(e.revenue / e.bookings) : 0,
          bookings:          e.bookings,
          customerCount:     e.customerIds.size,
        }));

      setAllRows(mapped);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") setAllRows([]);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo, empType]);

  // client-side filter + sort
  const rows = useMemo(() => {
    let data = [...allRows];
    // filter by selected employee name
    if (employee !== "All") {
      const empLabel = (employeeOptions.find(o => o.value === employee)?.label ?? "").toLowerCase().trim();
      if (empLabel) data = data.filter(r => (r.name ?? "").toLowerCase().trim() === empLabel);
    }
    // activity filter
    if (activity === "active")   data = data.filter(r => r.bookings > 0);
    if (activity === "inactive") data = data.filter(r => r.bookings === 0);
    data.sort((a, b) => b.revenue - a.revenue);
    return data;
  }, [allRows, employee, employeeOptions, activity]);

  useEffect(() => { setCurrentPage(1); }, [rows]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const close = () => { setShowEmpDrop(false); setShowDeptDrop(false); setShowActDrop(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const selectedEmpLabel = employeeOptions.find(o => o.value === employee)?.label ?? "All";
  const HEADERS = ["Name", "Role", "Department", "Bookings", "Services Sold", "Products Sold", "Service Revenue (₹)", "Product Revenue (₹)", "Total Revenue (₹)", "Avg Ticket (₹)", "Customers"];
  const exportRows = () => rows.map(r => [r.name, r.role, r.department, r.bookings, r.servicesPerformed, r.productsSold, r.serviceRevenue, r.productRevenue, r.revenue, r.avgTicket, r.customerCount]);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Button variant="ghost" className="rp-detail-back" onClick={onBack}>
            <ChevronLeft size={15} /> {report.name}
          </Button>
          <div className="rp-detail-view-icons">
            <button className="rp-detail-icon-btn" title="Column view"><Grid3x3Gap size={16} /></button>
            <ReportExportButton
                title={report.name}
                headers={HEADERS}
                rows={exportRows}
                filename={`${report.name}-${dateFrom}-${dateTo}`}
              />
            <button className="rp-detail-icon-btn" title="Info"><InfoCircle size={16} /></button>
          </div>
        </div>
        <div className="rp-detail-tab-bar"><span className="rp-detail-tab active">Default View</span></div>
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
        <div className="rp-detail-filter-group" style={{ position: "relative" }}>
          <label className="rp-detail-filter-label">Employee</label>
          <button className="rp-detail-select" onClick={() => { setShowEmpDrop((v: boolean) => !v); setShowDeptDrop(false); }}>
            {selectedEmpLabel.length > 16 ? selectedEmpLabel.slice(0, 16) + "…" : selectedEmpLabel}
            <span className="rp-detail-caret">▼</span>
          </button>
          {showEmpDrop && (
            <div className="rp-detail-dropdown" onMouseDown={e => e.stopPropagation()}>
              {employeeOptions.map(o => (
                <div key={o.value} className={`rp-detail-dropdown-item ${o.value === employee ? "active" : ""}`}
                  onClick={() => { setEmployee(o.value); setShowEmpDrop(false); }}>{o.label}</div>
              ))}
            </div>
          )}
        </div>
        <div className="rp-detail-filter-group" style={{ position: "relative" }}>
          <label className="rp-detail-filter-label">Emp. Type</label>
          <button className="rp-detail-select" onClick={() => { setShowDeptDrop((v: boolean) => !v); setShowEmpDrop(false); }}>
            {EMP_TYPES.find(t => t.value === empType)?.label ?? "All"} <span className="rp-detail-caret">▼</span>
          </button>
          {showDeptDrop && (
            <div className="rp-detail-dropdown" onMouseDown={e => e.stopPropagation()}>
              {EMP_TYPES.map(t => (
                <div key={t.value} className={`rp-detail-dropdown-item ${t.value === empType ? "active" : ""}`}
                  onClick={() => { setEmpType(t.value); setShowDeptDrop(false); }}>{t.label}</div>
              ))}
            </div>
          )}
        </div>
        <div className="rp-detail-filter-group" style={{ position: "relative" }}>
          <label className="rp-detail-filter-label">Activity</label>
          <button className="rp-detail-select" onClick={() => { setShowActDrop(v => !v); setShowEmpDrop(false); setShowDeptDrop(false); }}>
            {{ all: "All", active: "Active", inactive: "No Activity" }[activity] ?? "All"} <span className="rp-detail-caret">▼</span>
          </button>
          {showActDrop && (
            <div className="rp-detail-dropdown" onMouseDown={e => e.stopPropagation()}>
              {[{ label: "All", value: "all" }, { label: "Active (has bookings)", value: "active" }, { label: "No Activity", value: "inactive" }].map(o => (
                <div key={o.value} className={`rp-detail-dropdown-item ${o.value === activity ? "active" : ""}`}
                  onClick={() => { setActivity(o.value); setShowActDrop(false); }}>{o.label}</div>
              ))}
            </div>
          )}
        </div>
        <div className="rp-detail-filter-actions">
          <Button variant="ghost" className="rp-detail-refresh-btn" onClick={fetchData} loading={loading}>
            <Refresh size={13} /> Refresh
          </Button>
          <Button variant="ghost" className="rp-detail-save-btn">Save View</Button>
        </div>
      </div>


      <div className="rp-detail-drag-hint">
        {rows.length} staff member{rows.length !== 1 ? "s" : ""}
        {rows.length > 0 && (
          <>&nbsp;·&nbsp;Total Revenue: <strong>₹{rows.reduce((s, r) => s + r.revenue, 0).toLocaleString()}</strong>
          &nbsp;·&nbsp;Services Sold: <strong>{rows.reduce((s, r) => s + r.servicesPerformed, 0)}</strong>
          &nbsp;·&nbsp;Products Sold: <strong>{rows.reduce((s, r) => s + r.productsSold, 0)}</strong></>
        )}
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Role</th>
              <th>Department</th>
              <th>Bookings</th>
              <th>Services Sold <span className="rp-th-sort">↕</span></th>
              <th>Products Sold</th>
              <th>Service Rev (₹) <span className="rp-th-sort">↕</span></th>
              <th>Product Rev (₹)</th>
              <th>Total Rev (₹) <span className="rp-th-sort">↕</span></th>
              <th>Avg Ticket (₹)</th>
              <th>Customers</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={12} className="rp-detail-loading-cell"><PageLoader /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={12} className="rp-detail-empty-cell">No data available</td></tr>
            ) : rows.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((r, i) => (
              <tr key={i}>
                <td style={{ color: "#9ca3af", fontSize: 12 }}>#{i + 1}</td>
                <td className="fw-semibold">{r.name}</td>
                <td>{r.role}</td>
                <td>{r.department}</td>
                <td>{r.bookings}</td>
                <td>{r.servicesPerformed}</td>
                <td>{r.productsSold}</td>
                <td>₹{r.serviceRevenue.toLocaleString()}</td>
                <td>₹{r.productRevenue.toLocaleString()}</td>
                <td className="fw-semibold">₹{r.revenue.toLocaleString()}</td>
                <td>₹{r.avgTicket.toLocaleString()}</td>
                <td>{r.customerCount}</td>
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
};

// ─── Revenue by Service Report Detail ────────────────────────────────────────

interface RevenueByServiceRow {
  name: string;
  bookings: number;
  revenue: number;
  avgTicket: number;
  growth: number;
}

const RevenueByServiceReportDetail = ({ report, onBack }: { report: ReportItem; onBack: () => void }) => {
  const today      = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [dateFrom,       setDateFrom]       = useState(monthStart);
  const [dateTo,         setDateTo]         = useState(today);
  const [rows,           setRows]           = useState<RevenueByServiceRow[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [sortKey,        setSortKey]        = useState<"revenue" | "bookings">("revenue");

  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const params = new URLSearchParams({ period: "custom", from: dateFrom, to: dateTo });
      const res = await api.get<{ data: { services: RevenueByServiceRow[] } }>(
        REPORT.DETAIL("services", params.toString()),
        { signal: ctrl.signal },
      );
      if (res.data?.data?.services?.length) setRows(res.data.data.services);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") setRows([]);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => b[sortKey] - a[sortKey]),
    [rows, sortKey],
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(10);
  useEffect(() => { setCurrentPage(1); }, [sorted]); // eslint-disable-line react-hooks/exhaustive-deps

  const HEADERS = ["Service Name", "Bookings", "Revenue (₹)", "Avg Ticket (₹)", "Growth %"];
  const exportRows = () =>
    sorted.map(r => [r.name, r.bookings, r.revenue, r.avgTicket, `${r.growth}%`]);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Button variant="ghost" className="rp-detail-back" onClick={onBack}>
            <ChevronLeft size={15} /> {report.name}
          </Button>
          <div className="rp-detail-view-icons">
            <button className="rp-detail-icon-btn" title="Column view"><Grid3x3Gap size={16} /></button>
            <ReportExportButton
                title={report.name}
                headers={HEADERS}
                rows={exportRows}
                filename={`${report.name}-${dateFrom}-${dateTo}`}
              />
            <button className="rp-detail-icon-btn" title="Info"><InfoCircle size={16} /></button>
          </div>
        </div>
        <div className="rp-detail-tab-bar"><span className="rp-detail-tab active">Default View</span></div>
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
          <label className="rp-detail-filter-label">Sort By</label>
          <div className="rp-detail-date-range">
            {(["revenue", "bookings"] as const).map(k => (
              <button
                key={k}
                className={`rp-detail-select ${sortKey === k ? "active" : ""}`}
                style={{ marginRight: 6 }}
                onClick={() => setSortKey(k)}
              >
                {k === "revenue" ? "Revenue" : "Bookings"}
              </button>
            ))}
          </div>
        </div>
        <div className="rp-detail-filter-actions">
          <Button variant="ghost" className="rp-detail-refresh-btn" onClick={fetchData} loading={loading}>
            <Refresh size={13} /> Refresh
          </Button>
          <Button variant="ghost" className="rp-detail-save-btn">Save View</Button>
        </div>
      </div>


      <div className="rp-detail-drag-hint">
        {rows.length} service{rows.length !== 1 ? "s" : ""}
        {rows.length > 0 && <>&nbsp;·&nbsp;Total Revenue: <strong>₹{rows.reduce((s, r) => s + r.revenue, 0).toLocaleString()}</strong></>}
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>Service Name</th>
              <th>Bookings <span className="rp-th-sort">↕</span></th>
              <th>Revenue (₹) <span className="rp-th-sort">↕</span></th>
              <th>Avg Ticket (₹) <span className="rp-th-sort">↕</span></th>
              <th>Growth %</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="rp-detail-loading-cell"><PageLoader /></td></tr>
            ) : sorted.length === 0 ? (
              <tr><td colSpan={5} className="rp-detail-empty-cell">No data available</td></tr>
            ) : sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((r, i) => (
              <tr key={i}>
                <td className="fw-semibold">{r.name}</td>
                <td>{r.bookings}</td>
                <td className="fw-semibold">₹{r.revenue.toLocaleString()}</td>
                <td>₹{r.avgTicket.toLocaleString()}</td>
                <td>
                  <span style={{ color: r.growth >= 0 ? "#10b981" : "#ef4444", fontWeight: 600 }}>
                    {r.growth >= 0 ? "+" : ""}{r.growth}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage} pageSize={pageSize} totalItems={sorted.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }}
      />
    </div>
  );
};

// ─── VIP Clients Report Detail ────────────────────────────────────────────────
const VIP_TIERS = [
  { label: "All",    value: "all"    },
  { label: "Gold",   value: "gold"   },
  { label: "Silver", value: "silver" },
  { label: "Bronze", value: "bronze" },
];

function getVipTier(visits: number): "gold" | "silver" | "bronze" {
  if (visits >= 8) return "gold";
  if (visits >= 4) return "silver";
  return "bronze";
}

interface VipClientRow {
  clientId:   string;
  name:       string;
  phone:      string;
  email:      string;
  visits:     number;
  totalSpend: number;
  avgTicket:  number;
  lastVisit:  string;
  tier:       "gold" | "silver" | "bronze";
}

const VipClientsReportDetail = ({ report, onBack }: { report: ReportItem; onBack: () => void }) => {
  const today      = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const [dateFrom,    setDateFrom]    = useState(monthStart);
  const [dateTo,      setDateTo]      = useState(today);
  const [allRows,     setAllRows]     = useState<VipClientRow[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [tier,        setTier]        = useState("all");
  const [showTierDrop,setShowTierDrop]= useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(10);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const apptParams = new URLSearchParams({ start_date: dateFrom, end_date: dateTo, limit: "1000" });
      const [clientRes, apptRes] = await Promise.all([
        api.get(CLIENT.BASE, { signal: ctrl.signal }),
        api.get(`${BOOKING.BASE}?${apptParams}`, { signal: ctrl.signal }),
      ]);

      // Build client map: id → { name, phone, email }
      const clientRaw = clientRes.data?.data;
      const clientList: any[] = Array.isArray(clientRaw?.items) ? clientRaw.items
        : Array.isArray(clientRaw?.data) ? clientRaw.data
        : Array.isArray(clientRaw) ? clientRaw : [];

      const clientMap = new Map<string, { name: string; phone: string; email: string }>();
      clientList.forEach((c: any) => {
        const name = c.full_name ?? c.fullName ?? `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() ?? "Unknown";
        clientMap.set(String(c.id), { name, phone: c.phone ?? c.phone_number ?? "—", email: c.email ?? "—" });
      });

      // Aggregate per client from appointments
      const aggMap = new Map<string, { visits: number; totalSpend: number; lastVisit: string; clientName: string; clientPhone: string }>();
      const apptRaw = apptRes.data?.data?.data ?? apptRes.data?.data ?? apptRes.data ?? [];
      const appts: any[] = Array.isArray(apptRaw) ? apptRaw : [];

      appts.forEach((appt: any) => {
        const cid = String(appt.client_id ?? appt.clientId ?? "");
        if (!cid || cid === "null") return;
        const items = [
          ...(Array.isArray(appt.services)      ? appt.services      : []),
          ...(Array.isArray(appt.product_items) ? appt.product_items : []),
          ...(Array.isArray(appt.package_items) ? appt.package_items : []),
        ];
        const computed = items.reduce((s: number, i: any) =>
          s + (parseFloat(String(i.price ?? 0)) || 0) * (Number(i.quantity ?? i.qty ?? 1) || 1), 0);
        const spend = parseFloat(String(appt.grand_total ?? appt.total_amount ?? 0)) || computed;
        const visitDate = appt.scheduled_at ?? appt.date ?? "";
        const apptClientName  = appt.client_name ?? appt.clientName ?? appt.customer_name ?? "";
        const apptClientPhone = appt.client_phone ?? appt.clientPhone ?? appt.phone ?? "";
        const prev = aggMap.get(cid) ?? { visits: 0, totalSpend: 0, lastVisit: "", clientName: "", clientPhone: "" };
        aggMap.set(cid, {
          visits:      prev.visits + 1,
          totalSpend:  prev.totalSpend + spend,
          lastVisit:   visitDate > prev.lastVisit ? visitDate : prev.lastVisit,
          clientName:  prev.clientName || apptClientName,
          clientPhone: prev.clientPhone || apptClientPhone,
        });
      });

      const rows: VipClientRow[] = Array.from(aggMap.entries()).map(([cid, agg]) => {
        const info = clientMap.get(cid);
        const resolvedName  = info?.name  || agg.clientName  || `Unknown (${cid.slice(0, 8)})`;
        const resolvedPhone = info?.phone || agg.clientPhone || "—";
        const resolvedEmail = info?.email || "—";
        return {
          clientId:   cid,
          name:       resolvedName,
          phone:      resolvedPhone,
          email:      resolvedEmail,
          visits:     agg.visits,
          totalSpend: agg.totalSpend,
          avgTicket:  agg.visits > 0 ? agg.totalSpend / agg.visits : 0,
          lastVisit:  agg.lastVisit ? new Date(agg.lastVisit).toLocaleDateString("en-IN") : "—",
          tier:       getVipTier(agg.visits),
        };
      });

      rows.sort((a, b) => b.visits - a.visits || b.totalSpend - a.totalSpend);
      setAllRows(rows);
    } finally {
      if (!abortRef.current?.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo]);

  const rows = useMemo(() => {
    let data = [...allRows];
    if (tier !== "all") data = data.filter(r => r.tier === tier);
    return data;
  }, [allRows, tier]);

  useEffect(() => { setCurrentPage(1); }, [rows]);
  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const close = () => setShowTierDrop(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const HEADERS    = ["Name", "Phone", "Email", "Visits", "Total Spend (₹)", "Avg Ticket (₹)", "Last Visit", "VIP Tier"];
  const exportRows = () => rows.map(r => [r.name, r.phone, r.email, r.visits, r.totalSpend.toFixed(2), r.avgTicket.toFixed(2), r.lastVisit, r.tier]);
  const paged      = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const tierBadge = (t: string) => {
    const styles: Record<string, React.CSSProperties> = {
      gold:   { background: "#fef3c7", color: "#92400e", border: "1px solid #f59e0b" },
      silver: { background: "#f1f5f9", color: "#475569", border: "1px solid #94a3b8" },
      bronze: { background: "#fdf2f1", color: "#9a3412", border: "1px solid #fdba74" },
    };
    return (
      <span style={{ ...styles[t], padding: "2px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600, textTransform: "capitalize" }}>
        {t === "gold" ? "🥇 " : t === "silver" ? "🥈 " : "🥉 "}{t}
      </span>
    );
  };

  return (
    <div className="rp-detail-root">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Button variant="ghost" className="rp-detail-back-btn" onClick={onBack}>
            <ChevronLeft size={15} /> {report.name}
          </Button>
          <div className="rp-detail-view-icons">
            <AppsNavButton />
            <ReportExportButton title={report.name} headers={HEADERS} rows={exportRows} filename={`${report.name}-${dateFrom}-${dateTo}`} />
            <button className="rp-detail-icon-btn" title="Info"><InfoCircle size={16} /></button>
          </div>
        </div>
        <div className="rp-detail-tab-bar"><span className="rp-detail-tab active">Default View</span></div>
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
        <div className="rp-detail-filter-group" style={{ position: "relative" }}>
          <label className="rp-detail-filter-label">VIP Tier</label>
          <button className="rp-detail-select" onClick={() => setShowTierDrop(v => !v)}>
            {VIP_TIERS.find(t => t.value === tier)?.label ?? "All"} <span className="rp-detail-caret">▼</span>
          </button>
          {showTierDrop && (
            <div className="rp-detail-dropdown" onMouseDown={e => e.stopPropagation()}>
              {VIP_TIERS.map(t => (
                <div key={t.value} className={`rp-detail-dropdown-item ${t.value === tier ? "active" : ""}`}
                  onClick={() => { setTier(t.value); setShowTierDrop(false); }}>{t.label}</div>
              ))}
            </div>
          )}
        </div>
        <div className="rp-detail-filter-actions">
          <Button variant="ghost" className="rp-detail-refresh-btn" onClick={fetchData} loading={loading}>
            <Refresh size={13} /> Refresh
          </Button>
          <Button variant="ghost" className="rp-detail-save-btn">Save View</Button>
        </div>
      </div>

      <div className="rp-detail-drag-hint">
        {rows.length} VIP client{rows.length !== 1 ? "s" : ""}
        &nbsp;·&nbsp;Gold: <strong>{rows.filter(r=>r.tier==="gold").length}</strong>
        &nbsp;·&nbsp;Silver: <strong>{rows.filter(r=>r.tier==="silver").length}</strong>
        &nbsp;·&nbsp;Bronze: <strong>{rows.filter(r=>r.tier==="bronze").length}</strong>
      </div>

      <div className="rp-detail-table-wrap">
        {loading ? (
          <div className="rp-detail-loading">Loading VIP client data…</div>
        ) : paged.length === 0 ? (
          <div className="rp-detail-empty">No client visit data found for this period.</div>
        ) : (
          <table className="rp-detail-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Client Name</th>
                <th>Phone</th>
                <th>Visits</th>
                <th>Total Spend (₹)</th>
                <th>Avg Ticket (₹)</th>
                <th>Last Visit</th>
                <th>VIP Tier</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((r, i) => (
                <tr key={r.clientId}>
                  <td>#{(currentPage - 1) * pageSize + i + 1}</td>
                  <td><strong>{r.name}</strong></td>
                  <td>{r.phone}</td>
                  <td style={{ fontWeight: 700, color: "#6c3ce1" }}>{r.visits}</td>
                  <td>₹{r.totalSpend.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                  <td>₹{r.avgTicket.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                  <td>{r.lastVisit}</td>
                  <td>{tierBadge(r.tier)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination
        currentPage={currentPage} pageSize={pageSize} totalItems={rows.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }}
      />
    </div>
  );
};

// ─── Staff Schedule Report Detail ─────────────────────────────────────────────
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface StaffScheduleRow {
  staffId:  number;
  name:     string;
  role:     string;
  schedule: Record<number, { available: boolean; start: string; end: string }>;
}

const StaffScheduleReportDetail = ({ report, onBack }: { report: ReportItem; onBack: () => void }) => {
  const dispatch = useDispatch<AppDispatch>();

  const [allRows,     setAllRows]     = useState<StaffScheduleRow[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [employee,    setEmployee]    = useState("All");
  const [employeeOptions, setEmployeeOptions] = useState<{ label: string; value: string }[]>([{ label: "All", value: "All" }]);
  const [showEmpDrop, setShowEmpDrop] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(20);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const staffList = await dispatch(fetchStaffThunk()).unwrap();

      setEmployeeOptions([
        { label: "All", value: "All" },
        ...staffList.map((s: any) => ({
          label: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.name || "",
          value: String(s.id),
        })),
      ]);

      const schedResults = await Promise.allSettled(
        staffList.map((s: any) =>
          api.get(STAFF.SCHEDULES(s.id), { signal: ctrl.signal })
            .then(r => ({ staff: s, schedules: r.data?.data ?? [] }))
        )
      );

      const rows: StaffScheduleRow[] = schedResults.map((result, idx) => {
        const staff = staffList[idx] as any;
        const name  = `${staff.first_name ?? ""} ${staff.last_name ?? ""}`.trim() || staff.name || "Unknown";
        const schedule: StaffScheduleRow["schedule"] = {};

        if (result.status === "fulfilled") {
          const scheds: any[] = Array.isArray(result.value.schedules?.items)
            ? result.value.schedules.items
            : Array.isArray(result.value.schedules) ? result.value.schedules : [];
          scheds.forEach((s: any) => {
            const dow = Number(s.day_of_week);
            if (dow >= 0 && dow <= 6) {
              schedule[dow] = {
                available: s.is_available ?? true,
                start:     s.start_time ?? "",
                end:       s.end_time   ?? "",
              };
            }
          });
        }

        return { staffId: Number(staff.id), name, role: staff.role ?? "Staff", schedule };
      });

      setAllRows(rows);
    } finally {
      if (!abortRef.current?.signal.aborted) setLoading(false);
    }
  }, [dispatch]);

  const rows = useMemo(() => {
    if (employee === "All") return allRows;
    return allRows.filter(r => String(r.staffId) === employee);
  }, [allRows, employee]);

  useEffect(() => { setCurrentPage(1); }, [rows]);
  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const close = () => setShowEmpDrop(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const fmt12 = (t: string) => {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    if (isNaN(h)) return t;
    const ampm = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${String(m ?? 0).padStart(2, "0")} ${ampm}`;
  };

  const paged = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="rp-detail-root">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Button variant="ghost" className="rp-detail-back-btn" onClick={onBack}>
            <ChevronLeft size={15} /> {report.name}
          </Button>
          <div className="rp-detail-view-icons">
            <AppsNavButton />
            <button className="rp-detail-icon-btn" title="Info"><InfoCircle size={16} /></button>
          </div>
        </div>
        <div className="rp-detail-tab-bar"><span className="rp-detail-tab active">Default View</span></div>
      </div>

      <div className="rp-detail-filters">
        <div className="rp-detail-filter-group" style={{ position: "relative" }}>
          <label className="rp-detail-filter-label">Employee</label>
          <button className="rp-detail-select" onClick={() => setShowEmpDrop(v => !v)}>
            {(employeeOptions.find(o => o.value === employee)?.label ?? "All").slice(0, 18)}
            <span className="rp-detail-caret">▼</span>
          </button>
          {showEmpDrop && (
            <div className="rp-detail-dropdown" onMouseDown={e => e.stopPropagation()}>
              {employeeOptions.map(o => (
                <div key={o.value} className={`rp-detail-dropdown-item ${o.value === employee ? "active" : ""}`}
                  onClick={() => { setEmployee(o.value); setShowEmpDrop(false); }}>{o.label}</div>
              ))}
            </div>
          )}
        </div>
        <div className="rp-detail-filter-actions">
          <Button variant="ghost" className="rp-detail-refresh-btn" onClick={fetchData} loading={loading}>
            <Refresh size={13} /> Refresh
          </Button>
          <Button variant="ghost" className="rp-detail-save-btn">Save View</Button>
        </div>
      </div>

      <div className="rp-detail-drag-hint">{rows.length} staff member{rows.length !== 1 ? "s" : ""}</div>

      <div className="rp-detail-table-wrap" style={{ overflowX: "auto" }}>
        {loading ? (
          <div className="rp-detail-loading">Loading schedule data…</div>
        ) : paged.length === 0 ? (
          <div className="rp-detail-empty">No schedule data found.</div>
        ) : (
          <table className="rp-detail-table" style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th style={{ minWidth: 140 }}>Name</th>
                <th>Role</th>
                {DAYS_SHORT.map(d => <th key={d} style={{ minWidth: 90, textAlign: "center" }}>{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {paged.map(r => (
                <tr key={r.staffId}>
                  <td><strong>{r.name}</strong></td>
                  <td>{r.role}</td>
                  {[0,1,2,3,4,5,6].map(dow => {
                    const s = r.schedule[dow];
                    if (!s || !s.available) {
                      return (
                        <td key={dow} style={{ textAlign: "center", color: "#d1d5db", fontSize: 12 }}>Off</td>
                      );
                    }
                    return (
                      <td key={dow} style={{ textAlign: "center", fontSize: 11 }}>
                        <span style={{ color: "#16a34a", fontWeight: 600, display: "block" }}>On</span>
                        {s.start && s.end && (
                          <span style={{ color: "#6b7280" }}>{fmt12(s.start)}<br />{fmt12(s.end)}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination
        currentPage={currentPage} pageSize={pageSize} totalItems={rows.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }}
      />
    </div>
  );
};

// ─── Commissions Report Detail ────────────────────────────────────────────────
interface CommissionRow {
  staffId:          number;
  staffName:        string;
  role:             string;
  commissionType:   "percentage" | "fixed_rate";
  commissionRate:   number;
  revenue:          number;
  services:         number;
  commissionEarned: number;
}

const CommissionsReportDetail = ({ report, onBack }: { report: ReportItem; onBack: () => void }) => {
  const dispatch   = useDispatch<AppDispatch>();
  const today      = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const [dateFrom,        setDateFrom]        = useState(monthStart);
  const [dateTo,          setDateTo]          = useState(today);
  const [allRows,         setAllRows]         = useState<CommissionRow[]>([]);
  const [loading,         setLoading]         = useState(false);
  const [employee,        setEmployee]        = useState("All");
  const [employeeOptions, setEmployeeOptions] = useState<{ label: string; value: string }[]>([{ label: "All", value: "All" }]);
  const [showEmpDrop,     setShowEmpDrop]     = useState(false);
  const [currentPage,     setCurrentPage]     = useState(1);
  const [pageSize,        setPageSize]        = useState(10);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const ctrl = new AbortController();
    try {
      const apptParams = new URLSearchParams({ start_date: dateFrom, end_date: dateTo, limit: "500" });
      const [staffList, apptRes] = await Promise.all([
        dispatch(fetchStaffThunk()).unwrap(),
        api.get(`${BOOKING.BASE}?${apptParams}`, { signal: ctrl.signal }),
      ]);

      setEmployeeOptions([
        { label: "All", value: "All" },
        ...staffList.map((s: any) => ({
          label: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.name || "",
          value: String(s.id),
        })),
      ]);

      // Aggregate revenue + service count per staff from appointments
      const revenueMap = new Map<number, { revenue: number; services: number }>();
      const apptRaw = apptRes.data?.data?.data ?? apptRes.data?.data ?? apptRes.data ?? [];
      const appts: any[] = Array.isArray(apptRaw) ? apptRaw : [];
      appts.forEach((appt: any) => {
        const sid = Number(appt.staff_id ?? appt.staffId);
        if (!sid) return;
        const items = [
          ...(Array.isArray(appt.services)      ? appt.services      : []),
          ...(Array.isArray(appt.product_items) ? appt.product_items : []),
          ...(Array.isArray(appt.package_items) ? appt.package_items : []),
        ];
        const computedTotal = items.reduce((sum: number, item: any) => {
          const price = parseFloat(String(item.price ?? 0)) || 0;
          const qty   = Number(item.quantity ?? item.qty ?? 1) || 1;
          return sum + price * qty;
        }, 0);
        const revenue = parseFloat(String(appt.grand_total ?? appt.total_amount ?? 0)) || computedTotal;
        const prev    = revenueMap.get(sid) ?? { revenue: 0, services: 0 };
        revenueMap.set(sid, { revenue: prev.revenue + revenue, services: prev.services + 1 });
      });

      // Fetch each staff member's commission rate
      const commResults = await Promise.allSettled(
        staffList.map((s: any) =>
          api.get(STAFF.COMMISSIONS(s.id), { signal: ctrl.signal })
            .then(r => ({ staffId: s.id, data: r.data?.data ?? r.data }))
        )
      );

      const rows: CommissionRow[] = staffList.map((s: any) => {
        const staffName = `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.name || "Unknown";
        const perf      = revenueMap.get(Number(s.id)) ?? { revenue: 0, services: 0 };

        // Find commission data for this staff
        const commResult = commResults.find(r =>
          r.status === "fulfilled" && r.value.staffId === s.id
        );
        const commData: any = commResult?.status === "fulfilled" ? commResult.value.data : null;

        // API returns array of { category, is_enabled, commission_kind, default_rate, ... }
        // commission_kind: "percentage" | "fixed_rate"
        let commType: "percentage" | "fixed_rate" = "percentage";
        let commRate = 0;
        if (Array.isArray(commData) && commData.length > 0) {
          // Prefer services category (most relevant for appointments), else first enabled
          const svcComm = commData.find((c: any) => c.category === "services" && c.is_enabled)
            ?? commData.find((c: any) => c.is_enabled)
            ?? commData[0];
          commType = svcComm?.commission_kind ?? "percentage";
          commRate = parseFloat(String(svcComm?.default_rate ?? 0)) || 0;
        }

        const earned = commType === "percentage"
          ? (perf.revenue * commRate) / 100
          : commRate * perf.services;

        return {
          staffId:          Number(s.id),
          staffName,
          role:             s.role ?? s.designation ?? "Staff",
          commissionType:   commType,
          commissionRate:   commRate,
          revenue:          perf.revenue,
          services:         perf.services,
          commissionEarned: earned,
        };
      });

      setAllRows(rows);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  const rows = useMemo(() => {
    let data = [...allRows].sort((a, b) => b.commissionEarned - a.commissionEarned);
    if (employee !== "All") {
      const empLabel = (employeeOptions.find(o => o.value === employee)?.label ?? "").toLowerCase().trim();
      if (empLabel) data = data.filter(r => r.staffName.toLowerCase().trim() === empLabel);
    }
    return data;
  }, [allRows, employee, employeeOptions]);

  useEffect(() => { setCurrentPage(1); }, [rows]);
  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const close = () => setShowEmpDrop(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const HEADERS    = ["Name", "Role", "Commission Type", "Rate", "Revenue (₹)", "Services", "Commission Earned (₹)"];
  const exportRows = () => rows.map(r => [r.staffName, r.role, r.commissionType === "percentage" ? "Percentage" : "Fixed Rate", r.commissionRate, r.revenue, r.services, r.commissionEarned.toFixed(2)]);
  const paged      = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalEarned = rows.reduce((s, r) => s + r.commissionEarned, 0);

  return (
    <div className="rp-detail-root">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Button variant="ghost" className="rp-detail-back-btn" onClick={onBack}>
            <ChevronLeft size={15} /> {report.name}
          </Button>
          <div className="rp-detail-view-icons">
            <AppsNavButton />
            <ReportExportButton
              title={report.name}
              headers={HEADERS}
              rows={exportRows}
              filename={`${report.name}-${dateFrom}-${dateTo}`}
            />
            <button className="rp-detail-icon-btn" title="Info"><InfoCircle size={16} /></button>
          </div>
        </div>
        <div className="rp-detail-tab-bar"><span className="rp-detail-tab active">Default View</span></div>
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
        <div className="rp-detail-filter-group" style={{ position: "relative" }}>
          <label className="rp-detail-filter-label">Employee</label>
          <button className="rp-detail-select" onClick={() => setShowEmpDrop(v => !v)}>
            {(employeeOptions.find(o => o.value === employee)?.label ?? "All").slice(0, 16)}{(employeeOptions.find(o => o.value === employee)?.label ?? "All").length > 16 ? "…" : ""}
            <span className="rp-detail-caret">▼</span>
          </button>
          {showEmpDrop && (
            <div className="rp-detail-dropdown" onMouseDown={e => e.stopPropagation()}>
              {employeeOptions.map(o => (
                <div key={o.value} className={`rp-detail-dropdown-item ${o.value === employee ? "active" : ""}`}
                  onClick={() => { setEmployee(o.value); setShowEmpDrop(false); }}>{o.label}</div>
              ))}
            </div>
          )}
        </div>
        <div className="rp-detail-filter-actions">
          <Button variant="ghost" className="rp-detail-refresh-btn" onClick={fetchData} loading={loading}>
            <Refresh size={13} /> Refresh
          </Button>
          <Button variant="ghost" className="rp-detail-save-btn">Save View</Button>
        </div>
      </div>

      <div className="rp-detail-drag-hint">
        {rows.length} staff member{rows.length !== 1 ? "s" : ""}
        {totalEarned > 0 && <>&nbsp;·&nbsp;Total Commission: <strong>₹{totalEarned.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</strong></>}
      </div>

      <div className="rp-detail-table-wrap">
        {loading ? (
          <div className="rp-detail-loading">Loading commission data…</div>
        ) : paged.length === 0 ? (
          <div className="rp-detail-empty">No commission data found for this period.</div>
        ) : (
          <table className="rp-detail-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Role</th>
                <th>Commission Type</th>
                <th>Rate</th>
                <th>Revenue (₹)</th>
                <th>Services</th>
                <th>Commission Earned (₹)</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((r, i) => (
                <tr key={r.staffId}>
                  <td>#{(currentPage - 1) * pageSize + i + 1}</td>
                  <td><strong>{r.staffName}</strong></td>
                  <td>{r.role}</td>
                  <td>{r.commissionType === "percentage" ? "Percentage" : "Fixed Rate"}</td>
                  <td>{r.commissionType === "percentage" ? `${r.commissionRate}%` : `₹${r.commissionRate}/service`}</td>
                  <td>₹{r.revenue.toLocaleString("en-IN")}</td>
                  <td>{r.services}</td>
                  <td><strong style={{ color: r.commissionEarned > 0 ? "#16a34a" : undefined }}>
                    ₹{r.commissionEarned.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </strong></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 700, borderTop: "2px solid #e5e7eb" }}>
                <td colSpan={5}></td>
                <td>₹{rows.reduce((s, r) => s + r.revenue, 0).toLocaleString("en-IN")}</td>
                <td>{rows.reduce((s, r) => s + r.services, 0)}</td>
                <td style={{ color: "#16a34a" }}>₹{totalEarned.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      <Pagination
        currentPage={currentPage} pageSize={pageSize} totalItems={rows.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }}
      />
    </div>
  );
};

// ─── Leaves Report Detail ─────────────────────────────────────────────────────
const LEAVE_TYPES = [
  { value: "All",     label: "All Types"  },
  { value: "timeoff", label: "Time Off"   },
  { value: "dayoff",  label: "Day Off"    },
  { value: "sick",    label: "Sick Leave" },
  { value: "casual",  label: "Casual"     },
  { value: "other",   label: "Other"      },
];
const LEAVE_STATUSES = [
  { value: "All",      label: "All Status" },
  { value: "approved", label: "Approved"   },
  { value: "pending",  label: "Pending"    },
  { value: "rejected", label: "Rejected"   },
];

interface LeaveRow {
  staffId: number;
  staffName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  status: string;
  reason: string;
}

const LeavesReportDetail = ({ report, onBack }: { report: ReportItem; onBack: () => void }) => {
  const dispatch   = useDispatch<AppDispatch>();
  const today      = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const [dateFrom,        setDateFrom]        = useState(monthStart);
  const [dateTo,          setDateTo]          = useState(today);
  const [allRows,         setAllRows]         = useState<LeaveRow[]>([]);
  const [loading,         setLoading]         = useState(false);
  const [employee,        setEmployee]        = useState("All");
  const [leaveType,       setLeaveType]       = useState("All");
  const [leaveStatus,     setLeaveStatus]     = useState("All");
  const [employeeOptions, setEmployeeOptions] = useState<{ label: string; value: string }[]>([{ label: "All", value: "All" }]);
  const [showEmpDrop,     setShowEmpDrop]     = useState(false);
  const [showTypeDrop,    setShowTypeDrop]    = useState(false);
  const [showStatDrop,    setShowStatDrop]    = useState(false);
  const [currentPage,     setCurrentPage]     = useState(1);
  const [pageSize,        setPageSize]        = useState(10);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const ctrl = new AbortController();
    try {
      const staffList = await dispatch(fetchStaffThunk()).unwrap();

      const opts = [{ label: "All", value: "All" }, ...staffList.map((s: any) => ({
        label: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.name || "",
        value: String(s.id),
      }))];
      setEmployeeOptions(opts);

      const leaveResults = await Promise.allSettled(
        staffList.map((s: any) =>
          api.get(STAFF.LEAVES(s.id), { signal: ctrl.signal })
            .then(r => ({ staff: s, leaves: r.data?.data ?? r.data ?? [] }))
        )
      );

      const from = new Date(dateFrom);
      const to   = new Date(dateTo);
      to.setHours(23, 59, 59);

      const rows: LeaveRow[] = [];
      leaveResults.forEach(result => {
        if (result.status !== "fulfilled") return;
        const { staff, leaves } = result.value;
        const leaveArr: any[] = Array.isArray(leaves?.items) ? leaves.items : (Array.isArray(leaves) ? leaves : []);
        const staffName = `${staff.first_name ?? ""} ${staff.last_name ?? ""}`.trim() || staff.name || "Unknown";

        leaveArr.forEach((lv: any) => {
          const lvStart = lv.start_date ? new Date(lv.start_date) : null;
          const lvEnd   = lv.end_date   ? new Date(lv.end_date)   : lvStart;
          if (!lvStart) return;
          // Include if leave overlaps with the selected date range
          if (lvStart > to || (lvEnd && lvEnd < from)) return;

          const diffMs   = lvEnd ? Math.abs(lvEnd.getTime() - lvStart.getTime()) : 0;
          const diffDays = Math.round(diffMs / 86400000) + 1;

          rows.push({
            staffId:   staff.id,
            staffName,
            leaveType: lv.leave_type ?? lv.type ?? "other",
            startDate: lv.start_date ? new Date(lv.start_date).toLocaleDateString("en-IN") : "—",
            endDate:   lv.end_date   ? new Date(lv.end_date).toLocaleDateString("en-IN")   : "—",
            days:      diffDays,
            status:    lv.status ?? "pending",
            reason:    lv.reason ?? "—",
          });
        });
      });

      rows.sort((a, b) => a.staffName.localeCompare(b.staffName));
      setAllRows(rows);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  const rows = useMemo(() => {
    let data = [...allRows];
    if (employee !== "All") {
      const empLabel = (employeeOptions.find(o => o.value === employee)?.label ?? "").toLowerCase().trim();
      if (empLabel) data = data.filter(r => r.staffName.toLowerCase().trim() === empLabel);
    }
    if (leaveType   !== "All") data = data.filter(r => r.leaveType.toLowerCase() === leaveType.toLowerCase());
    if (leaveStatus !== "All") data = data.filter(r => r.status.toLowerCase()    === leaveStatus.toLowerCase());
    return data;
  }, [allRows, employee, employeeOptions, leaveType, leaveStatus]);

  useEffect(() => { setCurrentPage(1); }, [rows]);
  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const close = () => { setShowEmpDrop(false); setShowTypeDrop(false); setShowStatDrop(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const HEADERS    = ["Employee", "Leave Type", "Start Date", "End Date", "Days", "Status", "Reason"];
  const exportRows = () => rows.map(r => [r.staffName, r.leaveType, r.startDate, r.endDate, r.days, r.status, r.reason]);
  const paged      = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const statusBadge = (s: string) => {
    const map: Record<string, string> = { approved: "#16a34a", pending: "#d97706", rejected: "#dc2626" };
    const color = map[s.toLowerCase()] ?? "#6b7280";
    return <span style={{ color, fontWeight: 600, textTransform: "capitalize" }}>{s}</span>;
  };

  return (
    <div className="rp-detail-root">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Button variant="ghost" className="rp-detail-back-btn" onClick={onBack}>
            <ChevronLeft size={15} /> {report.name}
          </Button>
          <div className="rp-detail-view-icons">
            <AppsNavButton />
            <ReportExportButton
              title={report.name}
              headers={HEADERS}
              rows={exportRows}
              filename={`${report.name}-${dateFrom}-${dateTo}`}
            />
            <button className="rp-detail-icon-btn" title="Info"><InfoCircle size={16} /></button>
          </div>
        </div>
        <div className="rp-detail-tab-bar"><span className="rp-detail-tab active">Default View</span></div>
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
        <div className="rp-detail-filter-group" style={{ position: "relative" }}>
          <label className="rp-detail-filter-label">Employee</label>
          <button className="rp-detail-select" onClick={() => { setShowEmpDrop(v => !v); setShowTypeDrop(false); setShowStatDrop(false); }}>
            {(employeeOptions.find(o => o.value === employee)?.label ?? "All").slice(0, 16)}{(employeeOptions.find(o => o.value === employee)?.label ?? "All").length > 16 ? "…" : ""}
            <span className="rp-detail-caret">▼</span>
          </button>
          {showEmpDrop && (
            <div className="rp-detail-dropdown" onMouseDown={e => e.stopPropagation()}>
              {employeeOptions.map(o => (
                <div key={o.value} className={`rp-detail-dropdown-item ${o.value === employee ? "active" : ""}`}
                  onClick={() => { setEmployee(o.value); setShowEmpDrop(false); }}>{o.label}</div>
              ))}
            </div>
          )}
        </div>
        <div className="rp-detail-filter-group" style={{ position: "relative" }}>
          <label className="rp-detail-filter-label">Leave Type</label>
          <button className="rp-detail-select" onClick={() => { setShowTypeDrop(v => !v); setShowEmpDrop(false); setShowStatDrop(false); }}>
            {LEAVE_TYPES.find(t => t.value === leaveType)?.label ?? "All Types"} <span className="rp-detail-caret">▼</span>
          </button>
          {showTypeDrop && (
            <div className="rp-detail-dropdown" onMouseDown={e => e.stopPropagation()}>
              {LEAVE_TYPES.map(t => (
                <div key={t.value} className={`rp-detail-dropdown-item ${t.value === leaveType ? "active" : ""}`}
                  onClick={() => { setLeaveType(t.value); setShowTypeDrop(false); }}>{t.label}</div>
              ))}
            </div>
          )}
        </div>
        <div className="rp-detail-filter-group" style={{ position: "relative" }}>
          <label className="rp-detail-filter-label">Status</label>
          <button className="rp-detail-select" onClick={() => { setShowStatDrop(v => !v); setShowEmpDrop(false); setShowTypeDrop(false); }}>
            {LEAVE_STATUSES.find(t => t.value === leaveStatus)?.label ?? "All Status"} <span className="rp-detail-caret">▼</span>
          </button>
          {showStatDrop && (
            <div className="rp-detail-dropdown" onMouseDown={e => e.stopPropagation()}>
              {LEAVE_STATUSES.map(t => (
                <div key={t.value} className={`rp-detail-dropdown-item ${t.value === leaveStatus ? "active" : ""}`}
                  onClick={() => { setLeaveStatus(t.value); setShowStatDrop(false); }}>{t.label}</div>
              ))}
            </div>
          )}
        </div>
        <div className="rp-detail-filter-actions">
          <Button variant="ghost" className="rp-detail-refresh-btn" onClick={fetchData} loading={loading}>
            <Refresh size={13} /> Refresh
          </Button>
          <Button variant="ghost" className="rp-detail-save-btn">Save View</Button>
        </div>
      </div>

      <div className="rp-detail-drag-hint">
        {rows.length} leave record{rows.length !== 1 ? "s" : ""}
        {rows.length > 0 && <>&nbsp;·&nbsp;Total Days: <strong>{rows.reduce((s, r) => s + r.days, 0)}</strong></>}
      </div>

      <div className="rp-detail-table-wrap">
        {loading ? (
          <div className="rp-detail-loading">Loading leave data…</div>
        ) : paged.length === 0 ? (
          <div className="rp-detail-empty">No leave records found for this period.</div>
        ) : (
          <table className="rp-detail-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Employee</th>
                <th>Leave Type</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Days</th>
                <th>Status</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((r, i) => (
                <tr key={`${r.staffId}-${i}`}>
                  <td>#{(currentPage - 1) * pageSize + i + 1}</td>
                  <td><strong>{r.staffName}</strong></td>
                  <td style={{ textTransform: "capitalize" }}>{r.leaveType.replace(/_/g, " ")}</td>
                  <td>{r.startDate}</td>
                  <td>{r.endDate}</td>
                  <td>{r.days}</td>
                  <td>{statusBadge(r.status)}</td>
                  <td style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination
        currentPage={currentPage} pageSize={pageSize} totalItems={rows.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }}
      />
    </div>
  );
};

// ─── Staff Revenue Analytics Detail ─────────────────────────────────────────

type RevPeriodKey = "daily" | "weekly" | "monthly" | "yearly";

const StaffRevenueAnalyticsDetail = ({ report, onBack }: { report: ReportItem; onBack: () => void }) => {
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
  const abortRef = useRef<AbortController | null>(null);

  interface RevRow { label: string; serviceRevenue: number; productRevenue: number; total: number }
  const [rows, setRows] = useState<RevRow[]>([]);

  useEffect(() => {
    dispatch(fetchStaffThunk()).unwrap().then((list: any[]) => {
      const opts = list.map((s: any) => ({
        label: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.name || "",
        value: String(s.id ?? ""),
      })).filter((o: any) => o.label && o.value);
      setStaffOptions([{ label: "All", value: "All" }, ...opts]);
    }).catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const params = new URLSearchParams({ start_date: dateFrom, end_date: dateTo, limit: "500" });
      const [apptRes, staffList] = await Promise.all([
        api.get(`${BOOKING.BASE}?${params}`, { signal: ctrl.signal }),
        dispatch(fetchStaffThunk()).unwrap(),
      ]);
      const staffInfoMap = new Map<string, string>();
      staffList.forEach((s: any) => {
        staffInfoMap.set(String(s.id), `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.name || "");
      });
      const rawAppt = apptRes.data?.data;
      const appts: any[] = Array.isArray(rawAppt?.data) ? rawAppt.data : (Array.isArray(rawAppt) ? rawAppt : []);

      const bucketMap = new Map<string, { serviceRevenue: number; productRevenue: number }>();
      const fmt = (d: string) => {
        const dt = new Date(d);
        if (revPeriod === "daily")   return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
        if (revPeriod === "weekly")  { const w = new Date(dt); w.setDate(dt.getDate() - dt.getDay()); return `W${w.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`; }
        if (revPeriod === "monthly") return dt.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
        return dt.getFullYear().toString();
      };

      appts.forEach((appt: any) => {
        const sid = String(appt.staff_id ?? appt.staffId ?? "");
        if (staffFilter !== "All" && sid !== staffFilter) return;
        const date = String(appt.date ?? appt.appointment_date ?? appt.created_at ?? "").slice(0, 10);
        if (!date) return;
        const label = fmt(date);
        const svcRev  = (Array.isArray(appt.services)      ? appt.services      : []).reduce((s: number, it: any) => s + (parseFloat(String(it.price ?? 0)) || 0) * (Number(it.quantity ?? 1) || 1), 0);
        const prodRev = (Array.isArray(appt.product_items) ? appt.product_items : []).reduce((s: number, it: any) => s + (parseFloat(String(it.price ?? 0)) || 0) * (Number(it.quantity ?? 1) || 1), 0);
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
            <ChevronLeft size={15} /> {report.name}
          </Button>
          <div className="rp-detail-view-icons">
            <ReportExportButton title={report.name} headers={HEADERS} rows={exportRows} filename={`staff-revenue-${dateFrom}-${dateTo}`} />
          </div>
        </div>
        <div className="rp-detail-tab-bar">
          {(["daily", "weekly", "monthly", "yearly"] as RevPeriodKey[]).map(p => (
            <span key={p} className={`rp-detail-tab ${revPeriod === p ? "active" : ""}`}
              onClick={() => setRevPeriod(p)} style={{ cursor: "pointer" }}>
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
        <div className="rp-detail-filter-group" style={{ position: "relative" }}>
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
            <Refresh size={13} /> Refresh
          </Button>
        </div>
      </div>

      <div className="rp-sra-summary-row">
        {[
          { label: "Service Revenue", value: `₹${totalSvc.toLocaleString()}`, color: "#3b82f6" },
          { label: "Product Revenue", value: `₹${totalProd.toLocaleString()}`, color: "#10b981" },
          { label: "Total Revenue",   value: `₹${totalRev.toLocaleString()}`,  color: "#8b5cf6" },
        ].map(c => (
          <div key={c.label} className="rp-sra-summary-card">
            <div className="rp-sra-summary-val" style={{ color: c.color }}>{c.value}</div>
            <div className="rp-sra-summary-label">{c.label}</div>
          </div>
        ))}
      </div>

      {loading ? <div className="rp-detail-loading-cell"><PageLoader /></div> : rows.length === 0 ? (
        <div className="rp-detail-empty-cell">No revenue data found for selected range</div>
      ) : (
        <>
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 20px", marginBottom: 16 }}>
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
            <div className="rp-legend-row mt-2">
              <span className="rp-leg-item"><span className="rp-pie-dot" style={{ background: "#3b82f6" }} />Service Revenue</span>
              <span className="rp-leg-item"><span className="rp-pie-dot" style={{ background: "#10b981" }} />Product Revenue</span>
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
};

// ─── Staff Product Sales Detail ───────────────────────────────────────────────

interface StaffProductRow {
  staffName: string;
  productName: string;
  quantity: number;
  revenue: number;
  date: string;
}

const StaffProductSalesDetail = ({ report, onBack }: { report: ReportItem; onBack: () => void }) => {
  const dispatch = useDispatch<AppDispatch>();
  const today      = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [dateFrom,      setDateFrom]      = useState(monthStart);
  const [dateTo,        setDateTo]        = useState(today);
  const [staffFilter,   setStaffFilter]   = useState("All");
  const [staffOptions,  setStaffOptions]  = useState<{ label: string; value: string }[]>([{ label: "All", value: "All" }]);
  const [showStaffDrop, setShowStaffDrop] = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [allRows,       setAllRows]       = useState<StaffProductRow[]>([]);
  const [currentPage,   setCurrentPage]   = useState(1);
  const [pageSize,      setPageSize]      = useState(10);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    dispatch(fetchStaffThunk()).unwrap().then((list: any[]) => {
      const opts = list.map((s: any) => ({
        label: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.name || "",
        value: String(s.id ?? ""),
      })).filter((o: any) => o.label && o.value);
      setStaffOptions([{ label: "All", value: "All" }, ...opts]);
    }).catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const params = new URLSearchParams({ start_date: dateFrom, end_date: dateTo, limit: "500" });
      const [apptRes, staffList] = await Promise.all([
        api.get(`${BOOKING.BASE}?${params}`, { signal: ctrl.signal }),
        dispatch(fetchStaffThunk()).unwrap(),
      ]);
      const UUID_RE_PS = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const staffNameMap = new Map<string, string>();
      staffList.forEach((s: any) => {
        const name = `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.name || "";
        if (!name) return;
        [s.id, s.user_id, s.uuid, s.staff_id, s.auth_id, s.auth_user_id]
          .filter(Boolean)
          .forEach((uid: any) => staffNameMap.set(String(uid), name));
        Object.values(s).forEach((val: any) => {
          if (typeof val === "string" && (UUID_RE_PS.test(val) || /^\d+$/.test(val))) staffNameMap.set(val, name);
          else if (typeof val === "number") staffNameMap.set(String(val), name);
        });
      });
      const rawAppt = apptRes.data?.data;
      const appts: any[] =
        Array.isArray(rawAppt?.items) ? rawAppt.items :
        Array.isArray(rawAppt?.data)  ? rawAppt.data  :
        Array.isArray(rawAppt)        ? rawAppt        : [];

      const result: StaffProductRow[] = [];
      appts.forEach((appt: any) => {
        const sid = String(appt.staff_id ?? appt.staffId ?? "");
        if (staffFilter !== "All" && sid !== staffFilter) return;
        const inlineName = `${appt.staff_first_name ?? ""} ${appt.staff_last_name ?? ""}`.trim()
          || appt.staff_name || appt.staff?.name || "";
        const staffName = staffNameMap.get(sid) || inlineName || "Unknown";
        const date = String(appt.date ?? appt.appointment_date ?? appt.created_at ?? "").slice(0, 10);
        const prodItems: any[] = Array.isArray(appt.product_items) ? appt.product_items : [];
        prodItems.forEach((it: any) => {
          const qty = Number(it.quantity ?? it.qty ?? 1) || 1;
          const price = parseFloat(String(it.price ?? 0)) || 0;
          result.push({
            staffName,
            productName: String(it.name ?? it.product_name ?? "Product"),
            quantity: qty,
            revenue: Math.round(price * qty),
            date,
          });
        });
      });
      result.sort((a, b) => b.revenue - a.revenue);
      setAllRows(result);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") setAllRows([]);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo, staffFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [allRows]);

  const rows = useMemo(() => {
    if (staffFilter === "All") return allRows;
    const label = (staffOptions.find(o => o.value === staffFilter)?.label ?? "").toLowerCase();
    return allRows.filter(r => r.staffName.toLowerCase() === label);
  }, [allRows, staffFilter, staffOptions]);

  const totalQty = rows.reduce((s, r) => s + r.quantity, 0);
  const totalRev = rows.reduce((s, r) => s + r.revenue, 0);

  const topProducts = useMemo(() => {
    const map = new Map<string, { qty: number; rev: number }>();
    rows.forEach(r => {
      const e = map.get(r.productName) ?? { qty: 0, rev: 0 };
      e.qty += r.quantity; e.rev += r.revenue;
      map.set(r.productName, e);
    });
    return [...map.entries()].sort((a, b) => b[1].qty - a[1].qty).slice(0, 3);
  }, [rows]);

  const HEADERS = ["Staff Name", "Product Name", "Quantity Sold", "Product Revenue (₹)", "Date"];
  const exportRows = () => rows.map(r => [r.staffName, r.productName, r.quantity, r.revenue, r.date]);

  const paged = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Button variant="ghost" className="rp-detail-back" onClick={onBack}>
            <ChevronLeft size={15} /> {report.name}
          </Button>
          <div className="rp-detail-view-icons">
            <ReportExportButton title={report.name} headers={HEADERS} rows={exportRows} filename={`staff-product-sales-${dateFrom}-${dateTo}`} />
          </div>
        </div>
        <div className="rp-detail-tab-bar"><span className="rp-detail-tab active">Default View</span></div>
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
        <div className="rp-detail-filter-group" style={{ position: "relative" }}>
          <label className="rp-detail-filter-label">Staff Member</label>
          <button className="rp-detail-select" onClick={() => setShowStaffDrop(v => !v)}>
            {(staffOptions.find(o => o.value === staffFilter)?.label ?? "All").slice(0, 16)}
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
            <Refresh size={13} /> Refresh
          </Button>
        </div>
      </div>

      <div className="rp-sra-summary-row">
        {[
          { label: "Total Products Sold",    value: totalQty.toString(),                color: "#3b82f6" },
          { label: "Product Revenue",        value: `₹${totalRev.toLocaleString()}`,    color: "#10b981" },
          { label: "Top Selling Product",    value: topProducts[0]?.[0] ?? "—",         color: "#8b5cf6" },
          { label: "Highest Product Seller", value: rows[0]?.staffName ?? "—",          color: "#f59e0b" },
        ].map(c => (
          <div key={c.label} className="rp-sra-summary-card">
            <div className="rp-sra-summary-val" style={{ color: c.color, fontSize: c.label.includes("Top") || c.label.includes("Highest") ? 15 : undefined }}>{c.value}</div>
            <div className="rp-sra-summary-label">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="rp-detail-drag-hint">
        {rows.length} line item{rows.length !== 1 ? "s" : ""}
        {rows.length > 0 && <>&nbsp;·&nbsp;Total Qty: <strong>{totalQty}</strong>&nbsp;·&nbsp;Revenue: <strong>₹{totalRev.toLocaleString()}</strong></>}
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Staff Name</th>
              <th>Product Name</th>
              <th>Quantity Sold</th>
              <th>Product Revenue (₹)</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="rp-detail-loading-cell"><PageLoader /></td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={6} className="rp-detail-empty-cell">No product sales data available</td></tr>
            ) : paged.map((r, i) => (
              <tr key={i}>
                <td style={{ color: "#9ca3af", fontSize: 12 }}>#{(currentPage - 1) * pageSize + i + 1}</td>
                <td className="fw-semibold">{r.staffName}</td>
                <td>{r.productName}</td>
                <td>{r.quantity}</td>
                <td>₹{r.revenue.toLocaleString()}</td>
                <td>{r.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination currentPage={currentPage} pageSize={pageSize} totalItems={rows.length}
        onPageChange={setCurrentPage} onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} />
    </div>
  );
};

// ─── Staff Service Sales Detail ───────────────────────────────────────────────

interface StaffServiceRow {
  staffName: string;
  serviceName: string;
  count: number;
  revenue: number;
  avgValue: number;
}

const StaffServiceSalesDetail = ({ report, onBack }: { report: ReportItem; onBack: () => void }) => {
  const dispatch = useDispatch<AppDispatch>();
  const today      = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [dateFrom,      setDateFrom]      = useState(monthStart);
  const [dateTo,        setDateTo]        = useState(today);
  const [staffFilter,   setStaffFilter]   = useState("All");
  const [staffOptions,  setStaffOptions]  = useState<{ label: string; value: string }[]>([{ label: "All", value: "All" }]);
  const [showStaffDrop, setShowStaffDrop] = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [rows,          setRows]          = useState<StaffServiceRow[]>([]);
  const [currentPage,   setCurrentPage]   = useState(1);
  const [pageSize,      setPageSize]      = useState(10);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    dispatch(fetchStaffThunk()).unwrap().then((list: any[]) => {
      const opts = list.map((s: any) => ({
        label: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.name || "",
        value: String(s.id ?? ""),
      })).filter((o: any) => o.label && o.value);
      setStaffOptions([{ label: "All", value: "All" }, ...opts]);
    }).catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const params = new URLSearchParams({ start_date: dateFrom, end_date: dateTo, limit: "500" });
      const [apptRes, staffList] = await Promise.all([
        api.get(`${BOOKING.BASE}?${params}`, { signal: ctrl.signal }),
        dispatch(fetchStaffThunk()).unwrap(),
      ]);
      const UUID_RE_SS = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const staffNameMap = new Map<string, string>();
      staffList.forEach((s: any) => {
        const name = `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.name || "";
        if (!name) return;
        [s.id, s.user_id, s.uuid, s.staff_id, s.auth_id, s.auth_user_id]
          .filter(Boolean)
          .forEach((uid: any) => staffNameMap.set(String(uid), name));
        Object.values(s).forEach((val: any) => {
          if (typeof val === "string" && (UUID_RE_SS.test(val) || /^\d+$/.test(val))) staffNameMap.set(val, name);
          else if (typeof val === "number") staffNameMap.set(String(val), name);
        });
      });
      const rawAppt = apptRes.data?.data;
      const appts: any[] =
        Array.isArray(rawAppt?.items) ? rawAppt.items :
        Array.isArray(rawAppt?.data)  ? rawAppt.data  :
        Array.isArray(rawAppt)        ? rawAppt        : [];

      const aggMap = new Map<string, { count: number; revenue: number }>();
      appts.forEach((appt: any) => {
        const sid = String(appt.staff_id ?? appt.staffId ?? "");
        if (staffFilter !== "All" && sid !== staffFilter) return;
        const inlineName = `${appt.staff_first_name ?? ""} ${appt.staff_last_name ?? ""}`.trim()
          || appt.staff_name || appt.staff?.name || "";
        const staffName = staffNameMap.get(sid) || inlineName || "Unknown";
        const svcItems: any[] = Array.isArray(appt.services) ? appt.services : [];
        svcItems.forEach((it: any) => {
          const svcName = String(it.name ?? it.service_name ?? "Service");
          const key = `${staffName}||${svcName}`;
          const price = parseFloat(String(it.price ?? 0)) || 0;
          const e = aggMap.get(key) ?? { count: 0, revenue: 0 };
          e.count   += 1;
          e.revenue += price;
          aggMap.set(key, e);
        });
      });

      const result: StaffServiceRow[] = Array.from(aggMap.entries()).map(([key, v]) => {
        const [staffName, serviceName] = key.split("||");
        return { staffName, serviceName, count: v.count, revenue: Math.round(v.revenue), avgValue: v.count > 0 ? Math.round(v.revenue / v.count) : 0 };
      }).sort((a, b) => b.revenue - a.revenue);
      setRows(result);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") setRows([]);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo, staffFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [rows]);

  const totalCount = rows.reduce((s, r) => s + r.count, 0);
  const totalRev   = rows.reduce((s, r) => s + r.revenue, 0);
  const topService = rows[0]?.serviceName ?? "—";
  const topStaff   = rows[0]?.staffName   ?? "—";

  const HEADERS = ["Staff Name", "Service Name", "Services Completed", "Service Revenue (₹)", "Avg Service Value (₹)"];
  const exportRows = () => rows.map(r => [r.staffName, r.serviceName, r.count, r.revenue, r.avgValue]);

  const paged = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Button variant="ghost" className="rp-detail-back" onClick={onBack}>
            <ChevronLeft size={15} /> {report.name}
          </Button>
          <div className="rp-detail-view-icons">
            <ReportExportButton title={report.name} headers={HEADERS} rows={exportRows} filename={`staff-service-sales-${dateFrom}-${dateTo}`} />
          </div>
        </div>
        <div className="rp-detail-tab-bar"><span className="rp-detail-tab active">Default View</span></div>
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
        <div className="rp-detail-filter-group" style={{ position: "relative" }}>
          <label className="rp-detail-filter-label">Staff Member</label>
          <button className="rp-detail-select" onClick={() => setShowStaffDrop(v => !v)}>
            {(staffOptions.find(o => o.value === staffFilter)?.label ?? "All").slice(0, 16)}
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
            <Refresh size={13} /> Refresh
          </Button>
        </div>
      </div>

      <div className="rp-sra-summary-row">
        {[
          { label: "Most Popular Service",    value: topService,                       color: "#3b82f6" },
          { label: "Highest Service Revenue", value: `₹${totalRev.toLocaleString()}`, color: "#10b981" },
          { label: "Top Performing Staff",    value: topStaff,                         color: "#8b5cf6" },
          { label: "Total Services Done",     value: totalCount.toString(),            color: "#f59e0b" },
        ].map(c => (
          <div key={c.label} className="rp-sra-summary-card">
            <div className="rp-sra-summary-val" style={{ color: c.color, fontSize: 15 }}>{c.value}</div>
            <div className="rp-sra-summary-label">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="rp-detail-drag-hint">
        {rows.length} service-staff combination{rows.length !== 1 ? "s" : ""}
        {rows.length > 0 && <>&nbsp;·&nbsp;Total Revenue: <strong>₹{totalRev.toLocaleString()}</strong></>}
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Staff Name</th>
              <th>Service Name</th>
              <th>Services Completed</th>
              <th>Service Revenue (₹)</th>
              <th>Avg Service Value (₹)</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="rp-detail-loading-cell"><PageLoader /></td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={6} className="rp-detail-empty-cell">No service sales data available</td></tr>
            ) : paged.map((r, i) => (
              <tr key={i}>
                <td style={{ color: "#9ca3af", fontSize: 12 }}>#{(currentPage - 1) * pageSize + i + 1}</td>
                <td className="fw-semibold">{r.staffName}</td>
                <td>{r.serviceName}</td>
                <td>{r.count}</td>
                <td className="fw-semibold">₹{r.revenue.toLocaleString()}</td>
                <td>₹{r.avgValue.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination currentPage={currentPage} pageSize={pageSize} totalItems={rows.length}
        onPageChange={setCurrentPage} onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} />
    </div>
  );
};

// ─── Reports Dashboard data ────────────────────────────────────────────────────

interface ReportItem {
  id: string;
  name: string;
  tags: string[];
  description: string;
  category: string;
  isNewVersion?: boolean;
  isBookmarked?: boolean;
}

const ALL_REPORTS: ReportItem[] = [
  // ── Operational ──────────────────────────────────────────────────────────────
  { id: "appointments",         name: "Appointments",         tags: ["Operational", "Appointments"], description: "Use this report to view the details of all the appointments (including no-shows and cancelled appointments) for a given period.", category: "operational", isNewVersion: true },
  // ── Clients ───────────────────────────────────────────────────────────────────
  { id: "client_retention",     name: "Client Retention",     tags: ["Retention"],                   description: "Identify clients who haven't visited in the last 30, 60, or 90 days to drive re-engagement.",                                     category: "clients",     isNewVersion: true },
  { id: "vip_clients",          name: "VIP Clients",          tags: ["VIP"],                         description: "Rank clients by visit frequency and total spend. Automatically assigns Gold, Silver, and Bronze VIP tiers.",                           category: "clients",     isNewVersion: true },
  // ── Finance ───────────────────────────────────────────────────────────────────
  { id: "collections",          name: "Collections",          tags: ["Finance", "Collections"],      description: "Use this report to view the payments received (including redemptions) on a day or during the given period.",                       category: "finance",     isNewVersion: true },
  { id: "revenue_by_service",   name: "Revenue by Service",   tags: ["Finance", "Operational"],      description: "Break down total revenue by individual services offered, with average ticket and booking counts.",                                  category: "finance" },
  // ── Inventory ─────────────────────────────────────────────────────────────────
  { id: "current_stock",        name: "Current Stock",        tags: ["Inventory", "Value"],          description: "Use this report to know the on-hand stock and the cost of goods based on the FIFO or perpetual average costing method.",           category: "inventory",   isNewVersion: true },
  { id: "inventory_consumption",name: "Inventory Consumption",tags: ["Inventory"],                   description: "Track the quantity of products consumed in services versus sold directly to clients.",                                              category: "inventory" },
  // ── Payments ──────────────────────────────────────────────────────────────────
  { id: "digital_payments",     name: "Digital Payments",     tags: ["Payments"],                    description: "Use this report to list all the payments collected using online payment provider integrated with your salon system.",               category: "payments",    isNewVersion: true },
  { id: "payment_summary",      name: "Payment Summary",      tags: ["Payments"],                    description: "View a consolidated summary of all payment methods collected across all centers for a given period.",                               category: "payments" },
  // ── Daily Reports ─────────────────────────────────────────────────────────────
  { id: "daily_summary",        name: "Daily Summary",        tags: ["Daily Reports"],               description: "View a complete daily summary of appointments, collections, and staff performance for any given date.",                             category: "daily_reports" },
  { id: "client_acquisition",    name: "Client Acquisition",    tags: ["Acquisition"], description: "Analyse how new clients are acquired and track their visit history, spend, and engagement status over a period.",   category: "clients" },
  // ── Marketing ─────────────────────────────────────────────────────────────────
  { id: "campaign_performance",   name: "Campaign Performance",   tags: ["Marketing"], description: "Track WhatsApp campaign delivery rates, read rates, and engagement metrics across all campaigns.",                 category: "marketing" },
  { id: "template_performance",  name: "Template Performance",  tags: ["Marketing"], description: "Analyse which WhatsApp message templates drive the highest engagement and delivery success.",                         category: "marketing" },
  { id: "message_spend",         name: "Message Spend",         tags: ["Marketing"], description: "Monitor daily WhatsApp message volumes and estimated costs broken down by category (Marketing, Utility, Auth).",   category: "marketing" },
  // ── Employee ──────────────────────────────────────────────────────────────────
  { id: "attrition",                      name: "Attrition",                    tags: ["Team"],         description: "Track the number of center employees who have either joined or left the organization.",                 category: "employee" },
  { id: "block_out_time_details",         name: "Block Out Time Details",        tags: ["Time"],         description: "Show times when providers are on break or unavailable using Block Out Time Types.",                    category: "employee" },
  { id: "staff_schedule",                 name: "Staff Schedule",                tags: ["Time", "Team"], description: "View the weekly working schedule for all staff members — working hours per day across the week.",              category: "employee", isNewVersion: true },
  { id: "booking_productivity",           name: "Booking Productivity",          tags: ["Sales"],        description: "Insight into the types of services requested by your guests by calling your center.",                  category: "employee" },
  { id: "commissions",                    name: "Commissions",                   tags: ["Commissions"],  description: "Calculate and review commission earned by each employee based on services and products sold.",          category: "employee" },
  { id: "commissions_graphical",          name: "Commissions - Graphical",       tags: ["Commissions"],  description: "Graphical breakdown of commission earned per employee.",                                                category: "employee" },
  { id: "employee_collections",           name: "Employee Collections",          tags: ["Sales"],        description: "View the collections made by each employee during a selected period.",                                 category: "employee" },
  { id: "employee_collections_by_item",   name: "Employee Collections By Item Type", tags: ["Sales"],   description: "View details of the sales for each item type: services, products, memberships.",                      category: "employee" },
  { id: "employee_sales_metrics",         name: "Employee Sales Metrics",        tags: ["Performance"],  description: "Track all sales employees make in a selected time period.",                                            category: "employee" },
  { id: "guest_satisfaction",             name: "Guest Satisfaction",            tags: ["Performance"],  description: "Evaluate client satisfaction scores across employees and services.",                                    category: "employee" },
  { id: "leaves",                         name: "Leaves",                        tags: ["Time"],         description: "Track the number of leaves availed by employees of each leave type as well as the status.",            category: "employee" },
  { id: "no_show_cancellation",           name: "No-show/Cancellation",          tags: ["Sales"],        description: "View a quick snapshot of guests who either did not come in for their appointments.",                   category: "employee" },
  { id: "overtime",                       name: "Overtime",                      tags: ["Time"],         description: "Track overtime hours worked by each employee.",                                                        category: "employee" },
  { id: "overtime_summary",               name: "Overtime Summary",              tags: ["Time"],         description: "Track the number of extra hours spent by your center.",                                                category: "employee" },
  { id: "rebooking",                      name: "Rebooking",                     tags: ["Sales"],        description: "Track rebooking rates and patterns for clients and employees.",                                        category: "employee" },
  { id: "sales",                          name: "Sales",                         tags: ["Sales"],        description: "Detailed breakdown of all sales transactions by employee.",                                            category: "employee" },
  { id: "service_revenue_by_category",    name: "Service Revenue By Category",   tags: ["Sales"],        description: "View service revenue broken down by category.",                                                       category: "employee" },
  { id: "split_commission",               name: "Split Commission",              tags: ["Sales"],        description: "Track split commissions across employees for shared services.",                                        category: "employee" },
  { id: "staffing",                       name: "Staffing",                      tags: ["Team"],         description: "Track the total number of employees currently working in a center, categorized by role.",              category: "employee" },
  { id: "tip_adjustments",               name: "Tip Adjustments",               tags: ["Sales"],        description: "View the trail of changes made to tips.",                                                             category: "employee" },
  { id: "utilization",                    name: "Utilization",                   tags: ["Performance"],  description: "Track how effectively employees' working hours are being utilized across services and appointments.",   category: "employee" },
  { id: "employee_performance",           name: "Employee Performance",          tags: ["Performance"],  description: "Track individual employee revenue, bookings, and utilization rate across a selected time period.",      category: "employee", isNewVersion: true },
  { id: "staff_performance_report",       name: "Staff Performance Report",      tags: ["Performance"],  description: "Full breakdown of each staff member's bookings, services sold, products sold, service revenue, product revenue, total revenue, avg ticket, customers served.",  category: "employee", isNewVersion: true },
  { id: "staff_revenue_analytics",        name: "Staff Revenue Analytics",       tags: ["Performance"],  description: "Daily, weekly, monthly, and yearly revenue charts by staff member with service vs product revenue breakdown and staff filters.",                               category: "employee", isNewVersion: true },
  { id: "staff_product_sales",            name: "Staff Product Sales Report",    tags: ["Sales"],        description: "Track every product sold by each staff member with quantity, revenue, and date. Includes top-selling products and highest product seller summary.",             category: "employee", isNewVersion: true },
  { id: "staff_service_sales",            name: "Staff Service Sales Report",    tags: ["Sales"],        description: "Track services performed by each staff member with completion count, service revenue, and average service value. Includes top-performer summary.",             category: "employee", isNewVersion: true },
];

const SUB_CATEGORIES: Record<string, string[]> = {
  "employee": ["Sales", "Commissions", "Performance", "Team", "Time"],
  "clients":  ["VIP", "Retention", "Acquisition"],
};

const FALLBACK_CATEGORIES = [
  { key: "all",          label: "All",           count: 34 },
  { key: "daily_reports",label: "Daily Reports", count: 1  },
  { key: "employee",     label: "Employee",      count: 22 },
  { key: "clients",      label: "Clients",       count: 3  },
  { key: "finance",      label: "Finance",       count: 2  },
  { key: "inventory",    label: "Inventory",     count: 2  },
  { key: "marketing",    label: "Marketing",     count: 3  },
  { key: "operational",  label: "Operational",   count: 1  },
  { key: "payments",     label: "Payments",      count: 2  },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ReportsPage() {
  const dispatch = useDispatch<AppDispatch>();

  // ── Redux state ─────────────────────────────────────────────────────────────
  const {
    revenue: revenueData,
    appointments: appointmentsData,
    clients: clientsData,
    staff: staffData,
    services: servicesData,
    reportsDashboard,
    loading,
    error,
  } = useSelector((state: RootState) => state.report);

  // ── Local UI state ──────────────────────────────────────────────────────────
  const [period, setPeriod]           = useState<ReportPeriod>("30d");
  const [tab, setTab]                 = useState<ReportTab>("revenue");
  const [showFilter, setShowFilter]   = useState(false);
  const [filterFrom, setFilterFrom]   = useState("");
  const [filterTo, setFilterTo]       = useState("");
  const [filterPayment, setFilterPayment]     = useState("");
  const [filterStaff, setFilterStaff]         = useState("");
  const [filterService, setFilterService]     = useState("");
  const [filterDateError, setFilterDateError] = useState("");
  const [isCustomRange, setIsCustomRange]     = useState(false);
  const [filterStaffList, setFilterStaffList]     = useState<string[]>([]);
  const [filterServiceList, setFilterServiceList] = useState<string[]>([]);

  // ── Reports Dashboard state ──────────────────────────────────────────────────
  const [reportSearch, setReportSearch]           = useState("");
  const [reportCategory, setReportCategory]       = useState<string>("all");
  const [activeSubCategory, setActiveSubCategory] = useState<string | null>(null);
  const [bookmarked, setBookmarked]               = useState<string[]>([]);
  const [openReport, setOpenReport]               = useState<ReportItem | null>(null);

  // Sync bookmarks with API's isBookmarked flag on first load
  useEffect(() => {
    if (reportsDashboard?.reports) {
      const apiBookmarked = reportsDashboard.reports
        .filter(r => r.isBookmarked)
        .map(r => r.id);
      if (apiBookmarked.length > 0) setBookmarked(apiBookmarked);
    }
  }, [reportsDashboard]);

  // Reset sub-category when main category changes
  const handleCategoryChange = (cat: string) => {
    setReportCategory(cat);
    setActiveSubCategory(null);
  };

  const activeReports = ALL_REPORTS;

  const filteredReports = useMemo(() => {
    return activeReports.filter(r => {
      const matchesCategory    = reportCategory === "all" || r.category === reportCategory;
      const matchesSubCategory = !activeSubCategory || r.tags.includes(activeSubCategory);
      const matchesSearch      = r.name.toLowerCase().includes(reportSearch.toLowerCase()) ||
                                 r.description.toLowerCase().includes(reportSearch.toLowerCase());
      return matchesCategory && matchesSubCategory && matchesSearch;
    });
  }, [reportSearch, reportCategory, activeSubCategory, activeReports]);

  const bookmarkedReports = useMemo(
    () => activeReports.filter(r => bookmarked.includes(r.id)),
    [bookmarked, activeReports],
  );

  const toggleBookmark = (id: string) =>
    setBookmarked(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]);

  // ── Cache: tracks which "tab:period:from:to" keys have already been fetched ──
  const loadedRef = useRef<Set<string>>(new Set());

  // ── Fetch only when needed — lazy per tab, cached per period+filter ───────────
  const fetchCurrentTab = useCallback((from?: string, to?: string, force = false) => {
    const key    = `${tab}:${period}:${from ?? ""}:${to ?? ""}`;
    const svcKey = `services:${period}:${from ?? ""}:${to ?? ""}`;

    if (!force && loadedRef.current.has(key)) return; // already loaded, skip
    loadedRef.current.add(key);

    switch (tab) {
      case "revenue":
        dispatch(fetchRevenueReportThunk({ period, from, to }));
        // share services data with the services tab via svcKey
        if (force || !loadedRef.current.has(svcKey)) {
          loadedRef.current.add(svcKey);
          dispatch(fetchServicesReportThunk({ period, from, to }));
        }
        break;
      case "appointments": dispatch(fetchAppointmentsReportThunk({ period, from, to })); break;
      case "clients":      dispatch(fetchClientsReportThunk({ period, from, to }));      break;
      case "staff":        dispatch(fetchStaffReportThunk({ period, from, to }));        break;
      case "services":
        if (force || !loadedRef.current.has(svcKey)) {
          loadedRef.current.add(svcKey);
          dispatch(fetchServicesReportThunk({ period, from, to }));
        }
        break;
    }
  }, [dispatch, tab, period]); // filterFrom/filterTo removed — only applied on explicit click

  // Clear fetch cache whenever period changes so switching back to a previous
  // period always re-fetches fresh data (Redux only keeps one slot per tab).
  useEffect(() => {
    loadedRef.current = new Set();
  }, [period]);

  useEffect(() => {
    fetchCurrentTab(); // called without from/to — uses period only
  }, [fetchCurrentTab]);

  const dashboardFetchedRef = useRef(false);
  useEffect(() => {
    if (dashboardFetchedRef.current) return;
    dashboardFetchedRef.current = true;
    dispatch(fetchReportsDashboardThunk({}));
  }, [dispatch]);

  // Fetch real staff + service names for filter dropdowns from management APIs
  const filterFetchedRef = useRef(false);
  useEffect(() => {
    if (filterFetchedRef.current) return;
    filterFetchedRef.current = true;

    dispatch(fetchStaffThunk()).unwrap()
      .then(staffList => {
        const names = staffList.map((s: any) =>
          [s.first_name, s.last_name].filter(Boolean).join(" ")
        ).filter(Boolean);
        if (names.length) setFilterStaffList(names);
      })
      .catch(() => {});

    api.get<{ data: { data: Array<{ name: string }> } }>(`${SERVICES.BASE}?limit=200&status=active`)
      .then(res => {
        const names = (res.data?.data?.data ?? []).map(s => s.name).filter(Boolean);
        if (names.length) setFilterServiceList(names);
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Dismiss error after 4 s
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => dispatch(clearReportError()), 4000);
    return () => clearTimeout(t);
  }, [error, dispatch]);

  // ── Derive display data (API data > fallback when empty or null) ─────────────
  // Every array is sanitized with .filter(Boolean) so a null entry from the API
  // never reaches a Recharts component (which crashes with "cannot read 'map'").

  const revenueTrend = (() => {
    const raw = (revenueData?.trend ?? []).filter(Boolean);
    const sanitized = raw.map(p => ({
      ...p,
      label:   p.label   ?? "",
      revenue: p.revenue ?? 0,
      target:  p.target  ?? 0,
      prev:    p.prev    ?? 0,
    }));
    // Always build the full date series so empty days show as ₹0
    return buildRevenueSeries(period, sanitized);
  })();

  const apptVolume = (() => {
    const raw = (appointmentsData?.volume ?? []).filter(Boolean);
    if (!raw.length) return [];
    return raw.map(p => ({
      ...p,
      label:     p.label     ?? "",
      completed: p.completed ?? 0,
      cancelled: p.cancelled ?? 0,
      noShow:    p.noShow    ?? 0,
    }));
  })();

  const clientGrowthData = (() => {
    const raw = (clientsData?.growth ?? []).filter(Boolean);
    if (!raw.length) return [];
    return raw.map(p => ({
      ...p,
      label:     p.label     ?? "",
      new:       p.new       ?? 0,
      returning: p.returning ?? 0,
      churned:   p.churned   ?? 0,
    }));
  })();

  const topClientsList = (() => {
    const raw = (clientsData?.topClients ?? []).filter(Boolean);
    if (!raw.length) return [];
    return raw.map(c => ({
      ...c,
      id:     String(c.id ?? ""),
      name:   c.name   ?? "—",
      visits: c.visits ?? 0,
      spend:  c.spend  ?? 0,
    }));
  })();

  const staffList = (() => {
    const raw = (staffData?.performance ?? []).filter(Boolean);
    if (!raw.length) return [];
    return raw.map((s: any, i) => ({
      ...s,
      bookings:       s.bookings       ?? 0,
      revenue:        s.revenue        ?? 0,
      serviceRevenue: s.serviceRevenue ?? s.revenue ?? 0,
      productRevenue: s.productRevenue ?? 0,
      servicesSold:   s.servicesSold   ?? s.servicesPerformed ?? 0,
      productsSold:   s.productsSold   ?? 0,
      customerCount:  s.customerCount  ?? s.bookings ?? 0,
      avgTicket:      s.avgTicket      ?? 0,
      color: s.color ?? CHART_COLORS[i % CHART_COLORS.length],
    }));
  })();

  const radarData = (() => {
    const raw = (staffData?.radar ?? []).filter(Boolean);
    if (!raw.length) return [];
    const mapped = raw.map(point => {
      const out: { metric: string; [k: string]: string | number } = { metric: String(point.metric ?? "") };
      Object.entries(point).forEach(([k, v]) => {
        if (k !== "metric") out[k] = (v as number) ?? 0;
      });
      return out;
    });
    const hasStaffKeys = Object.keys(mapped[0] ?? {}).some(k => k !== "metric");
    if (!hasStaffKeys) return [];
    return mapped;
  })();

  const serviceList = (() => {
    const raw = (servicesData?.services ?? []).filter(Boolean);
    if (!raw.length) return [];
    return raw.map((s, i) => ({
      ...s,
      name:      s.name      ?? "—",
      bookings:  s.bookings  ?? 0,
      revenue:   s.revenue   ?? 0,
      avgTicket: s.avgTicket ?? 0,
      growth:    s.growth    ?? 0,
      color: s.color ?? CHART_COLORS[i % CHART_COLORS.length],
    }));
  })();

  const peakHoursData = (appointmentsData?.peakHours ?? [])
    .filter(Boolean)
    .map(h => ({ hour: h.hour ?? "", count: h.count ?? 0 }));

  // ── Live KPI config built from API data (falls back to static kpiConfig) ─────
  const liveKpis = useMemo(() => {
    const fmtRupee = (n: number) =>
      n >= 100_000 ? `₹${(n / 100_000).toFixed(1)}L`
      : n >= 1_000 ? `₹${(n / 1_000).toFixed(1)}k`
      : `₹${n.toLocaleString()}`;
    const fmtPct  = (n: number) => n === 0 ? "—" : `${n >= 0 ? "+" : ""}${n}%`;
    const isUp    = (n: number) => n >= 0;

    if (tab === "revenue" && revenueData?.kpi) {
      const k = revenueData.kpi;
      return [
        { label: "Total Revenue",     value: fmtRupee(k.totalRevenue),    change: fmtPct(k.changes.totalRevenue),    up: isUp(k.changes.totalRevenue),    icon: <CurrencyRupee size={16}/>, color: "#10b981" },
        { label: "Avg Daily Revenue", value: fmtRupee(k.avgDailyRevenue), change: fmtPct(k.changes.avgDailyRevenue), up: isUp(k.changes.avgDailyRevenue), icon: <GraphUpArrow  size={16}/>, color: "#3b82f6" },
        { label: "Best Day Revenue",  value: fmtRupee(k.bestDayRevenue),  change: fmtPct(k.changes.bestDayRevenue),  up: isUp(k.changes.bestDayRevenue),  icon: <ArrowUpRight  size={16}/>, color: "#8b5cf6" },
        { label: "Target Achieved",   value: `${k.targetAchieved}%`,      change: fmtPct(k.changes.targetAchieved),  up: isUp(k.changes.targetAchieved),  icon: <StarFill      size={16}/>, color: "#f59e0b" },
      ];
    }
    if (tab === "appointments" && appointmentsData?.kpi) {
      const k = appointmentsData.kpi;
      return [
        { label: "Total Bookings",    value: k.totalBookings.toLocaleString(), change: fmtPct(k.changes.totalBookings),    up: isUp(k.changes.totalBookings),    icon: <CalendarCheck  size={16}/>, color: "#3b82f6" },
        { label: "Completion Rate",   value: `${k.completionRate}%`,           change: fmtPct(k.changes.completionRate),   up: isUp(k.changes.completionRate),   icon: <ArrowUpRight   size={16}/>, color: "#10b981" },
        { label: "Cancellation Rate", value: `${k.cancellationRate}%`,         change: fmtPct(k.changes.cancellationRate), up: !isUp(k.changes.cancellationRate), icon: <ArrowDownRight size={16}/>, color: "#ef4444" },
        { label: "Avg Duration",      value: `${k.avgDuration} min`,           change: `${k.changes.avgDuration} min`,     up: false,                             icon: <Calendar3      size={16}/>, color: "#8b5cf6" },
      ];
    }
    if (tab === "clients" && clientsData?.kpi) {
      const k = clientsData.kpi;
      return [
        { label: "Total Clients",      value: k.totalClients.toLocaleString(),       change: fmtPct(k.changes.totalClients),       up: isUp(k.changes.totalClients),       icon: <People        size={16}/>, color: "#3b82f6" },
        { label: "New This Month",     value: k.newThisMonth.toString(),              change: fmtPct(k.changes.newThisMonth),       up: isUp(k.changes.newThisMonth),       icon: <ArrowUpRight  size={16}/>, color: "#10b981" },
        { label: "Retention Rate",     value: `${k.retentionRate}%`,                 change: fmtPct(k.changes.retentionRate),      up: isUp(k.changes.retentionRate),      icon: <ArrowRepeat   size={16}/>, color: "#8b5cf6" },
        { label: "Avg Visits/Client",  value: k.avgVisitsPerClient.toString(),        change: fmtPct(k.changes.avgVisitsPerClient), up: isUp(k.changes.avgVisitsPerClient), icon: <CalendarCheck size={16}/>, color: "#f59e0b" },
      ];
    }
    if (tab === "staff" && staffData?.kpi) {
      const k = staffData.kpi;
      return [
        { label: "Active Staff",    value: k.activeStaff.toString(),    change: fmtPct(k.changes.activeStaff),      up: isUp(k.changes.activeStaff),      icon: <People        size={16}/>, color: "#3b82f6" },
        { label: "Avg Utilization", value: `${k.avgUtilization}%`,      change: fmtPct(k.changes.avgUtilization),   up: isUp(k.changes.avgUtilization),   icon: <GraphUpArrow  size={16}/>, color: "#10b981" },
        { label: "Top Earner",      value: fmtRupee(k.topEarnerRevenue),change: fmtPct(k.changes.topEarnerRevenue), up: isUp(k.changes.topEarnerRevenue), icon: <CurrencyRupee size={16}/>, color: "#8b5cf6" },
        { label: "Avg Rating",      value: k.avgRating.toFixed(2),      change: fmtPct(k.changes.avgRating),        up: isUp(k.changes.avgRating),        icon: <StarFill      size={16}/>, color: "#f59e0b" },
      ];
    }
    if (tab === "services" && servicesData?.kpi) {
      const k = servicesData.kpi;
      return [
        { label: "Active Services", value: k.activeServices.toString(),     change: fmtPct(k.changes.activeServices),    up: isUp(k.changes.activeServices),    icon: <Scissors      size={16}/>, color: "#3b82f6" },
        { label: "Top Service Rev", value: fmtRupee(k.topServiceRevenue),   change: fmtPct(k.changes.topServiceRevenue), up: isUp(k.changes.topServiceRevenue), icon: <CurrencyRupee size={16}/>, color: "#10b981" },
        { label: "Avg Ticket",      value: `₹${k.avgTicket.toLocaleString()}`, change: fmtPct(k.changes.avgTicket),    up: isUp(k.changes.avgTicket),         icon: <ArrowUpRight  size={16}/>, color: "#8b5cf6" },
        { label: "New Services",    value: k.newServices.toString(),         change: fmtPct(k.changes.newServices),      up: isUp(k.changes.newServices),       icon: <ArrowRepeat   size={16}/>, color: "#f59e0b" },
      ];
    }
    return [];
  }, [tab, revenueData, appointmentsData, clientsData, staffData, servicesData]);

  // ── Tab / Period config ──────────────────────────────────────────────────────
  const periods: { key: ReportPeriod; label: string }[] = [
    { key: "7d",  label: "7 Days"   },
    { key: "30d", label: "30 Days"  },
    { key: "90d", label: "90 Days"  },
    { key: "12m", label: "12 Months"},
  ];

  const tabs: { key: ReportTab; label: string; icon: React.ReactNode }[] = [
    { key: "revenue",      label: "Revenue",      icon: <CurrencyRupee size={15} /> },
    { key: "appointments", label: "Appointments", icon: <CalendarCheck  size={15} /> },
    { key: "clients",      label: "Clients",      icon: <People         size={15} /> },
    { key: "staff",        label: "Staff",        icon: <People         size={15} /> },
    { key: "services",     label: "Services",     icon: <Scissors       size={15} /> },
  ];

  const kpis = liveKpis;
  const isTabLoading = loading[tab];

  // ── Export handler ───────────────────────────────────────────────────────────
  const handleExport = () => {
    dispatch(exportReportThunk({
      tab, period, format: "excel",
      from: filterFrom || undefined,
      to:   filterTo   || undefined,
    }));
  };

  return (
    <div className="rp-page">

      {/* ── Error banner ── */}
      {error && (
        <div className="rp-error-banner">
          {error}
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="rp-header">
        <div className="rp-header-left">
          <div className="rp-header-icon">
            <FileEarmarkBarGraph size={20} />
          </div>
          <div>
            <h1 className="rp-page-title">Reports</h1>
            <p className="rp-page-sub">Track performance, identify trends and grow your business</p>
          </div>
        </div>
        <div className="rp-header-right">
          <div className="rp-period-pills">
            {isCustomRange && (
              <span className="rp-period-pill active" style={{ cursor: "default", fontSize: 12 }}>
                Custom Range
              </span>
            )}
            {periods.map(p => (
              <Button
                key={p.key}
                variant="ghost"
                className={`rp-period-pill ${!isCustomRange && period === p.key ? "active" : ""}`}
                style={isCustomRange ? { opacity: 0.45, pointerEvents: "none" } : undefined}
                onClick={() => {
                  setIsCustomRange(false);
                  setFilterFrom("");
                  setFilterTo("");
                  setFilterDateError("");
                  setPeriod(p.key);
                }}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <Button variant="ghost" className="rp-filter-btn" onClick={() => setShowFilter(v => !v)}>
            <Funnel size={14} /> Filters
          </Button>
          <Button
            variant="ghost"
            className="rp-export-btn"
            loading={loading.export}
            iconLeft={<FileEarmarkArrowDown size={14} />}
            onClick={handleExport}
          >
            {loading.export ? "Exporting…" : "Export"}
          </Button>
        </div>
      </div>

      {/* ── FILTER BAR ── */}
      {showFilter && (
        <div className="rp-filter-bar">
          <div className="rp-filter-group">
            <label>DATE RANGE</label>
            <div className={`rp-filter-input-wrap${filterDateError ? " rp-filter-input-error" : ""}`}>
              <Calendar3 size={13} className="rp-filter-ic" />
              <input
                type="date"
                className="rp-filter-input"
                value={filterFrom}
                max={filterTo || undefined}
                onChange={e => { setFilterFrom(e.target.value); setFilterDateError(""); }}
              />
              <span className="rp-filter-sep">—</span>
              <input
                type="date"
                className="rp-filter-input"
                value={filterTo}
                min={filterFrom || undefined}
                onChange={e => { setFilterTo(e.target.value); setFilterDateError(""); }}
              />
            </div>
            {filterDateError && (
              <span className="rp-filter-date-err">{filterDateError}</span>
            )}
          </div>
          <div className="rp-filter-group">
            <label>STAFF</label>
            <select className="rp-filter-select" value={filterStaff} onChange={e => setFilterStaff(e.target.value)}>
              <option value="">All Staff</option>
              {filterStaffList.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <div className="rp-filter-group">
            <label>SERVICE</label>
            <select className="rp-filter-select" value={filterService} onChange={e => setFilterService(e.target.value)}>
              <option value="">All Services</option>
              {filterServiceList.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <div className="rp-filter-group">
            <label>PAYMENT</label>
            <select className="rp-filter-select" value={filterPayment} onChange={e => setFilterPayment(e.target.value)}>
              <option value="">All Methods</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
              <option value="wallet">Wallet</option>
            </select>
          </div>
          <Button
            variant="ghost"
            className="rp-apply-btn"
            onClick={() => {
              if (filterFrom && !filterTo) {
                setFilterDateError("Please select an end date");
                return;
              }
              if (!filterFrom && filterTo) {
                setFilterDateError("Please select a start date");
                return;
              }
              if (filterFrom && filterTo && filterFrom > filterTo) {
                setFilterDateError("Start date must be before end date");
                return;
              }
              setFilterDateError("");
              if (filterFrom && filterTo) {
                setIsCustomRange(true);
              }
              fetchCurrentTab(filterFrom || undefined, filterTo || undefined, true);
            }}
          >
            Apply
          </Button>
          {(filterFrom || filterTo || filterStaff || filterService || filterPayment) && (
            <Button
              variant="ghost"
              className="rp-apply-btn"
              onClick={() => {
                setFilterFrom("");
                setFilterTo("");
                setFilterStaff("");
                setFilterService("");
                setFilterPayment("");
                setFilterDateError("");
                setIsCustomRange(false);
                fetchCurrentTab(undefined, undefined, true);
              }}
            >
              Clear
            </Button>
          )}
        </div>
      )}

      {/* ── TABS ── */}
      <div className="rp-tabs">
        {tabs.map(t => (
          <Button
            key={t.key}
            variant="ghost"
            className={`rp-tab ${tab === t.key ? "active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.icon} {t.label}
          </Button>
        ))}
      </div>

      {/* ── KPI ROW ── */}
      <div className="rp-kpi-row">
        {kpis.map((k) => (
          <div className="rp-kpi-card" key={k.label}>
            <div className="rp-kpi-top">
              <span className="rp-kpi-icon" style={{ color: k.color, background: k.color + "18" }}>
                {k.icon}
              </span>
              <span className={`rp-kpi-change ${k.up ? "up" : "down"}`}>
                {k.up ? <ChevronUp size={11}/> : <ChevronDown size={11}/>} {k.change}
              </span>
            </div>
            <div className="rp-kpi-value">{k.value}</div>
            <div className="rp-kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      {/* ── TAB CONTENT ── */}
      <div style={{ position: "relative" }}>
        {isTabLoading && (
          <div className="rp-tab-loading">
            <PageLoader />
          </div>
        )}
        {tab === "revenue"      && <RevenueTab trend={revenueTrend} services={serviceList} period={period} />}
        {tab === "appointments" && <AppointmentsTab volume={apptVolume} peakHours={peakHoursData} />}
        {tab === "clients"      && <ClientsTab growth={clientGrowthData} topClients={topClientsList} />}
        {tab === "staff"        && <StaffTab radarStaff={radarData} period={period} filterFrom={filterFrom || undefined} filterTo={filterTo || undefined} />}
        {tab === "services"     && <ServicesTab services={serviceList} />}
      </div>

      {/* ── REPORTS DASHBOARD ── */}
      <div className="rp-dashboard-section">

        {/* ── Detail view when a report is opened ── */}
        {openReport ? (
          <>
            <h2 className="rp-dashboard-title">Reports</h2>
            {openReport.id === "revenue_by_service"
              ? <RevenueByServiceReportDetail report={openReport} onBack={() => setOpenReport(null)} />
              : openReport.category === "finance"       ? <FinanceReportDetail    report={openReport} onBack={() => setOpenReport(null)} />
              : openReport.category === "inventory"     ? <InventoryReportDetail  report={openReport} onBack={() => setOpenReport(null)} />
              : openReport.category === "payments"      ? <PaymentReportDetail    report={openReport} onBack={() => setOpenReport(null)} />
              : openReport.category === "daily_reports" ? <DailyReportDetail      report={openReport} onBack={() => setOpenReport(null)} staffNames={filterStaffList} />
              : openReport.id === "campaign_performance"  ? <CampaignPerformanceReportDetail  report={openReport} onBack={() => setOpenReport(null)} />
              : openReport.id === "template_performance" ? <TemplatePerformanceReportDetail report={openReport} onBack={() => setOpenReport(null)} />
              : openReport.id === "message_spend"        ? <MessageSpendReportDetail        report={openReport} onBack={() => setOpenReport(null)} />
              : openReport.id === "client_acquisition"   ? <ClientAcquisitionReportDetail   report={openReport} onBack={() => setOpenReport(null)} />
              : openReport.id === "vip_clients"                                             ? <VipClientsReportDetail    report={openReport} onBack={() => setOpenReport(null)} />
              : openReport.id === "staff_schedule"                                          ? <StaffScheduleReportDetail report={openReport} onBack={() => setOpenReport(null)} />
              : openReport.id === "commissions" || openReport.id === "commissions_graphical" ? <CommissionsReportDetail report={openReport} onBack={() => setOpenReport(null)} />
              : openReport.id === "leaves"                  ? <LeavesReportDetail              report={openReport} onBack={() => setOpenReport(null)} />
              : openReport.id === "staff_revenue_analytics" ? <StaffRevenueAnalyticsDetail     report={openReport} onBack={() => setOpenReport(null)} />
              : openReport.id === "staff_product_sales"     ? <StaffProductSalesDetail         report={openReport} onBack={() => setOpenReport(null)} />
              : openReport.id === "staff_service_sales"     ? <StaffServiceSalesDetail         report={openReport} onBack={() => setOpenReport(null)} />
              : openReport.category === "employee"          ? <EmployeeReportDetail            report={openReport} onBack={() => setOpenReport(null)} />
              : <AppointmentReportDetail report={openReport} onBack={() => setOpenReport(null)} />
            }
          </>
        ) : (
          <>
            <h2 className="rp-dashboard-title">Reports Dashboard</h2>

            {/* Search */}
            <div className="rp-search-wrap">
              <Search size={14} className="rp-search-ic" />
              <input
                type="text"
                className="rp-search-input"
                placeholder="Search Report"
                value={reportSearch}
                onChange={e => setReportSearch(e.target.value)}
              />
            </div>

            {/* Category tabs */}
            <div className="rp-cat-tabs">
              {FALLBACK_CATEGORIES.map(cat => (
                <Button
                  key={cat.key}
                  variant="ghost"
                  className={`rp-cat-tab ${reportCategory === cat.key ? "active" : ""}`}
                  onClick={() => handleCategoryChange(cat.key)}
                >
                  {cat.label}
                  {cat.count > 0 && <span className="rp-cat-count">{cat.count}</span>}
                </Button>
              ))}
            </div>

            {/* Sub-category pills — shown when the active category has sub-categories */}
            {reportCategory !== "all" && SUB_CATEGORIES[reportCategory] && (
              <div className="rp-subcat-pills">
                {SUB_CATEGORIES[reportCategory]!.map(sub => {
                  const subCount = activeReports.filter(r => r.category === reportCategory && r.tags.includes(sub)).length;
                  return (
                    <button
                      key={sub}
                      className={`rp-subcat-pill ${activeSubCategory === sub ? "active" : ""}`}
                      onClick={() => setActiveSubCategory(prev => prev === sub ? null : sub)}
                    >
                      {sub} ({subCount})
                    </button>
                  );
                })}
              </div>
            )}

            {/* List + Bookmarked */}
            <div className="rp-dashboard-body">

              {/* Report list */}
              <div className="rp-report-list">
                <div className="rp-report-list-head">
                  <span>NAME ↕</span>
                  <span>DESCRIPTION</span>
                </div>

                {filteredReports.length === 0 ? (
                  <div className="rp-report-empty">No reports found.</div>
                ) : (
                  filteredReports.map(report => (
                    <div key={report.id} className="rp-report-row" onClick={() => setOpenReport(report)}>
                      <div className="rp-report-name-col">
                        <span className="rp-report-name rp-report-name-link">
                          {report.name}
                        </span>
                        <div className="rp-report-tags">
                          {report.tags.map(t => (
                            <span key={t} className="rp-report-tag">{t}</span>
                          ))}
                          {report.isNewVersion && <span className="rp-report-tag new">New Version</span>}
                        </div>
                      </div>
                      <div className="rp-report-desc">
                        {report.description.length > 110
                          ? <>{report.description.slice(0, 110)}<span className="rp-report-more">...More</span></>
                          : report.description}
                      </div>
                      <button
                        className={`rp-bookmark-btn ${bookmarked.includes(report.id) ? "active" : ""}`}
                        onClick={e => { e.stopPropagation(); toggleBookmark(report.id); }}
                        aria-label="Bookmark"
                      >
                        {bookmarked.includes(report.id) ? <StarFill size={16} /> : <Star size={16} />}
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Bookmarked panel */}
              <div className="rp-bookmarked-panel">
                <h3 className="rp-bookmarked-title">Bookmarked</h3>
                {bookmarkedReports.length === 0 ? (
                  <div className="rp-bookmarked-empty">
                    <div className="rp-bookmarked-folder">
                      <FileEarmarkBarGraph size={52} className="rp-bookmarked-folder-icon" />
                    </div>
                    <p className="rp-bookmarked-empty-title">No bookmarked reports</p>
                    <p className="rp-bookmarked-empty-sub">
                      Start bookmarking reports to see bookmarked list of reports
                    </p>
                  </div>
                ) : (
                  <div className="rp-bookmarked-list">
                    {bookmarkedReports.map(r => (
                      <div key={r.id} className="rp-bookmarked-item">
                        <StarFill size={13} color="#f59e0b" />
                        <span>{r.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </>
        )}

      </div>

    </div>
  );
}
