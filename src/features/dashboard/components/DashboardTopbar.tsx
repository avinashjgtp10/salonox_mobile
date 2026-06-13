import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Search,
  BarChart,
  Bell,
  PersonCircle,
  Gear,
  BoxArrowRight,
  CheckAll,
  CalendarCheck,
  CurrencyRupee,
  PersonPlus,
  StarFill,
  ChevronRight,
  ArrowClockwise,
} from "react-bootstrap-icons";
import type { RootState } from "../../../store/store";
import SearchOverlay from "./SearchOverlay";

// ── Mock notification data ─────────────────────────────────────────────────────
interface Notification {
  id: number;
  type: "appointment" | "payment" | "client" | "review";
  title: string;
  body: string;
  time: string;
  read: boolean;
}

const INITIAL_NOTIFS: Notification[] = [
  { id: 1, type: "appointment", title: "New Appointment",  body: "Priya Sharma booked a Hair Color at 2:00 PM today.", time: "2 min ago",   read: false },
  { id: 2, type: "payment",     title: "Payment Received", body: "₹2,800 collected for Ticket #SVB5001.",             time: "18 min ago",  read: false },
  { id: 3, type: "client",      title: "New Client",       body: "Riya Kapoor registered as a new client.",            time: "1 hr ago",    read: false },
  { id: 4, type: "review",      title: "New Review ⭐⭐⭐⭐⭐", body: "Anita K. received a 5-star review.",              time: "3 hr ago",    read: true  },
  { id: 5, type: "appointment", title: "Cancellation",     body: "Meera Joshi cancelled her 4:30 PM appointment.",     time: "5 hr ago",    read: true  },
];

const NOTIF_ICONS: Record<Notification["type"], React.ReactNode> = {
  appointment: <CalendarCheck size={16} />,
  payment:     <CurrencyRupee size={16} />,
  client:      <PersonPlus   size={16} />,
  review:      <StarFill     size={14} />,
};

