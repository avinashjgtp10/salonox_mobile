import { useState, useMemo } from "react";
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

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = "7d" | "30d" | "90d" | "12m";
type ReportTab = "revenue" | "appointments" | "clients" | "staff" | "services";

// ─── Mock Data Generators ─────────────────────────────────────────────────────

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

const serviceData = [
  { name: "Haircut",    bookings: 312, revenue: 187200, avgTicket: 600,  color: "#111827", growth: 8.2  },
  { name: "Hair Color", bookings: 228, revenue: 364800, avgTicket: 1600, color: "#3b82f6", growth: 12.4 },
  { name: "Facial",     bookings: 165, revenue: 247500, avgTicket: 1500, color: "#10b981", growth: 5.1  },
  { name: "Massage",    bookings: 110, revenue: 198000, avgTicket: 1800, color: "#8b5cf6", growth: -2.3 },
  { name: "Nails",      bookings: 92,  revenue: 82800,  avgTicket: 900,  color: "#f59e0b", growth: 18.6 },
  { name: "Bridal Pkg", bookings: 28,  revenue: 238000, avgTicket: 8500, color: "#ef4444", growth: 22.1 },
];

const staffData = [
  { name: "Anita K.",  bookings: 128, revenue: 94200, rating: 4.9, utilization: 88, avgTicket: 736,  color: "#111827" },
  { name: "Pooja M.",  bookings: 105, revenue: 72800, rating: 4.8, utilization: 82, avgTicket: 693,  color: "#3b82f6" },
  { name: "Raj S.",    bookings: 98,  revenue: 41600, rating: 4.7, utilization: 76, avgTicket: 424,  color: "#10b981" },
  { name: "Neha T.",   bookings: 87,  revenue: 65200, rating: 4.6, utilization: 71, avgTicket: 749,  color: "#8b5cf6" },
  { name: "Vikram D.", bookings: 74,  revenue: 58900, rating: 4.5, utilization: 65, avgTicket: 796,  color: "#f59e0b" },
];

const radarStaff = [
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

const RevenueTab = ({ period }: { period: Period }) => {
  const data = period === "7d" ? revenueBy7d : revenueByMonth;
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
            <button className={`rp-toggle ${showTarget ? "active" : ""}`} onClick={() => setShowTarget(v => !v)}>
              <span className="rp-tog-dot" style={{ background: "#3b82f6" }} /> Target
            </button>
            <button className={`rp-toggle ${showPrev ? "active" : ""}`} onClick={() => setShowPrev(v => !v)}>
              <span className="rp-tog-dot" style={{ background: "#d1d5db" }} /> Previous
            </button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
            <BarChart data={serviceData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }} barSize={10}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#374151" }} axisLine={false} tickLine={false} width={72} />
              <Tooltip formatter={(v: any) => `₹${Number(v).toLocaleString()}`} />
              <Bar dataKey="revenue" name="Revenue" radius={[0, 4, 4, 0]}>
                {serviceData.map((s) => <Cell key={s.name} fill={s.color} />)}
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
              <Pie data={serviceData} cx="50%" cy="50%" innerRadius={60} outerRadius={95}
                paddingAngle={2} dataKey="revenue">
                {serviceData.map((s) => <Cell key={s.name} fill={s.color} />)}
              </Pie>
              <Tooltip formatter={(v: any) => `₹${Number(v).toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="rp-pie-legend">
            {serviceData.map(s => (
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

const AppointmentsTab = () => (
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
        <BarChart data={appointmentsWeekly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={14} barGap={3}>
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

const ClientsTab = () => (
  <div className="rp-tab-body">
    <div className="rp-main-chart-card">
      <div className="rp-chart-header">
        <div>
          <h4 className="rp-chart-title">Client Growth</h4>
          <p className="rp-chart-sub">New · Returning · Churned</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={clientGrowth} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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

const StaffTab = () => (
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

const ServicesTab = () => {
  const [sort, setSort] = useState<"revenue"|"bookings">("revenue");
  const sorted = useMemo(() =>
    [...serviceData].sort((a,b) => b[sort] - a[sort]), [sort]);

  return (
    <div className="rp-tab-body">
      <div className="rp-main-chart-card">
        <div className="rp-chart-header">
          <div>
            <h4 className="rp-chart-title">Service Performance</h4>
            <p className="rp-chart-sub">Revenue and booking count per service</p>
          </div>
          <div className="rp-toggles">
            <button className={`rp-toggle ${sort==="revenue" ? "active":""}`} onClick={() => setSort("revenue")}>By Revenue</button>
            <button className={`rp-toggle ${sort==="bookings"? "active":""}`} onClick={() => setSort("bookings")}>By Bookings</button>
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
              {sorted.map(s => <Cell key={s.name} fill={s.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="rp-services-grid">
        {serviceData.map(s => (
          <div key={s.name} className="rp-svc-card">
            <div className="rp-svc-top">
              <span className="rp-svc-dot" style={{ background: s.color }} />
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
            <Sparkline data={sparklineData} color={s.color} />
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [period, setPeriod]   = useState<Period>("30d");
  const [tab, setTab]         = useState<ReportTab>("revenue");
  const [showFilter, setShowFilter] = useState(false);

  const periods: { key: Period; label: string }[] = [
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

  return (
    <div className="rp-page">

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
              <button key={p.key} className={`rp-period-pill ${period === p.key ? "active" : ""}`}
                onClick={() => setPeriod(p.key)}>
                {p.label}
              </button>
            ))}
          </div>
          <button className="rp-filter-btn" onClick={() => setShowFilter(v => !v)}>
            <Funnel size={14} /> Filters
          </button>
          <button className="rp-export-btn">
            <FileEarmarkArrowDown size={14} /> Export
          </button>
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
              {staffData.map(s => <option key={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div className="rp-filter-group">
            <label>Service</label>
            <select className="rp-filter-select">
              <option>All Services</option>
              {serviceData.map(s => <option key={s.name}>{s.name}</option>)}
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
          <button className="rp-apply-btn">Apply</button>
        </div>
      )}

      {/* ── TABS ── */}
      <div className="rp-tabs">
        {tabs.map(t => (
          <button key={t.key} className={`rp-tab ${tab === t.key ? "active" : ""}`}
            onClick={() => setTab(t.key)}>
            {t.icon} {t.label}
          </button>
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
      {tab === "revenue"      && <RevenueTab period={period} />}
      {tab === "appointments" && <AppointmentsTab />}
      {tab === "clients"      && <ClientsTab />}
      {tab === "staff"        && <StaffTab />}
      {tab === "services"     && <ServicesTab />}

    </div>
  );
}
