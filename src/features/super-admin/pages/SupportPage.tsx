import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import {
  fetchAllTicketsThunk,
  fetchSupportStatsThunk,
  replyToTicketThunk,
  updateTicketStatusThunk,
} from "../../../middleware/support/support.thunk";
import type { SupportTicket } from "../../../store/supportSlice";

const STATUS_OPTS = ["all", "open", "in_progress", "resolved", "closed"];
const PRI_OPTS    = ["all", "high", "medium", "low"];

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  open:        { bg: "#eff6ff", color: "#2563eb",  label: "Open" },
  in_progress: { bg: "#fffbeb", color: "#d97706",  label: "In Progress" },
  resolved:    { bg: "#f0fdf4", color: "#16a34a",  label: "Resolved" },
  closed:      { bg: "#f8fafc", color: "#64748b",  label: "Closed" },
};

const PRI_STYLE: Record<string, { color: string }> = {
  high:   { color: "#ef4444" },
  medium: { color: "#f59e0b" },
  low:    { color: "#10b981" },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function StatCard({ label, value, color, bg }: { label: string; value: number | string; color: string; bg: string }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "16px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div style={{ fontSize: 24, fontWeight: 800, color, letterSpacing: "-0.5px" }}>{value ?? 0}</div>
      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500, marginTop: 2 }}>{label}</div>
      <div style={{ height: 3, background: bg, borderRadius: 2, marginTop: 10 }} />
    </div>
  );
}

