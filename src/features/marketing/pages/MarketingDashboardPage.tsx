import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import {
  fetchDashboardStatsThunk,
  fetchTemplatesThunk,
  fetchCampaignsThunk,
  syncTemplateThunk,
} from "../../../middleware/marketing/marketing.thunk";
import { Button, Badge, DateRangeFilter } from "../../../components/ui";
import type { DateRangeFilterValue } from "../../../components/ui";
import { maskMobile } from "../../../utils/maskMobile";
import "../styles/MarketingDashboardPage.scss";

type CampaignStatusFilter = "ALL" | "RUNNING" | "COMPLETED" | "PAUSED" | "FAILED" | "SCHEDULED";

const CAMPAIGN_STATUS_BADGE: Record<string, "success" | "info" | "warning" | "danger" | "secondary"> = {
  COMPLETED: "success",
  SENDING:   "info",
  RUNNING:   "info",
  PAUSED:    "warning",
  FAILED:    "danger",
  SCHEDULED: "secondary",
  PENDING:   "secondary",
};

const CAMPAIGN_STATUS_LABEL: Record<string, string> = {
  COMPLETED: "Completed",
  SENDING:   "Sending",
  RUNNING:   "Running",
  PAUSED:    "Paused",
  FAILED:    "Failed",
  SCHEDULED: "Scheduled",
  PENDING:   "Pending",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function inDateRange(dateStr: string | undefined | null, start: string, end: string): boolean {
  if (!start && !end) return true;
  if (!dateStr) return true;
  const d = new Date(dateStr).getTime();
  const s = start ? new Date(start).getTime()             : -Infinity;
  const e = end   ? new Date(end + "T23:59:59").getTime() : Infinity;
  return d >= s && d <= e;
}

function rollupFromCampaigns(list: any[]) {
  return list.reduce(
    (acc, c) => {
      acc.sent      += c.sent_count      ?? c.sent      ?? 0;
      acc.delivered += c.delivered_count ?? c.delivered ?? 0;
      acc.failed    += c.failed_count    ?? c.failed    ?? 0;
      acc.blocked   += c.blocked_count   ?? 0;
      acc.contacts  += c.total_contacts  ?? c.totalContacts ?? 0;
      return acc;
    },
    { sent: 0, delivered: 0, failed: 0, blocked: 0, contacts: 0 }
  );
}

function RateBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="mkt-rate-bar-wrap">
      <div className="mkt-rate-bar-track">
        <div className="mkt-rate-bar-fill" style={{ width: `${Math.min(value, 100)}%`, background: color }} />
      </div>
      <span className="mkt-rate-bar-pct" style={{ color }}>{value}%</span>
    </div>
  );
}

