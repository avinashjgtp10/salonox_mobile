import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/DashboardPage.scss";
import { useNavigate } from "react-router-dom";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  CalendarCheck,
  CurrencyRupee,
  People,
  Scissors,
  ArrowUpRight,
  ArrowDownRight,
  Lightning,
  ClockHistory,
  PersonPlus,
  CartPlus,
  Megaphone,
  ChevronRight,
  StarFill,
  CircleFill,
} from "react-bootstrap-icons";

// ─── Mock Data ───────────────────────────────────────────────────────────────

const revenueData = [
  { month: "Jan", revenue: 42000, expenses: 18000 },
  { month: "Feb", revenue: 38000, expenses: 15000 },
  { month: "Mar", revenue: 55000, expenses: 20000 },
  { month: "Apr", revenue: 61000, expenses: 22000 },
  { month: "May", revenue: 48000, expenses: 17000 },
  { month: "Jun", revenue: 72000, expenses: 25000 },
  { month: "Jul", revenue: 68000, expenses: 23000 },
  { month: "Aug", revenue: 79000, expenses: 28000 },
  { month: "Sep", revenue: 83000, expenses: 29000 },
  { month: "Oct", revenue: 91000, expenses: 31000 },
  { month: "Nov", revenue: 87000, expenses: 30000 },
  { month: "Dec", revenue: 98000, expenses: 33000 },
];

const appointmentsData = [
  { day: "Mon", completed: 18, cancelled: 3, pending: 5 },
  { day: "Tue", completed: 24, cancelled: 2, pending: 7 },
  { day: "Wed", completed: 21, cancelled: 4, pending: 6 },
  { day: "Thu", completed: 30, cancelled: 1, pending: 4 },
  { day: "Fri", completed: 35, cancelled: 2, pending: 8 },
  { day: "Sat", completed: 42, cancelled: 3, pending: 6 },
  { day: "Sun", completed: 15, cancelled: 1, pending: 3 },
];

const serviceDistribution = [
  { name: "Haircut", value: 35, color: "#111827" },
  { name: "Hair Color", value: 25, color: "#3b82f6" },
  { name: "Facial", value: 18, color: "#10b981" },
  { name: "Massage", value: 12, color: "#f59e0b" },
  { name: "Nails", value: 10, color: "#8b5cf6" },
];

const recentAppointments = [
  {
    id: 1,
    client: "Priya Sharma",
    service: "Hair Color + Cut",
    staff: "Anita K.",
    time: "10:00 AM",
    status: "completed",
    amount: 2800,
  },
  {
    id: 2,
    client: "Rahul Mehta",
    service: "Beard Trim",
    staff: "Raj S.",
    time: "11:30 AM",
    status: "completed",
    amount: 400,
  },
  {
    id: 3,
    client: "Sneha Patel",
    service: "Facial + Cleanup",
    staff: "Pooja M.",
    time: "12:00 PM",
    status: "in-progress",
    amount: 1500,
  },
  {
    id: 4,
    client: "Arjun Verma",
    service: "Haircut",
    staff: "Raj S.",
    time: "1:30 PM",
    status: "upcoming",
    amount: 600,
  },
  {
    id: 5,
    client: "Meera Joshi",
    service: "Bridal Package",
    staff: "Anita K.",
    time: "3:00 PM",
    status: "upcoming",
    amount: 8500,
  },
];

const topStaff = [
  { name: "Anita Kumar", role: "Senior Stylist", bookings: 128, revenue: 94200, rating: 4.9, avatar: "AK" },
  { name: "Pooja Mehta", role: "Beautician", bookings: 105, revenue: 72800, rating: 4.8, avatar: "PM" },
  { name: "Raj Sharma", role: "Barber", bookings: 98, revenue: 41600, rating: 4.7, avatar: "RS" },
];

const kpiCards = [
  {
    label: "Total Revenue",
    value: "₹98,400",
    change: "+12.5%",
    up: true,
    sub: "vs last month",
    icon: <CurrencyRupee size={20} />,
    color: "#10b981",
    bg: "#f0fdf4",
  },
  {
    label: "Appointments",
    value: "185",
    change: "+8.2%",
    up: true,
    sub: "this month",
    icon: <CalendarCheck size={20} />,
    color: "#3b82f6",
    bg: "#eff6ff",
  },
  {
    label: "Active Clients",
    value: "1,240",
    change: "+5.1%",
    up: true,
    sub: "total clients",
    icon: <People size={20} />,
    color: "#8b5cf6",
    bg: "#f5f3ff",
  },
  {
    label: "Avg. Ticket",
    value: "₹1,320",
    change: "-2.4%",
    up: false,
    sub: "per appointment",
    icon: <Scissors size={20} />,
    color: "#f59e0b",
    bg: "#fffbeb",
  },
];

