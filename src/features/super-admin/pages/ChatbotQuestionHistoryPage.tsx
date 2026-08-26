import { useState, useEffect, useCallback } from "react";
import api from "../../../services/api/axios";
import { BOT_QUESTIONS } from "../../../services/api/endpoints";
import Pagination from "../components/Pagination";

interface BotQuestion {
  id: string;
  salon_id: string | null;
  salon_name: string | null;
  user_id: string | null;
  question: string;
  answer: string | null;
  source: "predefined" | "groq" | "error";
  matched_id: string | null;
  matched_category: string | null;
  created_at: string;
}

interface FrequentQuestion {
  matched_id: string | null;
  matched_category: string | null;
  sample_question: string;
  ask_count: number;
  last_asked_at: string;
}

interface Stats {
  total: number;
  answered: number;
  unanswered: number;
  predefined: number;
  groq: number;
}

const ANSWERED_OPTIONS = [
  { value: "", label: "All Questions" },
  { value: "answered", label: "Answered" },
  { value: "unanswered", label: "Unanswered" },
];

const SOURCE_LABEL: Record<string, string> = {
  predefined: "Predefined",
  groq: "AI (Groq)",
  error: "Error",
};

const SOURCE_COLORS: Record<string, { bg: string; text: string }> = {
  predefined: { bg: "#eff6ff", text: "#3b82f6" },
  groq:       { bg: "#f5f3ff", text: "#7c3aed" },
  error:      { bg: "#fef2f2", text: "#dc2626" },
};

function isAnswered(q: BotQuestion): boolean {
  if (q.source === "error") return false;
  if (q.source === "predefined") return true;
  return !!q.answer && !/couldn.t (reach|find)/i.test(q.answer);
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "16px 18px", flex: "1 1 140px", minWidth: 130 }}>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

function SourceBadge({ source }: { source: BotQuestion["source"] }) {
  const c = SOURCE_COLORS[source] ?? SOURCE_COLORS.groq;
  return (
    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: c.bg, color: c.text, whiteSpace: "nowrap" }}>
      {SOURCE_LABEL[source] ?? source}
    </span>
  );
}

