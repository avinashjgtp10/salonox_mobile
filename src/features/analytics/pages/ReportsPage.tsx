import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Search, Star, ChevronLeft, ArrowRepeat as Refresh, Grid3x3Gap, InfoCircle } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import type { AppDispatch, RootState } from "../../../store/store";
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
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, ReferenceLine,
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

const RADAR_COLORS = ["#111827", "#3b82f6", "#10b981"];

interface StaffItem {
  id?: string | number;
  name: string;
  bookings: number;
  revenue: number;
  rating: number;
  utilization: number;
  avgTicket: number;
  color?: string;
}

const StaffTab = ({
  staffData,
  radarStaff,
}: {
  staffData: StaffItem[];
  radarStaff: Array<{ metric: string; [key: string]: string | number }>;
}) => {
  const radarNames = radarStaff.length > 0 && radarStaff[0] != null
    ? Object.keys(radarStaff[0]).filter(k => k !== "metric").slice(0, 3)
    : [];

  return (
  <div className="rp-tab-body">
    <div className="rp-two-col">
      <div className="rp-chart-card rp-chart-card-tall">
        <h4 className="rp-chart-title">Performance Radar</h4>
        <p className="rp-chart-sub">Top 3 staff multi-metric comparison</p>
        {radarNames.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarStaff} key={radarNames.join(",")}>
                <PolarGrid stroke="#f3f4f6" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "#6b7280" }} />
                {radarNames.map((name, i) => (
                  <Radar key={name} name={name} dataKey={name}
                    stroke={RADAR_COLORS[i]} fill={RADAR_COLORS[i]}
                    fillOpacity={0.08} strokeWidth={2} />
                ))}
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
            <div className="rp-legend-row mt-2 justify-content-center">
              {radarNames.map((name, i) => (
                <span key={name} className="rp-leg-item">
                  <span className="rp-pie-dot" style={{ background: RADAR_COLORS[i] }} />{name}
                </span>
              ))}
            </div>
          </>
        ) : (
          <EmptyChart height={260} message="No performance data available" />
        )}
      </div>
      <div className="rp-chart-card rp-chart-card-tall">
        <h4 className="rp-chart-title">Utilization Rate</h4>
        <p className="rp-chart-sub">Hours booked vs available</p>
        {staffData.length === 0 ? <EmptyChart height={260} /> : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={staffData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }} barSize={12}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                tickFormatter={v => `${v}%`} domain={[0,100]} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#374151" }} axisLine={false} tickLine={false} width={65} />
              <Tooltip formatter={(v: any) => `${v}%`} />
              <Bar dataKey="utilization" name="Utilization" radius={[0,4,4,0]}>
                {staffData.map((s, i) => <Cell key={s.name} fill={s.color ?? CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
    <div className="rp-staff-table-card">
      <h4 className="rp-chart-title mb-3">Staff Leaderboard</h4>
      {staffData.length === 0 ? <EmptyChart height={200} message="No staff data available" /> : (
        <div className="rp-table">
          <div className="rp-table-head">
            <span>#</span><span>Name</span><span>Bookings</span>
            <span>Revenue</span><span>Avg Ticket</span><span>Rating</span><span>Utilization</span>
          </div>
          {staffData.map((s, i) => {
            const color = s.color ?? CHART_COLORS[i % CHART_COLORS.length];
            return (
              <div key={s.name} className="rp-table-row">
                <span className="rp-table-rank">#{i+1}</span>
                <span className="d-flex align-items-center gap-2">
                  <span className="rp-sm-av" style={{ background: color }}>{s.name.split(" ").map(w=>w[0]).join("")}</span>
                  {s.name}
                </span>
                <span>{s.bookings}</span>
                <span className="fw-semibold">₹{s.revenue.toLocaleString()}</span>
                <span>₹{s.avgTicket}</span>
                <span className="rp-rating"><StarFill size={11} color="#f59e0b" /> {s.rating}</span>
                <span>
                  <div className="rp-util-bar">
                    <div className="rp-util-fill" style={{ width: `${s.utilization}%`, background: color }} />
                  </div>
                  <small className="text-muted ms-2">{s.utilization}%</small>
                </span>
              </div>
            );
          })}
        </div>
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
const APPT_STATUSES      = ["All", "Open", "Closed", "Cancelled", "No Show", "Checked-in", "Confirmed", "Deleted"];
const APPT_SOURCES       = ["All", "Walk-In", "Online", "Phone", "App", "Staff", "Kiosk", "Third Party", "Other"];

const AppointmentReportDetail = ({ report, onBack }: { report: ReportItem; onBack: () => void }) => {
  const today = new Date().toISOString().slice(0, 10);
  const navigate = useNavigate();
  const abortRef = useRef<AbortController | null>(null);
  const [dateType,          setDateType]          = useState(DATE_TYPE_OPTIONS[0]);
  const [showDtDrop,        setShowDtDrop]        = useState(false);
  const [dateFrom,          setDateFrom]          = useState(today);
  const [dateTo,            setDateTo]            = useState(today);
  const [selectedStatuses,  setSelectedStatuses]  = useState<string[]>(APPT_STATUSES);
  const [statusSearch,      setStatusSearch]      = useState("");
  const [showStatusDrop,    setShowStatusDrop]    = useState(false);
  const [selectedSources,   setSelectedSources]   = useState<string[]>(APPT_SOURCES);
  const [showSourceDrop,    setShowSourceDrop]    = useState(false);
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
        sources:  selectedSources.filter(s => s !== "All").join(","),
      });
      const res = await api.get<{ data: AppointmentRow[] }>(
        `/api/v1/reports/appointments/detail?${params}`,
        { signal: ctrl.signal },
      );
      if (res.data?.data) setRows(res.data.data);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") setRows([]);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateType, dateFrom, dateTo, selectedStatuses, selectedSources]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const close = () => {
      setShowDtDrop(false);
      setShowStatusDrop(false);
      setShowSourceDrop(false);
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

  const toggleSource = (s: string) => {
    if (s === "All") {
      setSelectedSources(selectedSources.length === APPT_SOURCES.length ? [] : [...APPT_SOURCES]);
    } else {
      setSelectedSources(prev =>
        prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
      );
    }
  };

  const statusLabel = selectedStatuses.length === APPT_STATUSES.length
    ? `All selected (${APPT_STATUSES.length - 1})`
    : selectedStatuses.length === 0 ? "None selected"
    : `${selectedStatuses.filter(s => s !== "All").length} selected`;

  const sourceLabel = selectedSources.length === APPT_SOURCES.length
    ? `All selected (${APPT_SOURCES.length - 1})`
    : selectedSources.length === 0 ? "None selected"
    : `${selectedSources.filter(s => s !== "All").length} selected`;

  const filteredStatuses = APPT_STATUSES.filter(s =>
    s.toLowerCase().includes(statusSearch.toLowerCase())
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
          <button className="rp-detail-select" onClick={() => { setShowDtDrop(v => !v); setShowStatusDrop(false); setShowSourceDrop(false); }}>
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
          <button className="rp-detail-select" onClick={() => { setShowStatusDrop(v => !v); setShowDtDrop(false); setShowSourceDrop(false); }}>
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
                  {opt}
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

      {/* ── Filters row 2 ── */}
      <div className="rp-detail-filters rp-detail-filters-row2">
        {/* Appointment Source — multi-select */}
        <div className="rp-detail-filter-group" style={{ position: "relative" }}>
          <label className="rp-detail-filter-label">Appointment Source</label>
          <button className="rp-detail-select" onClick={() => { setShowSourceDrop(v => !v); setShowDtDrop(false); setShowStatusDrop(false); }}>
            {sourceLabel} <span className="rp-detail-caret">▼</span>
          </button>
          {showSourceDrop && (
            <div className="rp-detail-dropdown rp-detail-dropdown-wide" onMouseDown={e => e.stopPropagation()}>
              {APPT_SOURCES.map(opt => (
                <div key={opt} className="rp-detail-checkbox-item" onClick={() => toggleSource(opt)}>
                  <span className={`rp-detail-checkbox ${selectedSources.includes(opt) ? "checked" : ""}`}>
                    {selectedSources.includes(opt) && "✓"}
                  </span>
                  {opt}
                </div>
              ))}
            </div>
          )}
        </div>

        <Button variant="ghost" className="rp-detail-refresh-btn" onClick={handleRefresh} loading={loading}>
          <Refresh size={13} /> Refresh
        </Button>
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

const PAYMENT_METHODS = ["All", "Cash", "Card", "UPI", "Online", "Wallet"];

const FinanceReportDetail = ({ report, onBack }: { report: ReportItem; onBack: () => void }) => {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [dateFrom,        setDateFrom]        = useState(monthStart);
  const [dateTo,          setDateTo]          = useState(today);
  const [paymentMethod,   setPaymentMethod]   = useState("All");
  const [showMethodDrop,  setShowMethodDrop]  = useState(false);
  const [rows,            setRows]            = useState<FinanceRow[]>([]);
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
      const params = new URLSearchParams({ from: dateFrom, to: dateTo, method: paymentMethod });
      const res = await api.get<{ data: FinanceRow[] }>(`/api/v1/reports/finance/detail?${params}`, { signal: ctrl.signal });
      if (res.data?.data) setRows(res.data.data);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") setRows([]);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo, paymentMethod]);

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
            {paymentMethod} <span className="rp-detail-caret">▼</span>
          </button>
          {showMethodDrop && (
            <div className="rp-detail-dropdown" onMouseDown={e => e.stopPropagation()}>
              {PAYMENT_METHODS.map(m => (
                <div key={m} className={`rp-detail-dropdown-item ${m === paymentMethod ? "active" : ""}`}
                  onClick={() => { setPaymentMethod(m); setShowMethodDrop(false); }}>{m}</div>
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
        api.get("/api/v1/products", { signal: ctrl.signal }),
        api.get("/api/v1/categories", { signal: ctrl.signal }),
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

const PAY_GATEWAYS = ["All", "Razorpay", "Stripe", "Paytm", "PayU", "Cashfree"];
const PAY_STATUSES = ["All", "Success", "Pending", "Failed", "Refunded"];

const PaymentReportDetail = ({ report, onBack }: { report: ReportItem; onBack: () => void }) => {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [dateFrom,        setDateFrom]        = useState(monthStart);
  const [dateTo,          setDateTo]          = useState(today);
  const [gateway,         setGateway]         = useState("All");
  const [payStatus,       setPayStatus]       = useState("All");
  const [showGwDrop,      setShowGwDrop]      = useState(false);
  const [showPsDrop,      setShowPsDrop]      = useState(false);
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
      const params = new URLSearchParams({ from: dateFrom, to: dateTo, gateway, status: payStatus });
      const res = await api.get<{ data: PaymentRow[] }>(`/api/v1/reports/payments/detail?${params}`, { signal: ctrl.signal });
      if (res.data?.data) setRows(res.data.data);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") setRows([]);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo, gateway, payStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const close = () => { setShowGwDrop(false); setShowPsDrop(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const HEADERS = ["Date", "Transaction ID", "Client Name", "Amount (₹)", "Gateway", "Method", "Reference No", "Status"];
  const exportRows = () => rows.map(r => [r.date, r.transactionId, r.clientName, r.amount, r.gateway, r.method, r.referenceNo, r.status]);

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
          <label className="rp-detail-filter-label">Gateway</label>
          <button className="rp-detail-select" onClick={() => { setShowGwDrop(v => !v); setShowPsDrop(false); }}>
            {gateway} <span className="rp-detail-caret">▼</span>
          </button>
          {showGwDrop && (
            <div className="rp-detail-dropdown" onMouseDown={e => e.stopPropagation()}>
              {PAY_GATEWAYS.map(g => (
                <div key={g} className={`rp-detail-dropdown-item ${g === gateway ? "active" : ""}`}
                  onClick={() => { setGateway(g); setShowGwDrop(false); }}>{g}</div>
              ))}
            </div>
          )}
        </div>
        <div className="rp-detail-filter-group" style={{ position: "relative" }}>
          <label className="rp-detail-filter-label">Status</label>
          <button className="rp-detail-select" onClick={() => { setShowPsDrop(v => !v); setShowGwDrop(false); }}>
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


      <div className="rp-detail-drag-hint">
        {rows.length} payment{rows.length !== 1 ? "s" : ""}
        {rows.length > 0 && <>&nbsp;·&nbsp;Total: <strong>₹{rows.reduce((s, r) => s + r.amount, 0).toLocaleString()}</strong></>}
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>Date <span className="rp-th-sort">↕</span></th>
              <th>Transaction ID</th>
              <th>Client Name</th>
              <th>Amount (₹) <span className="rp-th-sort">↕</span></th>
              <th>Gateway</th>
              <th>Method</th>
              <th>Reference No</th>
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
                <td>{r.date}</td>
                <td><span className="rp-detail-link">{r.transactionId}</span></td>
                <td><span className="rp-detail-link">{r.clientName}</span></td>
                <td className="fw-semibold">₹{r.amount.toLocaleString()}</td>
                <td>{r.gateway}</td>
                <td>{r.method}</td>
                <td>{r.referenceNo}</td>
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

const DAILY_SERVICES = ["All", "Haircut", "Hair Color", "Facial", "Massage", "Nails", "Bridal Pkg"];

const DailyReportDetail = ({ report, onBack, staffNames }: { report: ReportItem; onBack: () => void; staffNames: string[] }) => {
  const today = new Date().toISOString().slice(0, 10);
  const [date,            setDate]            = useState(today);
  const [serviceFilter,   setServiceFilter]   = useState("All");
  const [staffFilter,     setStaffFilter]     = useState("All");
  const [showSvcDrop,     setShowSvcDrop]     = useState(false);
  const [showStfDrop,     setShowStfDrop]     = useState(false);
  const [rows,            setRows]            = useState<DailyRow[]>([]);
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
      const params = new URLSearchParams({ date, service: serviceFilter, staff: staffFilter });
      const res = await api.get<{ data: DailyRow[] }>(`/api/v1/reports/daily/detail?${params}`, { signal: ctrl.signal });
      if (res.data?.data) setRows(res.data.data);
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
              {DAILY_SERVICES.map(s => (
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
                <td>{r.time}</td>
                <td><span className="rp-detail-link">{r.ticketNo}</span></td>
                <td><span className="rp-detail-link">{r.clientName}</span></td>
                <td>{r.service}</td>
                <td>{r.staff}</td>
                <td className="fw-semibold">₹{r.amount.toLocaleString()}</td>
                <td>{r.paymentMethod}</td>
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
      const res = await api.get("/api/v1/clients", { signal: ctrl.signal });
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
  revenue: number;
  avgTicket: number;
  bookings: number;
  rating: number;
  utilization: number;
}

const EMP_ROLES = ["All", "Senior Stylist", "Stylist", "Therapist", "Nail Technician", "Massage Therapist"];
const EMP_DEPTS = ["All", "Hair", "Spa", "Nails", "Skin", "Makeup"];

const EmployeeReportDetail = ({ report, onBack }: { report: ReportItem; onBack: () => void }) => {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [dateFrom,        setDateFrom]        = useState(monthStart);
  const [dateTo,          setDateTo]          = useState(today);
  const [role,            setRole]            = useState("All");
  const [dept,            setDept]            = useState("All");
  const [showRoleDrop,    setShowRoleDrop]    = useState(false);
  const [showDeptDrop,    setShowDeptDrop]    = useState(false);
  const [rows,            setRows]            = useState<EmployeeRow[]>([]);
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
      const params = new URLSearchParams({ from: dateFrom, to: dateTo, role, department: dept });
      const res = await api.get<{ data: EmployeeRow[] }>(`/api/v1/reports/employee/detail?${params}`, { signal: ctrl.signal });
      if (res.data?.data) setRows(res.data.data);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") setRows([]);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo, role, dept]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const close = () => { setShowRoleDrop(false); setShowDeptDrop(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const HEADERS = ["Name", "Role", "Department", "Services", "Revenue (₹)", "Avg Ticket (₹)", "Bookings", "Rating", "Utilization (%)"];
  const exportRows = () => rows.map(r => [r.name, r.role, r.department, r.servicesPerformed, r.revenue, r.avgTicket, r.bookings, r.rating, r.utilization]);

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
          <label className="rp-detail-filter-label">Role</label>
          <button className="rp-detail-select" onClick={() => { setShowRoleDrop(v => !v); setShowDeptDrop(false); }}>
            {role.length > 16 ? role.slice(0, 16) + "…" : role} <span className="rp-detail-caret">▼</span>
          </button>
          {showRoleDrop && (
            <div className="rp-detail-dropdown" onMouseDown={e => e.stopPropagation()}>
              {EMP_ROLES.map(r => (
                <div key={r} className={`rp-detail-dropdown-item ${r === role ? "active" : ""}`}
                  onClick={() => { setRole(r); setShowRoleDrop(false); }}>{r}</div>
              ))}
            </div>
          )}
        </div>
        <div className="rp-detail-filter-group" style={{ position: "relative" }}>
          <label className="rp-detail-filter-label">Department</label>
          <button className="rp-detail-select" onClick={() => { setShowDeptDrop(v => !v); setShowRoleDrop(false); }}>
            {dept} <span className="rp-detail-caret">▼</span>
          </button>
          {showDeptDrop && (
            <div className="rp-detail-dropdown" onMouseDown={e => e.stopPropagation()}>
              {EMP_DEPTS.map(d => (
                <div key={d} className={`rp-detail-dropdown-item ${d === dept ? "active" : ""}`}
                  onClick={() => { setDept(d); setShowDeptDrop(false); }}>{d}</div>
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
        {rows.length > 0 && <>&nbsp;·&nbsp;Total Revenue: <strong>₹{rows.reduce((s, r) => s + r.revenue, 0).toLocaleString()}</strong></>}
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Role</th>
              <th>Department</th>
              <th>Services <span className="rp-th-sort">↕</span></th>
              <th>Revenue (₹) <span className="rp-th-sort">↕</span></th>
              <th>Avg Ticket (₹) <span className="rp-th-sort">↕</span></th>
              <th>Rating <span className="rp-th-sort">↕</span></th>
              <th>Utilization</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="rp-detail-loading-cell"><PageLoader /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} className="rp-detail-empty-cell">No data available</td></tr>
            ) : rows.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((r, i) => (
              <tr key={i}>
                <td style={{ color: "#9ca3af", fontSize: 12 }}>#{i + 1}</td>
                <td className="fw-semibold">{r.name}</td>
                <td>{r.role}</td>
                <td>{r.department}</td>
                <td>{r.servicesPerformed}</td>
                <td className="fw-semibold">₹{r.revenue.toLocaleString()}</td>
                <td>₹{r.avgTicket}</td>
                <td style={{ color: "#f59e0b", fontWeight: 600 }}>{r.rating} ★</td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, height: 6, background: "#f3f4f6", borderRadius: 3 }}>
                      <div style={{ width: `${r.utilization}%`, height: "100%", background: "#111827", borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 11, color: "#6b7280", whiteSpace: "nowrap" }}>{r.utilization}%</span>
                  </div>
                </td>
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
        `/api/v1/reports/services?${params}`,
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
  { id: "client_retention",     name: "Client Retention",     tags: ["Operational"],                 description: "Identify clients who haven't visited in the last 30, 60, or 90 days to drive re-engagement.",                                     category: "operational", isNewVersion: true },
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
  // ── Marketing ─────────────────────────────────────────────────────────────────
  { id: "campaign_performance",   name: "Campaign Performance",   tags: ["Marketing"], description: "Track WhatsApp campaign delivery rates, read rates, and engagement metrics across all campaigns.",                 category: "marketing" },
  { id: "template_performance",  name: "Template Performance",  tags: ["Marketing"], description: "Analyse which WhatsApp message templates drive the highest engagement and delivery success.",                         category: "marketing" },
  { id: "message_spend",         name: "Message Spend",         tags: ["Marketing"], description: "Monitor daily WhatsApp message volumes and estimated costs broken down by category (Marketing, Utility, Auth).",   category: "marketing" },
  { id: "client_acquisition",    name: "Client Acquisition",    tags: ["Marketing"], description: "Analyse how new clients are acquired and track their visit history, spend, and engagement status over a period.",   category: "marketing" },
  // ── Employee ──────────────────────────────────────────────────────────────────
  { id: "attrition",                      name: "Attrition",                    tags: ["Team"],         description: "Track the number of center employees who have either joined or left the organization.",                 category: "employee" },
  { id: "block_out_time_details",         name: "Block Out Time Details",        tags: ["Time"],         description: "Show times when providers are on break or unavailable using Block Out Time Types.",                    category: "employee" },
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
  { id: "employee_performance",           name: "Employee Performance",          tags: ["Performance"],  description: "Track individual employee revenue, bookings, and utilization rate across a selected time period.",      category: "employee" },
];

const SUB_CATEGORIES: Record<string, string[]> = {
  "employee": ["Sales", "Commissions", "Performance", "Team", "Time"],
};

const FALLBACK_CATEGORIES = [
  { key: "all",          label: "All",           count: 32 },
  { key: "daily_reports",label: "Daily Reports", count: 1  },
  { key: "employee",     label: "Employee",      count: 21 },
  { key: "finance",      label: "Finance",       count: 2  },
  { key: "inventory",    label: "Inventory",     count: 2  },
  { key: "marketing",    label: "Marketing",     count: 4  },
  { key: "operational",  label: "Operational",   count: 2  },
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

  const activeReports = reportsDashboard?.reports ?? ALL_REPORTS;

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

    api.get<{ data: { items: Array<{ first_name: string; last_name?: string | null }> } }>("/api/v1/staff?limit=200")
      .then(res => {
        const names = (res.data?.data?.items ?? []).map(s =>
          [s.first_name, s.last_name].filter(Boolean).join(" ")
        ).filter(Boolean);
        if (names.length) setFilterStaffList(names);
      })
      .catch(() => {});

    api.get<{ data: { data: Array<{ name: string }> } }>("/api/v1/services?limit=200&status=active")
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
    return raw.map((s, i) => ({
      ...s,
      bookings:    s.bookings    ?? 0,
      revenue:     s.revenue     ?? 0,
      rating:      s.rating      ?? 0,
      utilization: s.utilization ?? 0,
      avgTicket:   s.avgTicket   ?? 0,
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
        {tab === "staff"        && <StaffTab staffData={staffList} radarStaff={radarData} />}
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
              : openReport.category === "employee"      ? <EmployeeReportDetail   report={openReport} onBack={() => setOpenReport(null)} />
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
              {(reportsDashboard?.categories ?? FALLBACK_CATEGORIES).map(cat => (
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
