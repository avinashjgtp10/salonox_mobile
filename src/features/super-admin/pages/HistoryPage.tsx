import { useState, useEffect, useCallback } from "react";
import api from "../../../services/api/axios";
import { SUPER_ADMIN } from "../../../services/api/endpoints";
import Pagination from "../components/Pagination";

interface DeletedAccountEntry {
  id: string;
  account_type: "user" | "salon";
  account_id: string;
  account_email: string | null;
  account_name: string | null;
  account_role: string | null;
  reason: string | null;
  created_at: string;
  deleted_by_name: string | null;
  deleted_by_email: string | null;
}

const ACCOUNT_TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "user", label: "User" },
  { value: "salon", label: "Salon" },
];

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  user:  { bg: "#eff6ff", text: "#3b82f6" },
  salon: { bg: "#f5f3ff", text: "#7c3aed" },
};

function TypeBadge({ type }: { type: string }) {
  const c = TYPE_COLORS[type] ?? TYPE_COLORS.user;
  return (
    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: c.bg, color: c.text, textTransform: "capitalize", whiteSpace: "nowrap" }}>
      {type}
    </span>
  );
}

// One tab today (Delete Account History) — kept as a tab list rather than a
// single page so future history types (e.g. login history, permission
// changes) can be added here as additional tabs without another page/route.
const TABS = [
  { key: "deleted-accounts", label: "Delete Account History" },
] as const;

function DeletedAccountHistoryTab() {
  const [items, setItems] = useState<DeletedAccountEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(SUPER_ADMIN.DELETED_ACCOUNT_HISTORY, {
        params: {
          search: search || undefined,
          account_type: typeFilter || undefined,
          page,
          per_page: perPage,
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
  }, [search, typeFilter, page, perPage]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, typeFilter]);

  const inputStyle: React.CSSProperties = {
    padding: "9px 14px", borderRadius: 9, border: "1.5px solid #e2e8f0",
    background: "#fff", color: "#64748b", fontSize: 13, outline: "none",
    appearance: "none", cursor: "pointer",
  };

  return (
    <>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ position: "relative", flex: "1 1 260px" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            style={{ width: "100%", boxSizing: "border-box", padding: "9px 14px 9px 34px", borderRadius: 9, border: "1.5px solid #e2e8f0", background: "#fff", color: "#0f172a", fontSize: 13, outline: "none" }}
          />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={inputStyle}>
          {ACCOUNT_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "auto", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 1100 }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              {["Type", "Name", "Email", "Role", "Deleted By", "Reason", "Deleted At"].map((h) => (
                <th key={h} style={{ padding: "11px 16px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i} style={{ borderTop: "1px solid #f1f5f9" }}>
                  {[...Array(7)].map((_, j) => (
                    <td key={j} style={{ padding: "14px 16px" }}>
                      <div style={{ height: 13, borderRadius: 4, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "dah-shimmer 1.4s infinite" }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: "48px 0", textAlign: "center", color: "#94a3b8", fontSize: 13.5 }}>No deleted accounts found</td></tr>
            ) : (
              items.map((entry) => (
                <tr
                  key={entry.id}
                  style={{ borderTop: "1px solid #f1f5f9", transition: "background 0.1s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                >
                  <td style={{ padding: "13px 16px" }}><TypeBadge type={entry.account_type} /></td>
                  <td style={{ padding: "13px 16px", color: "#0f172a", fontWeight: 600, fontSize: 13 }}>{entry.account_name || <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                  <td style={{ padding: "13px 16px", color: "#374151", fontSize: 12.5 }}>{entry.account_email || <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                  <td style={{ padding: "13px 16px", color: "#64748b", fontSize: 12.5, textTransform: "capitalize" }}>{entry.account_role?.replace(/_/g, " ") || <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ color: "#0f172a", fontSize: 12.5, fontWeight: 600 }}>{entry.deleted_by_name || "—"}</div>
                    <div style={{ color: "#94a3b8", fontSize: 11 }}>{entry.deleted_by_email}</div>
                  </td>
                  <td style={{ padding: "13px 16px", color: "#374151", fontSize: 12.5, maxWidth: 240 }}>{entry.reason || <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                  <td style={{ padding: "13px 16px", color: "#94a3b8", fontSize: 12, whiteSpace: "nowrap" }}>{new Date(entry.created_at).toLocaleString("en-IN")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <Pagination total={total} page={page} perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage} itemLabel="deleted accounts" />
      </div>
    </>
  );
}

export default function HistoryPage() {
  const [tab, setTab] = useState<typeof TABS[number]["key"]>("deleted-accounts");

  return (
    <div style={{ padding: "28px 28px 40px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(99,102,241,0.35)", flexShrink: 0 }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>History</h1>
          <p style={{ margin: "2px 0 0", color: "#94a3b8", fontSize: 13 }}>Activity trails across the platform</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1.5px solid #e2e8f0" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "10px 16px", border: "none", background: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 700, color: tab === t.key ? "#6366f1" : "#94a3b8",
              borderBottom: tab === t.key ? "2.5px solid #6366f1" : "2.5px solid transparent",
              marginBottom: -1.5,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "deleted-accounts" && <DeletedAccountHistoryTab />}

      <style>{`@keyframes dah-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  );
}
