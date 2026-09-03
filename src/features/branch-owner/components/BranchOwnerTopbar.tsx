import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  PersonCircle, BoxArrowRight, Bell, CheckAll,
  CalendarCheck, CurrencyRupee, PersonPlus, StarFill, ChatDots,
  CheckCircleFill, XCircleFill, ExclamationTriangleFill,
} from "react-bootstrap-icons";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { logout } from "../../../store/authSlice";
import { fetchMySalonsThunk } from "../../../middleware/branchOwner/branchOwner.thunk";
import { formatDateDDMMYYYY, formatTimeAgo } from "../../../utils/dateFormat";
import api from "../../../services/api/axios";
import { BRANCH_OWNER } from "../../../services/api/endpoints/branchOwner.endpoints";
import salonoxLogo from "../../../assets/salonox_full_logo.png";
import "../styles/BranchOwnerTopbar.scss";

// Same shape as the main dashboard's Notification type (DashboardTopbar.tsx)
// — the backend row is identical, only the fetch is scoped by an explicit
// salonId query param here instead of req.user.salonId, since a branch owner
// manages multiple salons and their JWT carries none of its own.
interface BoNotification {
  id: string;
  type: "appointment" | "payment" | "client" | "review" | "whatsapp" | "info" | "success" | "error" | "warning";
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
}

const NOTIF_ICONS: Record<string, React.ReactNode> = {
  appointment: <CalendarCheck size={16} />,
  payment: <CurrencyRupee size={16} />,
  client: <PersonPlus size={16} />,
  review: <StarFill size={14} />,
  whatsapp: <ChatDots size={16} />,
  info: <Bell size={15} />,
  success: <CheckCircleFill size={15} />,
  error: <XCircleFill size={15} />,
  warning: <ExclamationTriangleFill size={14} />,
};

const NOTIF_COLORS: Record<string, string> = {
  appointment: "#3b82f6",
  payment: "#10b981",
  client: "#8b5cf6",
  review: "#f59e0b",
  whatsapp: "#25d366",
  info: "#6b7280",
  success: "#10b981",
  error: "#ef4444",
  warning: "#f59e0b",
};