function AnswerModal({ question, onClose, onSaved }: { question: BotQuestion; onClose: () => void; onSaved: () => void }) {
  const [category, setCategory] = useState(question.matched_category || "");
  const [triggersText, setTriggersText] = useState("");
  const [answer, setAnswer] = useState(question.answer && question.source !== "error" ? question.answer : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    const triggers = triggersText.split(",").map((t) => t.trim()).filter(Boolean);
    if (!category.trim() || triggers.length === 0 || !answer.trim()) {
      setError("Category, at least one trigger phrase, and an answer are all required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.post(BOT_QUESTIONS.ANSWER(question.id), { category: category.trim(), triggers, answer: answer.trim() });
      onSaved();
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to save answer. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const fieldStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 9,
    border: "1.5px solid #e2e8f0", background: "#fff", color: "#0f172a", fontSize: 13, outline: "none",
    fontFamily: "inherit",
  };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0" }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#0f172a" }}>Answer Question</h2>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b", fontWeight: 600 }}>{question.question}</p>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle}>Category</label>
            <input style={fieldStyle} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Booking, Billing, Clients" />
          </div>
          <div>
            <label style={labelStyle}>Trigger phrases (comma-separated)</label>
            <input style={fieldStyle} value={triggersText} onChange={(e) => setTriggersText(e.target.value)} placeholder="e.g. reschedule, change appointment time" />
            <p style={{ margin: "6px 0 0", fontSize: 11.5, color: "#94a3b8" }}>
              The chatbot matches future questions containing these phrases and answers them automatically.
            </p>
          </div>
          <div>
            <label style={labelStyle}>Answer</label>
            <textarea style={{ ...fieldStyle, minHeight: 100, resize: "vertical" }} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Write the answer to save into the knowledge base…" />
          </div>
          {error && <div style={{ color: "#dc2626", fontSize: 12.5, fontWeight: 600 }}>{error}</div>}
        </div>

        <div style={{ padding: "16px 24px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} disabled={saving} style={{ padding: "9px 18px", borderRadius: 9, border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: "#6366f1", color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving…" : "Save Answer"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChatbotQuestionHistoryPage() {
  const [tab, setTab] = useState<"history" | "frequent">("history");

  const [stats, setStats] = useState<Stats | null>(null);

  const [items, setItems] = useState<BotQuestion[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [answeredFilter, setAnsweredFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const [frequent, setFrequent] = useState<FrequentQuestion[]>([]);
  const [loadingFrequent, setLoadingFrequent] = useState(true);

  const [answering, setAnswering] = useState<BotQuestion | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get(BOT_QUESTIONS.STATS);
      setStats(res.data?.data ?? null);
    } catch {
      setStats(null);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(BOT_QUESTIONS.LIST, {
        params: {
          search: search || undefined,
          answered: answeredFilter || undefined,
          source: sourceFilter || undefined,
          page,
          limit: perPage,
        },
      });
      const data = res.data?.data;
      setItems(data?.items ?? []);
      setTotal(data?.total ?? 0);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, answeredFilter, sourceFilter, page, perPage]);

  const loadFrequent = useCallback(async () => {
    setLoadingFrequent(true);
    try {
      const res = await api.get(BOT_QUESTIONS.FREQUENT, { params: { limit: 30 } });
      setFrequent(res.data?.data ?? []);
    } catch {
      setFrequent([]);
    } finally {
      setLoadingFrequent(false);
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadHistory(); }, [loadHistory]);
  useEffect(() => { if (tab === "frequent") loadFrequent(); }, [tab, loadFrequent]);

  // Any filter change should reset back to page 1, not silently show an
  // empty page 3 of a now-much-smaller result set.
  useEffect(() => { setPage(1); }, [search, answeredFilter, sourceFilter]);

  const inputStyle: React.CSSProperties = {
    padding: "9px 14px", borderRadius: 9, border: "1.5px solid #e2e8f0",
    background: "#fff", color: "#64748b", fontSize: 13, outline: "none",
    appearance: "none", cursor: "pointer",
  };

  return (
    <div style={{ padding: "28px 28px 40px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(99,102,241,0.35)", flexShrink: 0 }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
          </svg>
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>Chatbot Question History</h1>
          <p style={{ margin: "2px 0 0", color: "#94a3b8", fontSize: 13 }}>
            Every question asked to the support chatbot across all salons. Rows older than 30 days are purged automatically.
          </p>
        </div>
      </div>

      {stats && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
          <StatCard label="Total Questions" value={stats.total} color="#0f172a" />
          <StatCard label="Answered" value={stats.answered} color="#16a34a" />
          <StatCard label="Unanswered" value={stats.unanswered} color="#dc2626" />
          <StatCard label="Predefined Matches" value={stats.predefined} color="#3b82f6" />
          <StatCard label="AI Fallback" value={stats.groq} color="#7c3aed" />
        </div>
      )}

      <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1.5px solid #e2e8f0" }}>
        {(["history", "frequent"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "10px 16px", border: "none", background: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 700, color: tab === t ? "#6366f1" : "#94a3b8",
              borderBottom: tab === t ? "2.5px solid #6366f1" : "2.5px solid transparent",
              marginBottom: -1.5,
            }}
          >
            {t === "history" ? "All Questions" : "Most Frequent"}
          </button>
        ))}
      </div>

      {tab === "history" ? (
        <>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            <div style={{ position: "relative", flex: "1 1 260px" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search question text…"
                style={{ width: "100%", boxSizing: "border-box", padding: "9px 14px 9px 34px", borderRadius: 9, border: "1.5px solid #e2e8f0", background: "#fff", color: "#0f172a", fontSize: 13, outline: "none" }}
              />
            </div>
            <select value={answeredFilter} onChange={(e) => setAnsweredFilter(e.target.value)} style={inputStyle}>
              {ANSWERED_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} style={inputStyle}>
              <option value="">All Sources</option>
              <option value="predefined">Predefined</option>
              <option value="groq">AI (Groq)</option>
              <option value="error">Error</option>
            </select>
          </div>

          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "auto", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 1100 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  {["Salon", "Question", "Answer", "Matched ID", "Category", "Source", "Status", "Asked", ""].map((h) => (
                    <th key={h} style={{ padding: "11px 16px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i} style={{ borderTop: "1px solid #f1f5f9" }}>
                      {[...Array(9)].map((_, j) => (
                        <td key={j} style={{ padding: "14px 16px" }}>
                          <div style={{ height: 13, borderRadius: 4, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "bqh-shimmer 1.4s infinite" }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : items.length === 0 ? (
                  <tr><td colSpan={9} style={{ padding: "48px 0", textAlign: "center", color: "#94a3b8", fontSize: 13.5 }}>No questions found</td></tr>
                ) : (
                  items.map((q) => {
                    const answered = isAnswered(q);
                    return (
                      <tr
                        key={q.id}
                        style={{ borderTop: "1px solid #f1f5f9", transition: "background 0.1s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                      >
                        <td style={{ padding: "13px 16px", color: "#0f172a", fontWeight: 600, fontSize: 12.5, whiteSpace: "nowrap" }}>{q.salon_name || <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                        <td style={{ padding: "13px 16px", color: "#0f172a", fontWeight: 600, fontSize: 13, maxWidth: 260 }}>{q.question}</td>
                        <td style={{ padding: "13px 16px", color: answered ? "#374151" : "#dc2626", fontSize: 12.5, maxWidth: 320 }}>{q.answer || "No answer was returned."}</td>
                        <td style={{ padding: "13px 16px", color: "#64748b", fontSize: 12.5 }}>{q.matched_id || <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                        <td style={{ padding: "13px 16px", color: "#64748b", fontSize: 12.5 }}>{q.matched_category || <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                        <td style={{ padding: "13px 16px" }}><SourceBadge source={q.source} /></td>
                        <td style={{ padding: "13px 16px" }}>
                          <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: answered ? "#f0fdf4" : "#fef2f2", color: answered ? "#16a34a" : "#dc2626" }}>
                            {answered ? "Answered" : "Unanswered"}
                          </span>
                        </td>
                        <td style={{ padding: "13px 16px", color: "#94a3b8", fontSize: 12, whiteSpace: "nowrap" }}>{new Date(q.created_at).toLocaleString("en-IN")}</td>
                        <td style={{ padding: "13px 16px", whiteSpace: "nowrap" }}>
                          {!answered && (
                            <button
                              onClick={() => setAnswering(q)}
                              style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "#6366f1", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                            >
                              Answer
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            <Pagination total={total} page={page} perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage} itemLabel="questions" />
          </div>
        </>
      ) : (
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "auto", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 700 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                {["#", "Question", "Category", "Times Asked", "Last Asked"].map((h) => (
                  <th key={h} style={{ padding: "11px 16px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingFrequent ? (
                <tr><td colSpan={5} style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Loading…</td></tr>
              ) : frequent.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: "48px 0", textAlign: "center", color: "#94a3b8", fontSize: 13.5 }}>No predefined questions have been matched yet</td></tr>
              ) : (
                frequent.map((f, i) => (
                  <tr key={f.matched_id} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "13px 16px", color: "#94a3b8", fontSize: 12.5, fontWeight: 700 }}>{i + 1}</td>
                    <td style={{ padding: "13px 16px", color: "#0f172a", fontWeight: 600, fontSize: 13 }}>{f.sample_question}</td>
                    <td style={{ padding: "13px 16px", color: "#64748b", fontSize: 12.5 }}>{f.matched_category || "—"}</td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: "#eef2ff", color: "#6366f1", fontVariantNumeric: "tabular-nums" }}>
                        {f.ask_count}×
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px", color: "#94a3b8", fontSize: 12 }}>{new Date(f.last_asked_at).toLocaleString("en-IN")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <style>{`@keyframes bqh-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>

      {answering && (
        <AnswerModal
          question={answering}
          onClose={() => setAnswering(null)}
          onSaved={() => {
            setAnswering(null);
            loadHistory();
            loadStats();
          }}
        />
      )}
    </div>
  );
}
