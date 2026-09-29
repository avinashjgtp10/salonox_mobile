import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchMySalonsThunk, fetchSalonSubscriptionThunk, fetchSalonInvoicesThunk } from "../../../middleware/branchOwner/branchOwner.thunk";
import Dropdown from "../../../components/ui/Dropdown";
import Loader from "../../../components/ui/Loader";
import SettingsSection from "../../settings/components/SettingsSection";
import { inputStyle } from "../components/BranchOwnerUI";
import type { Subscription, SubscriptionPlan, Invoice } from "../../../features/billing/types/billing.types";

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const fmtMoney = (n: string | number) => `₹${Number(n).toLocaleString("en-IN")}`;

interface SalonSubscriptionRow {
  salonId: string;
  salonName: string;
  staffCount: number;
  subscription: Subscription | null;
  plan: SubscriptionPlan | null;
  invoices: Invoice[];
}

// Expiry-based lifecycle status shown to the branch owner — distinct from
// the raw billing_subscriptions.status (active/trialing/past_due/cancelled)
// since "Active" alone doesn't warn about a renewal coming up in the next
// week the way the mockup's Expiring bucket does.
type LifecycleStatus = "active" | "expiring" | "expired" | "cancelled" | "none";

function lifecycleStatus(row: SalonSubscriptionRow): LifecycleStatus {
  const sub = row.subscription;
  if (!sub) return "none";
  if (sub.status === "cancelled") return "cancelled";
  if (sub.status !== "active" && sub.status !== "trialing") return "none";
  const end = sub.current_period_end ? new Date(sub.current_period_end) : null;
  if (!end) return "active";
  const daysLeft = (end.getTime() - Date.now()) / 86400000;
  if (daysLeft < 0) return "expired";
  if (daysLeft <= 14) return "expiring";
  return "active";
}

const STATUS_STYLE: Record<LifecycleStatus, { bg: string; text: string; label: string }> = {
  active:    { bg: "#f0fdf4", text: "#16a34a", label: "Active" },
  expiring:  { bg: "#fffbeb", text: "#d97706", label: "Expiring" },
  expired:   { bg: "#fef2f2", text: "#dc2626", label: "Expired" },
  cancelled: { bg: "#f3f4f6", text: "#6b7280", label: "Cancelled" },
  none:      { bg: "#f3f4f6", text: "#6b7280", label: "No Plan" },
};

function StatusPill({ status }: { status: LifecycleStatus }) {
  const s = STATUS_STYLE[status];
  return <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.text }}>{s.label}</span>;
}

// billing_subscriptions has no auto-renewal or payment_status column — both
// are derived from what does exist (cancel intent via cancelled_at, and
// whether the row is actually active) rather than fabricated fields.
function autoRenewal(sub: Subscription | null): boolean {
  return !!sub && !sub.cancelled_at && sub.status !== "cancelled";
}
function paymentStatus(sub: Subscription | null): string {
  if (!sub) return "—";
  if (sub.status === "active") return "Paid";
  if (sub.status === "trialing") return "Trial";
  if (sub.status === "past_due") return "Overdue";
  return "—";
}

