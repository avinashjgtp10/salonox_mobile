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
  Wallet2,
  CashStack,
  JournalText,
  Safe2,
  CheckCircleFill,
  XCircleFill,
  ExclamationTriangleFill,
  BoxSeam,
  CalendarX,
  Stars,
} from "react-bootstrap-icons";
import type { RootState } from "../../../store/store";
import salonoxLogo from "../../../assets/salonox_full_logo.png";
import { formatDateDDMMYYYY, formatTimeAgo } from "../../../utils/dateFormat";
import SearchOverlay from "./SearchOverlay";
import api from "../../../services/api/axios";
import { NOTIFICATIONS } from "../../../services/api/endpoints";
import { connectSocket, disconnectSocket } from "../../../services/socket/socket";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { closeCashCounterThunk } from "../../../middleware/cashCounter/cashCounter.thunk";
import { sendDailySummaryEmail, fetchTodaysPaymentMethodCounts } from "../../cash-management/cashManagement.api";
import { useCurrency } from "../../../hooks/useCurrency";
import { Button, Modal } from "../../../components/ui";
import { onGlobalToast } from "../../../utils/globalToast";
import { selectNewFeatures, selectSpotlightFetched } from "../../../store/spotlightSlice";
import { fetchSpotlightFeaturesThunk } from "../../../middleware/spotlight/spotlight.thunk";

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
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function DashboardTopbar({ onLogout }: Props) {
  const navigate = useNavigate();
  const userProfile = useSelector((s: RootState) => s.user.profile);
  const salonId = useSelector((s: RootState) => s.auth.salonId);
  const { formatAmount } = useCurrency();

  const [showSearch, setShowSearch] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // ── Cash counter: "Close Counter" navbar shortcut ────────────────────────────
  const dispatch = useAppDispatch();
  const cashDashboard = useAppSelector((s) => s.cashCounter.dashboard);
  const newSpotlightFeatures = useAppSelector(selectNewFeatures);
  const spotlightFetched = useAppSelector(selectSpotlightFetched);
  const isCashCounterOpen = cashDashboard?.status === "open" && Boolean(cashDashboard.cashManagementId);
  const [showCloseCounterConfirm, setShowCloseCounterConfirm] = useState(false);
  const [closingCounter, setClosingCounter] = useState(false);
  const [paymentMethodCounts, setPaymentMethodCounts] = useState({
    upi: 0,
    card: 0,
    cash: 0,
    amounts: { upi: 0, card: 0, cash: 0 },
  });

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  // tracks setTimeout IDs so we can clear them
  const toastTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const unreadCount = notifs.filter(n => !n.is_read).length;
  const initials = getInitials(userProfile?.fullName);
  const displayName = userProfile?.fullName ?? "Salon Owner";
  const email = userProfile?.email ?? "";

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
    fetchNotifications();
  }, [fetchNotifications]);

  // Powers the topbar's Spotlight icon — fetched once here (topbar is
  // mounted on every dashboard page, unlike DashboardPage) so the "new
  // feature available" indicator shows up regardless of which page the
  // user lands on, not just the dashboard home.
  useEffect(() => {
    if (!spotlightFetched) dispatch(fetchSpotlightFeaturesThunk());
  }, [dispatch, spotlightFetched]);

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

  useEffect(() => {
    if (!showCloseCounterConfirm) return;
    let cancelled = false;
    fetchTodaysPaymentMethodCounts().then((counts) => {
      if (!cancelled) setPaymentMethodCounts(counts);
    });
    return () => {
      cancelled = true;
    };
  }, [showCloseCounterConfirm]);

  const handleConfirmCloseCounter = useCallback(async () => {
    if (!cashDashboard?.cashManagementId) {
      setShowCloseCounterConfirm(false);
      return;
    }

    setClosingCounter(true);
    try {
      const closedDashboard = await dispatch(
        closeCashCounterThunk({
          cash_management_id: cashDashboard.cashManagementId,
          in_store_cash: Number(cashDashboard.inStoreCash || cashDashboard.closingBalance || 0),
          remarks: cashDashboard.remarks ?? "",
        }),
      ).unwrap();
      setShowCloseCounterConfirm(false);
      showCashCounterToast("Counter closed", "The cash counter was closed successfully.");

      // Email the daily summary straight away, same as the stale-counter flow —
      // the salon owner shouldn't have to go into Cash Management to trigger it.
      // Sent silently: no notification either way, since the user only asked
      // to be told the counter closed, not about the email's delivery status.
      try {
        await sendDailySummaryEmail(
          cashDashboard.cashManagementId,
          { ...(closedDashboard ?? cashDashboard), paymentCounts: paymentMethodCounts },
          email,
        );
      } catch (emailErr: any) {
        console.error("[DashboardTopbar] Daily summary email failed:", emailErr);
      }
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? err?.response?.data?.error ?? err?.message ?? "Failed to close counter.";
      showCashCounterToast("Close counter failed", message);
    } finally {
      setClosingCounter(false);
    }
  }, [cashDashboard, dispatch, email, showCashCounterToast, paymentMethodCounts]);

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
          <h2 className="brand">
            <img src={salonoxLogo} alt="SalonOX" className="brand-logo" width="122" height="61" />
          </h2>
        </div>

        <div className="topbar-right">

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
        <div className="d-flex flex-column gap-3">
          <p className="topbar-confirm-copy mb-0">
            Are you sure you want to close today's cash counter? You cannot reopen it again today. A copy of the
            daily summary below will be emailed to {email || "the salon owner"} automatically.
          </p>

          {cashDashboard ? (
            <div className="p-3 bg-light rounded-3 border">
              <div className="row g-2">
                <div className="col-6">
                  <div className="p-2 bg-white rounded border">
                    <div className="text-muted small d-flex align-items-center gap-1">
                      <Wallet2 size={13} className="text-primary" /> Opening Balance
                    </div>
                    <div className="fw-bold text-dark fs-6 mt-1">
                      {formatAmount(cashDashboard.openingBalance ?? 0)}
                    </div>
                  </div>
                </div>

                <div className="col-6">
                  <div className="p-2 bg-white rounded border">
                    <div className="text-muted small d-flex align-items-center gap-1">
                      <CashStack size={13} className="text-success" /> Cash Revenue
                    </div>
                    <div className="fw-bold text-success fs-6 mt-1">
                      {formatAmount(paymentMethodCounts.amounts.cash)}
                    </div>
                  </div>
                </div>

                <div className="col-6">
                  <div className="p-2 bg-white rounded border">
                    <div className="text-muted small d-flex align-items-center gap-1">
                      <JournalText size={13} className="text-warning" /> Cash Expense
                    </div>
                    <div className="fw-bold text-warning fs-6 mt-1">
                      {formatAmount(cashDashboard.cashExpense ?? 0)}
                    </div>
                  </div>
                </div>

                <div className="col-6">
                  <div className="p-2 bg-white rounded border">
                    <div className="text-muted small d-flex align-items-center gap-1">
                      <Safe2 size={13} className="text-dark" /> Expected Closing
                    </div>
                    <div className="fw-bold text-dark fs-6 mt-1">
                      {formatAmount(
                        (cashDashboard.openingBalance ?? 0) +
                          paymentMethodCounts.amounts.cash -
                          (cashDashboard.cashExpense ?? 0)
                      )}
                    </div>
                  </div>
                </div>

                <div className="col-6">
                  <div className="p-2 bg-white rounded border">
                    <div className="text-muted small d-flex align-items-center gap-1">
                      <CurrencyRupee size={13} className="text-primary" /> UPI Payments
                    </div>
                    <div className="fw-bold text-dark fs-6 mt-1">
                      {formatAmount(paymentMethodCounts.amounts.upi)}
                    </div>
                  </div>
                </div>

                <div className="col-6">
                  <div className="p-2 bg-white rounded border">
                    <div className="text-muted small d-flex align-items-center gap-1">
                      <Wallet2 size={13} className="text-primary" /> Card Payments
                    </div>
                    <div className="fw-bold text-dark fs-6 mt-1">
                      {formatAmount(paymentMethodCounts.amounts.card)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
