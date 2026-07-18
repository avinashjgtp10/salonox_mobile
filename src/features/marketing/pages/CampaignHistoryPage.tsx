import { useEffect, useState, useMemo, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import {
  fetchCampaignsThunk,
  fetchCampaignContactsThunk,
  pauseCampaignThunk,
  resumeCampaignThunk,
  resendCampaignThunk,
} from "../../../middleware/marketing/marketing.thunk";
import { Button, Badge, Input } from "../../../components/ui";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import "../styles/CampaignHistoryPage.scss";

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_BADGE_VARIANT: Record<string, "success" | "info" | "warning" | "danger" | "secondary"> = {
  COMPLETED: "success",
  SENDING:   "info",
  RUNNING:   "info",
  PAUSED:    "warning",
  FAILED:    "danger",
  SCHEDULED: "secondary",
  PENDING:   "secondary",
};

const STATUS_LABEL: Record<string, string> = {
  COMPLETED: "✅ Completed",
  SENDING:   "⚡ Sending",
  RUNNING:   "⚡ Running",
  PAUSED:    "⏸ Paused",
  FAILED:    "❌ Failed",
  SCHEDULED: "📅 Scheduled",
  PENDING:   "🕐 Pending",
};

const CONTACT_STATUS_COLOR: Record<string, string> = {
  SENT:      "#10b981",
  DELIVERED: "#3b82f6",
  READ:      "#8b5cf6",
  FAILED:    "#ef4444",
  BLOCKED:   "#f59e0b",
  PENDING:   "#9ca3af",
};

const CONTACT_STATUS_HINT: Record<string, string> = {
  SENT:      "Reached Meta — waiting for delivery confirmation",
  DELIVERED: "Delivered to phone",
  READ:      "Opened by recipient",
  FAILED:    "Could not be delivered",
  BLOCKED:   "User already received too many marketing messages today",
  PENDING:   "Queued — not yet sent",
};

type ContactFilter = "ALL" | "SENT" | "DELIVERED" | "READ" | "FAILED" | "BLOCKED" | "PENDING";
type StatusFilter  = "ALL" | "RUNNING" | "COMPLETED" | "PAUSED" | "FAILED" | "SCHEDULED";

const PAGE_SIZE = 10;

// ── Types ─────────────────────────────────────────────────────────────────────

interface ContactPageData {
  contacts:   any[];
  total:      number;
  page:       number;
  totalPages: number;
}
// ── CSV Export ────────────────────────────────────────────────────────────────

const exportCSV = (campaign: any, contacts: any[]) => {
  const header = "Phone,Name,Status,Sent At,Delivered At,Read At";
  const rows   = contacts.map(c => [
    c.phone, c.name ?? "", c.status,
    c.sent_at ?? "", c.delivered_at ?? "", c.read_at ?? "",
  ].join(","));
  const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = `${campaign.name}_report.csv`; a.click();
  URL.revokeObjectURL(url);
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function CampaignHistoryPage() {
  const dispatch = useAppDispatch();
  const { campaigns, loading } = useAppSelector((s) => s.marketing);

  // ── Expanded contact state ────────────────────────────────────────────────
  const [expandedId,   setExpandedId]   = useState<string | null>(null);
  const [contactData,  setContactData]  = useState<Record<string, ContactPageData>>({});
  const [loadingId,    setLoadingId]    = useState<string | null>(null);
  const [cntFilter,    setCntFilter]    = useState<Record<string, ContactFilter>>({});

  // ── Campaign filters ──────────────────────────────────────────────────────
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [dateStart,    setDateStart]    = useState("");
  const [dateEnd,      setDateEnd]      = useState("");
  const [filtersOpen,  setFiltersOpen]  = useState(false);
  const [page,         setPage]         = useState(1);

  // ── Pause / Resume (no useOnce — per-campaign loading state) ─────────────
  const [pausingId,    setPausingId]    = useState<string | null>(null);
  const [resumingId,   setResumingId]   = useState<string | null>(null);
  const [resendingId,  setResendingId]  = useState<string | null>(null);

  const { showSuccess, showError, overlay } = useStatusOverlay();

  useEffect(() => { dispatch(fetchCampaignsThunk()); }, [dispatch]);
  useEffect(() => { setPage(1); }, [search, statusFilter, dateStart, dateEnd]);

  // ── Load contacts (server-side paginated) ─────────────────────────────────
  const loadContacts = useCallback(async (
  id:     string,
  pg:     number,
  status: ContactFilter
) => {
  setLoadingId(id);
  const res = await dispatch(fetchCampaignContactsThunk({
    id,
    page:   pg,
    status: status === "ALL" ? undefined : status,
  }) as any);
  const payload = res?.payload;
  if (payload && payload.contacts) {
    setContactData(prev => ({
      ...prev,
      [id]: {
        contacts:   payload.contacts,
        total:      payload.total      ?? 0,
        page:       payload.page       ?? 1,
        totalPages: payload.totalPages ?? 1,
      },
    }));
 
    }
    setLoadingId(null);
  }, [dispatch]);

  const toggleExpand = async (id: string) => {
  if (expandedId === id) { setExpandedId(null); return; }
  setExpandedId(id);
  if (!contactData[id]) {
    await loadContacts(id, 1, cntFilter[id] ?? "ALL");
  }
};

  const handleFilterTab = (campaignId: string, f: ContactFilter) => {
    setCntFilter(prev => ({ ...prev, [campaignId]: f }));
    loadContacts(campaignId, 1, f);
  };

  const handlePause = async (id: string) => {
    setPausingId(id);
    const res = await dispatch(pauseCampaignThunk(id));
    if (pauseCampaignThunk.rejected.match(res)) showError("Failed to pause campaign");
    else showSuccess("Campaign paused");
    setPausingId(null);
  };

  const handleResume = async (id: string) => {
    setResumingId(id);
    const res = await dispatch(resumeCampaignThunk(id));
    if (resumeCampaignThunk.rejected.match(res)) showError("Failed to resume campaign");
    else showSuccess("Campaign resumed");
    setResumingId(null);
  };

  const handleResend = async (id: string, name: string) => {
    setResendingId(id);
    const res = await dispatch(resendCampaignThunk(id));
    if (resendCampaignThunk.rejected.match(res)) {
      showError((res.payload as string) ?? "Failed to resend campaign");
    } else {
      showSuccess(`"${name}" resent to all contacts`);
    }
    setResendingId(null);
  };

  const pct = (a: number, b: number) => b > 0 ? `${Math.round((a / b) * 100)}%` : "0%";

  // ── Campaign filtering + pagination ───────────────────────────────────────
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => {
      if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
      if (search && !c.name?.toLowerCase().includes(search.toLowerCase())) return false;
      if (dateStart && new Date(c.created_at) < new Date(dateStart)) return false;
      if (dateEnd   && new Date(c.created_at) > new Date(dateEnd + "T23:59:59")) return false;
      return true;
    });
  }, [campaigns, statusFilter, search, dateStart, dateEnd]);

  const totalPages     = Math.ceil(filteredCampaigns.length / PAGE_SIZE);
  const pagedCampaigns = useMemo(() =>
    filteredCampaigns.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
  [filteredCampaigns, page]);

  const hasActiveFilters = !!(search || statusFilter !== "ALL" || dateStart || dateEnd);

  const counts = {
    total:     campaigns.length,
    completed: campaigns.filter(c => c.status === "COMPLETED").length,
    active:    campaigns.filter(c => ["SENDING","RUNNING"].includes(c.status)).length,
    paused:    campaigns.filter(c => c.status === "PAUSED").length,
    scheduled: campaigns.filter(c => c.status === "SCHEDULED").length,
  };

  return (
    <div className="ch-page">
      {overlay}

      {/* Header */}
      <div className="ch-header">
        <div>
          <h1 className="ch-title">Campaign History</h1>
          <p className="ch-sub">Click on a campaign to see contact-level delivery details</p>
        </div>
      </div>

      {/* Summary */}
      <div className="ch-summary">
        {[
          { val: counts.total,     label: "Total",     color: undefined  },
          { val: counts.completed, label: "Completed", color: "#10b981"  },
          { val: counts.active,    label: "Active",    color: "#3b82f6"  },
          { val: counts.paused,    label: "Paused",    color: "#f59e0b"  },
          { val: counts.scheduled, label: "Scheduled", color: "#8b5cf6"  },
        ].map(s => (
          <div key={s.label} className="ch-summary-card">
            <span className="ch-summary-val" style={s.color ? { color: s.color } : {}}>{s.val}</span>
            <span className="ch-summary-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="ch-toolbar">
        <Input
          placeholder="Search campaigns..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          containerClass="mb-0 ch-search"
        />
        <button
          className={`ch-filter-btn${filtersOpen ? " ch-filter-btn--active" : ""}${hasActiveFilters ? " ch-filter-btn--has" : ""}`}
          onClick={() => setFiltersOpen(o => !o)}
        >
          ⚙ Filters
          {hasActiveFilters && <span className="ch-filter-dot" />}
        </button>
        {hasActiveFilters && (
          <button className="ch-clear-btn" onClick={() => {
            setSearch(""); setStatusFilter("ALL"); setDateStart(""); setDateEnd("");
          }}>
            Clear
          </button>
        )}
      </div>

      {/* Filter panel */}
      {filtersOpen && (
        <div className="ch-filter-panel">
          <div className="ch-filter-row">
            <div className="ch-filter-group">
              <label className="ch-filter-label">Status</label>
              <div className="ch-pill-group">
                {(["ALL","RUNNING","COMPLETED","PAUSED","FAILED","SCHEDULED"] as StatusFilter[]).map(s => (
                  <button
                    key={s}
                    className={`ch-pill${statusFilter === s ? " ch-pill--active" : ""}`}
                    onClick={() => setStatusFilter(s)}
                  >
                    {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="ch-filter-group">
              <label className="ch-filter-label">Date range</label>
              <div className="ch-date-row">
                <input type="date" className="ch-date-input" value={dateStart} max={dateEnd || undefined} onChange={e => setDateStart(e.target.value)} />
                <span className="ch-date-sep">→</span>
                <input type="date" className="ch-date-input" value={dateEnd} min={dateStart || undefined} onChange={e => setDateEnd(e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {loading.fetchCampaigns ? (
        <div className="ch-loading">Loading campaigns...</div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="ch-empty">
          <div className="ch-empty-icon">{hasActiveFilters ? "🔍" : "🚀"}</div>
          <p>{hasActiveFilters ? "No campaigns match your filters." : "No campaigns yet. Launch your first blast campaign!"}</p>
        </div>
      ) : (
        <>
          <div className="ch-list">
            {pagedCampaigns.map((c) => {
              const sent      = Number(c.sent_count      ?? c.sent      ?? 0);
              const delivered = Number(c.delivered_count ?? c.delivered ?? 0);
              const read      = Number(c.read_count      ?? c.read      ?? 0);
              const failed    = Number(c.failed_count    ?? c.failed    ?? 0);
              const blocked   = Number(c.blocked_count   ?? 0);
              const total     = Number(c.total_contacts  ?? c.totalContacts ?? 0);
              const isActive  = ["SENDING","RUNNING"].includes(c.status);
              const isPaused  = c.status === "PAUSED";
              const isOpen    = expandedId === String(c.id);
              const cFilter   = cntFilter[String(c.id)] ?? "ALL";
              const cd        = contactData[String(c.id)];

              return (
                <div key={c.id} className={`ch-card${isOpen ? " ch-card--open" : ""}`}>

                  {/* Card header */}
                  <div className="ch-card-header" onClick={() => toggleExpand(String(c.id))}>
                    <div className="ch-card-left">
                      <h3 className="ch-card-name">{c.name}</h3>
                      <p className="ch-card-template">📨 {c.template_name ?? "—"}</p>
                    </div>
                    <div className="ch-card-right">
                      <Badge variant={STATUS_BADGE_VARIANT[c.status] ?? "secondary"}>
                        {STATUS_LABEL[c.status] ?? c.status}
                      </Badge>
                      <div className="ch-card-actions" onClick={e => e.stopPropagation()}>
                        {c.status === "SCHEDULED" && c.scheduled_at && (
                          <span className="ch-scheduled-time">
                            📅 {new Date(c.scheduled_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                          </span>
                        )}
                        {isActive && (
                          <Button
                            variant="outline-warning"
                            size="sm"
                            loading={pausingId === String(c.id)}
                            disabled={!!pausingId || !!resumingId}
                            onClick={() => handlePause(String(c.id))}
                          >
                            ⏸ Pause
                          </Button>
                        )}
                        {isPaused && (
                          <Button
                            variant="success"
                            size="sm"
                            loading={resumingId === String(c.id)}
                            disabled={!!pausingId || !!resumingId}
                            onClick={() => handleResume(String(c.id))}
                          >
                            ▶ Resume
                          </Button>
                        )}
                        {(c.status === "COMPLETED" || c.status === "FAILED") && (
                          <Button
                            variant="outline-primary"
                            size="sm"
                            loading={resendingId === String(c.id)}
                            disabled={!!resendingId}
                            onClick={() => handleResend(String(c.id), c.name)}
                          >
                            ↻ Resend
                          </Button>
                        )}
                        {cd && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => exportCSV(c, cd.contacts)}
                          >
                            ⬇ Export
                          </Button>
                        )}
                      </div>
                      <span className="ch-expand-icon">{isOpen ? "▲" : "▼"}</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="ch-progress-wrap">
                    <div className="ch-progress-track">
                      <div className="ch-progress-fill" style={{ width: total > 0 ? `${Math.round((sent / total) * 100)}%` : "0%" }} />
                    </div>
                    <span className="ch-progress-label">{sent}/{total} sent ({pct(sent, total)})</span>
                  </div>

                  {/* Stats row */}
                  <div className="ch-stats-row">
                    {[
                      { label: "Sent",      val: sent,      color: "#10b981", base: total, hint: "Messages that left your system" },
                      { label: "Delivered", val: delivered, color: "#3b82f6", base: sent,  hint: "Confirmed on recipient's phone" },
                      { label: "Read",      val: read,      color: "#8b5cf6", base: sent,  hint: "Opened by recipient" },
                      { label: "Failed",    val: failed,    color: "#ef4444", base: total, hint: "Could not be delivered" },
                      { label: "Blocked",   val: blocked,   color: "#f59e0b", base: total, hint: "User daily limit reached (131049)" },
                    ].map(s => (
                      <div key={s.label} className="ch-stat" title={s.hint}>
                        <span className="ch-stat-dot" style={{ background: s.color }} />
                        <span className="ch-stat-val">{s.val.toLocaleString("en-IN")}</span>
                        <span className="ch-stat-label">{s.label}</span>
                        <span className="ch-stat-pct">{pct(s.val, s.base)}</span>
                      </div>
                    ))}
                    <div className="ch-stat ch-stat-meta">
                      <span className="ch-stat-label">Created:</span>
                      <span className="ch-stat-val">
                        {new Date(c.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                  </div>

                  {/* Expanded contact details */}
                  {isOpen && (
                    <div className="ch-detail">
                      <div className="ch-detail-header">
                        <span className="ch-detail-title">
                          📋 Contact Details
                          {cd && <span className="ch-detail-total"> — {cd.total.toLocaleString("en-IN")} contacts</span>}
                        </span>
                        <div className="ch-filter-tabs">
                          {(["ALL","SENT","DELIVERED","READ","FAILED","BLOCKED","PENDING"] as ContactFilter[]).map(f => (
                            <button
                              key={f}
                              className={`ch-filter-tab${cFilter === f ? " ch-filter-tab--active" : ""}`}
                              title={CONTACT_STATUS_HINT[f] ?? ""}
                              onClick={() => handleFilterTab(String(c.id), f)}
                            >
                              {f}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Blocked explanation */}
                      {blocked > 0 && (
                        <div className="ch-blocked-note">
                          💡 <strong>{blocked} blocked</strong> — these users already received marketing messages from other businesses today.
                          Meta limits marketing messages per user per day (error 131049). This is normal.
                        </div>
                      )}

                      {/* Loading */}
                      {loadingId === String(c.id) ? (
                        <div className="ch-detail-loading">Loading contacts...</div>
                      ) : !cd ? (
                        <div className="ch-detail-empty">No data loaded.</div>
                      ) : cd.contacts.length === 0 ? (
                        <div className="ch-detail-empty">No contacts found for this filter.</div>
                      ) : (
                        <>
                          {/* Contact table */}
                          <div className="ch-contact-table">
                            <div className="ch-contact-row ch-contact-row--head">
                              <span>Phone</span>
                              <span>Name</span>
                              <span>Status</span>
                              <span>Sent At</span>
                              <span>Delivered At</span>
                              <span>Read At</span>
                            </div>
                            {cd.contacts.map((ct: any) => (
                              <div key={ct.id} className="ch-contact-row" title={CONTACT_STATUS_HINT[ct.status] ?? ""}>
                                <span className="ch-contact-phone">📱 {ct.phone}</span>
                                <span>{ct.name ?? "—"}</span>
                                <span className="ch-contact-status" style={{ color: CONTACT_STATUS_COLOR[ct.status] ?? "#9ca3af" }}>
                                  ● {ct.status}
                                  {ct.status === "BLOCKED" && (
                                    <span className="ch-contact-hint" title="User daily limit reached">⚠️</span>
                                  )}
                                </span>
                                <span>{ct.sent_at      ? new Date(ct.sent_at).toLocaleTimeString("en-IN",      { hour: "2-digit", minute: "2-digit" }) : "—"}</span>
                                <span>{ct.delivered_at ? new Date(ct.delivered_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}</span>
                                <span>{ct.read_at      ? new Date(ct.read_at).toLocaleTimeString("en-IN",      { hour: "2-digit", minute: "2-digit" }) : "—"}</span>
                              </div>
                            ))}
                          </div>

                          {/* Contact pagination */}
                          {cd.totalPages > 1 && (
                            <div className="ch-contact-pagination">
                              <span className="ch-contact-pagination-info">
                                Showing {((cd.page - 1) * 50) + 1}–{Math.min(cd.page * 50, cd.total)} of {cd.total.toLocaleString("en-IN")} contacts
                              </span>
                              <div className="ch-contact-pagination-btns">
                                <button
                                  className="ch-contact-page-btn"
                                  disabled={cd.page <= 1 || loadingId === String(c.id)}
                                  onClick={() => loadContacts(String(c.id), cd.page - 1, cFilter)}
                                >
                                  ← Prev
                                </button>
                                <span className="ch-contact-page-num">Page {cd.page} of {cd.totalPages}</span>
                                <button
                                  className="ch-contact-page-btn"
                                  disabled={cd.page >= cd.totalPages || loadingId === String(c.id)}
                                  onClick={() => loadContacts(String(c.id), cd.page + 1, cFilter)}
                                >
                                  Next →
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Campaign pagination */}
          {totalPages > 1 && (
            <div className="ch-pagination-wrap">
              <div className="ch-pagination">
                <button
                  className="ch-page-btn"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  ← Prev
                </button>
                <span className="ch-page-info">Page {page} of {totalPages} · {filteredCampaigns.length} campaigns</span>
                <button
                  className="ch-page-btn"
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
  );
}