const quickActions = [
  { label: "New Appointment", icon: <CalendarCheck size={22} />, path: "/dashboard/calendar", color: "#111827" },
  { label: "Add Client", icon: <PersonPlus size={22} />, path: "/dashboard/clients/add", color: "#3b82f6" },
  { label: "Quick Sale", icon: <CartPlus size={22} />, path: "/dashboard/sales", color: "#10b981" },
  { label: "Campaign", icon: <Megaphone size={22} />, path: "/dashboard/marketing", color: "#8b5cf6" },
];

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const RevenueTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="db-tooltip">
        <p className="db-tooltip-label">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color, margin: "2px 0", fontSize: 13 }}>
            {p.name}: ₹{p.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const ApptTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="db-tooltip">
        <p className="db-tooltip-label">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color, margin: "2px 0", fontSize: 13 }}>
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ─── Status Badge ─────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; cls: string }> = {
    completed: { label: "Completed", cls: "db-badge-success" },
    "in-progress": { label: "In Progress", cls: "db-badge-info" },
    upcoming: { label: "Upcoming", cls: "db-badge-warning" },
    cancelled: { label: "Cancelled", cls: "db-badge-danger" },
  };
  const { label, cls } = map[status] || { label: status, cls: "" };
  return <span className={`db-badge ${cls}`}>{label}</span>;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="db-home">

      {/* ── HEADER ── */}
      <div className="db-header">
        <div>
          <h1 className="db-title">Good morning, salonox! 👋</h1>
          <p className="db-subtitle">{today} · Here's what's happening today</p>
        </div>
        <div className="db-header-actions">
          {quickActions.map((qa) => (
            <button
              key={qa.label}
              className="db-quick-btn"
              onClick={() => navigate(qa.path)}
              style={{ "--qa-color": qa.color } as React.CSSProperties}
            >
              <span className="db-quick-icon" style={{ background: qa.color + "15", color: qa.color }}>
                {qa.icon}
              </span>
              <span>{qa.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI CARDS ── */}
      <div className="db-kpi-row">
        {kpiCards.map((card) => (
          <div className="db-kpi-card" key={card.label}>
            <div className="db-kpi-top">
              <span className="db-kpi-icon" style={{ background: card.bg, color: card.color }}>
                {card.icon}
              </span>
              <span className={`db-kpi-change ${card.up ? "up" : "down"}`}>
                {card.up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {card.change}
              </span>
            </div>
            <div className="db-kpi-value">{card.value}</div>
            <div className="db-kpi-label">{card.label}</div>
            <div className="db-kpi-sub">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* ── CHARTS ROW ── */}
      <div className="db-charts-row">

        {/* Revenue Area Chart */}
        <div className="db-card db-card-lg">
          <div className="db-card-header">
            <div>
              <h3 className="db-card-title">Revenue Overview</h3>
              <p className="db-card-sub">Monthly revenue vs expenses</p>
            </div>
            <div className="db-legend">
              <span className="db-legend-item"><CircleFill size={8} color="#111827" /> Revenue</span>
              <span className="db-legend-item"><CircleFill size={8} color="#e5e7eb" /> Expenses</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={revenueData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#111827" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#111827" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e5e7eb" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#e5e7eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<RevenueTooltip />} />
              <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#d1d5db" strokeWidth={2} fill="url(#expGrad)" />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#111827" strokeWidth={2.5} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Appointments Bar Chart */}
        <div className="db-card db-card-md">
          <div className="db-card-header">
            <div>
              <h3 className="db-card-title">This Week</h3>
              <p className="db-card-sub">Appointments breakdown</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={appointmentsData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} barSize={10} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip content={<ApptTooltip />} />
              <Bar dataKey="completed" name="Completed" fill="#111827" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pending" name="Pending" fill="#d1d5db" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cancelled" name="Cancelled" fill="#fecaca" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="db-bar-legend">
            <span><CircleFill size={8} color="#111827" /> Completed</span>
            <span><CircleFill size={8} color="#d1d5db" /> Pending</span>
            <span><CircleFill size={8} color="#fecaca" /> Cancelled</span>
          </div>
        </div>

      </div>

      {/* ── BOTTOM ROW ── */}
      <div className="db-bottom-row">

        {/* Recent Appointments */}
        <div className="db-card db-card-xl">
          <div className="db-card-header">
            <div>
              <h3 className="db-card-title">Today's Appointments</h3>
              <p className="db-card-sub">Live status updates</p>
            </div>
            <button className="db-view-all" onClick={() => navigate("/dashboard/calendar")}>
              View all <ChevronRight size={14} />
            </button>
          </div>
          <div className="db-appt-table">
            <div className="db-appt-head">
              <span>Client</span>
              <span>Service</span>
              <span>Staff</span>
              <span>Time</span>
              <span>Amount</span>
              <span>Status</span>
            </div>
            {recentAppointments.map((appt) => (
              <div className="db-appt-row" key={appt.id}>
                <span className="db-appt-client">
                  <span className="db-avatar">{appt.client.charAt(0)}</span>
                  {appt.client}
                </span>
                <span className="db-appt-service">{appt.service}</span>
                <span className="db-appt-staff">{appt.staff}</span>
                <span className="db-appt-time">
                  <ClockHistory size={12} className="me-1" />{appt.time}
                </span>
                <span className="db-appt-amount">₹{appt.amount.toLocaleString()}</span>
                <StatusBadge status={appt.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Right Column */}
        <div className="db-right-col">

          {/* Service Distribution Pie */}
          <div className="db-card">
            <div className="db-card-header">
              <div>
                <h3 className="db-card-title">Service Mix</h3>
                <p className="db-card-sub">By booking share</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={serviceDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {serviceDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="db-pie-legend">
              {serviceDistribution.map((s) => (
                <div className="db-pie-legend-item" key={s.name}>
                  <CircleFill size={8} color={s.color} />
                  <span>{s.name}</span>
                  <span className="ms-auto fw-semibold">{s.value}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Staff */}
          <div className="db-card">
            <div className="db-card-header">
              <div>
                <h3 className="db-card-title">Top Staff</h3>
                <p className="db-card-sub">This month</p>
              </div>
              <button className="db-view-all" onClick={() => navigate("/dashboard/team/staff")}>
                View all <ChevronRight size={14} />
              </button>
            </div>
            <div className="db-staff-list">
              {topStaff.map((s, i) => (
                <div className="db-staff-item" key={s.name}>
                  <span className="db-rank">#{i + 1}</span>
                  <div className="db-staff-avatar">{s.avatar}</div>
                  <div className="db-staff-info">
                    <div className="db-staff-name">{s.name}</div>
                    <div className="db-staff-role">{s.role}</div>
                  </div>
                  <div className="db-staff-stats">
                    <div className="db-staff-rev">₹{(s.revenue / 1000).toFixed(0)}k</div>
                    <div className="db-staff-rating">
                      <StarFill size={10} color="#f59e0b" /> {s.rating}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── QUICK STATS STRIP ── */}
      <div className="db-stats-strip">
        <div className="db-stat-item">
          <Lightning size={16} color="#f59e0b" />
          <span className="db-stat-label">Busiest day</span>
          <span className="db-stat-val">Saturday</span>
        </div>
        <div className="db-stat-divider" />
        <div className="db-stat-item">
          <Scissors size={16} color="#10b981" />
          <span className="db-stat-label">Top service</span>
          <span className="db-stat-val">Haircut</span>
        </div>
        <div className="db-stat-divider" />
        <div className="db-stat-item">
          <People size={16} color="#3b82f6" />
          <span className="db-stat-label">New clients</span>
          <span className="db-stat-val">42 this month</span>
        </div>
        <div className="db-stat-divider" />
        <div className="db-stat-item">
          <CalendarCheck size={16} color="#8b5cf6" />
          <span className="db-stat-label">Completion rate</span>
          <span className="db-stat-val">94.2%</span>
        </div>
        <div className="db-stat-divider" />
        <div className="db-stat-item">
          <CurrencyRupee size={16} color="#ef4444" />
          <span className="db-stat-label">Pending payments</span>
          <span className="db-stat-val">₹14,800</span>
        </div>
      </div>

    </div>
  );
}
