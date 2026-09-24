import { useEffect, useState, useMemo, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import {
  fetchCampaignsThunk,
  fetchCampaignContactsThunk,
  pauseCampaignThunk,
  resumeCampaignThunk,
  resendCampaignContactThunk,
  resendCampaignContactsBulkThunk,
} from "../../../middleware/marketing/marketing.thunk";
import ResendCampaignModal from "../components/ResendCampaignModal";
import { Button, Badge, Input, DateRangeFilter, Pagination, JiraFilterMenu } from "../../../components/ui";
import type { DateRangeFilterValue, JiraFilterField } from "../../../components/ui";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { usePermissions } from "../../../hooks/usePermissions";
import { showPermissionDenied } from "../../../store/permissionDialogSlice";
import { maskMobile } from "../../../utils/maskMobile";
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

const STATUS_OPTIONS = [
  { id: "RUNNING",   label: "Running" },
  { id: "COMPLETED", label: "Completed" },
  { id: "PAUSED",    label: "Paused" },
  { id: "FAILED",    label: "Failed" },
  { id: "SCHEDULED", label: "Scheduled" },
];

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_CONTACT_PAGE_SIZE = 50;

// ── Types ─────────────────────────────────────────────────────────────────────

interface ContactPageData {
  contacts:   any[];
  total:      number;
  page:       number;
  totalPages: number;
}
// ── CSV Export ────────────────────────────────────────────────────────────────

// Owner/admin exports carry the real number; staff/manager exports stay
// masked, same as every other client-contact export in the app.
const exportCSV = (campaign: any, contacts: any[], canViewFullContact: boolean) => {
  const header = "Phone,Name,Status,Sent At,Delivered At,Read At";
  const rows   = contacts.map(c => [
    canViewFullContact ? c.phone : maskMobile(c.phone), c.name ?? "", c.status,
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
  const role = useAppSelector((s) => s.auth.role);
  const canViewFullContact = role === "salon_owner" || role === "admin";

  // ── Expanded contact state ────────────────────────────────────────────────
  const [expandedId,   setExpandedId]   = useState<string | null>(null);
  const [contactData,  setContactData]  = useState<Record<string, ContactPageData>>({});
  const [loadingId,    setLoadingId]    = useState<string | null>(null);
  const [cntFilter,    setCntFilter]    = useState<Record<string, ContactFilter>>({});
  const [cntPageSize,  setCntPageSize]  = useState<Record<string, number>>({});

  // ── Campaign filters ──────────────────────────────────────────────────────
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [dateRange,    setDateRange]    = useState<DateRangeFilterValue>({ preset: "all_time", startDate: "", endDate: "" });
  const [page,         setPage]         = useState(1);
  const [pageSize,     setPageSize]     = useState(DEFAULT_PAGE_SIZE);

  // ── Pause / Resume (no useOnce — per-campaign loading state) ─────────────
  const [pausingId,    setPausingId]    = useState<string | null>(null);
  const [resumingId,   setResumingId]   = useState<string | null>(null);
  const [exportingId,  setExportingId]  = useState<string | null>(null);

  // ── Resend modal (review clients / edit offer / preview before sending) ──
  const [resendTarget, setResendTarget] = useState<{ id: string; name: string; totalContacts: number } | null>(null);

  const { showSuccess, showError, overlay } = useStatusOverlay();
  const { can } = usePermissions();
  const denyPerm = (permKey: string) => dispatch(showPermissionDenied(
    `Your account does not have the "${permKey}" permission. Ask your salon owner to enable it in Settings → Roles & Permissions.`
  ));

  useEffect(() => { dispatch(fetchCampaignsThunk()); }, [dispatch]);
  useEffect(() => { setPage(1); }, [search, statusFilter, dateRange.startDate, dateRange.endDate, pageSize]);

  // ── Load contacts (server-side paginated) ─────────────────────────────────
  const loadContacts = useCallback(async (
  id:     string,
  pg:     number,
  status: ContactFilter,
  limit:  number = cntPageSize[id] ?? DEFAULT_CONTACT_PAGE_SIZE
) => {
  setLoadingId(id);
  const res = await dispatch(fetchCampaignContactsThunk({
    id,
    page:   pg,
    limit,
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
  }, [dispatch, cntPageSize]);

  const toggleExpand = async (id: string) => {
  setSelectedContactIds(new Set());
  if (expandedId === id) { setExpandedId(null); return; }
  setExpandedId(id);
  if (!contactData[id]) {
    await loadContacts(id, 1, cntFilter[id] ?? "ALL");
  }
};

  const handleFilterTab = (campaignId: string, f: ContactFilter) => {
    setSelectedContactIds(new Set());
    setCntFilter(prev => ({ ...prev, [campaignId]: f }));
    loadContacts(campaignId, 1, f);
  };

  const handleContactPageSizeChange = (campaignId: string, size: number) => {
    setSelectedContactIds(new Set());
    setCntPageSize(prev => ({ ...prev, [campaignId]: size }));
    loadContacts(campaignId, 1, cntFilter[campaignId] ?? "ALL", size);
  };

  const handlePause = async (id: string) => {
    if (!can("send_campaign")) { denyPerm("send_campaign"); return; }
    setPausingId(id);
    const res = await dispatch(pauseCampaignThunk(id));
    if (pauseCampaignThunk.rejected.match(res)) showError("Failed to pause campaign");
    else showSuccess("Campaign paused");
    setPausingId(null);
  };

  const handleResume = async (id: string) => {
    if (!can("send_campaign")) { denyPerm("send_campaign"); return; }
    setResumingId(id);
    const res = await dispatch(resumeCampaignThunk(id));
    if (resumeCampaignThunk.rejected.match(res)) showError("Failed to resume campaign");
    else showSuccess("Campaign resumed");
    setResumingId(null);
  };

  const handleResendClick = (id: string, name: string, totalContacts: number) => {
    if (!can("send_campaign")) { denyPerm("send_campaign"); return; }
    setResendTarget({ id, name, totalContacts });
  };

  // ── Per-contact Resend (one FAILED/BLOCKED recipient only) ────────────────
  const [resendingContactId, setResendingContactId] = useState<string | null>(null);

  const handleResendContact = async (campaignId: string, contactId: string) => {
    if (!can("send_campaign")) { denyPerm("send_campaign"); return; }
    setResendingContactId(contactId);
    try {
      const res = await dispatch(resendCampaignContactThunk({ campaignId, contactId }));
      if (resendCampaignContactThunk.fulfilled.match(res)) {
        showSuccess("Message resent to this contact");
        // Refresh just this campaign's currently-shown contact page so the
        // row's status/timestamps reflect the fresh attempt.
        await loadContacts(campaignId, contactData[campaignId]?.page ?? 1, cntFilter[campaignId] ?? "ALL");
        dispatch(fetchCampaignsThunk());
      } else {
        showError((res.payload as string) ?? "Failed to resend message to this contact");
      }
    } finally {
      setResendingContactId(null);
    }
  };

  // ── Bulk Resend (select multiple FAILED/BLOCKED contacts, one action) ─────
  // Selection is scoped to whichever contacts are currently loaded on screen
  // for the currently-expanded campaign (i.e. the current filter tab + page)
  // — cleared whenever the filter, page, or expanded campaign changes, so a
  // stale selection from a different view never carries over silently.
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [bulkResending, setBulkResending] = useState(false);

  const toggleContactSelected = (contactId: string) => {
    setSelectedContactIds(prev => {
      const next = new Set(prev);
      if (next.has(contactId)) next.delete(contactId); else next.add(contactId);
      return next;
    });
  };

  const resendableIdsOnScreen = (campaignId: string): string[] => {
    const cd = contactData[campaignId];
    if (!cd) return [];
    return cd.contacts.filter((ct: any) => ct.status === "FAILED" || ct.status === "BLOCKED").map((ct: any) => ct.id);
  };

  const handleSelectAllToggle = (campaignId: string) => {
    const resendable = resendableIdsOnScreen(campaignId);
    const allSelected = resendable.length > 0 && resendable.every(id => selectedContactIds.has(id));
    setSelectedContactIds(allSelected ? new Set() : new Set(resendable));
  };

  const handleBulkResend = async (campaignId: string) => {
    if (!can("send_campaign")) { denyPerm("send_campaign"); return; }
    const contactIds = Array.from(selectedContactIds);
    if (contactIds.length === 0) return;
    setBulkResending(true);
    try {
      const res = await dispatch(resendCampaignContactsBulkThunk({ campaignId, contactIds }));
      if (resendCampaignContactsBulkThunk.fulfilled.match(res)) {
        const { queued, skipped } = res.payload;
        if (queued.length > 0) showSuccess(`Resent to ${queued.length} contact${queued.length === 1 ? "" : "s"}`);
        if (skipped.length > 0) showError(`${skipped.length} contact${skipped.length === 1 ? "" : "s"} could not be resent (already succeeded or not found)`);
        setSelectedContactIds(new Set());
        await loadContacts(campaignId, contactData[campaignId]?.page ?? 1, cntFilter[campaignId] ?? "ALL");
        dispatch(fetchCampaignsThunk());
      } else {
        showError((res.payload as string) ?? "Failed to resend to the selected contacts");
      }
    } finally {
      setBulkResending(false);
    }
  };

  // Export must fetch every contact, not just the current on-screen page —
  // cd.contacts is capped at whatever page size is selected (default 50),
  // so exporting that directly silently truncated large campaigns.
  const handleExport = async (campaign: any) => {
    const id = String(campaign.id);
    const cd = contactData[id];
    if (!cd) return;
    setExportingId(id);
    try {
      const status = cntFilter[id] ?? "ALL";
      const res = await dispatch(fetchCampaignContactsThunk({
        id,
        page:   1,
        limit:  cd.total || 1,
        status: status === "ALL" ? undefined : status,
      }) as any);
      const payload = res?.payload;
      if (payload?.contacts) {
        exportCSV(campaign, payload.contacts, canViewFullContact);
      } else {
        showError("Failed to export contacts");
      }
    } finally {
      setExportingId(null);
    }
  };

  const pct = (a: number, b: number) => b > 0 ? `${Math.round((a / b) * 100)}%` : "0%";

  // ── Campaign filtering + pagination ───────────────────────────────────────
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => {
      if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
      if (search && !c.name?.toLowerCase().includes(search.toLowerCase())) return false;
      if (dateRange.startDate && new Date(c.created_at) < new Date(dateRange.startDate)) return false;
      if (dateRange.endDate   && new Date(c.created_at) > new Date(dateRange.endDate + "T23:59:59")) return false;
      return true;
    });
  }, [campaigns, statusFilter, search, dateRange.startDate, dateRange.endDate]);

  const pagedCampaigns = useMemo(() =>
    filteredCampaigns.slice((page - 1) * pageSize, page * pageSize),
  [filteredCampaigns, page, pageSize]);

  const hasActiveFilters = !!(search || statusFilter !== "ALL" || dateRange.preset !== "all_time");

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "status", label: "Status", options: STATUS_OPTIONS },
  ], []);

  const filterMenuSelected = useMemo(
    () => ({ status: statusFilter !== "ALL" ? [statusFilter] : [] }),
    [statusFilter],
  );

  // Behaves as single-select even though the checkbox list is multi-capable —
  // picking a second status replaces the first, same convention as Client
  // Rating's minimum-rating filter.
  const handleFiltersApply = (next: Record<string, string[]>) => {
    const picked = next.status ?? [];
    setStatusFilter((picked.length ? picked[picked.length - 1] : "ALL") as StatusFilter);
  };

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
        <JiraFilterMenu fields={filterFields} selected={filterMenuSelected} onApply={handleFiltersApply} triggerLabel="Filters" />

        <DateRangeFilter value={dateRange} onChange={setDateRange} />

        {hasActiveFilters && (
          <button className="ch-clear-btn" onClick={() => {
            setSearch(""); setStatusFilter("ALL"); setDateRange({ preset: "all_time", startDate: "", endDate: "" });
          }}>
            Clear
          </button>
        )}

        <Input
          placeholder="Search campaigns..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          containerClass="mb-0 ch-search"
        />
      </div>

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
                            disabled={(!!pausingId || !!resumingId) && can("send_campaign")}
                            style={!can("send_campaign") ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
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
                            disabled={(!!pausingId || !!resumingId) && can("send_campaign")}
                            style={!can("send_campaign") ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                            onClick={() => handleResume(String(c.id))}
                          >
                            ▶ Resume
                          </Button>
                        )}
                        {(c.status === "COMPLETED" || c.status === "FAILED") && (
                          <Button
                            variant="outline-primary"
                            size="sm"
                            style={!can("send_campaign") ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                            onClick={() => handleResendClick(String(c.id), c.name, c.total_contacts ?? c.totalContacts ?? 0)}
                          >
                            ↻ Resend
                          </Button>
                        )}
                        {cd && (
                          <Button
                            variant="ghost"
                            size="sm"
                            loading={exportingId === String(c.id)}
                            disabled={!!exportingId}
                            onClick={() => handleExport(c)}
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

                      {/* Bulk resend bar — only meaningful once at least one
                          FAILED/BLOCKED contact is actually on screen (e.g.
                          filtered to the BLOCKED tab). Selection only ever
                          covers the currently-loaded page/filter, never
                          "every blocked contact across every page" silently. */}
                      {cd && resendableIdsOnScreen(String(c.id)).length > 0 && (
                        <div className="ch-bulk-bar">
                          <label className="ch-bulk-select-all">
                            <input
                              type="checkbox"
                              checked={resendableIdsOnScreen(String(c.id)).every(id => selectedContactIds.has(id))}
                              onChange={() => handleSelectAllToggle(String(c.id))}
                            />
                            Select all {resendableIdsOnScreen(String(c.id)).length} failed/blocked on this page
                          </label>
                          {selectedContactIds.size > 0 && (
                            <Button
                              variant="success"
                              size="sm"
                              loading={bulkResending}
                              disabled={bulkResending}
                              style={!can("send_campaign") ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                              onClick={() => handleBulkResend(String(c.id))}
                            >
                              ↻ Resend Selected ({selectedContactIds.size})
                            </Button>
                          )}
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
                              <span />
                              <span>Phone</span>
                              <span>Name</span>
                              <span>Status</span>
                              <span>Reason</span>
                              <span>Sent At</span>
                              <span>Delivered At</span>
                              <span>Read At</span>
                              <span>Action</span>
                            </div>
                            {cd.contacts.map((ct: any) => {
                              const isResendable = ct.status === "FAILED" || ct.status === "BLOCKED";
                              return (
                              <div key={ct.id} className="ch-contact-row" title={CONTACT_STATUS_HINT[ct.status] ?? ""}>
                                <span>
                                  {isResendable && (
                                    <input
                                      type="checkbox"
                                      checked={selectedContactIds.has(ct.id)}
                                      onChange={() => toggleContactSelected(ct.id)}
                                    />
                                  )}
                                </span>
                                <span className="ch-contact-phone">📱 {maskMobile(ct.phone)}</span>
                                <span>{ct.name ?? "—"}</span>
                                <span className="ch-contact-status" style={{ color: CONTACT_STATUS_COLOR[ct.status] ?? "#9ca3af" }}>
                                  ● {ct.status}
                                  {ct.status === "BLOCKED" && (
                                    <span className="ch-contact-hint" title="User daily limit reached">⚠️</span>
                                  )}
                                </span>
                                <span className="ch-contact-reason" title={ct.error_message || ""}>
                                  {ct.error_message || (isResendable ? CONTACT_STATUS_HINT[ct.status] : "—")}
                                </span>
                                <span>{ct.sent_at      ? new Date(ct.sent_at).toLocaleTimeString("en-IN",      { hour: "2-digit", minute: "2-digit" }) : "—"}</span>
                                <span>{ct.delivered_at ? new Date(ct.delivered_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}</span>
                                <span>{ct.read_at      ? new Date(ct.read_at).toLocaleTimeString("en-IN",      { hour: "2-digit", minute: "2-digit" }) : "—"}</span>
                                <span>
                                  {isResendable && (
                                    <Button
                                      variant="outline-primary"
                                      size="sm"
                                      loading={resendingContactId === ct.id}
                                      disabled={!!resendingContactId}
                                      style={!can("send_campaign") ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                                      onClick={() => handleResendContact(String(c.id), ct.id)}
                                    >
                                      ↻ Resend
                                    </Button>
                                  )}
                                </span>
                              </div>
                              );
                            })}
                          </div>

                          {/* Contact pagination */}
                          <Pagination
                            currentPage={cd.page}
                            pageSize={cntPageSize[String(c.id)] ?? DEFAULT_CONTACT_PAGE_SIZE}
                            totalItems={cd.total}
                            onPageChange={(pg) => { setSelectedContactIds(new Set()); loadContacts(String(c.id), pg, cFilter); }}
                            onPageSizeChange={(size) => handleContactPageSizeChange(String(c.id), size)}
                            pageSizeOptions={[25, 50, 100, 200]}
                          />
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Campaign pagination */}
          <Pagination
            currentPage={page}
            pageSize={pageSize}
            totalItems={filteredCampaigns.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </>
      )}

      {resendTarget && (
        <ResendCampaignModal
          show={!!resendTarget}
          onClose={() => setResendTarget(null)}
          campaignId={resendTarget.id}
          campaignName={resendTarget.name}
          totalContacts={resendTarget.totalContacts}
          onResent={() => dispatch(fetchCampaignsThunk())}
        />
      )}
    </div>
  );
}