function DetailDrawer({ row, onClose }: { row: SalonSubscriptionRow; onClose: () => void }) {
  const sub = row.subscription;
  const plan = row.plan;
  const status = lifecycleStatus(row);

  const fields: [string, React.ReactNode][] = [
    ["Salon Name", row.salonName],
    ["Plan", plan?.name ?? "Free tier"],
    ["Billing Cycle", plan?.billing_cycle ? plan.billing_cycle.charAt(0).toUpperCase() + plan.billing_cycle.slice(1) : "—"],
    ["Start Date", fmtDate(sub?.current_period_start ?? null)],
    ["Next Billing Date", fmtDate(sub?.current_period_end ?? null)],
    ["Expiry Date", fmtDate(sub?.current_period_end ?? null)],
    ["Amount", sub ? fmtMoney(sub.total_amount) : "—"],
    ["Staff", `${row.staffCount}${plan?.max_staff ? ` / ${plan.max_staff}` : ""}`],
    ["Status", <StatusPill key="s" status={status} />],
    ["Auto Renewal", <span key="ar" style={{ fontWeight: 700, color: autoRenewal(sub) ? "#16a34a" : "#6b7280" }}>{autoRenewal(sub) ? "ON" : "OFF"}</span>],
    ["Payment Status", paymentStatus(sub)],
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 14, padding: "24px 28px", maxWidth: 460, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a" }}>Subscription Details</div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#94a3b8" }}><X size={18} /></button>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <tbody>
            {fields.map(([label, value]) => (
              <tr key={label} style={{ borderTop: "1px solid #f1f5f9" }}>
                <td style={{ padding: "9px 0", color: "#64748b", width: "45%" }}>{label}</td>
                <td style={{ padding: "9px 0", color: "#0f172a", fontWeight: 600 }}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function BranchOwnerSubscriptionSection() {
  const dispatch = useAppDispatch();
  const salons = useAppSelector((s) => s.branchOwner.salons);

  const [rows, setRows] = useState<SalonSubscriptionRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRow, setSelectedRow] = useState<SalonSubscriptionRow | null>(null);

  useEffect(() => { dispatch(fetchMySalonsThunk()); }, [dispatch]);

  useEffect(() => {
    if (salons.length === 0) return;
    let cancelled = false;
    setLoaded(false);
    Promise.all(
      salons.map(async (s) => {
        const [subRes, invRes] = await Promise.all([
          dispatch(fetchSalonSubscriptionThunk(s.id)),
          dispatch(fetchSalonInvoicesThunk(s.id)),
        ]);
        const { subscription, plan } = fetchSalonSubscriptionThunk.fulfilled.match(subRes)
          ? subRes.payload : { subscription: null, plan: null };
        const invoices = fetchSalonInvoicesThunk.fulfilled.match(invRes) ? invRes.payload : [];
        return { salonId: s.id, salonName: s.name, staffCount: s.staff_count ?? 0, subscription, plan, invoices };
      })
    ).then((result) => {
      if (cancelled) return;
      setRows(result);
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [salons, dispatch]);

  const planOptions = useMemo(() => {
    const names = new Set(rows.map((r) => r.plan?.name).filter(Boolean) as string[]);
    return [{ id: "all", name: "All Plans" }, ...Array.from(names).map((n) => ({ id: n, name: n }))];
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !r.salonName.toLowerCase().includes(q)) return false;
      if (planFilter !== "all" && r.plan?.name !== planFilter) return false;
      if (statusFilter !== "all" && lifecycleStatus(r) !== statusFilter) return false;
      return true;
    });
  }, [rows, search, planFilter, statusFilter]);

  const totalSalons = rows.length;
  const activePlans = rows.filter((r) => ["active", "expiring"].includes(lifecycleStatus(r))).length;
  const monthlyCost = rows.reduce((sum, r) => {
    if (!r.subscription || !["active", "trialing"].includes(r.subscription.status)) return sum;
    const amount = parseFloat(r.subscription.total_amount) || 0;
    return sum + (r.plan?.billing_cycle === "yearly" ? amount / 12 : amount);
  }, 0);

  const allInvoices = rows.flatMap((r) => r.invoices.map((inv) => ({ ...inv, salonName: r.salonName })));

  return (
    <>
      <div className="settings-page-header">
        <h2 className="settings-page-title">Subscription Management</h2>
        <p className="settings-page-subtitle">Manage subscriptions for all your salon branches. Read-only — plan changes are made by the salon owner.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 18px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" }}>Total Salons</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>{loaded ? totalSalons : "—"}</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 18px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" }}>Active Plans</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#16a34a", marginTop: 4 }}>{loaded ? activePlans : "—"}</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 18px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" }}>Monthly Cost (approx.)</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>{loaded ? fmtMoney(Math.round(monthlyCost)) : "—"}</div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 280 }}>
          <Search size={13} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input
            type="text"
            placeholder="Search salon"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "9px 12px 9px 32px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box", background: "#fff" }}
          />
        </div>
        <div style={{ width: 170 }}>
          <Dropdown value={planFilter} onChange={setPlanFilter} options={planOptions} placeholder="All Plans" searchable={false} style={inputStyle} />
        </div>
        <div style={{ width: 170 }}>
          <Dropdown
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { id: "all", name: "All Status" },
              { id: "active", name: "Active" },
              { id: "expiring", name: "Expiring" },
              { id: "expired", name: "Expired" },
              { id: "cancelled", name: "Cancelled" },
              { id: "none", name: "No Plan" },
            ]}
            placeholder="All Status"
            searchable={false}
            style={inputStyle}
          />
        </div>
      </div>

      <SettingsSection title="Salon Subscriptions" noPadding>
        {!loaded ? (
          <Loader message="Loading subscriptions…" />
        ) : filteredRows.length === 0 ? (
          <p style={{ fontSize: 13, color: "#6b7280", padding: "16px 22px" }}>No salons match the current filters.</p>
        ) : (
          <div className="bo-table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 850 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Salon", "Plan", "Staff", "Valid Till", "Status", ""].map((h) => (
                  <th key={h} style={{ padding: "10px 20px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.salonId} style={{ borderTop: "1px solid #f8fafc" }}>
                  <td style={{ padding: "11px 20px", fontWeight: 700, color: "#0f172a" }}>{row.salonName}</td>
                  <td style={{ padding: "11px 20px", color: "#475569" }}>{row.plan?.name ?? "Free tier"}</td>
                  <td style={{ padding: "11px 20px", color: "#475569" }}>{row.staffCount}</td>
                  <td style={{ padding: "11px 20px", color: "#475569" }}>{fmtDate(row.subscription?.current_period_end ?? null)}</td>
                  <td style={{ padding: "11px 20px" }}><StatusPill status={lifecycleStatus(row)} /></td>
                  <td style={{ padding: "11px 20px" }}>
                    <button
                      onClick={() => setSelectedRow(row)}
                      style={{ padding: "5px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600, border: "1.5px solid #e2e8f0", cursor: "pointer", background: "#fff", color: "#374151" }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </SettingsSection>

      <div style={{ marginTop: 20 }}>
        <SettingsSection title="Billing History" desc="Invoices across every salon you manage." noPadding>
          {!loaded ? (
            <p style={{ fontSize: 13, color: "#6b7280", padding: "16px 22px" }}>Loading…</p>
          ) : allInvoices.length === 0 ? (
            <p style={{ fontSize: 13, color: "#6b7280", padding: "16px 22px" }}>No invoices yet.</p>
          ) : (
            <div className="bo-table-scroll">
            <table className="settings-billing-table" style={{ minWidth: 700 }}>
              <thead className="settings-billing-head">
                <tr><th>Salon</th><th>Invoice</th><th>Date</th><th>Amount</th><th>Status</th></tr>
              </thead>
              <tbody>
                {allInvoices.map((inv) => (
                  <tr key={inv.id} className="settings-billing-row">
                    <td style={{ fontWeight: 600, fontSize: 12.5 }}>{inv.salonName}</td>
                    <td style={{ fontSize: 12.5 }}>{inv.invoice_number}</td>
                    <td style={{ color: "#6b7280", fontSize: 13 }}>{fmtDate(inv.created_at)}</td>
                    <td style={{ fontWeight: 700 }}>{fmtMoney(inv.total_amount)}</td>
                    <td>
                      <span style={{
                        padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: "capitalize",
                        background: inv.status === "paid" ? "#f0fdf4" : inv.status === "open" ? "#fffbeb" : "#f3f4f6",
                        color: inv.status === "paid" ? "#16a34a" : inv.status === "open" ? "#d97706" : "#6b7280",
                      }}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </SettingsSection>
      </div>

      {selectedRow && <DetailDrawer row={selectedRow} onClose={() => setSelectedRow(null)} />}
    </>
  );
}
