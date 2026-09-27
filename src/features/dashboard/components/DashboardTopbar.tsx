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
  CheckCircleFill,
  XCircleFill,
  ExclamationTriangleFill,
  BoxSeam,
  CalendarX,
  Stars,
  ListUl,
} from "react-bootstrap-icons";
import type { RootState } from "../../../store/store";
import salonoxLogo from "../../../assets/salonox_full_logo.png";
import { formatDateDDMMYYYY, formatTimeAgo } from "../../../utils/dateFormat";
import SearchOverlay from "./SearchOverlay";
import api from "../../../services/api/axios";
import { NOTIFICATIONS } from "../../../services/api/endpoints";
import { connectSocket, disconnectSocket } from "../../../services/socket/socket";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { usePermissions } from "../../../hooks/usePermissions";
import { showPermissionDenied } from "../../../store/permissionDialogSlice";
import { closeCashCounterThunk } from "../../../middleware/cashCounter/cashCounter.thunk";
import { sendDailySummaryEmail } from "../../cash-management/cashManagement.api";
import { CloseCounterModal } from "../../cash-management/pages/CashManagementModals";
import type { CloseCounterPayload } from "../../cash-management/cashManagement.types";
import { onGlobalToast } from "../../../utils/globalToast";
import { selectNewFeatures } from "../../../store/spotlightSlice";
import PlanExpiryBanner from "./PlanExpiryBanner";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Notification {
  id: string;
  type: "appointment" | "payment" | "client" | "review" | "whatsapp" | "info" | "success" | "error" | "warning" | "spotlight";
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
  product_id?: string | null;
  branch_id?: string | null;
  alert_status?: "low_stock" | "out_of_stock" | "expiring_soon" | "expired" | null;
  spotlight_feature_id?: string | null;
}

interface Toast extends Notification {
  toastId: string;
  exiting: boolean;
}

// ── Icon / colour maps ─────────────────────────────────────────────────────────

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
  spotlight: <Stars size={14} />,
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
  spotlight: "#8b5cf6",
};

// Inventory alerts all arrive with type "warning" — alert_status picks a
// more specific icon/color than the generic warning triangle so low stock,
// out of stock, and expiry read as visually distinct at a glance.
const ALERT_ICONS: Record<string, React.ReactNode> = {
  low_stock: <BoxSeam size={15} />,
  out_of_stock: <BoxSeam size={15} />,
  expiring_soon: <CalendarX size={14} />,
  expired: <CalendarX size={14} />,
};

const ALERT_COLORS: Record<string, string> = {
  low_stock: "#f59e0b",
  out_of_stock: "#ef4444",
  expiring_soon: "#f59e0b",
  expired: "#ef4444",
};

const notifIcon = (n: Notification) => (n.alert_status ? ALERT_ICONS[n.alert_status] : undefined) ?? NOTIF_ICONS[n.type] ?? NOTIF_ICONS.info;
const notifColor = (n: Notification) => (n.alert_status ? ALERT_COLORS[n.alert_status] : undefined) ?? NOTIF_COLORS[n.type] ?? NOTIF_COLORS.info;

const TOAST_DURATION = 5000; // ms before auto-dismiss