// Mirrors DashboardTopbar.tsx's structure/classes (.topbar/.topbar-left/
// .brand/.topbar-right/.topbar-profile-*) for visual parity with the main
// dashboard — the Active Branch switcher sits in topbar-left the same way
// SalonGroupSwitcher does on the main site's topbar.
export default function BranchOwnerTopbar() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((s) => s.auth) as any;
  const salons = useAppSelector((s) => s.branchOwner.salons);

  const [activeBranchId, setActiveBranchId] = useState("");
  const [showAllBranches, setShowAllBranches] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [notifs, setNotifs] = useState<BoNotification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => { dispatch(fetchMySalonsThunk()); }, [dispatch]);
  useEffect(() => {
    if (!activeBranchId && salons.length > 0) setActiveBranchId(salons[0].id);
  }, [salons, activeBranchId]);

  const unreadCount = notifs.filter((n) => !n.is_read).length;

  // Notifications are scoped to whichever branch is currently selected in
  // the switcher above — the backend has no single-salon JWT context for a
  // branch owner to fall back on (see branch-owner.service.ts), so this is
  // re-fetched every time activeBranchId changes.
  const fetchNotifications = useCallback(async (salonId: string) => {
    if (!salonId) { setNotifs([]); return; }
    try {
      setNotifLoading(true);
      const res = await api.get(BRANCH_OWNER.NOTIFICATIONS(salonId));
      setNotifs(res.data?.data ?? []);
    } catch {
      // non-critical
    } finally {
      setNotifLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(activeBranchId); }, [activeBranchId, fetchNotifications]);

  const handleMarkAllRead = useCallback(async () => {
    if (!activeBranchId) return;
    try {
      await api.patch(BRANCH_OWNER.NOTIFICATIONS_MARK_ALL, { salonId: activeBranchId });
      setNotifs([]);
    } catch { /* ignore */ }
  }, [activeBranchId]);

  const handleNotifItemClick = useCallback((n: BoNotification) => {
    setNotifs((prev) => prev.filter((x) => x.id !== n.id));
    if (!n.is_read && activeBranchId) {
      api.patch(BRANCH_OWNER.NOTIFICATIONS_MARK_ONE(n.id), { salonId: activeBranchId }).catch(() => { /* best-effort */ });
    }
  }, [activeBranchId]);

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const todayLabel = formatDateDDMMYYYY(now);
  const timeLabel = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleLogout() {
    dispatch(logout());
    navigate("/login", { replace: true });
  }

  const name = user?.first_name ? `${user.first_name} ${user.last_name ?? ""}`.trim() : "Branch Owner";
  const initials = (user?.first_name?.[0] ?? "B").toUpperCase() + (user?.last_name?.[0] ?? "").toUpperCase();

  return (
    <div className="topbar">
      <div className="topbar-left">
        <h2 className="brand">
          <img src={salonoxLogo} alt="SalonOX" className="brand-logo" width="190" height="61" />
        </h2>

        {salons.length > 0 && (
          <select
            className="bot-branch-select"
            value={activeBranchId}
            onChange={(e) => setActiveBranchId(e.target.value)}
          >
            {salons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}

        <button
          type="button"
          className={`bot-all-branches-btn ${showAllBranches ? "bot-all-branches-btn--active" : ""}`}
          onClick={() => setShowAllBranches((v) => !v)}
          title="All Branches Overview"
        >
          All Branches Overview
        </button>
      </div>

      <div className="topbar-right">
        <span className="topbar-date" title="Today's date">{todayLabel}</span>
        <span className="topbar-time" title="Current time">{timeLabel}</span>

        <div className="topbar-notif-wrap" ref={notifRef}>
          <button
            className={`topbar-icon-btn topbar-notif-btn ${showNotif ? "topbar-icon-btn--active" : ""}`}
            title="Notifications"
            aria-label="Notifications"
            onClick={() => { setShowNotif((v) => !v); setShowProfile(false); }}
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
                {!activeBranchId ? (
                  <div className="topbar-notif-empty">Select a salon to see its notifications</div>
                ) : notifLoading && notifs.length === 0 ? (
                  <div className="topbar-notif-empty">Loading…</div>
                ) : notifs.length === 0 ? (
                  <div className="topbar-notif-empty">No notifications</div>
                ) : (
                  notifs.map((n) => {
                    const color = NOTIF_COLORS[n.type] ?? NOTIF_COLORS.info;
                    const icon = NOTIF_ICONS[n.type] ?? NOTIF_ICONS.info;
                    return (
                      <div
                        key={n.id}
                        className={`topbar-notif-item ${n.is_read ? "" : "topbar-notif-item--unread"}`}
                        onClick={() => handleNotifItemClick(n)}
                        role="menuitem"
                      >
                        <span className="topbar-notif-icon" style={{ background: color + "18", color }}>
                          {icon}
                        </span>
                        <div className="topbar-notif-content">
                          <p className="topbar-notif-item-title">{n.title}</p>
                          {n.body && <p className="topbar-notif-item-body">{n.body}</p>}
                          <span className="topbar-notif-time">{formatTimeAgo(n.created_at)}</span>
                        </div>
                        {!n.is_read && <span className="topbar-notif-dot" />}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="topbar-profile-wrap" ref={profileRef}>
          <button
            className={`topbar-profile-btn ${showProfile ? "topbar-profile-btn--active" : ""}`}
            onClick={() => { setShowProfile((v) => !v); setShowNotif(false); }}
            aria-label="Profile menu"
            title="Profile"
          >
            <span className="topbar-profile-initials">{initials}</span>
          </button>

          {showProfile && (
            <div className="topbar-profile-dropdown" role="menu">
              <div className="topbar-profile-info">
                <div className="topbar-profile-info-av">
                  <span className="topbar-profile-initials topbar-profile-initials--lg">{initials}</span>
                </div>
                <div className="topbar-profile-info-text">
                  <p className="topbar-profile-name">{name}</p>
                  <p className="topbar-profile-email">Branch Owner</p>
                </div>
              </div>

              <div className="topbar-profile-divider" />

              <button className="topbar-profile-item" onClick={() => { setShowProfile(false); navigate("/branch-owner/settings"); }}>
                <PersonCircle size={15} /> Settings
              </button>

              <div className="topbar-profile-divider" />

              <button className="topbar-profile-item topbar-profile-item--danger" onClick={handleLogout}>
                <BoxArrowRight size={15} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
