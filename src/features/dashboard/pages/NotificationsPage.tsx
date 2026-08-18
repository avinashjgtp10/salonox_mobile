import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CalendarCheck,
  CurrencyRupee,
  PersonPlus,
  StarFill,
  ChatDots,
  CheckAll,
  ArrowLeft,
  Clock,
  ArrowClockwise,
  ExclamationTriangle,
} from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { NOTIFICATIONS } from "../../../services/api/endpoints";
import { formatDateDDMMYYYY } from "../../../utils/dateFormat";
import "../styles/NotificationsPage.scss";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Notification {
  id: string;
  type: "appointment" | "payment" | "client" | "review" | "whatsapp" | "info";
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
}

// ── Maps ───────────────────────────────────────────────────────────────────────

const NOTIF_ICONS: Record<string, React.ReactNode> = {
  appointment: <CalendarCheck size={18} />,
  payment:     <CurrencyRupee size={18} />,
  client:      <PersonPlus   size={18} />,
  review:      <StarFill     size={16} />,
  whatsapp:    <ChatDots     size={18} />,
  info:        <Bell         size={17} />,
};

const NOTIF_COLORS: Record<string, string> = {
  appointment: "#3b82f6",
  payment:     "#10b981",
  client:      "#8b5cf6",
  review:      "#f59e0b",
  whatsapp:    "#25d366",
  info:        "#6b7280",
};

const NOTIF_LABELS: Record<string, string> = {
  appointment: "Appointment",
  payment:     "Payment",
  client:      "Client",
  review:      "Review",
  whatsapp:    "WhatsApp",
  info:        "Info",
};

