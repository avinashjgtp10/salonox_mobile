import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { submitTicketThunk, fetchMyTicketsThunk } from "../../../middleware/support/support.thunk";
import { clearSubmitSuccess } from "../../../store/supportSlice";

const CATEGORIES = ["General", "Billing", "Technical", "Feature Request", "Account", "Other"];
const PRIORITIES = [
  { value: "low",    label: "Low",    color: "#10b981" },
  { value: "medium", label: "Medium", color: "#f59e0b" },
  { value: "high",   label: "High",   color: "#ef4444" },
];

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  open:        { bg: "#eff6ff", color: "#2563eb", label: "Open" },
  in_progress: { bg: "#fffbeb", color: "#d97706", label: "In Progress" },
  resolved:    { bg: "#f0fdf4", color: "#16a34a", label: "Resolved" },
  closed:      { bg: "#f8fafc", color: "#64748b", label: "Closed" },
};

const PRI_STYLE: Record<string, { color: string }> = {
  low:    { color: "#10b981" },
  medium: { color: "#f59e0b" },
  high:   { color: "#ef4444" },
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

export default function HelpPage() {
  const dispatch = useAppDispatch();
  const { myTickets, loading, submitSuccess, error } = useAppSelector((s) => s.support);
  const [tab, setTab] = useState<"submit" | "tickets">("submit");

  // Form state
  const [subject,  setSubject]  = useState("");
  const [category, setCategory] = useState("General");
  const [priority, setPriority] = useState("medium");
  const [message,  setMessage]  = useState("");

  useEffect(() => { dispatch(fetchMyTicketsThunk()); }, []);

  useEffect(() => {
    if (submitSuccess) {
      setSubject(""); setCategory("General"); setPriority("medium"); setMessage("");
      dispatch(clearSubmitSuccess());
      setTab("tickets");
    }
  }, [submitSuccess]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    dispatch(submitTicketThunk({ subject, category, message, priority }));
  }

  return (
    <div style={{ padding: "28px 28px 60px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", maxWidth: 760 }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>Help & Support</h1>
        <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>
          Submit a support request or track your existing tickets
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "inline-flex", background: "#f1f5f9", borderRadius: 10, padding: 3, gap: 2, marginBottom: 24 }}>
        {(["submit", "tickets"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "8px 22px", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
            background: tab === t ? "#6366f1" : "transparent",
            color:      tab === t ? "#fff"    : "#64748b",
            transition: "background 0.15s",
          }}>
            {t === "submit" ? "Submit a Request" : `My Tickets${myTickets.length ? ` (${myTickets.length})` : ""}`}
          </button>
        ))}
      </div>

      {/* ── Submit Form ── */}
      {tab === "submit" && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
          <div style={{ padding: "18px 24px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>New Support Request</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>Our team typically responds within 24 hours</div>
          </div>

          <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
            {/* Subject */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Subject *</label>
              <input
                type="text" value={subject} onChange={e => setSubject(e.target.value)}
                placeholder="Briefly describe your issue…"
                style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 9, padding: "10px 13px", fontSize: 13.5, fontFamily: "inherit", outline: "none", boxSizing: "border-box", color: "#0f172a" }}
                onFocus={e => (e.target.style.borderColor = "#6366f1")}
                onBlur={e  => (e.target.style.borderColor = "#e2e8f0")}
              />
            </div>

            {/* Category + Priority row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)}
                  style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 9, padding: "10px 13px", fontSize: 13.5, fontFamily: "inherit", outline: "none", background: "#fff", color: "#0f172a", cursor: "pointer" }}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Priority</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {PRIORITIES.map(p => (
                    <button key={p.value} type="button" onClick={() => setPriority(p.value)} style={{
                      flex: 1, padding: "9px 0", border: `1.5px solid ${priority === p.value ? p.color : "#e2e8f0"}`,
                      borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                      background: priority === p.value ? `${p.color}15` : "#fff",
                      color: priority === p.value ? p.color : "#94a3b8",
                      transition: "all 0.15s",
                    }}>{p.label}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Message */}
            <div style={{ marginBottom: 22 }}>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Message *</label>
              <textarea
                value={message} onChange={e => setMessage(e.target.value)} rows={5}
                placeholder="Describe your issue in detail — include any error messages, steps you've already tried, etc."
                style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 9, padding: "10px 13px", fontSize: 13.5, fontFamily: "inherit", outline: "none", resize: "vertical", boxSizing: "border-box", color: "#0f172a", minHeight: 120 }}
                onFocus={e => (e.target.style.borderColor = "#6366f1")}
                onBlur={e  => (e.target.style.borderColor = "#e2e8f0")}
              />
            </div>

            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 9, padding: "10px 14px", marginBottom: 14, color: "#dc2626", fontSize: 13 }}>{error}</div>
            )}

            <button type="submit" disabled={loading.submit || !subject.trim() || !message.trim()} style={{
              padding: "11px 32px", background: loading.submit ? "#a5b4fc" : "#6366f1", color: "#fff",
              border: "none", borderRadius: 9, fontSize: 14, fontWeight: 700,
              cursor: loading.submit ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              {loading.submit
                ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "sp-spin 0.8s linear infinite" }}><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg> Submitting…</>
                : "Submit Request"}
            </button>
          </form>
        </div>
      )}

      {/* ── My Tickets ── */}
      {tab === "tickets" && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
          <div style={{ padding: "18px 24px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Your Support Tickets</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{myTickets.length} ticket{myTickets.length !== 1 ? "s" : ""} found</div>
            </div>
            <button onClick={() => dispatch(fetchMyTicketsThunk())} style={{ padding: "7px 14px", background: "#f1f5f9", border: "none", borderRadius: 8, fontSize: 12.5, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>
              Refresh
            </button>
          </div>

          {loading.myTickets ? (
            <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Loading…</div>
          ) : myTickets.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <div style={{ color: "#64748b", fontSize: 14, fontWeight: 600 }}>No tickets yet</div>
              <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>
                <button onClick={() => setTab("submit")} style={{ color: "#6366f1", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>Submit your first request</button>
              </div>
            </div>
          ) : (
            myTickets.map((ticket, i) => {
              const s = STATUS_STYLE[ticket.status] ?? STATUS_STYLE.open;
              const p = PRI_STYLE[ticket.priority] ?? PRI_STYLE.medium;
              return (
                <div key={ticket.id} style={{ padding: "18px 24px", borderBottom: i < myTickets.length - 1 ? "1px solid #f8fafc" : "none" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{ticket.subject}</div>
                      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{ticket.category} · {timeAgo(ticket.created_at)}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: p.color, background: `${p.color}15`, padding: "3px 9px", borderRadius: 20, textTransform: "capitalize" }}>{ticket.priority}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: s.color, background: s.bg, padding: "3px 9px", borderRadius: 20 }}>{s.label}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>{ticket.message}</div>
                  {ticket.admin_reply && (
                    <div style={{ marginTop: 12, padding: "12px 14px", background: "#f0fdf4", borderRadius: 10, border: "1px solid #bbf7d0" }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: "#16a34a", marginBottom: 4 }}>✓ Support Team Reply · {ticket.replied_at ? timeAgo(ticket.replied_at) : ""}</div>
                      <div style={{ fontSize: 13, color: "#166534" }}>{ticket.admin_reply}</div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      <style>{`@keyframes sp-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