export default function MarketingDashboardPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const {
    dashboardStats: data,
    loading,
    templates,
    campaigns,
    waConfig,
  } = useAppSelector((s) => s.marketing);
  const prevStatuses = useRef<Record<string, string>>({});

  // ── ALL useState hooks ────────────────────────────────────────────────────
  const [dateRange,   setDateRange]   = useState<DateRangeFilterValue>({ preset: "all_time", startDate: "", endDate: "" });
  const [campFilter,  setCampFilter]  = useState<CampaignStatusFilter>("ALL");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { showSuccess, showError, overlay } = useStatusOverlay();

  // ── ALL useEffect hooks ───────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchDashboardStatsThunk());
    dispatch(fetchTemplatesThunk());
    dispatch(fetchCampaignsThunk());
    // waConfig already fetched by MarketingRoutes — no need to re-fetch here
  }, [dispatch]);

  useEffect(() => {
    const pending = templates.filter((t) => t.status === "PENDING");
    if (pending.length === 0) return;
    const interval = setInterval(async () => {
      for (const t of pending) {
        const res = await dispatch(syncTemplateThunk(String(t.id)));
        if (syncTemplateThunk.fulfilled.match(res)) {
          const updated = res.payload;
          const prev    = prevStatuses.current[String(t.id)];
          if (prev && prev !== updated.status) {
            if (updated.status === "APPROVED") showSuccess(`✅ Template "${t.name}" approved!`);
            else if (updated.status === "REJECTED") showError(`❌ Template "${t.name}" rejected.`);
          }
          prevStatuses.current[String(t.id)] = updated.status;
        }
      }
    }, 60_000);
    pending.forEach((t) => { prevStatuses.current[String(t.id)] = t.status; });
    return () => clearInterval(interval);
  }, [templates, dispatch]);

  // ── ALL derived values & useMemo hooks ───────────────────────────────────
  const stats            = data ?? ({} as any);
  const isLoading        = loading.fetchDashboardStats || loading.fetchCampaigns;
  const hasActiveFilters = !!(dateRange.preset !== "all_time" || campFilter !== "ALL");
  // Just the fields still inside the collapsible Filters panel — date range
  // is now a standalone always-visible control whose own trigger shows its
  // state, so it isn't counted toward the Filters button's own badge.
  const panelFilterCount = campFilter !== "ALL" ? 1 : 0;

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      if (campFilter !== "ALL" && c.status !== campFilter) return false;
      if (!inDateRange(c.created_at, dateRange.startDate, dateRange.endDate)) return false;
      return true;
    });
  }, [campaigns, campFilter, dateRange.startDate, dateRange.endDate]);

  const kpiNumbers = useMemo(() => {
    if (hasActiveFilters) {
      const r = rollupFromCampaigns(filteredCampaigns);
      return {
        totalSent:          r.sent,
        totalDelivered:     r.delivered,
        totalFailed:        r.failed,
        totalBlocked:       r.blocked,
        totalCampaigns:     filteredCampaigns.length,
        activeCampaigns:    filteredCampaigns.filter(c => c.status === "RUNNING" || c.status === "SENDING").length,
        completedCampaigns: filteredCampaigns.filter(c => c.status === "COMPLETED").length,
      };
    }
    return {
      totalSent:          stats.totalSent          ?? stats.totalMessagesSent ?? 0,
      totalDelivered:     stats.totalDelivered      ?? 0,
      totalFailed:        stats.totalFailed         ?? 0,
      totalBlocked:       stats.totalBlocked        ?? 0,
      totalCampaigns:     stats.totalCampaigns      ?? 0,
      activeCampaigns:    stats.activeCampaigns     ?? 0,
      completedCampaigns: stats.completedCampaigns  ?? 0,
    };
  }, [hasActiveFilters, filteredCampaigns, stats]);

  const hasData = kpiNumbers.totalSent > 0 || campaigns.length > 0;

  const dailyLimit    = waConfig?.dailyLimit    ?? (waConfig as any)?.daily_limit    ?? 0;
  const displayPhone  = waConfig?.displayPhone  ?? (waConfig as any)?.display_phone  ?? null;
  const qualityRating = waConfig?.qualityRating ?? (waConfig as any)?.quality_rating ?? null;
  const isVerified    = waConfig?.isVerified    ?? (waConfig as any)?.is_verified    ?? false;

  // sentToday comes from the backend, which sums across every send path —
  // campaign blasts, automation triggers (thank_you, review_request,
  // reminders...) and inbox replies — not just campaigns, since all of them
  // count against Meta's daily cap.
  const sentToday = stats.sentToday ?? 0;

  const usagePct    = dailyLimit > 0 ? Math.min((sentToday / dailyLimit) * 100, 100) : 0;
  const isNearLimit = usagePct >= 80 && usagePct < 100;
  const isLimitHit  = usagePct >= 100;

  const qualityColor =
    qualityRating === "GREEN"  ? "#16a34a" :
    qualityRating === "YELLOW" ? "#d97706" : "#ef4444";

  const topCampaigns     = (stats.topCampaigns    ?? []) as any[];
  const topTemplates     = (stats.topTemplates    ?? []) as any[];
  const engagedContacts  = (stats.engagedContacts ?? []) as any[];
  const pendingTemplates = templates.filter((t) => t.status === "PENDING");

  const kpis = [
    {
      label: "Total Sent",
      value: kpiNumbers.totalSent,
      icon:  "ti-send",
      color: "#10b981",
      sub:   "Total messages sent to customers",
    },
    {
      label: "Delivered",
      value: kpiNumbers.totalSent - kpiNumbers.totalFailed - kpiNumbers.totalBlocked,
      icon:  "ti-circle-check",
      color: "#3b82f6",
      sub:   kpiNumbers.totalSent > 0
        ? `${Math.round(((kpiNumbers.totalSent - kpiNumbers.totalFailed - kpiNumbers.totalBlocked) / kpiNumbers.totalSent) * 100)}% of sent`
        : "0% of sent",
    },
    {
      label: "Campaigns Done",
      value: kpiNumbers.totalCampaigns,
      icon:  "ti-speakerphone",
      color: "#111827",
      sub:   `${kpiNumbers.activeCampaigns} active`,
    },
    {
      label: "Failed",
      value: kpiNumbers.totalFailed,
      icon:  "ti-alert-circle",
      color: "#f59e0b",
      sub:   kpiNumbers.totalSent > 0
        ? `${Math.round((kpiNumbers.totalFailed / kpiNumbers.totalSent) * 100)}% of sent`
        : "0% of sent",
    },
    {
      label: "Blocked",
      value: kpiNumbers.totalBlocked,
      icon:  "ti-ban",
      color: "#ef4444",
      sub:   kpiNumbers.totalSent > 0
        ? `${Math.round((kpiNumbers.totalBlocked / kpiNumbers.totalSent) * 100)}% of sent`
        : "0% of sent",
    },
  ];

  // ── ALL hooks done — safe to do conditional returns now ───────────────────

  // Empty state
  if (!isLoading && !hasData && !hasActiveFilters) {
    return (
      <div className="mkt-page">
        {overlay}
        <div className="mkt-page-header">
          <div>
            <h1 className="mkt-page-title">WhatsApp Marketing</h1>
            <p className="mkt-page-sub">Send campaigns, track delivery and manage templates</p>
          </div>
        </div>
        <div className="mkt-empty-state">
          <div className="mkt-empty-icon">📣</div>
          <div className="mkt-empty-title">No campaigns yet</div>
          <div className="mkt-empty-sub">
            Get started by creating a WhatsApp template, then launch your first campaign.
          </div>
          <div className="mkt-empty-actions">
            <Button variant="primary" onClick={() => navigate("/dashboard/marketing/templates/create")}>
              + Create Template
            </Button>
            <Button variant="primary" onClick={() => navigate("/dashboard/marketing/campaigns/create")}>
              + Launch Campaign
            </Button>
          </div>
          <div className="mkt-empty-steps">
            {[
              "Create a WhatsApp message template and get it approved by Meta",
              "Upload your contacts or use existing salon clients",
              "Launch a blast campaign and track delivery in real time",
            ].map((s, i) => (
              <div key={i} className="mkt-step">
                <div className="mkt-step-num">{i + 1}</div>
                <div className="mkt-step-text">{s}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Main dashboard
  return (
    <div className="mkt-page">
      {overlay}

      {/* Header */}
      <div className="mkt-page-header">
        <div>
          <h1 className="mkt-page-title">WhatsApp Marketing</h1>
          <p className="mkt-page-sub">Monitor campaigns, delivery rates and messaging performance</p>
        </div>
        <div className="mkt-header-btns">
          <button
            className={`mkt-filter-btn${filtersOpen ? " mkt-filter-btn--active" : ""}${panelFilterCount > 0 ? " mkt-filter-btn--has" : ""}`}
            onClick={() => setFiltersOpen((o) => !o)}
          >
            <i className="ti ti-adjustments-horizontal" />
            Filters
            {panelFilterCount > 0 && <span className="mkt-filter-dot" />}
          </button>
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
          <Button variant="primary" onClick={() => navigate("/dashboard/marketing/templates/create")}>
            + Template
          </Button>
          <Button variant="primary" onClick={() => navigate("/dashboard/marketing/campaigns/create")}>
            + Campaign
          </Button>
        </div>
      </div>

      {/* Connected WA number banner */}
      {isVerified && displayPhone && (
        <div className="mkt-wa-banner">
          <div className="mkt-wa-banner-left">
            <span className="mkt-wa-dot" />
            <span className="mkt-wa-phone">{displayPhone}</span>
            <span className="mkt-wa-sep">·</span>
            <span className="mkt-wa-tier">
              {dailyLimit >= 999999999
                ? "Unlimited"
                : dailyLimit > 0
                ? `${dailyLimit.toLocaleString("en-IN")} msg/day`
                : "Limit unknown"}
            </span>
            {qualityRating && (
              <>
                <span className="mkt-wa-sep">·</span>
                <span className="mkt-wa-quality" style={{ color: qualityColor }}>
                  {`● ${qualityRating === "GREEN" ? "High quality" : qualityRating === "YELLOW" ? "Medium quality" : "Low quality"}`}
                </span>
              </>
            )}
          </div>
          <button className="mkt-wa-config-link" onClick={() => navigate("/dashboard/marketing/config")}>
            Manage →
          </button>
        </div>
      )}

      {/* Limit exhausted */}
      {isLimitHit && (
        <div className="mkt-limit-banner mkt-limit-banner--exhausted">
          <span className="mkt-limit-icon">🚫</span>
          <div className="mkt-limit-text">
            <strong>Daily messaging limit reached</strong>
            <span>{`You've used all ${dailyLimit.toLocaleString("en-IN")} messages for today. Campaigns resume tomorrow.`}</span>
          </div>
          <button className="mkt-limit-cta" onClick={() => navigate("/dashboard/marketing/config")}>
            View limits →
          </button>
        </div>
      )}

      {/* Near limit */}
      {isNearLimit && (
        <div className="mkt-limit-banner mkt-limit-banner--warning">
          <span className="mkt-limit-icon">⚠️</span>
          <div className="mkt-limit-text">
            <strong>Approaching daily limit</strong>
            <span>{`${sentToday.toLocaleString("en-IN")} of ${dailyLimit.toLocaleString("en-IN")} messages used today (${Math.round(usagePct)}%)`}</span>
          </div>
        </div>
      )}

      {/* Filter Panel */}
      {filtersOpen && (
        <div className="mkt-filter-panel">
          <div className="mkt-filter-row">
            <div className="mkt-filter-group">
              <label className="mkt-filter-label">Campaign status</label>
              <div className="mkt-pill-group">
                {(["ALL", "RUNNING", "COMPLETED", "PAUSED", "FAILED", "SCHEDULED"] as CampaignStatusFilter[]).map((s) => (
                  <button
                    key={s}
                    className={`mkt-pill${campFilter === s ? " mkt-pill--active" : ""}`}
                    onClick={() => setCampFilter(s)}
                  >
                    {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
            {panelFilterCount > 0 && (
              <button
                className="mkt-filter-clear"
                onClick={() => setCampFilter("ALL")}
              >
                Clear all
              </button>
            )}
          </div>
          {hasActiveFilters && (
            <div className="mkt-filter-note">KPI cards reflect filtered campaigns only</div>
          )}
        </div>
      )}

      {/* Pending templates banner */}
      {pendingTemplates.length > 0 && (
        <div className="mkt-pending-banner" onClick={() => navigate("/dashboard/marketing/templates")}>
          <span className="mkt-pending-pulse" />
          <span className="mkt-pending-text">
            <strong>{`${pendingTemplates.length} template${pendingTemplates.length > 1 ? "s" : ""}`}</strong>
            {" pending Meta approval"}
            {pendingTemplates.length <= 3 && (
              <span className="mkt-pending-names">
                {`: ${pendingTemplates.map((t) => `"${t.name}"`).join(", ")}`}
              </span>
            )}
          </span>
          <span className="mkt-pending-cta">View templates →</span>
        </div>
      )}

      {isLoading ? (
        <div className="mkt-loading">Loading stats…</div>
      ) : (
        <>
          {/* KPI Grid */}
          <div className="mkt-kpi-grid">
            {kpis.map((k) => (
              <div key={k.label} className="mkt-kpi-card">
                <div className="mkt-kpi-top">
                  <span className="mkt-kpi-icon" style={{ color: k.color }}>
                    <i className={`ti ${k.icon}`} />
                  </span>
                </div>
                <div className="mkt-kpi-value">{k.value.toLocaleString("en-IN")}</div>
                <div className="mkt-kpi-label">{k.label}</div>
                {k.sub && <div className="mkt-kpi-sub">{k.sub}</div>}
              </div>
            ))}
          </div>

          {/* Usage bar */}
          {isVerified && dailyLimit > 0 && (
            <div className="mkt-usage-bar-wrap">
              <div className="mkt-usage-bar-header">
                <span className="mkt-usage-bar-label">
                  {"Today's usage "}
                  <span className="mkt-usage-bar-nums">
                    {`${sentToday.toLocaleString("en-IN")} / ${dailyLimit.toLocaleString("en-IN")} messages`}
                  </span>
                </span>
                <span
                  className="mkt-usage-bar-pct"
                  style={{ color: isLimitHit ? "#ef4444" : isNearLimit ? "#f59e0b" : "#10b981" }}
                >
                  {`${Math.round(usagePct)}% used`}
                </span>
              </div>
              <div className="mkt-usage-track">
                <div
                  className={`mkt-usage-fill${isLimitHit ? " mkt-usage-fill--exhausted" : isNearLimit ? " mkt-usage-fill--warning" : ""}`}
                  style={{ width: `${usagePct}%` }}
                />
              </div>
              {isLimitHit  && <div className="mkt-usage-hint mkt-usage-hint--red">Limit reached — new campaigns cannot be sent until tomorrow</div>}
              {isNearLimit && <div className="mkt-usage-hint mkt-usage-hint--amber">{`${(dailyLimit - sentToday).toLocaleString("en-IN")} messages remaining today`}</div>}
            </div>
          )}

          {/* Campaign Performance */}
          <div className="mkt-card mkt-perf-card">
            <div className="mkt-perf-header">
              <div className="mkt-card-title">🏆 Campaign Performance</div>
              <button className="mkt-view-all" onClick={() => navigate("/dashboard/marketing/campaigns/history")}>
                View all →
              </button>
            </div>
            {topCampaigns.length === 0 ? (
              <div className="mkt-table-empty">No campaigns yet</div>
            ) : (
              <div className="mkt-table-wrap">
                <table className="mkt-table">
                  <thead>
                    <tr>
                      <th>Campaign</th>
                      <th>Status</th>
                      <th>Sent</th>
                      <th>Delivery rate</th>
                      <th>Read rate</th>
                      <th>Failed</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCampaigns.map((c: any, i: number) => (
                      <tr
                        key={c.id}
                        className="mkt-campaign-row"
                        onClick={() => navigate("/dashboard/marketing/campaigns/history")}
                      >
                        <td>
                          <div className="mkt-camp-name-cell">
                            {i === 0 && <span className="mkt-rank-badge">🥇</span>}
                            {i === 1 && <span className="mkt-rank-badge">🥈</span>}
                            {i === 2 && <span className="mkt-rank-badge">🥉</span>}
                            <span className="mkt-campaign-name">{c.name}</span>
                          </div>
                        </td>
                        <td>
                          <Badge variant={CAMPAIGN_STATUS_BADGE[c.status] ?? "secondary"}>
                            {CAMPAIGN_STATUS_LABEL[c.status] ?? c.status}
                          </Badge>
                        </td>
                        <td>{Number(c.sent_count).toLocaleString("en-IN")}</td>
                        <td><RateBar value={Number(c.delivery_rate)} color="#3b82f6" /></td>
                        <td><RateBar value={Number(c.read_rate)} color="#8b5cf6" /></td>
                        <td className={Number(c.failed_count) > 0 ? "mkt-td-fail" : ""}>
                          {Number(c.failed_count).toLocaleString("en-IN")}
                        </td>
                        <td className="mkt-td-date">{fmtDate(c.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Top Templates + Engaged Contacts */}
          <div className="mkt-insight-row">
            <div className="mkt-card mkt-insight-card">
              <div className="mkt-card-title">📐 Top Performing Templates</div>
              {topTemplates.length === 0 ? (
                <div className="mkt-table-empty">No template data yet</div>
              ) : (
                <div className="mkt-template-list">
                  {topTemplates.map((t: any, i: number) => (
                    <div key={t.template_id ?? i} className="mkt-template-row">
                      <div className="mkt-template-rank">{i + 1}</div>
                      <div className="mkt-template-info">
                        <div className="mkt-template-name">{t.template_name}</div>
                        <div className="mkt-template-meta">
                          {`Used in ${t.times_used} campaign${t.times_used > 1 ? "s" : ""} · ${Number(t.total_sent).toLocaleString("en-IN")} sent`}
                        </div>
                      </div>
                      <div className="mkt-template-rates">
                        <div className="mkt-template-rate">
                          <span className="mkt-rate-dot" style={{ background: "#8b5cf6" }} />
                          <span>{`${Number(t.avg_read_rate).toFixed(1)}% read`}</span>
                        </div>
                        <div className="mkt-template-rate">
                          <span className="mkt-rate-dot" style={{ background: "#3b82f6" }} />
                          <span>
                            {`${Number(t.total_sent) > 0
                              ? Math.round((Number(t.total_delivered) / Number(t.total_sent)) * 100)
                              : 0}% delivered`}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mkt-card mkt-insight-card">
              <div className="mkt-card-title">⭐ Most Engaged Contacts</div>
              <div className="mkt-card-subtitle">Contacts who consistently read your messages</div>
              {engagedContacts.length === 0 ? (
                <div className="mkt-table-empty">No engagement data yet</div>
              ) : (
                <div className="mkt-engaged-list">
                  {engagedContacts.map((c: any) => (
                    <div key={c.phone} className="mkt-engaged-row">
                      <div className="mkt-engaged-avatar">
                        {(c.name ?? c.phone).slice(-2).toUpperCase()}
                      </div>
                      <div className="mkt-engaged-info">
                        <div className="mkt-engaged-name">{c.name ?? maskMobile(c.phone)}</div>
                        <div className="mkt-engaged-phone">{c.name ? maskMobile(c.phone) : ""}</div>
                      </div>
                      <div className="mkt-engaged-stats">
                        <div className="mkt-engaged-stat">
                          <span className="mkt-engaged-val" style={{ color: "#8b5cf6" }}>
                            {c.campaigns_read}
                          </span>
                          <span className="mkt-engaged-label">reads</span>
                        </div>
                        <div className="mkt-engaged-stat">
                          <span
                            className="mkt-engaged-val"
                            style={{ color: Number(c.read_rate) >= 80 ? "#10b981" : "#f59e0b" }}
                          >
                            {`${Number(c.read_rate).toFixed(0)}%`}
                          </span>
                          <span className="mkt-engaged-label">rate</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}