// ── Trigger descriptions (for the "How it works" info box) ────────────────────
const HOW_IT_WORKS = [
  { icon: <CalendarCheck size={14} />, color: "#3b82f6", text: "New appointment is booked" },
  { icon: <CurrencyRupee size={14} />, color: "#10b981", text: "Sale or payment is created" },
  { icon: <PersonPlus   size={14} />, color: "#8b5cf6", text: "New client is added" },
  { icon: <ChatDots     size={14} />, color: "#25d366", text: "WhatsApp message received" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days} day${days > 1 ? "s" : ""} ago`;
  return formatDateDDMMYYYY(isoDate);
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const navigate = useNavigate();

  const [notifs,   setNotifs]   = useState<Notification[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [filter,   setFilter]   = useState<"all" | "unread">("all");
  const [showInfo, setShowInfo] = useState(false);

  const unreadCount = notifs.filter(n => !n.is_read).length;

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(NOTIFICATIONS.LIST);
      setNotifs(res.data?.data ?? []);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const handleMarkRead = useCallback(async (id: string) => {
    try {
      await api.patch(NOTIFICATIONS.MARK_ONE(id));
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch { /* ignore */ }
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await api.patch(NOTIFICATIONS.MARK_ALL);
      setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch { /* ignore */ }
  }, []);

  const displayed = filter === "unread" ? notifs.filter(n => !n.is_read) : notifs;

  // Group by date label
  const grouped = displayed.reduce<Record<string, Notification[]>>((acc, n) => {
    const date      = new Date(n.created_at);
    const today     = new Date();
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);

    let label: string;
    if (date.toDateString() === today.toDateString())          label = "Today";
    else if (date.toDateString() === yesterday.toDateString()) label = "Yesterday";
    else label = formatDateDDMMYYYY(date);

    (acc[label] ??= []).push(n);
    return acc;
  }, {});

  return (
    <div className="notif-page">

      {/* ── Header ── */}
      <div className="notif-page-header">
        <button className="notif-page-back" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft size={18} />
        </button>
        <div className="notif-page-heading">
          <h1>Notifications</h1>
          {unreadCount > 0 && (
            <span className="notif-page-badge">{unreadCount} unread</span>
          )}
        </div>
        <div className="notif-page-actions">
          <button
            className="notif-page-icon-btn"
            onClick={fetchNotifications}
            title="Refresh"
            disabled={loading}
          >
            <ArrowClockwise size={16} className={loading ? "notif-page-spin" : ""} />
          </button>
          {unreadCount > 0 && (
            <button className="notif-page-mark-all" onClick={handleMarkAllRead}>
              <CheckAll size={16} /> Mark all as read
            </button>
          )}
        </div>
      </div>

      {/* ── How it works info banner ── */}
      <div className="notif-page-info-banner">
        <button
          className="notif-page-info-toggle"
          onClick={() => setShowInfo(v => !v)}
        >
          <Bell size={14} />
          How do notifications appear here?
          <span className="notif-page-info-chevron">{showInfo ? "▲" : "▼"}</span>
        </button>
        {showInfo && (
          <div className="notif-page-info-body">
            <p>You receive a notification automatically whenever:</p>
            <ul>
              {HOW_IT_WORKS.map((item, i) => (
                <li key={i}>
                  <span className="notif-page-info-icon" style={{ color: item.color, background: item.color + "18" }}>
                    {item.icon}
                  </span>
                  {item.text}
                </li>
              ))}
            </ul>
            <p className="notif-page-info-note">
              Notifications also appear as a popup toast at the top-right of your screen in real time — even when you're on another page.
            </p>
          </div>
        )}
      </div>

      {/* ── Filter tabs ── */}
      <div className="notif-page-tabs">
        <button
          className={`notif-page-tab ${filter === "all" ? "notif-page-tab--active" : ""}`}
          onClick={() => setFilter("all")}
        >
          All
          <span className="notif-page-tab-count">{notifs.length}</span>
        </button>
        <button
          className={`notif-page-tab ${filter === "unread" ? "notif-page-tab--active" : ""}`}
          onClick={() => setFilter("unread")}
        >
          Unread
          {unreadCount > 0 && (
            <span className="notif-page-tab-count notif-page-tab-count--unread">{unreadCount}</span>
          )}
        </button>
      </div>

      {/* ── Content ── */}
      <div className="notif-page-body">

        {/* Error state */}
        {error && !loading && (
          <div className="notif-page-error">
            <ExclamationTriangle size={28} />
            <p>{error}</p>
            <button onClick={fetchNotifications}>
              <ArrowClockwise size={14} /> Try again
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="notif-page-empty">
            <div className="notif-page-spinner" />
            <p>Loading notifications…</p>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && displayed.length === 0 && (
          <div className="notif-page-empty">
            <Bell size={44} className="notif-page-empty-icon" />
            <p>{filter === "unread" ? "No unread notifications" : "No notifications yet"}</p>
            <span>
              {filter === "unread"
                ? "All caught up! Switch to \"All\" to see past notifications."
                : "Book an appointment, add a client, or make a sale — it will appear here instantly."}
            </span>
          </div>
        )}

        {/* List */}
        {!loading && !error && displayed.length > 0 &&
          Object.entries(grouped).map(([dateLabel, items]) => (
            <div key={dateLabel} className="notif-page-group">
              <div className="notif-page-group-label">
                <Clock size={12} /> {dateLabel}
              </div>
              <div className="notif-page-list">
                {items.map(n => {
                  const color = NOTIF_COLORS[n.type] ?? NOTIF_COLORS.info;
                  const icon  = NOTIF_ICONS[n.type]  ?? NOTIF_ICONS.info;
                  return (
                    <div
                      key={n.id}
                      className={`notif-page-item ${n.is_read ? "" : "notif-page-item--unread"}`}
                      onClick={() => !n.is_read && handleMarkRead(n.id)}
                    >
                      <span className="notif-page-item-icon" style={{ background: color + "15", color }}>
                        {icon}
                      </span>
                      <div className="notif-page-item-content">
                        <div className="notif-page-item-top">
                          <span className="notif-page-item-tag" style={{ background: color + "15", color }}>
                            {NOTIF_LABELS[n.type] ?? n.type}
                          </span>
                          <span className="notif-page-item-time">{timeAgo(n.created_at)}</span>
                        </div>
                        <p className="notif-page-item-title">{n.title}</p>
                        {n.body && <p className="notif-page-item-body">{n.body}</p>}
                      </div>
                      {!n.is_read && <span className="notif-page-item-dot" />}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}
