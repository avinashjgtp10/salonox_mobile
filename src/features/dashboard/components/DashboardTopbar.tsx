import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
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
  ChatDots,
  LockFill,
  X,
} from "react-bootstrap-icons";
import type { RootState } from "../../../store/store";
import salonoxMark from "../../../assets/salonox_mark.jpg";
import { formatDateDDMMYYYY } from "../../../utils/dateFormat";
import SearchOverlay from "./SearchOverlay";
import api from "../../../services/api/axios";
import { NOTIFICATIONS } from "../../../services/api/endpoints";
import { connectSocket, disconnectSocket } from "../../../services/socket/socket";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { closeCashCounterThunk } from "../../../middleware/cashCounter/cashCounter.thunk";
import { Button, Modal } from "../../../components/ui";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Notification {
  id: string;
  type: "appointment" | "payment" | "client" | "review" | "whatsapp" | "info";
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
}

interface Toast extends Notification {
  toastId: string;
  exiting: boolean;
}

// ── Icon / colour maps ─────────────────────────────────────────────────────────

const NOTIF_ICONS: Record<string, React.ReactNode> = {
  appointment: <CalendarCheck size={16} />,
  payment:     <CurrencyRupee size={16} />,
  client:      <PersonPlus   size={16} />,
  review:      <StarFill     size={14} />,
  whatsapp:    <ChatDots     size={16} />,
  info:        <Bell         size={15} />,
};

const NOTIF_COLORS: Record<string, string> = {
  appointment: "#3b82f6",
  payment:     "#10b981",
  client:      "#8b5cf6",
  review:      "#f59e0b",
  whatsapp:    "#25d366",
  info:        "#6b7280",
};

const TOAST_DURATION = 5000; // ms before auto-dismiss

