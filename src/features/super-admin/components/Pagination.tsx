interface PaginationProps {
  total: number;
  page: number;
  perPage: number;
  onPageChange: (p: number) => void;
  onPerPageChange: (n: number) => void;
  itemLabel?: string;
}

const PER_PAGE_OPTIONS = [10, 20, 50, 100];

export default function Pagination({ total, page, perPage, onPageChange, onPerPageChange, itemLabel = "items" }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const from       = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to         = Math.min(page * perPage, total);

  // Build page window: always show first, last, current ±1, with "…" gaps
  function pageNumbers(): (number | "…")[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const nums = new Set<number>([1, totalPages, page, page - 1, page + 1].filter(n => n >= 1 && n <= totalPages));
    const sorted = [...nums].sort((a, b) => a - b);
    const result: (number | "…")[] = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push("…");
      result.push(sorted[i]);
    }
    return result;
  }

  const btnBase: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    minWidth: 32, height: 32, borderRadius: 7, border: "1.5px solid #e2e8f0",
    background: "#fff", cursor: "pointer", fontSize: 12.5, fontWeight: 600,
    color: "#374151", transition: "all 0.15s", padding: "0 6px",
    userSelect: "none",
  };
  const btnActive: React.CSSProperties = {
    ...btnBase, background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
    border: "1.5px solid #6366f1", color: "#fff",
    boxShadow: "0 2px 8px rgba(99,102,241,0.35)",
  };
  const btnDisabled: React.CSSProperties = { ...btnBase, opacity: 0.4, cursor: "not-allowed" };

  if (total === 0) return null;

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexWrap: "wrap", gap: 10, padding: "12px 16px",
      borderTop: "1px solid #f1f5f9",
      fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
    }}>
      {/* Left: count info */}
      <span style={{ fontSize: 12.5, color: "#64748b", fontWeight: 500, whiteSpace: "nowrap" }}>
        Showing <strong style={{ color: "#0f172a" }}>{from}–{to}</strong> of{" "}
        <strong style={{ color: "#0f172a" }}>{total}</strong> {itemLabel}
      </span>

      {/* Centre: page buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
        {/* Prev */}
        <button
          style={page === 1 ? btnDisabled : btnBase}
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        {pageNumbers().map((n, i) =>
          n === "…"
            ? <span key={`gap-${i}`} style={{ width: 28, textAlign: "center", color: "#94a3b8", fontSize: 12.5 }}>…</span>
            : <button
                key={n}
                style={n === page ? btnActive : btnBase}
                onClick={() => onPageChange(n as number)}
              >{n}</button>
        )}

        {/* Next */}
        <button
          style={page === totalPages ? btnDisabled : btnBase}
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>

      {/* Right: per-page selector */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap" }}>
        <span style={{ fontSize: 12, color: "#64748b" }}>Rows per page</span>
        <select
          value={perPage}
          onChange={e => { onPerPageChange(Number(e.target.value)); onPageChange(1); }}
          style={{ padding: "4px 10px", borderRadius: 7, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 12.5, color: "#374151", outline: "none", cursor: "pointer" }}
        >
          {PER_PAGE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
    </div>
  );
}