export default function SupportPage() {
  const dispatch = useAppDispatch();
  const { allTickets, stats, loading, error } = useAppSelector((s) => s.support);

  const [statusFilter,   setStatusFilter]   = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [search,         setSearch]         = useState("");
  const [selected,       setSelected]       = useState<SupportTicket | null>(null);
  const [replyText,      setReplyText]      = useState("");
  const [replyMsg,       setReplyMsg]       = useState("");

  useEffect(() => {
    dispatch(fetchAllTicketsThunk(undefined));
    dispatch(fetchSupportStatsThunk());
  }, []);

  async function handleReply() {
    if (!selected || !replyText.trim()) return;
    const res = await dispatch(replyToTicketThunk({ id: selected.id, reply: replyText.trim() }));
    if (replyToTicketThunk.fulfilled.match(res)) {
      setReplyText("");
      setReplyMsg("✓ Reply sent!");
      setSelected(res.payload);
      setTimeout(() => setReplyMsg(""), 3000);
    }
  }

  async function handleStatus(status: string) {
    if (!selected) return;
    const res = await dispatch(updateTicketStatusThunk({ id: selected.id, status }));
    if (updateTicketStatusThunk.fulfilled.match(res)) setSelected(res.payload);
  }

  const filtered = allTickets.filter(t => {
    if (statusFilter   !== "all" && t.status   !== statusFilter)   return false;
    if (priorityFilter !== "all" && t.priority  !== priorityFilter) return false;
    if (search.trim() && !t.subject.toLowerCase().includes(search.toLowerCase()) &&
        !t.salon_name?.toLowerCase().includes(search.toLowerCase()) &&
        !t.submitter_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ padding: "28px 28px 60px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>Support Tickets</h1>
        <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>Manage and respond to support requests from all salons</p>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 12, marginBottom: 24 }}>
          <StatCard label="Total"       value={stats.total}        color="#0f172a" bg="#e2e8f0" />
          <StatCard label="Open"        value={stats.open}         color="#2563eb" bg="#bfdbfe" />
          <StatCard label="In Progress" value={stats.in_progress}  color="#d97706" bg="#fde68a" />
          <StatCard label="Resolved"    value={stats.resolved}     color="#16a34a" bg="#bbf7d0" />
          <StatCard label="Closed"      value={stats.closed}       color="#64748b" bg="#e2e8f0" />
          <StatCard label="High Priority" value={stats.high_priority} color="#ef4444" bg="#fecaca" />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 420px" : "1fr", gap: 20 }}>

        {/* ── Ticket list ── */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>

          {/* Filters */}
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="text" placeholder="Search tickets…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: 160, border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "7px 12px", fontSize: 13, fontFamily: "inherit", outline: "none" }}
            />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              style={{ border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "7px 10px", fontSize: 12.5, fontFamily: "inherit", background: "#fff", cursor: "pointer", outline: "none" }}>
              {STATUS_OPTS.map(s => <option key={s} value={s}>{s === "all" ? "All Status" : STATUS_STYLE[s]?.label ?? s}</option>)}
            </select>
            <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}
              style={{ border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "7px 10px", fontSize: 12.5, fontFamily: "inherit", background: "#fff", cursor: "pointer", outline: "none" }}>
              {PRI_OPTS.map(p => <option key={p} value={p}>{p === "all" ? "All Priority" : p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
            <button onClick={() => dispatch(fetchAllTicketsThunk({ status: statusFilter !== "all" ? statusFilter : undefined, priority: priorityFilter !== "all" ? priorityFilter : undefined }))}
              style={{ padding: "7px 14px", background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
              Refresh
            </button>
          </div>

          {/* List */}
          {loading.allTickets ? (
            <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Loading tickets…</div>
          ) : error ? (
            <div style={{ padding: "24px", margin: 16, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, color: "#dc2626", fontSize: 13 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Failed to load tickets</div>
              <div style={{ fontFamily: "monospace", fontSize: 12 }}>{error}</div>
              <button onClick={() => dispatch(fetchAllTicketsThunk(undefined))}
                style={{ marginTop: 10, padding: "6px 14px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 7, fontSize: 12, cursor: "pointer" }}>
                Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center", color: "#94a3b8" }}>No tickets match your filters</div>
          ) : filtered.map((ticket, i) => {
            const s = STATUS_STYLE[ticket.status] ?? STATUS_STYLE.open;
            const p = PRI_STYLE[ticket.priority]  ?? PRI_STYLE.medium;
            const isSelected = selected?.id === ticket.id;
            return (
              <div key={ticket.id}
                onClick={() => { setSelected(ticket); setReplyText(ticket.admin_reply ?? ""); setReplyMsg(""); }}
                style={{
                  padding: "14px 20px", borderBottom: i < filtered.length - 1 ? "1px solid #f8fafc" : "none",
                  cursor: "pointer", transition: "background 0.1s",
                  background: isSelected ? "#f0f0ff" : "#fff",
                  borderLeft: isSelected ? "3px solid #6366f1" : "3px solid transparent",
                }}
                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "#f8fafc"; }}
                onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "#fff"; }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {ticket.subject}
                    </div>
                    <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 3 }}>
                      {ticket.salon_name} · {ticket.submitter_name} · {timeAgo(ticket.created_at)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: p.color, padding: "2px 8px", borderRadius: 20, background: `${p.color}15`, textTransform: "capitalize" }}>{ticket.priority}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: s.color, background: s.bg, padding: "2px 8px", borderRadius: 20 }}>{s.label}</span>
                  </div>
                </div>
                <div style={{ fontSize: 12.5, color: "#94a3b8", marginTop: 5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                  {ticket.message}
                </div>
                {ticket.admin_reply && (
                  <div style={{ marginTop: 5, fontSize: 11.5, color: "#16a34a", fontWeight: 600 }}>✓ Replied</div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Ticket Detail ── */}
        {selected && (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 200px)" }}>

            {/* Detail header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{selected.subject}</div>
                <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 2 }}>
                  {selected.category} · {selected.salon_name} · {timeAgo(selected.created_at)}
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ padding: "4px 10px", border: "1px solid #e2e8f0", borderRadius: 7, background: "#fff", cursor: "pointer", fontSize: 13, color: "#64748b", flexShrink: 0 }}>✕</button>
            </div>

            {/* Status change */}
            <div style={{ padding: "12px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginRight: 4, alignSelf: "center" }}>Status:</span>
              {["open", "in_progress", "resolved", "closed"].map(st => {
                const ss = STATUS_STYLE[st];
                return (
                  <button key={st} onClick={() => handleStatus(st)} style={{
                    padding: "4px 11px", fontSize: 11.5, fontWeight: 700, borderRadius: 20, cursor: "pointer", transition: "all 0.15s",
                    border: `1.5px solid ${selected.status === st ? ss.color : "#e2e8f0"}`,
                    background: selected.status === st ? ss.bg : "#fff",
                    color: selected.status === st ? ss.color : "#94a3b8",
                  }}>{ss.label}</button>
                );
              })}
            </div>

            {/* Scrollable body */}
            <div style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}>
              {/* Submitter info */}
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, padding: "10px 12px", background: "#f8fafc", borderRadius: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                  {selected.submitter_name?.[0]?.toUpperCase() ?? "U"}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{selected.submitter_name}</div>
                  <div style={{ fontSize: 11.5, color: "#94a3b8" }}>{selected.submitter_email} · {selected.salon_name}</div>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", gap: 5 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: PRI_STYLE[selected.priority]?.color, padding: "3px 9px", borderRadius: 20, background: `${PRI_STYLE[selected.priority]?.color}15`, textTransform: "capitalize" }}>{selected.priority} priority</span>
                </div>
              </div>

              {/* Message */}
              <div style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.7, marginBottom: 16, padding: "14px 16px", background: "#f8fafc", borderRadius: 10, border: "1px solid #f1f5f9" }}>
                {selected.message}
              </div>

              {/* Existing reply */}
              {selected.admin_reply && (
                <div style={{ padding: "12px 14px", background: "#f0fdf4", borderRadius: 10, border: "1px solid #bbf7d0", marginBottom: 16 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "#16a34a", marginBottom: 6 }}>
                    Your Reply · {selected.replied_at ? timeAgo(selected.replied_at) : ""}
                  </div>
                  <div style={{ fontSize: 13, color: "#166534", lineHeight: 1.6 }}>{selected.admin_reply}</div>
                </div>
              )}

              {/* Reply box */}
              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                  {selected.admin_reply ? "Update Reply" : "Write a Reply"}
                </label>
                <textarea
                  rows={4} value={replyText} onChange={e => setReplyText(e.target.value)}
                  placeholder="Type your reply here…"
                  style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 9, padding: "10px 12px", fontSize: 13, fontFamily: "inherit", outline: "none", resize: "vertical", boxSizing: "border-box", color: "#0f172a" }}
                  onFocus={e => (e.target.style.borderColor = "#6366f1")}
                  onBlur={e  => (e.target.style.borderColor = "#e2e8f0")}
                />
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
                  <button onClick={handleReply} disabled={loading.reply || !replyText.trim()} style={{
                    padding: "9px 22px", background: loading.reply ? "#a5b4fc" : "#6366f1", color: "#fff",
                    border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700,
                    cursor: loading.reply ? "not-allowed" : "pointer",
                  }}>
                    {loading.reply ? "Sending…" : (selected.admin_reply ? "Update Reply" : "Send Reply")}
                  </button>
                  {replyMsg && <span style={{ fontSize: 13, fontWeight: 600, color: "#16a34a" }}>{replyMsg}</span>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
