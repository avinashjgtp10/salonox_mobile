import { useEffect, useMemo, useState } from "react";
import { Search, CashCoin, CheckCircle, ClockHistory, XCircle } from "react-bootstrap-icons";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchBranchOwnerPaymentsThunk } from "../../../middleware/branchOwner/branchOwner.thunk";
import { DateRangeFilter, JiraFilterMenu, getDateRangePresetValue } from "../../../components/ui";
import type { DateRangeFilterValue, JiraFilterField } from "../../../components/ui";
import { usePagination, BoPagination } from "../components/BranchOwnerUI";

function KpiCard({ icon, bg, label, value, sub }: {
  icon: React.ReactNode; bg: string; label: string; value: string | number; sub?: string;
}) {
  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: "14px 16px", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(15,23,42,0.04)", display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: "#64748b", fontSize: 11.5, fontWeight: 500 }}>{label}</div>
        <div style={{ color: "#0f172a", fontSize: 18, fontWeight: 800, lineHeight: 1.3 }}>{value}</div>
        {sub && <div style={{ color: "#94a3b8", fontSize: 10.5, marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}

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

const STATUS_OPTIONS = [
  { id: "paid", label: "Paid" },
  { id: "pending", label: "Pending" },
  { id: "failed", label: "Failed" },
];

export default function BranchOwnerPaymentsPage() {
  const dispatch = useAppDispatch();
  const { payments, loading } = useAppSelector((s) => s.branchOwner);

  const [dateRange, setDateRange] = useState<DateRangeFilterValue>({ preset: "all_time", ...getDateRangePresetValue("all_time") });
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [methodFilter, setMethodFilter] = useState<string[]>([]);
  const [salonFilter, setSalonFilter] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    dispatch(fetchBranchOwnerPaymentsThunk(statusFilter.length === 1 ? statusFilter[0] : undefined));
  }, [dispatch, statusFilter]);

  const fmt = (n: any) => n != null ? `₹${Number(n).toLocaleString("en-IN")}` : "—";

  const methodOptions = useMemo(() => {
    const seen = new Map<string, string>();
    payments.forEach((p) => {
      if (p.payment_method && !seen.has(p.payment_method)) seen.set(p.payment_method, p.payment_method);
    });
    return Array.from(seen.entries()).map(([id, label]) => ({ id, label }));
  }, [payments]);

  // Keyed by salon_id when present, falling back to the salon name itself —
  // a handful of payment rows can lack salon_id (see BranchOwnerPayment's
  // optional field), and without this fallback those salons would have no
  // way to appear in the filter at all.
  const salonOptions = useMemo(() => {
    const seen = new Map<string, string>();
    payments.forEach((p) => {
      const key = p.salon_id || p.salon_name;
      if (key && !seen.has(key)) seen.set(key, p.salon_name);
    });
    return Array.from(seen.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [payments]);

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "salon", label: "Salon Name", options: salonOptions, searchable: true },
    { key: "status", label: "Payment Status", options: STATUS_OPTIONS },
    { key: "method", label: "Payment Method", options: methodOptions, searchable: true },
  ], [salonOptions, methodOptions]);

  const filterMenuSelected = useMemo(() => ({ status: statusFilter, method: methodFilter, salon: salonFilter }), [statusFilter, methodFilter, salonFilter]);

  const handleFiltersApply = (next: Record<string, string[]>) => {
    setStatusFilter(next.status ?? []);
    setMethodFilter(next.method ?? []);
    setSalonFilter(next.salon ?? []);
  };

  const { startDate, endDate } = dateRange;

  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payments.filter((p) => {
      if (startDate && (!p.created_at || p.created_at.slice(0, 10) < startDate)) return false;
      if (endDate && (!p.created_at || p.created_at.slice(0, 10) > endDate)) return false;
      if (methodFilter.length && !methodFilter.includes(p.payment_method)) return false;
      if (salonFilter.length && !salonFilter.includes(p.salon_id || p.salon_name)) return false;
      if (q) {
        const haystack = `${p.salon_name} ${p.invoice_number ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [payments, startDate, endDate, methodFilter, salonFilter, search]);

  const total = filteredPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const kpis = useMemo(() => {
    const paidCount = filteredPayments.filter((p) => p.status === "paid" || p.status === "completed").length;
    const pendingCount = filteredPayments.filter((p) => p.status === "pending" || p.status === "partial").length;
    const failedCount = filteredPayments.filter((p) => p.status === "failed").length;
    return { count: filteredPayments.length, total, paidCount, pendingCount, failedCount };
  }, [filteredPayments, total]);

  const paymentsPage = usePagination(filteredPayments, 10);

  return (
    <div style={{ padding: "28px 28px 40px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>Payments</h1>
        <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>{filteredPayments.length} payment{filteredPayments.length !== 1 ? "s" : ""} · {fmt(total)} total</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        <KpiCard icon={<CashCoin size={16} color="#2563eb" />} bg="#eff6ff" label="Total Amount" value={fmt(kpis.total)} sub={`${kpis.count} payment${kpis.count !== 1 ? "s" : ""}`} />
        <KpiCard icon={<CheckCircle size={16} color="#16a34a" />} bg="#f0fdf4" label="Paid" value={kpis.paidCount} />
        <KpiCard icon={<ClockHistory size={16} color="#d97706" />} bg="#fffbeb" label="Pending" value={kpis.pendingCount} />
        <KpiCard icon={<XCircle size={16} color="#dc2626" />} bg="#fef2f2" label="Failed" value={kpis.failedCount} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
        <JiraFilterMenu fields={filterFields} selected={filterMenuSelected} onApply={handleFiltersApply} triggerLabel="Filters" />
        <div style={{ position: "relative", flex: "1 1 240px", maxWidth: 320 }}>
          <Search size={13} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input
            type="text"
            placeholder="Search salon or invoice no."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "9px 12px 9px 32px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box", background: "#fff" }}
          />
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "auto", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 820 }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              {["Salon Name", "Invoice Number", "Payment Received", "Payment Method", "Payment Status", "Payment Date"].map((h) => (
                <th key={h} style={{ padding: "11px 16px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading.payments ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} style={{ borderTop: "1px solid #f1f5f9" }}>
                  {[...Array(6)].map((_, j) => (
                    <td key={j} style={{ padding: "14px 16px" }}>
                      <div style={{ height: 13, borderRadius: 4, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "bop-shimmer 1.4s infinite" }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filteredPayments.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: "48px 0", textAlign: "center", color: "#94a3b8", fontSize: 13.5 }}>No payments found</td></tr>
            ) : (
              paymentsPage.pageItems.map((p) => (
                <tr key={p.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "13px 16px", color: "#0f172a", fontWeight: 700 }}>{p.salon_name}</td>
                  <td style={{ padding: "13px 16px", color: "#374151" }}>{p.invoice_number || "—"}</td>
                  <td style={{ padding: "13px 16px", color: "#16a34a", fontWeight: 700 }}>{fmt(p.amount)}</td>
                  <td style={{ padding: "13px 16px", color: "#374151", textTransform: "capitalize" }}>{p.payment_method || "—"}</td>
                  <td style={{ padding: "13px 16px" }}><Badge status={p.status} /></td>
                  <td style={{ padding: "13px 16px", color: "#64748b", fontSize: 12.5 }}>{p.created_at ? new Date(p.created_at).toLocaleDateString("en-IN") : "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <BoPagination {...paymentsPage} />
      </div>
      <style>{`@keyframes bop-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  );
}
