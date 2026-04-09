import { useState, useMemo, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Search, Star, ChevronLeft, ArrowRepeat as Refresh, Grid3x3Gap, BoxArrowUp, InfoCircle } from "react-bootstrap-icons";
import type { AppDispatch, RootState } from "../../../store/store";
import { clearReportError } from "../../../store/reportSlice";
import {
  fetchRevenueReportThunk,
  fetchAppointmentsReportThunk,
  fetchClientsReportThunk,
  fetchStaffReportThunk,
  fetchServicesReportThunk,
  exportReportThunk,
} from "../../../middleware/report/report.thunk";
import type { ReportPeriod, ReportTab } from "../../../types/report.types";
import Button from "../../../components/ui/Button";
import { PageLoader } from "../../../components/ui/PageLoader";
import "../styles/ReportsPage.scss";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis,
} from "recharts";
import {
  ArrowUpRight, ArrowDownRight, Funnel,
  Calendar3, CurrencyRupee, CalendarCheck, People,
  Scissors, GraphUpArrow, FileEarmarkBarGraph,
  StarFill, ChevronUp, ChevronDown, ArrowRepeat,
  FileEarmarkArrowDown,
} from "react-bootstrap-icons";

// ─── Fallback mock data (shown while API data loads or if API is unavailable) ──

const revenueByMonth = [
  { label: "Jan", revenue: 42000, target: 45000, prev: 38000 },
  { label: "Feb", revenue: 38500, target: 45000, prev: 35000 },
  { label: "Mar", revenue: 55200, target: 50000, prev: 44000 },
  { label: "Apr", revenue: 61800, target: 55000, prev: 52000 },
  { label: "May", revenue: 48400, target: 55000, prev: 43000 },
  { label: "Jun", revenue: 72600, target: 65000, prev: 61000 },
  { label: "Jul", revenue: 68900, target: 65000, prev: 60000 },
  { label: "Aug", revenue: 79300, target: 70000, prev: 68000 },
  { label: "Sep", revenue: 83700, target: 75000, prev: 72000 },
  { label: "Oct", revenue: 91200, target: 80000, prev: 80000 },
  { label: "Nov", revenue: 87500, target: 80000, prev: 81000 },
  { label: "Dec", revenue: 98400, target: 90000, prev: 88000 },
];

const revenueBy7d = [
  { label: "Mon", revenue: 12400, target: 11000, prev: 10200 },
  { label: "Tue", revenue: 15800, target: 13000, prev: 13400 },
  { label: "Wed", revenue: 11200, target: 13000, prev: 10800 },
  { label: "Thu", revenue: 18600, target: 15000, prev: 16200 },
  { label: "Fri", revenue: 22400, target: 18000, prev: 19800 },
  { label: "Sat", revenue: 31200, target: 25000, prev: 28400 },
  { label: "Sun", revenue: 8900,  target: 10000, prev: 7600  },
];

const appointmentsWeekly = [
  { label: "Mon", completed: 18, cancelled: 3, noShow: 1 },
  { label: "Tue", completed: 24, cancelled: 2, noShow: 2 },
  { label: "Wed", completed: 20, cancelled: 4, noShow: 1 },
  { label: "Thu", completed: 30, cancelled: 1, noShow: 0 },
  { label: "Fri", completed: 35, cancelled: 2, noShow: 2 },
  { label: "Sat", completed: 42, cancelled: 3, noShow: 1 },
  { label: "Sun", completed: 15, cancelled: 1, noShow: 0 },
];

const clientGrowth = [
  { label: "Jan", new: 42, returning: 88, churned: 12 },
  { label: "Feb", new: 38, returning: 91, churned: 9  },
  { label: "Mar", new: 56, returning: 98, churned: 14 },
  { label: "Apr", new: 61, returning: 105, churned: 11 },
  { label: "May", new: 48, returning: 112, churned: 8  },
  { label: "Jun", new: 73, returning: 118, churned: 15 },
  { label: "Jul", new: 69, returning: 124, churned: 10 },
  { label: "Aug", new: 80, returning: 130, churned: 13 },
  { label: "Sep", new: 84, returning: 138, churned: 9  },
  { label: "Oct", new: 92, returning: 145, churned: 11 },
  { label: "Nov", new: 88, returning: 150, churned: 8  },
  { label: "Dec", new: 99, returning: 160, churned: 12 },
];

const fallbackServiceData = [
  { name: "Haircut",    bookings: 312, revenue: 187200, avgTicket: 600,  color: "#111827", growth: 8.2  },
  { name: "Hair Color", bookings: 228, revenue: 364800, avgTicket: 1600, color: "#3b82f6", growth: 12.4 },
  { name: "Facial",     bookings: 165, revenue: 247500, avgTicket: 1500, color: "#10b981", growth: 5.1  },
  { name: "Massage",    bookings: 110, revenue: 198000, avgTicket: 1800, color: "#8b5cf6", growth: -2.3 },
  { name: "Nails",      bookings: 92,  revenue: 82800,  avgTicket: 900,  color: "#f59e0b", growth: 18.6 },
  { name: "Bridal Pkg", bookings: 28,  revenue: 238000, avgTicket: 8500, color: "#ef4444", growth: 22.1 },
];

