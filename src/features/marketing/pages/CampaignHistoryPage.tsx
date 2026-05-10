import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import {
  fetchCampaignsThunk, fetchCampaignContactsThunk,
  pauseCampaignThunk, resumeCampaignThunk,
} from "../../../middleware/marketing/marketing.thunk";
import { Button } from "../../../components/ui";
import { useOnce } from "../../../hooks/useOnce";
import "../styles/CampaignHistoryPage.scss";

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: "#10b981", SENDING: "#3b82f6", RUNNING: "#3b82f6",
  PAUSED: "#f59e0b", FAILED: "#ef4444", DRAFT: "#9ca3af", PENDING: "#9ca3af",
};
const STATUS_LABEL: Record<string, string> = {
  COMPLETED: "✅ Completed", SENDING: "⚡ Sending", RUNNING: "⚡ Running",
  PAUSED: "⏸ Paused", FAILED: "❌ Failed", DRAFT: "📝 Draft", PENDING: "🕐 Pending",
};
const CONTACT_STATUS_COLOR: Record<string, string> = {
  SENT: "#10b981", DELIVERED: "#3b82f6", READ: "#8b5cf6",
  FAILED: "#ef4444", BLOCKED: "#f59e0b", PENDING: "#9ca3af",
};

type ContactFilter = "ALL" | "SENT" | "DELIVERED" | "READ" | "FAILED" | "BLOCKED" | "PENDING";

const exportCSV = (campaign: any, contacts: any[]) => {
  const header = "Phone,Name,Status,Sent At,Delivered At,Read At";
  const rows   = contacts.map(c => [c.phone, c.name ?? "", c.status, c.sent_at ?? "", c.delivered_at ?? "", c.read_at ?? ""].join(","));
  const blob   = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement("a");
  a.href = url; a.download = `${campaign.name}_report.csv`; a.click();
  URL.revokeObjectURL(url);
};

