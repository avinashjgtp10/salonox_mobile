import { useState, useEffect } from "react";
import {
  LifePreserver,
  Clock,
  ClockHistory,
  BoxArrowUpRight,
  Envelope,
  Telephone,
  Whatsapp,
  Megaphone,
  FileEarmark,
  ArrowClockwise,
  ExclamationCircle,
  InboxFill,
  CheckCircleFill,
} from "react-bootstrap-icons";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { submitTicketThunk, fetchMyTicketsThunk } from "../../../middleware/support/support.thunk";
import { clearSubmitSuccess } from "../../../store/supportSlice";
import "../styles/HelpPage.scss";

const CATEGORIES = ["General", "Billing", "Technical", "Feature Request", "Account", "Other"];
const PRIORITIES = [
  { value: "low",    label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high",   label: "High" },
];
const MESSAGE_MAX = 1000;

const STATUS_LABEL: Record<string, string> = {
  open:        "Open",
  in_progress: "In Progress",
  resolved:    "Resolved",
  closed:      "Closed",
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

  function handleCancel() {
    setSubject(""); setCategory("General"); setPriority("medium"); setMessage("");
  }

  const messageLength = message.length;
  const isNearLimit = messageLength > MESSAGE_MAX * 0.9;

  return (
    <div className="hs-page">
      {/* Header */}
      <div className="hs-header">
        <div className="hs-header-icon"><LifePreserver size={22} /></div>
        <div>
          <h1 className="hs-title">Help &amp; Support</h1>
          <p className="hs-subtitle">
            Need assistance? Submit a support request or track your existing tickets.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="hs-tabs">
        {(["submit", "tickets"] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={`hs-tab ${tab === t ? "hs-tab--active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "submit" ? "Submit a Request" : "My Tickets"}
            {t === "tickets" && myTickets.length > 0 && (
              <span className="hs-tab-count">{myTickets.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="hs-layout">
        <div>
          {/* ── Submit Form ── */}
          {tab === "submit" && (
            <div className="hs-card">
              <div className="hs-card-header">
                <div className="hs-card-title">New Support Request</div>
                <div className="hs-card-sub">Our team typically responds within 24 hours</div>
              </div>

              <form onSubmit={handleSubmit} className="hs-form">
                <div className="hs-field">
                  <label className="hs-label">Subject <span className="hs-req">*</span></label>
                  <input
                    type="text"
                    className="hs-input"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Briefly describe your issue…"
                  />
                </div>

                <div className="hs-field-row">
                  <div>
                    <label className="hs-label">Category</label>
                    <select className="hs-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="hs-label">Priority</label>
                    <div className="hs-priority-group">
                      {PRIORITIES.map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          className={`hs-priority-chip hs-priority-chip--${p.value} ${priority === p.value ? "hs-priority-chip--active" : ""}`}
                          onClick={() => setPriority(p.value)}
                        >
                          <span className="hs-priority-dot" />
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="hs-field">
                  <label className="hs-label">Message <span className="hs-req">*</span></label>
                  <textarea
                    className="hs-textarea"
                    rows={5}
                    value={message}
                    maxLength={MESSAGE_MAX}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your issue in detail — include any error messages, steps you've already tried, etc."
                  />
                  <span className={`hs-char-count ${isNearLimit ? "hs-char-count--warn" : ""}`}>
                    {messageLength} / {MESSAGE_MAX}
                  </span>
                </div>

                {error && (
                  <div className="hs-alert hs-alert--error">
                    <ExclamationCircle size={14} />
                    {error}
                  </div>
                )}

                <div className="hs-actions">
                  <button
                    type="submit"
                    className="hs-btn hs-btn--primary"
                    disabled={loading.submit || !subject.trim() || !message.trim()}
                  >
                    {loading.submit ? (
                      <>
                        <ArrowClockwise size={14} className="hs-spin" />
                        Submitting…
                      </>
                    ) : (
                      "Submit Request"
                    )}
                  </button>
                  <button
                    type="button"
                    className="hs-btn hs-btn--ghost"
                    onClick={handleCancel}
                    disabled={loading.submit}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── My Tickets ── */}
          {tab === "tickets" && (
            <div className="hs-card">
              <div className="hs-card-header hs-tickets-header">
                <div>
                  <div className="hs-card-title">Your Support Tickets</div>
                  <div className="hs-card-sub">{myTickets.length} ticket{myTickets.length !== 1 ? "s" : ""} found</div>
                </div>
                <button className="hs-refresh-btn" onClick={() => dispatch(fetchMyTicketsThunk())}>
                  <ArrowClockwise size={12} />
                  Refresh
                </button>
              </div>

              {loading.myTickets ? (
                <div className="hs-ticket-loading">Loading…</div>
              ) : myTickets.length === 0 ? (
                <div className="hs-ticket-empty">
                  <div className="hs-ticket-empty-icon"><InboxFill size={20} /></div>
                  <div className="hs-ticket-empty-title">No tickets yet</div>
                  <div className="hs-ticket-empty-sub">
                    <button className="hs-link-btn" onClick={() => setTab("submit")}>Submit your first request</button>
                  </div>
                </div>
              ) : (
                myTickets.map((ticket) => {
                  const statusLabel = STATUS_LABEL[ticket.status] ?? ticket.status;
                  return (
                    <div key={ticket.id} className="hs-ticket-row">
                      <div className="hs-ticket-top">
                        <div>
                          <div className="hs-ticket-subject">{ticket.subject}</div>
                          <div className="hs-ticket-meta">{ticket.category} · {timeAgo(ticket.created_at)}</div>
                        </div>
                        <div className="hs-ticket-badges">
                          <span className={`hs-badge hs-badge--priority-${ticket.priority}`}>{ticket.priority}</span>
                          <span className={`hs-badge hs-badge--status-${ticket.status}`}>{statusLabel}</span>
                        </div>
                      </div>
                      <div className="hs-ticket-message">{ticket.message}</div>
                      {ticket.attachments && ticket.attachments.length > 0 && (
                        <div className="hs-ticket-attachments">
                          {ticket.attachments.map((url, i) => (
                            <a key={url} href={url} target="_blank" rel="noreferrer" className="hs-ticket-attachment-link">
                              <FileEarmark size={12} />
                              Attachment {i + 1}
                            </a>
                          ))}
                        </div>
                      )}
                      {ticket.admin_reply && (
                        <div className="hs-ticket-reply">
                          <div className="hs-ticket-reply-head">
                            <CheckCircleFill size={11} />
                            Support Team Reply · {ticket.replied_at ? timeAgo(ticket.replied_at) : ""}
                          </div>
                          <div className="hs-ticket-reply-body">{ticket.admin_reply}</div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* ── Info sidebar ── */}
        <div className="hs-sidebar">
          <div className="hs-side-card">
            <div className="hs-side-title"><Clock size={14} /> Support Hours</div>
            <div className="hs-side-row">
              <span className="hs-side-row-label">Monday – Friday</span>
              <span className="hs-side-row-value">9:00 AM – 8:00 PM</span>
            </div>
            <div className="hs-side-row">
              <span className="hs-side-row-label">Saturday</span>
              <span className="hs-side-row-value">10:00 AM – 5:00 PM</span>
            </div>
            <div className="hs-side-row">
              <span className="hs-side-row-label">Sunday</span>
              <span className="hs-side-row-value">Closed</span>
            </div>
          </div>

          <div className="hs-side-card">
            <div className="hs-side-title"><ClockHistory size={14} /> Average Response Time</div>
            <div className="hs-side-row">
              <span className="hs-side-row-label">High priority</span>
              <span className="hs-side-row-value">~2 hours</span>
            </div>
            <div className="hs-side-row">
              <span className="hs-side-row-label">Medium priority</span>
              <span className="hs-side-row-value">~8 hours</span>
            </div>
            <div className="hs-side-row">
              <span className="hs-side-row-label">Low priority</span>
              <span className="hs-side-row-value">~24 hours</span>
            </div>
          </div>

          <div className="hs-side-card">
            <div className="hs-side-title"><Megaphone size={14} /> Recent Updates</div>
            <div className="hs-update-row">
              <span className="hs-update-dot" />
              <div>
                <div className="hs-update-text">Faster ticket response times for high-priority issues.</div>
                <div className="hs-update-date">2 days ago</div>
              </div>
            </div>
          </div>

          <div className="hs-side-card">
            <div className="hs-side-title">Contact Us</div>
            <div className="hs-contact-row">
              <div className="hs-contact-icon"><Envelope size={14} /></div>
              <div className="hs-contact-info">
                <div className="hs-contact-label">Email</div>
                <div className="hs-contact-value">support@salonox.com</div>
              </div>
            </div>
            <div className="hs-contact-row">
              <div className="hs-contact-icon"><Telephone size={14} /></div>
              <div className="hs-contact-info">
                <div className="hs-contact-label">Phone</div>
                <div className="hs-contact-value">+91 9503302647</div>
              </div>
            </div>
            <div className="hs-contact-row">
              <div className="hs-contact-icon"><Whatsapp size={14} /></div>
              <div className="hs-contact-info">
                <div className="hs-contact-label">WhatsApp</div>
                <div className="hs-contact-value">+91 9503302647</div>
              </div>
            </div>
            <button type="button" className="hs-side-link">
              Visit Help Center
              <BoxArrowUpRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