const fallbackStaffData = [
  { name: "Anita K.",  bookings: 128, revenue: 94200, rating: 4.9, utilization: 88, avgTicket: 736,  color: "#111827" },
  { name: "Pooja M.",  bookings: 105, revenue: 72800, rating: 4.8, utilization: 82, avgTicket: 693,  color: "#3b82f6" },
  { name: "Raj S.",    bookings: 98,  revenue: 41600, rating: 4.7, utilization: 76, avgTicket: 424,  color: "#10b981" },
  { name: "Neha T.",   bookings: 87,  revenue: 65200, rating: 4.6, utilization: 71, avgTicket: 749,  color: "#8b5cf6" },
  { name: "Vikram D.", bookings: 74,  revenue: 58900, rating: 4.5, utilization: 65, avgTicket: 796,  color: "#f59e0b" },
];

const radarStaffFallback = [
  { metric: "Bookings",   "Anita K.": 95, "Pooja M.": 80, "Raj S.": 72 },
  { metric: "Revenue",    "Anita K.": 90, "Pooja M.": 75, "Raj S.": 45 },
  { metric: "Rating",     "Anita K.": 98, "Pooja M.": 96, "Raj S.": 94 },
  { metric: "Retention",  "Anita K.": 88, "Pooja M.": 82, "Raj S.": 78 },
  { metric: "Efficiency", "Anita K.": 92, "Pooja M.": 86, "Raj S.": 80 },
];

const sparklineData = [3,5,4,7,6,8,9,7,10,11,9,12];

// ─── KPI config ───────────────────────────────────────────────────────────────

const kpiConfig = {
  revenue:      [
    { label: "Total Revenue",    value: "₹8,26,700", change: "+14.2%", up: true,  icon: <CurrencyRupee size={16}/>, color: "#10b981" },
    { label: "Avg Daily Revenue",value: "₹27,557",   change: "+9.8%",  up: true,  icon: <GraphUpArrow size={16}/>,  color: "#3b82f6" },
    { label: "Best Day Revenue", value: "₹98,400",   change: "+5.3%",  up: true,  icon: <ArrowUpRight size={16}/>,  color: "#8b5cf6" },
    { label: "Target Achieved",  value: "91.2%",     change: "+3.1%",  up: true,  icon: <StarFill size={16}/>,      color: "#f59e0b" },
  ],
  appointments: [
    { label: "Total Bookings",   value: "1,085",  change: "+11.4%", up: true,  icon: <CalendarCheck size={16}/>, color: "#3b82f6" },
    { label: "Completion Rate",  value: "94.2%",  change: "+1.8%",  up: true,  icon: <ArrowUpRight size={16}/>,  color: "#10b981" },
    { label: "Cancellation Rate",value: "4.1%",   change: "-0.6%",  up: true,  icon: <ArrowDownRight size={16}/>,color: "#ef4444" },
    { label: "Avg Duration",     value: "52 min", change: "-3 min", up: true,  icon: <Calendar3 size={16}/>,     color: "#8b5cf6" },
  ],
  clients: [
    { label: "Total Clients",    value: "1,240",  change: "+8.4%",  up: true,  icon: <People size={16}/>,        color: "#3b82f6" },
    { label: "New This Month",   value: "99",     change: "+13.2%", up: true,  icon: <ArrowUpRight size={16}/>,  color: "#10b981" },
    { label: "Retention Rate",   value: "82.4%",  change: "+2.1%",  up: true,  icon: <ArrowRepeat size={16}/>,   color: "#8b5cf6" },
    { label: "Avg Visits/Client",value: "4.2",    change: "+0.3",   up: true,  icon: <CalendarCheck size={16}/>, color: "#f59e0b" },
  ],
  staff: [
    { label: "Active Staff",     value: "8",      change: "+1",     up: true,  icon: <People size={16}/>,        color: "#3b82f6" },
    { label: "Avg Utilization",  value: "76.4%",  change: "+4.2%",  up: true,  icon: <GraphUpArrow size={16}/>,  color: "#10b981" },
    { label: "Top Earner",       value: "₹94.2k", change: "+12.1%", up: true,  icon: <CurrencyRupee size={16}/>, color: "#8b5cf6" },
    { label: "Avg Rating",       value: "4.74",   change: "+0.12",  up: true,  icon: <StarFill size={16}/>,      color: "#f59e0b" },
  ],
  services: [
    { label: "Active Services",  value: "24",     change: "+2",     up: true,  icon: <Scissors size={16}/>,      color: "#3b82f6" },
    { label: "Top Service Rev",  value: "₹3.65L", change: "+18.2%", up: true,  icon: <CurrencyRupee size={16}/>, color: "#10b981" },
    { label: "Avg Ticket",       value: "₹1,320", change: "+4.8%",  up: true,  icon: <ArrowUpRight size={16}/>,  color: "#8b5cf6" },
    { label: "New Services",     value: "3",      change: "+3",     up: true,  icon: <ArrowRepeat size={16}/>,   color: "#f59e0b" },
  ],
};

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