const NOTIF_COLORS: Record<Notification["type"], string> = {
  appointment: "#3b82f6",
  payment:     "#10b981",
  client:      "#8b5cf6",
  review:      "#f59e0b",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Get initials from full name */
const getInitials = (name?: string) => {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  onLogout: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function DashboardTopbar({ onLogout }: Props) {
  const navigate  = useNavigate();
  const userProfile = useSelector((s: RootState) => s.user.profile);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [showSearch,   setShowSearch]   = useState(false);
  const [showNotif,    setShowNotif]    = useState(false);
  const [showProfile,  setShowProfile]  = useState(false);
  const [notifs,       setNotifs]       = useState<Notification[]>(INITIAL_NOTIFS);
  const [planLoading,  setPlanLoading]  = useState(false);

  const notifRef   = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifs.filter(n => !n.read).length;
  const initials    = getInitials(userProfile?.fullName);
  const displayName = userProfile?.fullName ?? "Salon Owner";
  const email       = userProfile?.email     ?? "";

  // ── Close dropdowns on outside click ────────────────────────────────────────
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current   && !notifRef.current.contains(e.target as Node))   setShowNotif(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── Keyboard shortcut: Ctrl+K → open search ─────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleActivatePlan = useCallback(() => {
    setPlanLoading(true);
    setTimeout(() => {
      setPlanLoading(false);
      navigate("/dashboard/settings/billing");
    }, 400);
  }, [navigate]);

  const handleMarkAllRead = useCallback(() => {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const handleMarkRead = useCallback((id: number) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const handleLogoutClick = useCallback(() => {
    setShowProfile(false);
    onLogout();
  }, [onLogout]);

  return (
    <>
      {/* ── TOPBAR ── */}
      <div className="topbar">

        {/* Brand */}
        <h2 className="brand">salonox</h2>

        {/* Right side actions */}
        <div className="topbar-right">

          {/* Activate Plan */}
          <button
            className={`activate-btn ${planLoading ? "activate-btn--loading" : ""}`}
            onClick={handleActivatePlan}
            disabled={planLoading}
          >
            {planLoading ? (
              <span className="activate-btn-spinner" />
            ) : (
              "Activate Plan"
            )}
          </button>

          {/* Search */}
          <button
            className="topbar-icon-btn"
            title="Search (Ctrl+K)"
            onClick={() => setShowSearch(true)}
            aria-label="Open search"
          >
            <Search size={19} />
          </button>

          {/* Analytics */}
          <button
            className="topbar-icon-btn"
            title="Analytics"
            onClick={() => navigate("/dashboard/analytics")}
            aria-label="Analytics"
          >
            <BarChart size={19} />
          </button>

          {/* Notifications */}
          <div className="topbar-notif-wrap" ref={notifRef}>
            <button
              className={`topbar-icon-btn topbar-notif-btn ${showNotif ? "topbar-icon-btn--active" : ""}`}
              title="Notifications"
              onClick={() => { setShowNotif(v => !v); setShowProfile(false); }}
              aria-label="Notifications"
            >
              <Bell size={19} />
              {unreadCount > 0 && (
                <span className="topbar-notif-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
              )}
            </button>

            {showNotif && (
              <div className="topbar-notif-dropdown" role="menu">
                <div className="topbar-notif-header">
                  <span className="topbar-notif-title">
                    Notifications
                    {unreadCount > 0 && <span className="topbar-notif-count">{unreadCount} new</span>}
                  </span>
                  {unreadCount > 0 && (
                    <button className="topbar-notif-mark-all" onClick={handleMarkAllRead}>
                      <CheckAll size={14} /> Mark all read
                    </button>
                  )}
                </div>

                <div className="topbar-notif-list">
                  {notifs.length === 0 ? (
                    <div className="topbar-notif-empty">No notifications</div>
                  ) : (
                    notifs.map(n => (
                      <div
                        key={n.id}
                        className={`topbar-notif-item ${n.read ? "" : "topbar-notif-item--unread"}`}
                        onClick={() => handleMarkRead(n.id)}
                        role="menuitem"
                      >
                        <span
                          className="topbar-notif-icon"
                          style={{ background: NOTIF_COLORS[n.type] + "18", color: NOTIF_COLORS[n.type] }}
                        >
                          {NOTIF_ICONS[n.type]}
                        </span>
                        <div className="topbar-notif-content">
                          <p className="topbar-notif-item-title">{n.title}</p>
                          <p className="topbar-notif-item-body">{n.body}</p>
                          <span className="topbar-notif-time">{n.time}</span>
                        </div>
                        {!n.read && <span className="topbar-notif-dot" />}
                      </div>
                    ))
                  )}
                </div>

                <div className="topbar-notif-footer">
                  <button
                    className="topbar-notif-view-all"
                    onClick={() => { setShowNotif(false); navigate("/dashboard/settings"); }}
                  >
                    View all notifications <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="topbar-profile-wrap" ref={profileRef}>
            <button
              className={`topbar-profile-btn ${showProfile ? "topbar-profile-btn--active" : ""}`}
              onClick={() => { setShowProfile(v => !v); setShowNotif(false); }}
              aria-label="Profile menu"
              title="Profile"
            >
              {userProfile?.avatarUrl ? (
                <img src={userProfile.avatarUrl} alt={displayName} className="topbar-profile-avatar-img" />
              ) : (
                <span className="topbar-profile-initials">{initials}</span>
              )}
            </button>

            {showProfile && (
              <div className="topbar-profile-dropdown" role="menu">
                {/* User info section */}
                <div className="topbar-profile-info">
                  <div className="topbar-profile-info-av">
                    {userProfile?.avatarUrl ? (
                      <img src={userProfile.avatarUrl} alt={displayName} className="topbar-profile-avatar-img topbar-profile-avatar-img--lg" />
                    ) : (
                      <span className="topbar-profile-initials topbar-profile-initials--lg">{initials}</span>
                    )}
                  </div>
                  <div className="topbar-profile-info-text">
                    <p className="topbar-profile-name">{displayName}</p>
                    {email && <p className="topbar-profile-email">{email}</p>}
                  </div>
                </div>

                <div className="topbar-profile-divider" />

                {/* Menu items */}
                <button
                  className="topbar-profile-item"
                  onClick={() => { setShowProfile(false); navigate("/dashboard/profile"); }}
                >
                  <PersonCircle size={15} />
                  My Profile
                </button>
                <button
                  className="topbar-profile-item"
                  onClick={() => { setShowProfile(false); navigate("/dashboard/settings"); }}
                >
                  <Gear size={15} />
                  Settings
                </button>

                <div className="topbar-profile-divider" />

                {/* Logout */}
                <button
                  className="topbar-profile-item topbar-profile-item--danger"
                  onClick={handleLogoutClick}
                >
                  <BoxArrowRight size={15} />
                  Logout
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Search Overlay */}
      {showSearch && <SearchOverlay onClose={() => setShowSearch(false)} />}
    </>
  );
}