// ── Time helper ────────────────────────────────────────────────────────────────

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} day ago`;
}

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
  const navigate    = useNavigate();
  const userProfile = useSelector((s: RootState) => s.user.profile);
  const salonId     = useSelector((s: RootState) => s.auth.salonId);

  const [showSearch,  setShowSearch]  = useState(false);
  const [showNotif,   setShowNotif]   = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notifs,      setNotifs]      = useState<Notification[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [toasts,      setToasts]      = useState<Toast[]>([]);

  // ── Cash counter: "Close Counter" navbar shortcut ────────────────────────────
  const dispatch = useAppDispatch();
  const cashDashboard = useAppSelector((s) => s.cashCounter.dashboard);
  const isCashCounterOpen = cashDashboard?.status === "open" && Boolean(cashDashboard.cashManagementId);
  const [showCloseCounterConfirm, setShowCloseCounterConfirm] = useState(false);
  const [closingCounter, setClosingCounter] = useState(false);

  const notifRef   = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  // tracks setTimeout IDs so we can clear them
  const toastTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const unreadCount = notifs.filter(n => !n.is_read).length;
  const initials    = getInitials(userProfile?.fullName);
  const displayName = userProfile?.fullName ?? "Salon Owner";
  const email       = userProfile?.email    ?? "";

  // Live clock — ticks every minute so the topbar always shows the actual
  // current time, not just the time the component happened to mount.
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const todayLabel = formatDateDDMMYYYY(now);
  const timeLabel = now.toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });

  // ── Toast helpers ─────────────────────────────────────────────────────────────

  const dismissToast = useCallback((toastId: string) => {
    // Start exit animation
    setToasts(prev => prev.map(t => t.toastId === toastId ? { ...t, exiting: true } : t));
    // Remove after animation completes
    const removeTimer = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.toastId !== toastId));
    }, 280);
    toastTimers.current.set(`remove_${toastId}`, removeTimer);
  }, []);

  const showToast = useCallback((notification: Notification) => {
    const toastId = `${notification.id}_${Date.now()}`;
    const toast: Toast = { ...notification, toastId, exiting: false };

    setToasts(prev => [toast, ...prev].slice(0, 4)); // max 4 toasts at once

    // Auto-dismiss after TOAST_DURATION
    const timer = setTimeout(() => dismissToast(toastId), TOAST_DURATION);
    toastTimers.current.set(toastId, timer);
  }, [dismissToast]);

  // Clear all toast timers on unmount
  useEffect(() => {
    return () => {
      toastTimers.current.forEach(id => clearTimeout(id));
    };
  }, []);

  // ── Initial load of existing notifications ───────────────────────────────────

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(NOTIFICATIONS.LIST);
      setNotifs(res.data?.data ?? []);
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // ── WebSocket: real-time notifications ───────────────────────────────────────

  useEffect(() => {
    if (!salonId) return;

    const socket = connectSocket(salonId);

    const handleNotification = (notification: Notification) => {
      // Add to bell list (deduplicated)
      setNotifs(prev => {
        if (prev.some(n => n.id === notification.id)) return prev;
        return [notification, ...prev];
      });
      // Show toast popup
      showToast(notification);
    };

    socket.on("notification", handleNotification);

    return () => {
      socket.off("notification", handleNotification);
    };
  }, [salonId, showToast]);

  // Disconnect on unmount
  useEffect(() => {
    return () => { disconnectSocket(); };
  }, []);

  // ── Close dropdowns on outside click ────────────────────────────────────────

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current   && !notifRef.current.contains(e.target as Node))   setShowNotif(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── Ctrl+K → search ──────────────────────────────────────────────────────────

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

  const handleMarkAllRead = useCallback(async () => {
    try {
      await api.patch(NOTIFICATIONS.MARK_ALL);
      setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch { /* ignore */ }
  }, []);

  const handleMarkRead = useCallback(async (id: string) => {
    try {
      await api.patch(NOTIFICATIONS.MARK_ONE(id));
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch { /* ignore */ }
  }, []);

  const handleLogoutClick = useCallback(() => {
    setShowProfile(false);
    disconnectSocket();
    onLogout();
  }, [onLogout]);

  const showCashCounterToast = useCallback((title: string, body: string) => {
    showToast({
      id: `cash-counter_${Date.now()}`,
      type: "info",
      title,
      body,
      is_read: true,
      created_at: new Date().toISOString(),
    });
  }, [showToast]);

  const handleConfirmCloseCounter = useCallback(async () => {
    if (!cashDashboard?.cashManagementId) {
      setShowCloseCounterConfirm(false);
      return;
    }

    setClosingCounter(true);
    try {
      await dispatch(
        closeCashCounterThunk({
          cash_management_id: cashDashboard.cashManagementId,
          in_store_cash: Number(cashDashboard.inStoreCash || cashDashboard.closingBalance || 0),
          remarks: cashDashboard.remarks ?? "",
        }),
      ).unwrap();
      setShowCloseCounterConfirm(false);
      showCashCounterToast("Counter closed", "The cash counter was closed successfully.");
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? err?.response?.data?.error ?? err?.message ?? "Failed to close counter.";
      showCashCounterToast("Close counter failed", message);
    } finally {
      setClosingCounter(false);
    }
  }, [cashDashboard, dispatch, showCashCounterToast]);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── TOAST CONTAINER ── */}
      <div className="notif-toast-container" aria-live="polite" aria-atomic="false">
        {toasts.map(toast => {
          const color = NOTIF_COLORS[toast.type] ?? NOTIF_COLORS.info;
          const icon  = NOTIF_ICONS[toast.type]  ?? NOTIF_ICONS.info;
          return (
            <div
              key={toast.toastId}
              className={`notif-toast${toast.exiting ? " notif-toast--exit" : ""}`}
              style={{ "--toast-color": color, "--toast-bg": color + "18", position: "relative" } as React.CSSProperties}
              onClick={() => {
                handleMarkRead(toast.id);
                dismissToast(toast.toastId);
                setShowNotif(true);
              }}
            >
              <span className="notif-toast-icon">{icon}</span>
              <div className="notif-toast-body">
                <p className="notif-toast-title">{toast.title}</p>
                {toast.body && <p className="notif-toast-text">{toast.body}</p>}
                <span className="notif-toast-time">just now</span>
              </div>
              <button
                className="notif-toast-close"
                onClick={e => { e.stopPropagation(); dismissToast(toast.toastId); }}
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
              <div className="notif-toast-progress" />
            </div>
          );
        })}
      </div>

      {/* ── TOPBAR ── */}
      <div className="topbar">
        <div className="topbar-left">
          <h2 className="brand">
            <img src={salonoxMark} alt="" className="brand-icon" width="26" height="26" />
            <span className="brand-wordmark">
              Salon<span className="brand-wordmark-accent">OX</span>
            </span>
          </h2>
        </div>

        <div className="topbar-right">

          {/* Current date & time */}
          <span className="topbar-date" title="Today's date">{todayLabel}</span>
          <span className="topbar-time" title="Current time">{timeLabel}</span>

          {/* Notifications bell */}
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
                  {loading && notifs.length === 0 ? (
                    <div className="topbar-notif-empty">Loading…</div>
                  ) : notifs.length === 0 ? (
                    <div className="topbar-notif-empty">No notifications</div>
                  ) : (
                    notifs.map(n => {
                      const color = NOTIF_COLORS[n.type] ?? NOTIF_COLORS.info;
                      const icon  = NOTIF_ICONS[n.type]  ?? NOTIF_ICONS.info;
                      return (
                        <div
                          key={n.id}
                          className={`topbar-notif-item ${n.is_read ? "" : "topbar-notif-item--unread"}`}
                          onClick={() => !n.is_read && handleMarkRead(n.id)}
                          role="menuitem"
                        >
                          <span className="topbar-notif-icon" style={{ background: color + "18", color }}>
                            {icon}
                          </span>
                          <div className="topbar-notif-content">
                            <p className="topbar-notif-item-title">{n.title}</p>
                            {n.body && <p className="topbar-notif-item-body">{n.body}</p>}
                            <span className="topbar-notif-time">{timeAgo(n.created_at)}</span>
                          </div>
                          {!n.is_read && <span className="topbar-notif-dot" />}
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="topbar-notif-footer">
                  <button
                    className="topbar-notif-view-all"
                    onClick={() => { setShowNotif(false); navigate("/dashboard/notifications"); }}
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

                <button className="topbar-profile-item" onClick={() => { setShowProfile(false); navigate("/dashboard/profile"); }}>
                  <PersonCircle size={15} /> My Profile
                </button>
                <button className="topbar-profile-item" onClick={() => { setShowProfile(false); navigate("/dashboard/settings"); }}>
                  <Gear size={15} /> Settings
                </button>

                <div className="topbar-profile-divider" />

                {isCashCounterOpen && (
                  <button
                    className="topbar-profile-item"
                    onClick={() => { setShowProfile(false); setShowCloseCounterConfirm(true); }}
                  >
                    <LockFill size={15} /> Close Counter
                  </button>
                )}

                <button className="topbar-profile-item topbar-profile-item--danger" onClick={handleLogoutClick}>
                  <BoxArrowRight size={15} /> Logout
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {showSearch && <SearchOverlay onClose={() => setShowSearch(false)} />}

      <Modal
        show={showCloseCounterConfirm}
        onClose={() => { if (!closingCounter) setShowCloseCounterConfirm(false); }}
        title="Close Cash Counter"
        size="md"
        footer={
          <div className="topbar-confirm-footer">
            <Button
              variant="ghost"
              onClick={() => setShowCloseCounterConfirm(false)}
              disabled={closingCounter}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={closingCounter}
              disabled={closingCounter}
              onClick={() => void handleConfirmCloseCounter()}
            >
              Yes, Close Counter
            </Button>
          </div>
        }
      >
        <p className="topbar-confirm-copy">
          Are you sure you want to close today's cash counter? You cannot reopen it again today.
        </p>
      </Modal>
    </>
  );
}
