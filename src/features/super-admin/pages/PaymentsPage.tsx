import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchSuperAdminPaymentsThunk } from "../../../middleware/superAdmin/superAdmin.thunk";

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  completed: { bg: "#f0fdf4", text: "#16a34a" },
  paid:      { bg: "#f0fdf4", text: "#16a34a" },
  pending:   { bg: "#fffbeb", text: "#d97706" },
  failed:    { bg: "#fef2f2", text: "#dc2626" },
  refunded:  { bg: "#f5f3ff", text: "#7c3aed" },
  partial:   { bg: "#eff6ff", text: "#3b82f6" },
};

export default function PaymentsPage() {
  const dispatch = useAppDispatch();
  const { payments, loading } = useAppSelector((s) => s.superAdmin);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    dispatch(fetchSuperAdminPaymentsThunk(statusFilter || undefined));
  }, [dispatch, statusFilter]);

  const total = payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
  const fmt   = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  const summary = [
    { label: "Total Collected",  value: fmt(payments.filter((p: any) => ["completed","paid"].includes(p.status)).reduce((s: number, p: any) => s + Number(p.amount || 0), 0)), color: "#16a34a", bg: "#f0fdf4" },
    { label: "Pending",          value: payments.filter((p: any) => p.status === "pending").length, color: "#d97706", bg: "#fffbeb" },
    { label: "Failed",           value: payments.filter((p: any) => p.status === "failed").length,  color: "#dc2626", bg: "#fef2f2" },
  ];

  return (
    <div style={{ padding: "28px 28px 40px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>Payments</h1>
          <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>
            {payments.length} transaction{payments.length !== 1 ? "s" : ""} · Total: <span style={{ color: "#0f172a", fontWeight: 700 }}>{fmt(total)}</span>
          </p>
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: "9px 14px", borderRadius: 9, border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: 13, outline: "none", appearance: "none", cursor: "pointer" }}>
          <option value="">All Statuses</option>
          {["completed", "pending", "failed", "refunded", "partial"].map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
        {summary.map(({ label, value, color, bg }) => (
          <div key={label} style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 500, marginBottom: 8 }}>{label}</div>
            <div style={{ color, fontSize: 22, fontWeight: 800 }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "auto", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 600 }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              {["Salon", "Amount", "Method", "Status", "Date"].map(h => (
                <th key={h} style={{ padding: "11px 16px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading.payments ? (
              [...Array(8)].map((_, i) => (
                <tr key={i} style={{ borderTop: "1px solid #f1f5f9" }}>
                  {[...Array(5)].map((_, j) => (
                    <td key={j} style={{ padding: "13px 16px" }}>
                      <div style={{ height: 13, borderRadius: 4, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "sa-shimmer 1.4s infinite" }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : payments.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: "48px 0", textAlign: "center", color: "#94a3b8", fontSize: 13.5 }}>No payments found</td></tr>
            ) : (
              payments.map((p: any) => {
                const c = STATUS_COLOR[p.status] ?? { bg: "#f8fafc", text: "#64748b" };
                return (
                  <tr key={p.id} style={{ borderTop: "1px solid #f1f5f9", transition: "background 0.1s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}>
                    <td style={{ padding: "13px 16px", color: "#0f172a", fontWeight: 700 }}>{p.salon_name}</td>
                    <td style={{ padding: "13px 16px", color: "#16a34a", fontWeight: 800 }}>{fmt(Number(p.amount))}</td>
                    <td style={{ padding: "13px 16px", color: "#64748b", textTransform: "capitalize" }}>{p.payment_method || "—"}</td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11.5, fontWeight: 600, background: c.bg, color: c.text, textTransform: "capitalize" }}>{p.status}</span>
                    </td>
                    <td style={{ padding: "13px 16px", color: "#94a3b8", fontSize: 12.5 }}>
                      {p.created_at ? new Date(p.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <style>{`@keyframes sa-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  );
}