const getInitials = (name?: string) => {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  onLogout: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function DashboardTopbar({ onLogout, collapsed, onToggleCollapsed }: Props) {
  const navigate = useNavigate();
  const userProfile = useSelector((s: RootState) => s.user.profile);
  const currentSalon = useSelector((s: RootState) => s.salon.currentSalon);
  const salonId = useSelector((s: RootState) => s.auth.salonId);
  const [showSearch, setShowSearch] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // ── Cash counter: "Close Counter" navbar shortcut ────────────────────────────
  const dispatch = useAppDispatch();
  const { can } = usePermissions();
  const canViewNotifications = can("view_notifications");
  const denyNotifPerm = () => dispatch(showPermissionDenied(
    `Your account does not have the "view_notifications" permission. Ask your salon owner to enable it in Settings → Roles & Permissions.`
  ));
  const cashDashboard = useAppSelector((s) => s.cashCounter.dashboard);
  const newSpotlightFeatures = useAppSelector(selectNewFeatures);
  const isCashCounterOpen = cashDashboard?.status === "open" && Boolean(cashDashboard.cashManagementId);
  const [showCloseCounterConfirm, setShowCloseCounterConfirm] = useState(false);
  const [closingCounter, setClosingCounter] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  // tracks setTimeout IDs so we can clear them
  const toastTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const unreadCount = notifs.filter(n => !n.is_read).length;
  // The navbar profile shows the salon/business identity, not the logged-in
  // user's own name — "App" (personal) vs "App Testing" (business). Email
  // stays the personal account's own login email; only name + avatar swap.
  const displayName = currentSalon?.business_name || userProfile?.fullName || "Salon Owner";
  const initials = getInitials(displayName);
  const email = userProfile?.email ?? "";
  const businessLogoUrl = currentSalon?.logo_url || null;
  // Reset whenever the logo URL itself changes (new upload, salon switch) so
  // a stale "this one failed" doesn't stick around and hide a working image.
  const [businessLogoFailed, setBusinessLogoFailed] = useState(false);
  useEffect(() => { setBusinessLogoFailed(false); }, [businessLogoUrl]);
  const showBusinessLogo = !!businessLogoUrl && !businessLogoFailed;

  // Live clock — ticks every minute so the topbar always shows the actual
  // current time, not just the time the component happened to mount.
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  // Slash-separated, distinct from the app-wide dash-separated formatDateDDMMYYYY
  // — this chip pairs the date with a time, so the dash would be ambiguous with
  // the " / " joiner between them.
  const todayLabel = formatDateDDMMYYYY(now).replace(/-/g, "/");
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
    // Disabled actions must not trigger the related API — skip the fetch
    // entirely (not just hide the result) when view_notifications is off.
    if (canViewNotifications) fetchNotifications();
  }, [fetchNotifications, canViewNotifications]);

  // Spotlight data itself is NOT fetched here — DashboardLayout (the only
  // place that ever renders this topbar) already dispatches
  // fetchSpotlightFeaturesThunk unconditionally on its own mount, and since
  // both mount in the same render pass, a second dispatch here always raced
  // that one and duplicated the GET. Reading `spotlightFetched`/the derived
  // selectors below is enough for the topbar's "new feature" indicator.

  // ── WebSocket: real-time notifications ───────────────────────────────────────

  useEffect(() => {
    if (!salonId) return;

    const socket = connectSocket(salonId);

    const handleNotification = (notification: Notification) => {
      // view_notifications off must disable the feature entirely, not just
      // the bell click/fetch — real-time pushes were slipping through and
      // still populating the badge count + popping the toast regardless.
      if (!canViewNotifications) return;
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
  }, [salonId, showToast, canViewNotifications]);

  // Disconnect on unmount
  useEffect(() => {
    return () => { disconnectSocket(); };
  }, []);

  // ── Close dropdowns on outside click ────────────────────────────────────────

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
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
      setNotifs([]);
    } catch { /* ignore */ }
  }, []);

  const handleMarkRead = useCallback(async (id: string) => {
    try {
      await api.patch(NOTIFICATIONS.MARK_ONE(id));
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch { /* ignore */ }
  }, []);

  // Clicking a notification in the dropdown list dismisses it from the panel
  // immediately (same as "Mark all read" now clearing the whole list) rather
  // than just flipping is_read and leaving it sitting there looking read —
  // the sync to the server is fire-and-forget so the dismissal isn't blocked
  // on (or undone by) a slow/failed request.
  const handleNotifItemClick = useCallback((n: Notification) => {
    setNotifs(prev => prev.filter(x => x.id !== n.id));
    if (!n.is_read) {
      api.patch(NOTIFICATIONS.MARK_ONE(n.id)).catch(() => { /* best-effort */ });
    }
    if (n.product_id) {
      setShowNotif(false);
      navigate(`/dashboard/inventory/products?highlight=${n.product_id}`);
    } else if (n.spotlight_feature_id) {
      setShowNotif(false);
      navigate(`/dashboard/spotlight/${n.spotlight_feature_id}`);
    }
  }, [navigate]);

  const handleLogoutClick = useCallback(() => {
    setShowProfile(false);
    disconnectSocket();
    onLogout();
  }, [onLogout]);

  // Cash counter close/email outcomes get the same floating toast card as
  // any other live notification (e.g. "New Appointment Booked"), not just a
  // silent add to the bell dropdown — a user-initiated action like Close
  // Counter deserves the same visible confirmation as everything else.
  const showCashCounterToast = useCallback((title: string, body: string) => {
    const notification: Notification = {
      id: `cash-counter_${Date.now()}`,
      type: "info",
      title,
      body,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setNotifs(prev => [notification, ...prev]);
    showToast(notification);
  }, [showToast]);

  // Lets components mounted outside this one (the cash-counter open/close
  // flows in UnclosedCounterGate.tsx, AutoOpenCounterForNewAccount.tsx, and
  // CashManagementPage.tsx) trigger this exact same toast via
  // showGlobalToast(...) instead of each rolling its own notification UI.
  useEffect(() => {
    return onGlobalToast(({ type, title, body }) => {
      showToast({
        id: `global-toast_${Date.now()}`,
        type,
        title,
        body: body ?? null,
        is_read: false,
        created_at: new Date().toISOString(),
      });
    });
  }, [showToast]);

  const handleConfirmCloseCounter = useCallback(async (payload: CloseCounterPayload) => {
    setClosingCounter(true);
    try {
      const closedDashboard = await dispatch(closeCashCounterThunk(payload)).unwrap();
      setShowCloseCounterConfirm(false);
      showCashCounterToast("Counter closed", "The cash counter was closed successfully.");

      // Email the daily summary straight away, same as the stale-counter flow —
      // the salon owner shouldn't have to go into Cash Management to trigger it.
      // Sent silently: no notification either way, since the user only asked
      // to be told the counter closed, not about the email's delivery status.
      try {
        await sendDailySummaryEmail(payload.cash_management_id, closedDashboard ?? cashDashboard, email);
      } catch (emailErr: any) {
        console.error("[DashboardTopbar] Daily summary email failed:", emailErr);
      }
    } finally {
      setClosingCounter(false);
    }
  }, [cashDashboard, dispatch, email, showCashCounterToast]);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── TOAST CONTAINER ── */}
      <div className="notif-toast-container" aria-live="polite" aria-atomic="false">
        {toasts.map(toast => {
          const color = notifColor(toast);
          const icon = notifIcon(toast);
          return (
            <div
              key={toast.toastId}
              className={`notif-toast${toast.exiting ? " notif-toast--exit" : ""}`}
              style={{ "--toast-color": color, "--toast-bg": color + "18", position: "relative" } as React.CSSProperties}
              onClick={() => {
                handleMarkRead(toast.id);
                dismissToast(toast.toastId);
                if (toast.product_id) {
                  navigate(`/dashboard/inventory/products?highlight=${toast.product_id}`);
                } else if (toast.spotlight_feature_id) {
                  navigate(`/dashboard/spotlight/${toast.spotlight_feature_id}`);
                } else {
                  setShowNotif(true);
                }
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
          <button
            type="button"
            className="topbar-icon-btn topbar-collapse-btn"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ListUl size={20} />
          </button>
          <h2 className="brand">
            <img src={salonoxLogo} alt="SalonoX" className="brand-logo" width="122" height="61" />
          </h2>
        </div>

        <div className="topbar-right">

          {/* Plan expiry warning pill — click opens a modal with details */}
          <PlanExpiryBanner />

          {/* Current date & time */}
          <span className="topbar-datetime" title="Today's date and time">
            <span className="topbar-datetime__date">{todayLabel}</span>
            <span className="topbar-datetime__time">{timeLabel}</span>
          </span>

          {/* New Spotlight feature indicator — only rendered once there's an
              unexplored published feature (selectNewFeatures), same "new"
              definition the bell/dashboard card use. Goes straight to that
              feature's detail page and marks it explored on arrival
              (SpotlightDetailPage's own mount effect, same as clicking
              Explore anywhere else). */}
          {newSpotlightFeatures.length > 0 && (
            <button
              className="topbar-icon-btn topbar-spotlight-btn"
              title={`New feature available: ${newSpotlightFeatures[0].featureName}`}
              onClick={() => navigate(`/dashboard/spotlight/${newSpotlightFeatures[0].id}`)}
              aria-label="New feature available"
            >
              <Stars size={18} />
              <span className="topbar-spotlight-dot" />
            </button>
          )}

          {/* Notifications bell */}
          <div className="topbar-notif-wrap" ref={notifRef}>
            <button
              className={`topbar-icon-btn topbar-notif-btn ${showNotif ? "topbar-icon-btn--active" : ""}`}
              title="Notifications"
              style={canViewNotifications ? undefined : { opacity: 0.5, cursor: "not-allowed" }}
              onClick={() => {
                if (!canViewNotifications) { denyNotifPerm(); return; }
                setShowNotif(v => !v); setShowProfile(false);
              }}
              aria-label="Notifications"
            >
              <Bell size={19} />
              {unreadCount > 0 && (
                <span className="topbar-notif-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
              )}
            </button>

            {showNotif && canViewNotifications && (
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
                      const color = notifColor(n);
                      const icon = notifIcon(n);
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
              {showBusinessLogo ? (
                <img
                  src={businessLogoUrl!}
                  alt={displayName}
                  className="topbar-profile-avatar-img"
                  onError={() => setBusinessLogoFailed(true)}
                />
              ) : (
                <span className="topbar-profile-initials">{initials}</span>
              )}
            </button>

            {showProfile && (
              <div className="topbar-profile-dropdown" role="menu">
                <div className="topbar-profile-info">
                  <div className="topbar-profile-info-av">
                    {showBusinessLogo ? (
                      <img
                        src={businessLogoUrl!}
                        alt={displayName}
                        className="topbar-profile-avatar-img topbar-profile-avatar-img--lg"
                        onError={() => setBusinessLogoFailed(true)}
                      />
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

                <button
                  className="topbar-profile-item"
                  disabled={!isCashCounterOpen}
                  onClick={() => {
                    if (!isCashCounterOpen) return;
                    setShowProfile(false);
                    setShowCloseCounterConfirm(true);
                  }}
                >
                  <LockFill size={15} /> Close Counter
                </button>

                <button className="topbar-profile-item topbar-profile-item--danger" onClick={handleLogoutClick}>
                  <BoxArrowRight size={15} /> Logout
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {showSearch && <SearchOverlay onClose={() => setShowSearch(false)} />}

      {cashDashboard && (
        <CloseCounterModal
          show={showCloseCounterConfirm}
          dashboard={cashDashboard}
          loading={closingCounter}
          onClose={() => setShowCloseCounterConfirm(false)}
          onNotify={(tone, message) =>
            showCashCounterToast(tone === "success" ? "Counter closed" : "Close counter failed", message)
          }
          onSubmit={handleConfirmCloseCounter}
        />
      )}
    </>
  );
}
