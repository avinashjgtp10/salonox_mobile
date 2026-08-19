import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchBranchOwnerPaymentsThunk } from "../../../middleware/branchOwner/branchOwner.thunk";

const statusStyle: Record<string, { bg: string; text: string }> = {
  paid:      { bg: "#f0fdf4", text: "#16a34a" },
  completed: { bg: "#f0fdf4", text: "#16a34a" },
  pending:   { bg: "#fffbeb", text: "#d97706" },
  failed:    { bg: "#fef2f2", text: "#dc2626" },
  partial:   { bg: "#eff6ff", text: "#2563eb" },
};

function Badge({ status }: { status: string }) {
  const c = statusStyle[status] ?? { bg: "#f8fafc", text: "#64748b" };
  return <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11.5, fontWeight: 600, background: c.bg, color: c.text, textTransform: "capitalize" }}>{status}</span>;
}

const FILTERS = ["all", "paid", "pending", "failed"] as const;

export default function BranchOwnerPaymentsPage() {
  const dispatch = useAppDispatch();
  const { payments, loading } = useAppSelector((s) => s.branchOwner);
  const [filter, setFilter] = useState<typeof FILTERS[number]>("all");

  useEffect(() => {
    dispatch(fetchBranchOwnerPaymentsThunk(filter === "all" ? undefined : filter));
  }, [dispatch, filter]);

  const fmt = (n: any) => n != null ? `₹${Number(n).toLocaleString("en-IN")}` : "—";
  const total = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  return (
    <div style={{ padding: "28px 28px 40px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>Payments</h1>
          <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>{payments.length} payment{payments.length !== 1 ? "s" : ""} · {fmt(total)} total</p>
        </div>
        <div style={{ display: "flex", gap: 6, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 4 }}>
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "6px 14px", borderRadius: 7, border: "none", cursor: "pointer",
              background: filter === f ? "#eef2ff" : "transparent",
              color: filter === f ? "#6366f1" : "#64748b",
              fontSize: 12.5, fontWeight: 600, textTransform: "capitalize", fontFamily: "inherit",
            }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "auto", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 700 }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              {["Salon", "Amount", "Method", "Status", "Date"].map((h) => (
                <th key={h} style={{ padding: "11px 16px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading.payments ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} style={{ borderTop: "1px solid #f1f5f9" }}>
                  {[...Array(5)].map((_, j) => (
                    <td key={j} style={{ padding: "14px 16px" }}>
                      <div style={{ height: 13, borderRadius: 4, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "bop-shimmer 1.4s infinite" }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : payments.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: "48px 0", textAlign: "center", color: "#94a3b8", fontSize: 13.5 }}>No payments found</td></tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "13px 16px", color: "#0f172a", fontWeight: 700 }}>{p.salon_name}</td>
                  <td style={{ padding: "13px 16px", color: "#16a34a", fontWeight: 700 }}>{fmt(p.amount)}</td>
                  <td style={{ padding: "13px 16px", color: "#374151", textTransform: "capitalize" }}>{p.payment_method || "—"}</td>
                  <td style={{ padding: "13px 16px" }}><Badge status={p.status} /></td>
                  <td style={{ padding: "13px 16px", color: "#64748b", fontSize: 12.5 }}>{p.created_at ? new Date(p.created_at).toLocaleDateString("en-IN") : "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <style>{`@keyframes bop-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  );
}
