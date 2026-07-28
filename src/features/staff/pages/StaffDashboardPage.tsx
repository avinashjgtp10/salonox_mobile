import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectCurrentSalon } from "../../../store/selectors/slices.selectors";
import {
  People,
  Calendar2Check,
  CurrencyDollar,
  PersonCheck,
  ArrowUpRight,
  Clock,
  StarFill,
  PersonPlus,
} from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { STAFF, BOOKING, SALE, CLIENT } from "../../../services/api/endpoints";
import "../styles/StaffDashboardPage.scss";

interface StatCard {
  label: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: "indigo" | "emerald" | "amber" | "rose";
  loading: boolean;
}

interface RecentStaff {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  job_title?: string;
  status?: string;
  is_active?: boolean;
  calendar_color?: string;
  invitation_status?: string;
}

const GRADIENTS: Record<string, string> = {
  light_blue: "#93c5fd",
  blue: "#3b82f6",
  dark_blue: "#1d4ed8",
  purple: "#8b5cf6",
  pink: "#f472b6",
  green: "#34d399",
  teal: "#2dd4bf",
  orange: "#fb923c",
};

function getAvatar(name: string, color?: string): { initials: string; bg: string } {
  const initials = name
    .split(" ")
    .map((n) => n[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
  const bg = color ? GRADIENTS[color] ?? "#6366f1" : "#6366f1";
  return { initials, bg };
}

export default function StaffDashboardPage() {
  const navigate = useNavigate();
  const currentSalon = useSelector(selectCurrentSalon);
  const salonId = currentSalon?.id;

  const [stats, setStats] = useState({
    totalStaff: 0,
    activeStaff: 0,
    todayAppointments: 0,
    totalClients: 0,
    revenue: 0,
    loadingStaff: true,
    loadingAppointments: true,
    loadingClients: true,
    loadingRevenue: true,
  });

  const [recentStaff, setRecentStaff] = useState<RecentStaff[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!salonId) return;
    const today = new Date().toISOString().split("T")[0];

    // Staff count + recent list
    api
      .get(STAFF.BASE, { params: { limit: 50 } })
      .then((res) => {
        const items = res.data?.data?.items ?? res.data?.data ?? res.data ?? [];
        const arr: RecentStaff[] = Array.isArray(items) ? items : [];
        const active = arr.filter(
          (s) => s.is_active ?? s.status?.toLowerCase() === "active"
        ).length;
        setStats((p) => ({
          ...p,
          totalStaff: res.data?.data?.pagination?.total ?? arr.length,
          activeStaff: active,
          loadingStaff: false,
        }));
        setRecentStaff(arr.slice(0, 5));
        setLoadingRecent(false);
      })
      .catch(() => {
        setStats((p) => ({ ...p, loadingStaff: false }));
        setLoadingRecent(false);
      });

    // Today's appointments — backend requires salon_id + date as query params
    api
      .get(BOOKING.BASE, {
        params: { salon_id: String(salonId), date: today },
      })
      .then((res) => {
        const items = res.data?.data?.items ?? res.data?.data ?? res.data ?? [];
        const arr = Array.isArray(items) ? items : [];
        setStats((p) => ({
          ...p,
          todayAppointments: res.data?.data?.pagination?.total ?? arr.length,
          loadingAppointments: false,
        }));
      })
      .catch(() => setStats((p) => ({ ...p, loadingAppointments: false })));

    // Total clients (count only)
    api
      .get(CLIENT.BASE, { params: { limit: 1 } })
      .then((res) => {
        const items = res.data?.data?.items ?? res.data?.data ?? res.data ?? [];
        const arr = Array.isArray(items) ? items : [];
        setStats((p) => ({
          ...p,
          totalClients: res.data?.data?.pagination?.total ?? arr.length,
          loadingClients: false,
        }));
      })
      .catch(() => setStats((p) => ({ ...p, loadingClients: false })));

    // Revenue — backend requires both salon_id and date query params
    api
      .get(SALE.SUMMARY, { params: { salon_id: String(salonId), date: today } })
      .then((res) => {
        const raw =
          res.data?.data?.total_revenue ??
          res.data?.data?.revenue ??
          res.data?.total_revenue ??
          0;
        setStats((p) => ({ ...p, revenue: Number(raw), loadingRevenue: false }));
      })
      .catch(() => setStats((p) => ({ ...p, loadingRevenue: false })));
  }, [salonId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const statCards: StatCard[] = [
    {
      label: "Total Staff",
      value: stats.totalStaff,
      icon: <People size={20} />,
      color: "indigo",
      loading: stats.loadingStaff,
    },
    {
      label: "Today's Appointments",
      value: stats.todayAppointments,
      icon: <Calendar2Check size={20} />,
      color: "emerald",
      loading: stats.loadingAppointments,
    },
    {
      label: "Total Clients",
      value: stats.totalClients,
      icon: <PersonCheck size={20} />,
      color: "amber",
      loading: stats.loadingClients,
    },
    {
      label: "Revenue (All Time)",
      value: `₹${Number(stats.revenue).toLocaleString("en-IN")}`,
      icon: <CurrencyDollar size={20} />,
      color: "rose",
      loading: stats.loadingRevenue,
    },
  ];

  return (
    <div className="sdb">
      {/* ── Header ── */}
      <div className="sdb__header">
        <div>
          <h1 className="sdb__title">Staff Overview</h1>
          <p className="sdb__subtitle">
            Monitor your staff's performance and activity at a glance.
          </p>
        </div>
        <button
          className="sdb__add-btn"
          onClick={() => navigate("/dashboard/team/add")}
        >
          <PersonPlus size={16} />
          Add member
        </button>
      </div>

      {/* ── Stat Cards ── */}
      <div className="sdb__stats">
        {statCards.map((card) => (
          <div key={card.label} className={`sdb__stat sdb__stat--${card.color}`}>
            <div className="sdb__stat-top">
              <span className="sdb__stat-label">{card.label}</span>
              <span className="sdb__stat-icon">{card.icon}</span>
            </div>
            {card.loading ? (
              <div className="sdb__skeleton sdb__skeleton--value" />
            ) : (
              <div className="sdb__stat-value">{card.value}</div>
            )}
          </div>
        ))}
      </div>

      {/* ── Body Grid ── */}
      <div className="sdb__grid">
        {/* Recent Staff Members */}
        <div className="sdb__card">
          <div className="sdb__card-header">
            <h3 className="sdb__card-title">Recent Staff Members</h3>
            <button
              className="sdb__card-link"
              onClick={() => navigate("/dashboard/team/members")}
            >
              View all
            </button>
          </div>

          {loadingRecent ? (
            <div className="sdb__member-list">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="sdb__member-skeleton">
                  <div className="sdb__skeleton sdb__skeleton--avatar" />
                  <div className="sdb__skeleton-lines">
                    <div className="sdb__skeleton sdb__skeleton--name" />
                    <div className="sdb__skeleton sdb__skeleton--sub" />
                  </div>
                  <div className="sdb__skeleton sdb__skeleton--badge" />
                </div>
              ))}
            </div>
          ) : recentStaff.length === 0 ? (
            <div className="sdb__empty">
              <People size={36} className="sdb__empty-icon" />
              <p>No staff members yet</p>
              <button
                className="sdb__empty-btn"
                onClick={() => navigate("/dashboard/team/add")}
              >
                Add first member
              </button>
            </div>
          ) : (
            <div className="sdb__member-list">
              {recentStaff.map((member) => {
                const fullName = `${member.first_name} ${member.last_name}`.trim();
                const { initials, bg } = getAvatar(fullName, member.calendar_color);
                const isActive =
                  member.is_active ??
                  (member.status?.toLowerCase() === "active");
                return (
                  <div
                    key={member.id}
                    className="sdb__member-row"
                    onClick={() => navigate(`/dashboard/team/${member.id}`)}
                  >
                    <div
                      className="sdb__member-avatar"
                      style={{ "--avatar-bg": bg } as React.CSSProperties}
                    >
                      {initials || "?"}
                    </div>
                    <div className="sdb__member-info">
                      <span className="sdb__member-name">{fullName || "Unknown"}</span>
                      <span className="sdb__member-role">
                        {member.job_title || member.email || "—"}
                      </span>
                    </div>
                    <span
                      className={`sdb__status-badge ${
                        isActive
                          ? "sdb__status-badge--active"
                          : "sdb__status-badge--inactive"
                      }`}
                    >
                      {isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="sdb__card">
          <div className="sdb__card-header">
            <h3 className="sdb__card-title">Quick Actions</h3>
          </div>
          <div className="sdb__actions">
            {[
              {
                label: "Add Staff Member",
                desc: "Invite a new staff member",
                icon: <PersonPlus size={18} />,
                path: "/dashboard/team/add",
                color: "indigo",
              },
              {
                label: "View Appointments",
                desc: "See today's schedule",
                icon: <Calendar2Check size={18} />,
                path: "/dashboard/team/appointments",
                color: "emerald",
              },
              {
                label: "View Customers",
                desc: "Browse client records",
                icon: <PersonCheck size={18} />,
                path: "/dashboard/team/customers",
                color: "amber",
              },
              {
                label: "Sales Report",
                desc: "Check billing & revenue",
                icon: <CurrencyDollar size={18} />,
                path: "/dashboard/team/sales",
                color: "rose",
              },
              {
                label: "Scheduled Shifts",
                desc: "Manage work schedules",
                icon: <Clock size={18} />,
                path: "/dashboard/team/shifts",
                color: "violet",
              },
              {
                label: "Pay Runs",
                desc: "Process payroll",
                icon: <StarFill size={18} />,
                path: "/dashboard/team/payruns",
                color: "blue",
              },
            ].map((action) => (
              <button
                key={action.label}
                className={`sdb__action-item sdb__action-item--${action.color}`}
                onClick={() => navigate(action.path)}
              >
                <span className="sdb__action-icon">{action.icon}</span>
                <div className="sdb__action-text">
                  <span className="sdb__action-label">{action.label}</span>
                  <span className="sdb__action-desc">{action.desc}</span>
                </div>
                <ArrowUpRight size={14} className="sdb__action-arrow" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
