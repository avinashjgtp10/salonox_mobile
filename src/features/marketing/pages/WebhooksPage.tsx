import { useEffect, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchWebhookEventsThunk } from "../../../middleware/marketing/marketing.thunk";
import type { WebhookStatus } from "../../../types/marketing.types";
import "../styles/WebhooksPage.scss";

const STATUS_COLOR: Record<WebhookStatus, string> = {
  SENT:      "#3b82f6",
  DELIVERED: "#10b981",
  READ:      "#8b5cf6",
  FAILED:    "#ef4444",
  BLOCKED:   "#f59e0b",
};

function formatTime(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function WebhooksPage() {
  const dispatch = useAppDispatch();
  const { webhookEvents: events, loading } = useAppSelector((s) => s.marketing);
  const isLoading = loading.fetchWebhookEvents;

  const refetch = useCallback(() => {
    dispatch(fetchWebhookEventsThunk());
  }, [dispatch]);

  useEffect(() => {
    refetch();
    const interval = setInterval(refetch, 5000);
    return () => clearInterval(interval);
  }, [refetch]);

  const stats = {
    total:     events.length,
    sent:      events.filter((e) => e.status === "SENT").length,
    delivered: events.filter((e) => e.status === "DELIVERED").length,
    read:      events.filter((e) => e.status === "READ").length,
    failed:    events.filter((e) => e.status === "FAILED").length,
    blocked:   events.filter((e) => e.status === "BLOCKED").length,
  };

  return (
    <div className="wh-page">
      {/* Header */}
      <div className="wh-header">
        <div>
          <h1 className="wh-title">Webhook Logs</h1>
          <p className="wh-sub">
            Real-time delivery events from WhatsApp · Auto-refreshes every 5s
          </p>
        </div>
        <button className="wh-refresh-btn" onClick={refetch}>
          🔄 Refresh
        </button>
      </div>

      <div className="wh-layout">
        {/* ── Left Panel ── */}
        <div className="wh-left">
          {/* Endpoint */}
          <div className="wh-card">
            <div className="wh-card-title">
              <span className="wh-live-dot" /> ENDPOINT ACTIVE
            </div>
            <div className="wh-endpoint">POST /api/v1/webhooks/whatsapp</div>
          </div>

          {/* Stats */}
          <div className="wh-card">
            <div className="wh-card-title">📊 Event Stats</div>
            {[
              { label: "Total",     value: stats.total,     color: "#111827" },
              { label: "Sent",      value: stats.sent,      color: STATUS_COLOR.SENT },
              { label: "Delivered", value: stats.delivered, color: STATUS_COLOR.DELIVERED },
              { label: "Read",      value: stats.read,      color: STATUS_COLOR.READ },
              { label: "Failed",    value: stats.failed,    color: STATUS_COLOR.FAILED },
              { label: "Blocked",   value: stats.blocked,   color: STATUS_COLOR.BLOCKED },
            ].map((s) => (
              <div key={s.label} className="wh-stat-row">
                <span className="wh-stat-label">{s.label}</span>
                <span className="wh-stat-value" style={{ color: s.color }}>
                  {s.value}
                </span>
              </div>
            ))}
          </div>

          {/* Pipeline */}
          <div className="wh-card">
            <div className="wh-card-title">⚙️ How It Works</div>
            {[
              "Meta POSTs status payload",
              "Backend verifies request",
              "HTTP 200 returned instantly",
              "DB updated with new status",
              "Campaign counts refreshed",
              "Events appear here live",
            ].map((step, i) => (
              <div key={i} className="wh-pipeline-step">
                <span className="wh-pipeline-num">{i + 1}</span>
                <span className="wh-pipeline-text">{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Events Table ── */}
        <div className="wh-right">
          <div className="wh-events-header">
            <span className="wh-card-title">📡 Incoming Events</span>
            {events.length > 0 && (
              <span className="wh-count">{events.length} events</span>
            )}
          </div>

          {isLoading && events.length === 0 ? (
            <div className="wh-empty">Loading events...</div>
          ) : events.length === 0 ? (
            <div className="wh-empty">
              <div className="wh-empty-icon">📡</div>
              <div className="wh-empty-title">No events yet</div>
              <div className="wh-empty-sub">
                Send a campaign to see real delivery events here
              </div>
            </div>
          ) : (
            <div className="wh-table-wrap">
              <table className="wh-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Sent At</th>
                    <th>Delivered</th>
                    <th>Read At</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev, i) => (
                    <tr key={ev.id} className={i === 0 ? "latest" : ""}>
                      <td className="wh-time">{formatTime(ev.updatedAt)}</td>
                      <td className="wh-phone">{ev.phone}</td>
                      <td>
                        <span
                          className="wh-status-pill"
                          style={{
                            background:
                              (STATUS_COLOR[ev.status] ?? "#6b7280") + "20",
                            color: STATUS_COLOR[ev.status] ?? "#6b7280",
                          }}
                        >
                          {ev.status}
                        </span>
                      </td>
                      <td className="wh-date">{formatTime(ev.sentAt)}</td>
                      <td className="wh-date">{formatTime(ev.deliveredAt)}</td>
                      <td className="wh-date">{formatTime(ev.readAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