export default function CampaignHistoryPage() {
  const dispatch = useAppDispatch();
  const { campaigns, loading } = useAppSelector((s) => s.marketing);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [contacts,   setContacts]   = useState<Record<string, any[]>>({});
  const [loadingId,  setLoadingId]  = useState<string | null>(null);
  const [filter,     setFilter]     = useState<Record<string, ContactFilter>>({});

  useEffect(() => { dispatch(fetchCampaignsThunk()); }, [dispatch]);

  const toggleExpand = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (!contacts[id]) {
      setLoadingId(id);
      const res = await dispatch(fetchCampaignContactsThunk(id));
      if (fetchCampaignContactsThunk.fulfilled.match(res)) setContacts(prev => ({ ...prev, [id]: res.payload }));
      setLoadingId(null);
    }
  };

  const pct = (a: number, b: number) => b > 0 ? `${Math.round((a / b) * 100)}%` : "0%";

  const getFiltered = (id: string) => {
    const all = contacts[id] ?? []; const f = filter[id] ?? "ALL";
    return f === "ALL" ? all : all.filter(c => c.status === f);
  };

  const [handlePause, pausing]   = useOnce(async (id: string) => { await dispatch(pauseCampaignThunk(id)); });
  const [handleResume, resuming] = useOnce(async (id: string) => { await dispatch(resumeCampaignThunk(id)); });

  return (
    <div className="ch-page">
      <div className="ch-header">
        <div>
          <h1 className="ch-title">Campaign History</h1>
          <p className="ch-sub">Click on a campaign to see contact-level details</p>
        </div>
      </div>

      <div className="ch-summary">
        {[
          { val: campaigns.length,                                                                label: "Total",     color: undefined },
          { val: campaigns.filter(c => c.status === "COMPLETED").length,                          label: "Completed", color: "#10b981" },
          { val: campaigns.filter(c => ["SENDING","RUNNING"].includes(c.status)).length,          label: "Active",    color: "#3b82f6" },
          { val: campaigns.filter(c => c.status === "PAUSED").length,                             label: "Paused",    color: "#f59e0b" },
        ].map(s => (
          <div key={s.label} className="ch-summary-card">
            <span className="ch-summary-val" style={s.color ? { color: s.color } : {}}>{s.val}</span>
            <span className="ch-summary-label">{s.label}</span>
          </div>
        ))}
      </div>

      {loading.fetchCampaigns ? (
        <div className="ch-loading">Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
        <div className="ch-empty"><div className="ch-empty-icon">🚀</div><p>No campaigns yet. Create your first blast campaign!</p></div>
      ) : (
        <div className="ch-list">
          {campaigns.map((c) => {
            const sent      = c.sent_count ?? c.sent ?? 0;
            const delivered = c.delivered_count ?? c.delivered ?? 0;
            const read      = c.read_count ?? c.read ?? 0;
            const failed    = c.failed_count ?? c.failed ?? 0;
            const blocked   = c.blocked_count ?? 0;
            const total     = c.total_contacts ?? c.totalContacts ?? 0;
            const isActive  = ["SENDING","RUNNING"].includes(c.status);
            const isPaused  = c.status === "PAUSED";
            const isOpen    = expandedId === String(c.id);
            const cFilter   = filter[String(c.id)] ?? "ALL";
            const filtered  = getFiltered(String(c.id));

            return (
              <div key={c.id} className={`ch-card ${isOpen ? "ch-card--open" : ""}`}>
                <div className="ch-card-header" onClick={() => toggleExpand(String(c.id))}>
                  <div className="ch-card-left">
                    <h3 className="ch-card-name">{c.name}</h3>
                    <p className="ch-card-template">📨 {c.template_name ?? "—"}</p>
                  </div>
                  <div className="ch-card-right">
                    <span className="ch-status-badge" style={{ background: `${STATUS_COLOR[c.status]}20`, color: STATUS_COLOR[c.status] }}>
                      {STATUS_LABEL[c.status] ?? c.status}
                    </span>
                    <div className="ch-card-actions" onClick={e => e.stopPropagation()}>
                      {c.status === "SCHEDULED" && c.scheduled_at && (
                      <span className="ch-scheduled-time">
                        📅 {new Date(c.scheduled_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                      </span>
                    )}
                    {isActive && (
                        <Button variant="warning" size="sm" loading={pausing} disabled={pausing || resuming}
                          onClick={() => handlePause(String(c.id))}>⏸ Pause</Button>
                      )}
                      {isPaused && (
                        <Button variant="success" size="sm" loading={resuming} disabled={pausing || resuming}
                          onClick={() => handleResume(String(c.id))}>▶ Resume</Button>
                      )}
                      {contacts[String(c.id)] && (
                        <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); exportCSV(c, contacts[String(c.id)]); }}>
                          ⬇ Export
                        </Button>
                      )}
                    </div>
                    <span className="ch-expand-icon">{isOpen ? "▲" : "▼"}</span>
                  </div>
                </div>

                <div className="ch-progress-wrap">
                  <div className="ch-progress-track">
                    <div className="ch-progress-fill" style={{ width: total > 0 ? `${Math.round((sent / total) * 100)}%` : "0%" }} />
                  </div>
                  <span className="ch-progress-label">{sent}/{total} sent ({pct(sent, total)})</span>
                </div>

                <div className="ch-stats-row">
                  {[
                    { label: "Sent",      val: sent,      color: "#10b981", base: total },
                    { label: "Delivered", val: delivered, color: "#3b82f6", base: sent  },
                    { label: "Read",      val: read,      color: "#8b5cf6", base: sent  },
                    { label: "Failed",    val: failed,    color: "#ef4444", base: total },
                    { label: "Blocked",   val: blocked,   color: "#f59e0b", base: total },
                  ].map(s => (
                    <div key={s.label} className="ch-stat">
                      <span className="ch-stat-dot" style={{ background: s.color }} />
                      <span className="ch-stat-val">{s.val.toLocaleString("en-IN")}</span>
                      <span className="ch-stat-label">{s.label}</span>
                      <span className="ch-stat-pct">{pct(s.val, s.base)}</span>
                    </div>
                  ))}
                  <div className="ch-stat ch-stat-meta">
                    <span className="ch-stat-label">Created:</span>
                    <span className="ch-stat-val">{new Date(c.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                  </div>
                </div>

                {isOpen && (
                  <div className="ch-detail">
                    <div className="ch-detail-header">
                      <span className="ch-detail-title">📋 Contact Details</span>
                      <div className="ch-filter-tabs">
                        {(["ALL","SENT","DELIVERED","READ","FAILED","BLOCKED","PENDING"] as ContactFilter[]).map(f => (
                          <button key={f} className={`ch-filter-tab ${cFilter === f ? "ch-filter-tab--active" : ""}`}
                            onClick={() => setFilter(prev => ({ ...prev, [String(c.id)]: f }))}>{f}</button>
                        ))}
                      </div>
                    </div>
                    {loadingId === String(c.id) ? (
                      <div className="ch-detail-loading">Loading contacts...</div>
                    ) : filtered.length === 0 ? (
                      <div className="ch-detail-empty">No contacts found for this filter.</div>
                    ) : (
                      <div className="ch-contact-table">
                        <div className="ch-contact-row ch-contact-row--head">
                          <span>Phone</span><span>Name</span><span>Status</span>
                          <span>Sent At</span><span>Delivered At</span><span>Read At</span>
                        </div>
                        {filtered.map((ct: any) => (
                          <div key={ct.id} className="ch-contact-row">
                            <span className="ch-contact-phone">📱 {ct.phone}</span>
                            <span>{ct.name ?? "—"}</span>
                            <span className="ch-contact-status" style={{ color: CONTACT_STATUS_COLOR[ct.status] ?? "#9ca3af" }}>● {ct.status}</span>
                            <span>{ct.sent_at      ? new Date(ct.sent_at).toLocaleTimeString("en-IN",      { hour: "2-digit", minute: "2-digit" }) : "—"}</span>
                            <span>{ct.delivered_at ? new Date(ct.delivered_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}</span>
                            <span>{ct.read_at      ? new Date(ct.read_at).toLocaleTimeString("en-IN",      { hour: "2-digit", minute: "2-digit" }) : "—"}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}