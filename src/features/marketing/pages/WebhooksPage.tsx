import { useEffect, useCallback, useState, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchWebhookEventsThunk } from "../../../middleware/marketing/marketing.thunk";
import { Button, Badge } from "../../../components/ui";
import "../styles/WebhooksPage.scss";

const STATUS_COLOR: Record<string, string> = {
  SENT:      "#3b82f6",
  DELIVERED: "#10b981",
  READ:      "#8b5cf6",
  FAILED:    "#ef4444",
  BLOCKED:   "#f59e0b",
};

const STATUS_BADGE_VARIANT: Record<string, "info" | "success" | "secondary" | "danger" | "warning"> = {
  SENT:      "info",
  DELIVERED: "success",
  READ:      "secondary",
  FAILED:    "danger",
  BLOCKED:   "warning",
};

type StatusFilter = "ALL" | "SENT" | "DELIVERED" | "READ" | "FAILED" | "BLOCKED";

const PAGE_SIZE = 10;

function formatTime(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function SkeletonRow() {
  return (
    <tr className="wh-skeleton-row">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i}><span className="wh-skeleton-cell" /></td>
      ))}
    </tr>
  );
}

export default function WebhooksPage() {
  const dispatch  = useAppDispatch();
  const { webhookEvents: events, loading } = useAppSelector((s) => s.marketing);
  const isLoading = loading.fetchWebhookEvents;

  const [page,         setPage]         = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const refetch = useCallback(() => { dispatch(fetchWebhookEventsThunk()); }, [dispatch]);

  useEffect(() => {
    refetch();
    const interval = setInterval(refetch, 5000);
    return () => clearInterval(interval);
  }, [refetch]);

  useEffect(() => { setPage(1); }, [statusFilter]);

  const stats = {
    total:     events.length,
    sent:      events.filter(e => e.status === "SENT").length,
    delivered: events.filter(e => e.status === "DELIVERED").length,
    read:      events.filter(e => e.status === "READ").length,
    failed:    events.filter(e => e.status === "FAILED").length,
    blocked:   events.filter(e => e.status === "BLOCKED").length,
  };

  const filteredEvents = useMemo(() =>
    statusFilter === "ALL" ? events : events.filter(e => e.status === statusFilter),
  [events, statusFilter]);

  const totalPages  = Math.ceil(filteredEvents.length / PAGE_SIZE);
  const pagedEvents = useMemo(() =>
    filteredEvents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
  [filteredEvents, page]);

  const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
    { label: `All (${stats.total})`,           value: "ALL"       },
    { label: `Sent (${stats.sent})`,           value: "SENT"      },
    { label: `Delivered (${stats.delivered})`, value: "DELIVERED" },
    { label: `Read (${stats.read})`,           value: "READ"      },
    { label: `Failed (${stats.failed})`,       value: "FAILED"    },
    { label: `Blocked (${stats.blocked})`,     value: "BLOCKED"   },
  ];

  return (
    <div className="wh-page">

      {/* Header */}
      <div className="wh-header">
        <div>
          <h1 className="wh-title">Message Logs</h1>
          <p className="wh-sub">Real-time delivery events from WhatsApp · Auto-refreshes every 5s</p>
        </div>
        <Button variant="ghost" size="sm" onClick={refetch}>↻ Refresh</Button>
      </div>

      

      {/* Events table card */}
      <div className="wh-card">

        {/* Card header */}
        <div className="wh-card-header">
          <div className="wh-card-title-row">
            <span className="wh-live-dot" />
            <span className="wh-card-title">Incoming Events</span>
            {events.length > 0 && (
              <span className="wh-count">
                {filteredEvents.length !== events.length
                  ? `${filteredEvents.length} of ${events.length}`
                  : events.length} events
              </span>
            )}
          </div>

          {/* Filter pills */}
          <div className="wh-filter-row">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                className={`wh-pill${statusFilter === f.value ? " wh-pill--active" : ""}`}
                style={statusFilter === f.value && f.value !== "ALL"
                  ? { borderColor: STATUS_COLOR[f.value], color: STATUS_COLOR[f.value], background: STATUS_COLOR[f.value] + "12" }
                  : {}}
                onClick={() => setStatusFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {isLoading && events.length === 0 ? (
          <div className="wh-table-wrap">
            <table className="wh-table">
              <thead>
                <tr><th>Time</th><th>Phone</th><th>Sent At</th><th>Delivered At</th><th>Read At</th></tr>
              </thead>
              <tbody>
                {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
              </tbody>
            </table>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="wh-empty">
            <div className="wh-empty-icon">📡</div>
            <div className="wh-empty-title">
              {events.length === 0 ? "No events yet" : `No ${statusFilter.toLowerCase()} events`}
            </div>
            <div className="wh-empty-sub">
              {events.length === 0
                ? "Send a campaign to see real-time delivery events here"
                : "Try a different status filter"}
            </div>
          </div>
        ) : (
          <>
            <div className="wh-table-wrap">
              <table className="wh-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Phone</th>
                    <th>Sent At</th>
                    <th>Delivered At</th>
                    <th>Read At</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedEvents.map((ev, i) => (
                    <tr
                      key={ev.id}
                      className={i === 0 && page === 1 ? "wh-row-latest" : ""}
                      style={{ borderLeft: `3px solid ${STATUS_COLOR[ev.status] ?? "#e5e7eb"}` }}
                    >
                      <td className="wh-time">{formatTime(ev.updated_at ?? ev.updatedAt ?? null)}</td>
                      <td className="wh-phone">{ev.phone}</td>
                      <td className="wh-date">{formatTime(ev.sent_at      ?? ev.sentAt      ?? null)}</td>
                      <td className="wh-date">{formatTime(ev.delivered_at ?? ev.deliveredAt ?? null)}</td>
                      <td className="wh-date">{formatTime(ev.read_at      ?? ev.readAt      ?? null)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="wh-pagination">
                <span className="wh-pagination-info">
                  Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filteredEvents.length)} of {filteredEvents.length}
                </span>
                <div className="wh-pagination-btns">
                  <button
                    className="wh-page-btn"
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    ← Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .map((p, idx, arr) => (
                      <>
                        {idx > 0 && arr[idx - 1] !== p - 1 && (
                          <span key={`ellipsis-${p}`} className="wh-page-ellipsis">…</span>
                        )}
                        <button
                          key={p}
                          className={`wh-page-btn${page === p ? " wh-page-btn--active" : ""}`}
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </button>
                      </>
                    ))
                  }
                  <button
                    className="wh-page-btn"
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* How it works */}
      <div className="wh-how">
        <div className="wh-how-title">⚙️ How it works</div>
        <div className="wh-how-steps">
          {[
            { n: 1, text: "Meta POSTs status payload to your webhook URL" },
            { n: 2, text: "Backend verifies the request signature" },
            { n: 3, text: "HTTP 200 returned instantly to Meta" },
            { n: 4, text: "DB updated with new message status" },
            { n: 5, text: "Campaign counts refreshed in real-time" },
            { n: 6, text: "Events appear here live every 5 seconds" },
          ].map(s => (
            <div key={s.n} className="wh-how-step">
              <span className="wh-how-num">{s.n}</span>
              <span className="wh-how-text">{s.text}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}