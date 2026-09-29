import { useCallback, useEffect, useState } from "react";
import api from "../../../../services/api/axios";
import { SALON_PLANS } from "../../../../services/api/endpoints";
import type { InvoiceStatus, InvoiceSummary, SalonPlanInvoice } from "./plans.types";
import PlanTierBadge from "./PlanTierBadge";

const STATUS_STYLES: Record<InvoiceStatus, { bg: string; text: string; label: string }> = {
  paid:    { bg: "#f0fdf4", text: "#16a34a", label: "Paid" },
  open:    { bg: "#eff6ff", text: "#3b82f6", label: "Open" },
  overdue: { bg: "#fef2f2", text: "#dc2626", label: "Overdue" },
  void:    { bg: "#f8fafc", text: "#94a3b8", label: "Void" },
};

const fmtDate = (iso: string | null) => iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function BillingInvoicesTab() {
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [invoices, setInvoices] = useState<SalonPlanInvoice[]>([]);
  const [summary, setSummary] = useState<InvoiceSummary>({ total: 0, collected: 0, outstanding: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(SALON_PLANS.INVOICES, {
        params: { status: statusFilter || undefined, search: search || undefined },
      });
      const data = res.data?.data;
      setInvoices(data?.data ?? []);
      setSummary(data?.summary ?? { total: 0, collected: 0, outstanding: 0 });
    } catch {
      setInvoices([]);
      setError("Failed to load invoices. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div>
      {/* ── Summary cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 22 }}>
        {[
          { label: "Total Billed", value: summary.total, color: "#0f172a", bg: "#fff" },
          { label: "Collected", value: summary.collected, color: "#16a34a", bg: "#f0fdf4" },
          { label: "Outstanding", value: summary.outstanding, color: "#dc2626", bg: "#fef2f2" },
        ].map((c) => (
          <div key={c.label} style={{ background: c.bg, border: "1px solid #e2e8f0", borderRadius: 14, padding: 18 }}>
            <div style={{ fontSize: 11.5, color: "#64748b", fontWeight: 600, marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: c.color }}>₹{c.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by salon or invoice #…"
          style={{ flex: "1 1 260px", boxSizing: "border-box", padding: "9px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 13, outline: "none", fontFamily: "inherit" }}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: "9px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", color: "#374151", fontSize: 13, outline: "none", cursor: "pointer" }}>
          <option value="">All Statuses</option>
          <option value="paid">Paid</option>
          <option value="open">Open</option>
          <option value="overdue">Overdue</option>
          <option value="void">Void</option>
        </select>
      </div>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", color: "#dc2626", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* ── Invoice table ── */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "auto", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 800 }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              {["Invoice #", "Salon", "Plan", "Amount", "Status", "Issued", "Due"].map((h) => (
                <th key={h} style={{ padding: "11px 16px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: "48px 0", textAlign: "center", color: "#94a3b8" }}>Loading…</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: "48px 0", textAlign: "center", color: "#94a3b8" }}>No invoices found</td></tr>
            ) : (
              invoices.map((inv) => {
                const s = STATUS_STYLES[inv.status];
                return (
                  <tr key={inv.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "13px 16px", fontWeight: 700, color: "#0f172a" }}>{inv.invoice_number}</td>
                    <td style={{ padding: "13px 16px", color: "#374151" }}>{inv.salon_name}</td>
                    <td style={{ padding: "13px 16px" }}><PlanTierBadge tier={inv.plan_tier} size="sm" /></td>
                    <td style={{ padding: "13px 16px", fontWeight: 700, color: "#0f172a" }}>₹{Number(inv.amount).toLocaleString()}</td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ fontSize: 11.5, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: s.bg, color: s.text }}>{s.label}</span>
                    </td>
                    <td style={{ padding: "13px 16px", color: "#64748b", fontSize: 12.5, whiteSpace: "nowrap" }}>{fmtDate(inv.issued_date)}</td>
                    <td style={{ padding: "13px 16px", color: "#64748b", fontSize: 12.5, whiteSpace: "nowrap" }}>{fmtDate(inv.due_date)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