const Sparkline = ({ data, color }: { data: number[]; color: string }) => (
  <ResponsiveContainer width="100%" height={40}>
    <AreaChart data={data.map((v, i) => ({ v, i }))} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
      <defs>
        <linearGradient id={`sp-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5}
        fill={`url(#sp-${color.replace("#","")})`} dot={false} />
    </AreaChart>
  </ResponsiveContainer>
);

// ─── Tab content components ───────────────────────────────────────────────────

const RevenueTab = ({
  trend,
}: {
  trend: typeof revenueBy7d;
}) => {
  const [showTarget, setShowTarget] = useState(true);
  const [showPrev, setShowPrev]     = useState(true);

  return (
    <div className="rp-tab-body">
      <div className="rp-main-chart-card">
        <div className="rp-chart-header">
          <div>
            <h4 className="rp-chart-title">Revenue Trend</h4>
            <p className="rp-chart-sub">Revenue vs Target vs Previous Period</p>
          </div>
          <div className="rp-toggles">
            <Button variant="ghost" className={`rp-toggle ${showTarget ? "active" : ""}`} onClick={() => setShowTarget(v => !v)}>
              <span className="rp-tog-dot" style={{ background: "#3b82f6" }} /> Target
            </Button>
            <Button variant="ghost" className={`rp-toggle ${showPrev ? "active" : ""}`} onClick={() => setShowPrev(v => !v)}>
              <span className="rp-tog-dot" style={{ background: "#d1d5db" }} /> Previous
            </Button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#111827" stopOpacity={0.14} />
                <stop offset="95%" stopColor="#111827" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gTgt" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false}
              tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            {showPrev && (
              <Area type="monotone" dataKey="prev" name="Previous" stroke="#d1d5db"
                strokeWidth={1.5} strokeDasharray="4 4" fill="none" dot={false} />
            )}
            {showTarget && (
              <Area type="monotone" dataKey="target" name="Target" stroke="#3b82f6"
                strokeWidth={1.5} strokeDasharray="5 3" fill="url(#gTgt)" dot={false} />
            )}
            <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#111827"
              strokeWidth={2.5} fill="url(#gRev)" dot={false}
              activeDot={{ r: 5, fill: "#111827" }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="rp-two-col">
        {/* Revenue by Service */}
        <div className="rp-chart-card">
          <h4 className="rp-chart-title">Revenue by Service</h4>
          <p className="rp-chart-sub">Contribution per category</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={fallbackServiceData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }} barSize={10}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#374151" }} axisLine={false} tickLine={false} width={72} />
              <Tooltip formatter={(v: any) => `₹${Number(v).toLocaleString()}`} />
              <Bar dataKey="revenue" name="Revenue" radius={[0, 4, 4, 0]}>
                {fallbackServiceData.map((s) => <Cell key={s.name} fill={s.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Daily Heatmap-style */}
        <div className="rp-chart-card">
          <h4 className="rp-chart-title">Revenue Distribution</h4>
          <p className="rp-chart-sub">Service share of total revenue</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={fallbackServiceData} cx="50%" cy="50%" innerRadius={60} outerRadius={95}
                paddingAngle={2} dataKey="revenue">
                {fallbackServiceData.map((s) => <Cell key={s.name} fill={s.color} />)}
              </Pie>
              <Tooltip formatter={(v: any) => `₹${Number(v).toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="rp-pie-legend">
            {fallbackServiceData.map(s => (
              <div key={s.name} className="rp-pie-row">
                <span className="rp-pie-dot" style={{ background: s.color }} />
                <span>{s.name}</span>
                <span className="ms-auto text-muted" style={{ fontSize: 12 }}>₹{(s.revenue/1000).toFixed(0)}k</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const AppointmentsTab = ({ volume }: { volume: typeof appointmentsWeekly }) => (
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
    </div>

    <div className="rp-two-col">
      <div className="rp-chart-card">
        <h4 className="rp-chart-title">Peak Hours</h4>
        <p className="rp-chart-sub">Busiest time slots</p>
        <div className="rp-heatmap">
          {["9AM","10AM","11AM","12PM","1PM","2PM","3PM","4PM","5PM","6PM","7PM"].map((h, i) => {
            const vals = [8,14,18,16,12,20,24,22,28,19,10];
            const max = 28;
            const pct = Math.round((vals[i]/max)*100);
            return (
              <div key={h} className="rp-heat-row">
                <span className="rp-heat-label">{h}</span>
                <div className="rp-heat-bar-track">
                  <div className="rp-heat-bar" style={{ width: `${pct}%`, opacity: 0.4 + pct/200 }} />
                </div>
                <span className="rp-heat-val">{vals[i]}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="rp-chart-card">
        <h4 className="rp-chart-title">Booking Source</h4>
        <p className="rp-chart-sub">Walk-in · Online · Phone</p>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={[
              { name: "Walk-In", value: 38, color: "#111827" },
              { name: "Online",  value: 45, color: "#3b82f6" },
              { name: "Phone",   value: 17, color: "#10b981" },
            ]} cx="50%" cy="50%" outerRadius={80} paddingAngle={3} dataKey="value">
              {[{color:"#111827"},{color:"#3b82f6"},{color:"#10b981"}].map((c,i) => <Cell key={i} fill={c.color} />)}
            </Pie>
            <Tooltip formatter={(v: any) => `${v}%`} />
          </PieChart>
        </ResponsiveContainer>
        <div className="rp-pie-legend">
          {[["#111827","Walk-In","38%"],["#3b82f6","Online","45%"],["#10b981","Phone","17%"]].map(([c,l,v]) => (
            <div key={l} className="rp-pie-row">
              <span className="rp-pie-dot" style={{ background: c }} />
              <span>{l}</span>
              <span className="ms-auto fw-semibold" style={{ fontSize: 12 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const ClientsTab = ({ growth }: { growth: typeof clientGrowth }) => (
  <div className="rp-tab-body">
    <div className="rp-main-chart-card">
      <div className="rp-chart-header">
        <div>
          <h4 className="rp-chart-title">Client Growth</h4>
          <p className="rp-chart-sub">New · Returning · Churned</p>
        </div>
      </div>
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
    </div>
    <div className="rp-two-col">
      <div className="rp-chart-card">
        <h4 className="rp-chart-title">Retention Funnel</h4>
        <p className="rp-chart-sub">Client visit frequency</p>
        {[
          { label: "1 visit",     count: 312, pct: 100 },
          { label: "2–3 visits",  count: 248, pct: 80  },
          { label: "4–6 visits",  count: 180, pct: 58  },
          { label: "7–10 visits", count: 124, pct: 40  },
          { label: "10+ visits",  count: 82,  pct: 26  },
        ].map(row => (
          <div key={row.label} className="rp-funnel-row">
            <span className="rp-funnel-label">{row.label}</span>
            <div className="rp-funnel-track">
              <div className="rp-funnel-fill" style={{ width: `${row.pct}%` }} />
            </div>
            <span className="rp-funnel-count">{row.count}</span>
          </div>
        ))}
      </div>
      <div className="rp-chart-card">
        <h4 className="rp-chart-title">Top Clients</h4>
        <p className="rp-chart-sub">By total spend</p>
        <div className="rp-rank-list">
          {[
            { name: "Priya Sharma",  visits: 28, spend: "₹42,800", avatar: "PS" },
            { name: "Meera Joshi",   visits: 24, spend: "₹38,200", avatar: "MJ" },
            { name: "Sneha Patel",   visits: 21, spend: "₹31,500", avatar: "SP" },
            { name: "Riya Kapoor",   visits: 19, spend: "₹28,900", avatar: "RK" },
            { name: "Ananya Verma",  visits: 16, spend: "₹24,600", avatar: "AV" },
          ].map((c, i) => (
            <div key={c.name} className="rp-rank-row">
              <span className="rp-rank-num">#{i+1}</span>
              <div className="rp-rank-av">{c.avatar}</div>
              <div className="rp-rank-info">
                <div className="rp-rank-name">{c.name}</div>
                <div className="rp-rank-sub">{c.visits} visits</div>
              </div>
              <span className="rp-rank-val">{c.spend}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const StaffTab = ({
  staffData,
  radarStaff,
}: {
  staffData: typeof fallbackStaffData;
  radarStaff: Array<{ metric: string; [key: string]: string | number }>;
}) => (
  <div className="rp-tab-body">
    <div className="rp-two-col">
      <div className="rp-chart-card rp-chart-card-tall">
        <h4 className="rp-chart-title">Performance Radar</h4>
        <p className="rp-chart-sub">Top 3 staff multi-metric comparison</p>
        <ResponsiveContainer width="100%" height={260}>
          <RadarChart data={radarStaff}>
            <PolarGrid stroke="#f3f4f6" />
            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "#6b7280" }} />
            <Radar name="Anita K." dataKey="Anita K." stroke="#111827" fill="#111827" fillOpacity={0.08} strokeWidth={2} />
            <Radar name="Pooja M." dataKey="Pooja M." stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.08} strokeWidth={2} />
            <Radar name="Raj S."   dataKey="Raj S."   stroke="#10b981" fill="#10b981" fillOpacity={0.08} strokeWidth={2} />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
        <div className="rp-legend-row mt-2 justify-content-center">
          {[["#111827","Anita K."],["#3b82f6","Pooja M."],["#10b981","Raj S."]].map(([c,l]) => (
            <span key={l} className="rp-leg-item"><span className="rp-pie-dot" style={{ background: c }} />{l}</span>
          ))}
        </div>
      </div>
      <div className="rp-chart-card rp-chart-card-tall">
        <h4 className="rp-chart-title">Utilization Rate</h4>
        <p className="rp-chart-sub">Hours booked vs available</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={staffData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }} barSize={12}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false}
              tickFormatter={v => `${v}%`} domain={[0,100]} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#374151" }} axisLine={false} tickLine={false} width={65} />
            <Tooltip formatter={(v: any) => `${v}%`} />
            <Bar dataKey="utilization" name="Utilization" radius={[0,4,4,0]}>
              {staffData.map(s => <Cell key={s.name} fill={s.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
    <div className="rp-staff-table-card">
      <h4 className="rp-chart-title mb-3">Staff Leaderboard</h4>
      <div className="rp-table">
        <div className="rp-table-head">
          <span>#</span><span>Name</span><span>Bookings</span>
          <span>Revenue</span><span>Avg Ticket</span><span>Rating</span><span>Utilization</span>
        </div>
        {staffData.map((s, i) => (
          <div key={s.name} className="rp-table-row">
            <span className="rp-table-rank">#{i+1}</span>
            <span className="d-flex align-items-center gap-2">
              <span className="rp-sm-av" style={{ background: s.color }}>{s.name.split(" ").map(w=>w[0]).join("")}</span>
              {s.name}
            </span>
            <span>{s.bookings}</span>
            <span className="fw-semibold">₹{s.revenue.toLocaleString()}</span>
            <span>₹{s.avgTicket}</span>
            <span className="rp-rating"><StarFill size={11} color="#f59e0b" /> {s.rating}</span>
            <span>
              <div className="rp-util-bar">
                <div className="rp-util-fill" style={{ width: `${s.utilization}%`, background: s.color }} />
              </div>
              <small className="text-muted ms-2">{s.utilization}%</small>
            </span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const ServicesTab = ({ services }: { services: typeof fallbackServiceData }) => {
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
          <div className="rp-toggles">
            <Button variant="ghost" className={`rp-toggle ${sort==="revenue" ? "active":""}`} onClick={() => setSort("revenue")}>By Revenue</Button>
            <Button variant="ghost" className={`rp-toggle ${sort==="bookings"? "active":""}`} onClick={() => setSort("bookings")}>By Bookings</Button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={sorted} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barSize={28}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false}
              tickFormatter={v => sort==="revenue" ? `₹${(v/1000).toFixed(0)}k` : `${v}`} />
            <Tooltip formatter={(v: any, n?: string) =>
              n==="Revenue" ? `₹${Number(v).toLocaleString()}` : v} />
            <Bar dataKey={sort} name={sort==="revenue"?"Revenue":"Bookings"} radius={[6,6,0,0]}>
              {sorted.map(s => <Cell key={s.name} fill={s.color ?? "#111827"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="rp-services-grid">
        {services.map(s => (
          <div key={s.name} className="rp-svc-card">
            <div className="rp-svc-top">
              <span className="rp-svc-dot" style={{ background: s.color ?? "#111827" }} />
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
            <Sparkline data={sparklineData} color={s.color ?? "#111827"} />
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Appointment report detail ────────────────────────────────────────────────

interface AppointmentRow {
  appointmentDate: string;
  bookedDate: string;
  ticketNo: string;
  guestName: string;
  serviceName: string;
  serviceCode: string;
  centerName: string;
}

const MOCK_APPOINTMENTS: AppointmentRow[] = [
  { appointmentDate: "08-04-2026", bookedDate: "08-04-2026", ticketNo: "SVB5888", guestName: "Manisha Singh", serviceName: "Regular Pedicure", serviceCode: "HF10002", centerName: "Sanghavi Nagar,Bara..." },
  { appointmentDate: "08-04-2026", bookedDate: "08-04-2026", ticketNo: "SVB5888", guestName: "Manisha Singh", serviceName: "PediSmooth",       serviceCode: "HF30009", centerName: "Sanghavi Nagar,Bara..." },
];

const DATE_TYPE_OPTIONS  = ["Appointment Date", "Booking Date"];
const APPT_STATUSES      = ["All", "Open", "Closed", "Cancelled", "No Show", "Checked-in", "Confirmed", "Deleted"];
const APPT_SOURCES       = ["All", "Walk-In", "Online", "Phone", "App", "Staff", "Kiosk", "Third Party", "Other"];

const AppointmentReportDetail = ({ onBack }: { onBack: () => void }) => {
  const [dateType,        setDateType]        = useState(DATE_TYPE_OPTIONS[0]);
  const [showDtDrop,      setShowDtDrop]      = useState(false);
  const [dateFrom,        setDateFrom]        = useState("2026-04-08");
  const [dateTo,          setDateTo]          = useState("2026-04-08");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(APPT_STATUSES);
  const [statusSearch,    setStatusSearch]    = useState("");
  const [showStatusDrop,  setShowStatusDrop]  = useState(false);
  const [selectedSources,  setSelectedSources]  = useState<string[]>(APPT_SOURCES);
  const [showSourceDrop,  setShowSourceDrop]  = useState(false);
  const rows      = MOCK_APPOINTMENTS;
  const [loading, setLoading] = useState(false);

  const handleRefresh = () => { setLoading(true); setTimeout(() => setLoading(false), 800); };

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
            <ChevronLeft size={15} /> Appointments
          </Button>
          <div className="rp-detail-view-icons">
            <button className="rp-detail-icon-btn" title="Column view"><Grid3x3Gap size={16} /></button>
            <button className="rp-detail-icon-btn" title="Export"><BoxArrowUp size={16} /></button>
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
            <div className="rp-detail-dropdown">
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

        {/* Centers */}
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Centers</label>
          <button className="rp-detail-select">Sanghavi Naga... <span className="rp-detail-caret">▼</span></button>
        </div>

        {/* Appointment Status — multi-select with search */}
        <div className="rp-detail-filter-group" style={{ position: "relative" }}>
          <label className="rp-detail-filter-label">Appointment Status</label>
          <button className="rp-detail-select" onClick={() => { setShowStatusDrop(v => !v); setShowDtDrop(false); setShowSourceDrop(false); }}>
            {statusLabel} <span className="rp-detail-caret">▼</span>
          </button>
          {showStatusDrop && (
            <div className="rp-detail-dropdown rp-detail-dropdown-wide">
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
            <div className="rp-detail-dropdown rp-detail-dropdown-wide">
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

      {/* ── Drag row groups ── */}
      <div className="rp-detail-drag-hint">
        <span className="rp-detail-drag-check" />
        Drag here to set row groups
      </div>

      {/* ── Table ── */}
      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>Appointment Date <span className="rp-th-sort">↕</span></th>
              <th></th>
              <th>Booked Date <span className="rp-th-sort">↕</span></th>
              <th>Ticket No <span className="rp-th-sort">↕</span></th>
              <th>Guest Name</th>
              <th>Service Name</th>
              <th>Service Code</th>
              <th>Center Name <span className="rp-th-sort">↕</span></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="rp-detail-loading-cell"><PageLoader /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="rp-detail-empty-cell">No data available</td></tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i}>
                  <td>{row.appointmentDate}</td>
                  <td></td>
                  <td>{row.bookedDate}</td>
                  <td><span className="rp-detail-link">{row.ticketNo}</span></td>
                  <td><span className="rp-detail-link">{row.guestName}</span></td>
                  <td>{row.serviceName}</td>
                  <td>{row.serviceCode}</td>
                  <td>{row.centerName}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      <div className="rp-detail-pagination">
        <span className="rp-detail-page-info">1 to {rows.length} of {rows.length}</span>
        <div className="rp-detail-page-nav">
          <button className="rp-detail-page-btn" disabled>‹</button>
          <span className="rp-detail-page-cur">Page 1 of 1</span>
          <button className="rp-detail-page-btn" disabled>›</button>
        </div>
      </div>

    </div>
  );
};

// ─── Reports Dashboard data ────────────────────────────────────────────────────

type ReportCategory =
  | "All"
  | "Daily Reports"
  | "Employee"
  | "Finance"
  | "Inventory"
  | "Marketing"
  | "Operational"
  | "Payments";

interface ReportItem {
  id: number;
  name: string;
  tags: string[];
  description: string;
  category: Exclude<ReportCategory, "All">;
  isNew?: boolean;
  tryNew?: boolean;
}

const ALL_REPORTS: ReportItem[] = [
  // ── Operational ──────────────────────────────────────────────────────────────
  { id: 1,  name: "Appointments",         tags: ["Operational", "Appointments"], description: "Use this report to view the details of all the appointments (including no-shows and cancelled appointments) for a given period.", category: "Operational", isNew: true },
  { id: 11, name: "Client Retention",     tags: ["Operational"],                 description: "Identify clients who haven't visited in the last 30, 60, or 90 days to drive re-engagement.",                                     category: "Operational", isNew: true },
  // ── Finance ───────────────────────────────────────────────────────────────────
  { id: 2,  name: "Collections",          tags: ["Finance", "Collections"],      description: "Use this report to view the payments received (including redemptions) on a day or during the given period.",                       category: "Finance",     isNew: true },
  { id: 10, name: "Revenue by Service",   tags: ["Finance", "Operational"],      description: "Break down total revenue by individual services offered, with average ticket and booking counts.",                                  category: "Finance"  },
  // ── Inventory ─────────────────────────────────────────────────────────────────
  { id: 3,  name: "Current Stock",        tags: ["Inventory", "Value"],          description: "Use this report to know the on-hand stock and the cost of goods based on the FIFO or perpetual average costing method.",           category: "Inventory",   isNew: true },
  { id: 9,  name: "Inventory Consumption",tags: ["Inventory"],                   description: "Track the quantity of products consumed in services versus sold directly to clients.",                                              category: "Inventory" },
  // ── Payments ──────────────────────────────────────────────────────────────────
  { id: 4,  name: "Digital Payments",     tags: ["Payments"],                    description: "Use this report to list all the payments collected using online payment provider integrated with your salon system.",               category: "Payments",    isNew: true },
  { id: 12, name: "Payment Summary",      tags: ["Payments"],                    description: "View a consolidated summary of all payment methods collected across all centers for a given period.",                               category: "Payments" },
  // ── Daily Reports ─────────────────────────────────────────────────────────────
  { id: 6,  name: "Daily Sales Summary",  tags: ["Daily Reports", "Finance"],    description: "A quick summary of all sales transactions completed within a single business day.",                                                category: "Daily Reports", isNew: true },
  // ── Marketing ─────────────────────────────────────────────────────────────────
  { id: 7,  name: "Loyalty Points",       tags: ["Marketing"],                   description: "View loyalty points earned, redeemed, and expired for all clients during a selected period.",                                      category: "Marketing" },
  { id: 8,  name: "Marketing Campaign ROI", tags: ["Marketing"],                 description: "Measure the return on investment for all marketing campaigns including SMS, email, and WhatsApp.",                                  category: "Marketing",   isNew: true },
  // ── Employee ──────────────────────────────────────────────────────────────────
  { id: 13, name: "Attrition",                    tags: ["Team"],         description: "The Attrition report helps you track the number of center employees who have either joined or left the organization.",   category: "Employee" },
  { id: 14, name: "Block Out Time Details",        tags: ["Time"],         description: "The front desk uses Block Out Time Types on the Appointment Book to show times when providers are on break or unavailable.", category: "Employee" },
  { id: 15, name: "Booking Productivity",          tags: ["Sales"],        description: "This report gives you an insight into the types of services requested by your guests by calling your center.",           category: "Employee" },
  { id: 16, name: "Commissions",                   tags: ["Commissions"],  description: "",                                                                                                                         category: "Employee" },
  { id: 17, name: "Commissions - Graphical",       tags: ["Commissions"],  description: "",                                                                                                                         category: "Employee" },
  { id: 18, name: "Employee Collections",          tags: ["Sales"],        description: "",                                                                                                                         category: "Employee", tryNew: true },
  { id: 19, name: "Employee Collections By Item Type", tags: ["Sales"],    description: "Use this report to view details of the sales for each item type services, products, memberships.",                      category: "Employee", tryNew: true },
  { id: 20, name: "Employee Sales Metrics",        tags: ["Performance"],  description: "The Employee Sales Metrics report helps you track all sales employees make in a selected time period.",                  category: "Employee" },
  { id: 21, name: "Guest Satisfaction",            tags: ["Performance"],  description: "",                                                                                                                         category: "Employee" },
  { id: 22, name: "Leaves",                        tags: ["Time"],         description: "The Leaves report helps you track the number leaves availed by the employees of each leave type as well as the status.", category: "Employee" },
  { id: 23, name: "No-show/Cancellation",          tags: ["Sales"],        description: "Use this report to view a quick snapshot of guests who either did not come in for their appointments.",                  category: "Employee", tryNew: true },
  { id: 24, name: "Overtime",                      tags: ["Time"],         description: "",                                                                                                                         category: "Employee" },
  { id: 25, name: "Overtime Summary",              tags: ["Time"],         description: "The Employee Overtime Summary report helps you track the number of extra hours spent by your center.",                   category: "Employee" },
  { id: 26, name: "Rebooking",                     tags: ["Sales"],        description: "",                                                                                                                         category: "Employee" },
  { id: 27, name: "Sales",                         tags: ["Sales"],        description: "",                                                                                                                         category: "Employee", tryNew: true },
  { id: 28, name: "Service Revenue By Category",   tags: ["Sales"],        description: "",                                                                                                                         category: "Employee", tryNew: true },
  { id: 29, name: "Split Commission",              tags: ["Sales"],        description: "",                                                                                                                         category: "Employee" },
  { id: 30, name: "Staffing",                      tags: ["Team"],         description: "The Staffing report helps you track the total number of employees currently working in a center, categorized by role.",  category: "Employee" },
  { id: 31, name: "Tip Adjustments",               tags: ["Sales"],        description: "Use this report to view the trail of changes made to tips.",                                                            category: "Employee" },
  { id: 32, name: "Utilization",                   tags: ["Performance"],  description: "Track how effectively employees' working hours are being utilized across services and appointments.",                    category: "Employee" },
  { id: 5,  name: "Employee Performance",          tags: ["Performance"],  description: "Track individual employee revenue, bookings, and utilization rate across a selected time period.",                       category: "Employee" },
];

// Sub-category pills per category
const SUB_CATEGORIES: Partial<Record<ReportCategory, string[]>> = {
  "Employee": ["Sales", "Commissions", "Performance", "Team", "Time"],
};

const REPORT_CATEGORIES: ReportCategory[] = [
  "All", "Daily Reports", "Employee", "Finance",
  "Inventory", "Marketing", "Operational", "Payments",
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
    loading,
    error,
  } = useSelector((state: RootState) => state.report);

  // ── Local UI state ──────────────────────────────────────────────────────────
  const [period, setPeriod]           = useState<ReportPeriod>("30d");
  const [tab, setTab]                 = useState<ReportTab>("revenue");
  const [showFilter, setShowFilter]   = useState(false);

  // ── Reports Dashboard state ──────────────────────────────────────────────────
  const [reportSearch, setReportSearch]         = useState("");
  const [reportCategory, setReportCategory]     = useState<ReportCategory>("All");
  const [activeSubCategory, setActiveSubCategory] = useState<string | null>(null);
  const [bookmarked, setBookmarked]             = useState<number[]>([]);
  const [openReport, setOpenReport]             = useState<ReportItem | null>(null);

  // Reset sub-category when main category changes
  const handleCategoryChange = (cat: ReportCategory) => {
    setReportCategory(cat);
    setActiveSubCategory(null);
  };

  const filteredReports = useMemo(() => {
    return ALL_REPORTS.filter(r => {
      const matchesCategory    = reportCategory === "All" || r.category === reportCategory;
      const matchesSubCategory = !activeSubCategory || r.tags.includes(activeSubCategory);
      const matchesSearch      = r.name.toLowerCase().includes(reportSearch.toLowerCase()) ||
                                 r.description.toLowerCase().includes(reportSearch.toLowerCase());
      return matchesCategory && matchesSubCategory && matchesSearch;
    });
  }, [reportSearch, reportCategory, activeSubCategory]);

  const bookmarkedReports = useMemo(
    () => ALL_REPORTS.filter(r => bookmarked.includes(r.id)),
    [bookmarked],
  );

  const toggleBookmark = (id: number) =>
    setBookmarked(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]);

  // ── Fetch data when tab or period changes ────────────────────────────────────
  const fetchCurrentTab = useCallback(() => {
    switch (tab) {
      case "revenue":      dispatch(fetchRevenueReportThunk({ period }));      break;
      case "appointments": dispatch(fetchAppointmentsReportThunk({ period })); break;
      case "clients":      dispatch(fetchClientsReportThunk({ period }));      break;
      case "staff":        dispatch(fetchStaffReportThunk({ period }));        break;
      case "services":     dispatch(fetchServicesReportThunk({ period }));     break;
    }
  }, [dispatch, tab, period]);

  useEffect(() => {
    fetchCurrentTab();
  }, [fetchCurrentTab]);

  // Dismiss error after 4 s
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => dispatch(clearReportError()), 4000);
    return () => clearTimeout(t);
  }, [error, dispatch]);

  // ── Derive display data (API data > fallback) ────────────────────────────────
  const revenueTrend = revenueData?.trend ?? (period === "7d" ? revenueBy7d : revenueByMonth);
  const apptVolume   = appointmentsData?.volume ?? appointmentsWeekly;
  const clientGrowthData = clientsData?.growth ?? clientGrowth;
  const staffList    = staffData?.performance?.map((s, i) => ({
    ...s,
    color: fallbackStaffData[i % fallbackStaffData.length]?.color ?? "#111827",
  })) ?? fallbackStaffData;
  const radarData    = staffData?.radar ?? radarStaffFallback;
  const serviceList  = servicesData?.services?.map((s, i) => ({
    ...s,
    color: s.color ?? fallbackServiceData[i % fallbackServiceData.length]?.color ?? "#111827",
  })) ?? fallbackServiceData;

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

  const kpis = kpiConfig[tab];
  const isTabLoading = loading[tab];

  // ── Export handler ───────────────────────────────────────────────────────────
  const handleExport = () => {
    dispatch(exportReportThunk({ tab, period, format: "excel" }));
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
            {periods.map(p => (
              <Button
                key={p.key}
                variant="ghost"
                className={`rp-period-pill ${period === p.key ? "active" : ""}`}
                onClick={() => setPeriod(p.key)}
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
            <label>Date Range</label>
            <div className="rp-filter-input-wrap">
              <Calendar3 size={13} className="rp-filter-ic" />
              <input type="date" className="rp-filter-input" defaultValue="2024-01-01" />
              <span className="rp-filter-sep">→</span>
              <input type="date" className="rp-filter-input" defaultValue="2024-12-31" />
            </div>
          </div>
          <div className="rp-filter-group">
            <label>Staff</label>
            <select className="rp-filter-select">
              <option>All Staff</option>
              {fallbackStaffData.map(s => <option key={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div className="rp-filter-group">
            <label>Service</label>
            <select className="rp-filter-select">
              <option>All Services</option>
              {fallbackServiceData.map(s => <option key={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div className="rp-filter-group">
            <label>Payment</label>
            <select className="rp-filter-select">
              <option>All Methods</option>
              <option>Cash</option>
              <option>Card</option>
              <option>UPI</option>
            </select>
          </div>
          <Button variant="ghost" className="rp-apply-btn" onClick={fetchCurrentTab}>Apply</Button>
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
        {kpis.map((k, i) => (
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
            <Sparkline data={sparklineData.map((v,j) => v + i*2 + j%3)} color={k.color} />
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
        {tab === "revenue"      && <RevenueTab trend={revenueTrend} />}
        {tab === "appointments" && <AppointmentsTab volume={apptVolume} />}
        {tab === "clients"      && <ClientsTab growth={clientGrowthData} />}
        {tab === "staff"        && <StaffTab staffData={staffList} radarStaff={radarData} />}
        {tab === "services"     && <ServicesTab services={serviceList} />}
      </div>

      {/* ── REPORTS DASHBOARD ── */}
      <div className="rp-dashboard-section">

        {/* ── Detail view when a report is opened ── */}
        {openReport ? (
          <>
            <h2 className="rp-dashboard-title">Reports</h2>
            <AppointmentReportDetail onBack={() => setOpenReport(null)} />
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
              {REPORT_CATEGORIES.map(cat => {
                const count = cat === "All"
                  ? ALL_REPORTS.length
                  : ALL_REPORTS.filter(r => r.category === cat).length;
                return (
                  <Button
                    key={cat}
                    variant="ghost"
                    className={`rp-cat-tab ${reportCategory === cat ? "active" : ""}`}
                    onClick={() => handleCategoryChange(cat)}
                  >
                    {cat}
                    {count > 0 && (
                      <span className="rp-cat-count">{count}</span>
                    )}
                  </Button>
                );
              })}
            </div>

            {/* Sub-category pills — shown when the active category has sub-categories */}
            {reportCategory !== "All" && SUB_CATEGORIES[reportCategory] && (
              <div className="rp-subcat-pills">
                {SUB_CATEGORIES[reportCategory]!.map(sub => {
                  const subCount = ALL_REPORTS.filter(r => r.category === reportCategory && r.tags.includes(sub)).length;
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
                          {report.isNew && <span className="rp-report-tag new">New Version</span>}
                        </div>
                      </div>
                      <div className="rp-report-desc">
                        {report.tryNew && (
                          <span className="rp-try-new-badge">Try New Version ↗</span>
                        )}
                        {!report.tryNew && report.description.length > 110
                          ? <>{report.description.slice(0, 110)}<span className="rp-report-more">...More</span></>
                          : !report.tryNew ? report.description : null}
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
