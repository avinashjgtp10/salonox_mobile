import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchSuperAdminSubscriptionsThunk, fetchSuperAdminPlansThunk } from "../../../middleware/superAdmin/superAdmin.thunk";

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  active:    { bg: "#f0fdf4", text: "#16a34a" },
  trialing:  { bg: "#fffbeb", text: "#d97706" },
  cancelled: { bg: "#fef2f2", text: "#dc2626" },
  paused:    { bg: "#f8fafc", text: "#64748b" },
  past_due:  { bg: "#fff7ed", text: "#ea580c" },
};

function TabBtn({ id, active, label, onClick }: { id: string; active: boolean; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: "8px 22px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 600,
      background: active ? "#6366f1" : "transparent",
      color: active ? "#fff" : "#64748b",
      transition: "all 0.15s",
      boxShadow: active ? "0 2px 8px rgba(99,102,241,0.3)" : "none",
    }}>{label}</button>
  );
}

export default function BillingPage() {
  const dispatch = useAppDispatch();
  const { subscriptions = [], plans = [], loading } = useAppSelector((s) => s.superAdmin as any);
  const [tab, setTab]           = useState<"subs" | "plans">("subs");
  const [statusFilter, setStatus] = useState("");

  useEffect(() => {
    dispatch(fetchSuperAdminSubscriptionsThunk(statusFilter || undefined));
    dispatch(fetchSuperAdminPlansThunk());
  }, [dispatch, statusFilter]);

  const activeCount    = subscriptions.filter((s: any) => s.status === "active").length;
  const trialCount     = subscriptions.filter((s: any) => s.status === "trialing").length;
  const cancelledCount = subscriptions.filter((s: any) => s.status === "cancelled").length;

  const fmt = (n: any) => n != null ? `₹${Number(n).toLocaleString("en-IN")}` : "—";

  const summaryCards = [
    { label: "Active Subscriptions", value: activeCount,    color: "#16a34a", bg: "#f0fdf4", icon: "✓" },
    { label: "Trialing",             value: trialCount,     color: "#d97706", bg: "#fffbeb", icon: "⏳" },
    { label: "Cancelled",            value: cancelledCount, color: "#dc2626", bg: "#fef2f2", icon: "✗" },
  ];

  return (
    <div style={{ padding: "28px 28px 40px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>Plan & Billing</h1>
        <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>Manage subscriptions and billing plans</p>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 28 }}>
        {summaryCards.map(({ label, value, color, bg, icon }) => (
          <div key={label} style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color }}>
                {icon}
              </div>
              <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 500 }}>{label}</div>
            </div>
            <div style={{ color, fontSize: 28, fontWeight: 800 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: "#f1f5f9", padding: 4, borderRadius: 10, width: "fit-content", marginBottom: 20 }}>
        <TabBtn id="subs"  active={tab === "subs"}  label="Subscriptions" onClick={() => setTab("subs")} />
        <TabBtn id="plans" active={tab === "plans"} label="Plans"          onClick={() => setTab("plans")} />
      </div>

      {tab === "subs" && (
        <>
          <div style={{ marginBottom: 16 }}>
            <select value={statusFilter} onChange={(e) => setStatus(e.target.value)}
              style={{ padding: "9px 14px", borderRadius: 9, border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: 13, outline: "none", appearance: "none", cursor: "pointer" }}>
              <option value="">All Statuses</option>
              {["active", "trialing", "cancelled", "paused", "past_due"].map((s) => (
                <option key={s} value={s}>{s.replace("_", " ").charAt(0).toUpperCase() + s.replace("_", " ").slice(1)}</option>
              ))}
            </select>
          </div>

          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "auto", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 700 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  {["Salon", "Owner", "Plan", "Price", "Status", "Renews"].map(h => (
                    <th key={h} style={{ padding: "11px 16px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subscriptions.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: "48px 0", textAlign: "center", color: "#94a3b8", fontSize: 13.5 }}>No subscriptions found</td></tr>
                ) : (
                  subscriptions.map((sub: any) => {
                    const c = STATUS_COLOR[sub.status] ?? { bg: "#f8fafc", text: "#64748b" };
                    return (
                      <tr key={sub.id} style={{ borderTop: "1px solid #f1f5f9", transition: "background 0.1s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}>
                        <td style={{ padding: "13px 16px", color: "#0f172a", fontWeight: 700 }}>{sub.salon_name}</td>
                        <td style={{ padding: "13px 16px", color: "#64748b", fontSize: 13 }}>{sub.owner_email}</td>
                        <td style={{ padding: "13px 16px" }}>
                          <span style={{ color: "#6366f1", fontWeight: 600 }}>{sub.plan_name || "—"}</span>
                        </td>
                        <td style={{ padding: "13px 16px", color: "#16a34a", fontWeight: 700 }}>
                          {fmt(sub.price_per_unit)}{sub.interval ? `/${sub.interval === "yearly" ? "yr" : "mo"}` : ""}
                        </td>
                        <td style={{ padding: "13px 16px" }}>
                          <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11.5, fontWeight: 600, background: c.bg, color: c.text, textTransform: "capitalize" }}>{sub.status?.replace("_", " ")}</span>
                        </td>
                        <td style={{ padding: "13px 16px", color: "#94a3b8", fontSize: 12.5 }}>
                          {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "plans" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {plans.length === 0 ? (
            <div style={{ color: "#94a3b8", fontSize: 13.5, padding: "48px 0", textAlign: "center", gridColumn: "1/-1" }}>No plans configured.</div>
          ) : (
            plans.map((plan: any) => (
              <div key={plan.id} style={{
                background: "#fff", borderRadius: 14,
                border: "1px solid #e2e8f0",
                padding: "24px 22px", position: "relative", overflow: "hidden",
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg,#6366f1,#8b5cf6)" }} />
                <div style={{ color: "#6366f1", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{plan.interval || "monthly"}</div>
                <div style={{ color: "#0f172a", fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{plan.name}</div>
                <div style={{ color: "#16a34a", fontSize: 28, fontWeight: 800, marginBottom: 16 }}>
                  {fmt(plan.price_per_unit)}
                  <span style={{ color: "#94a3b8", fontSize: 14, fontWeight: 400 }}>/{plan.interval === "yearly" ? "yr" : "mo"}</span>
                </div>
                {plan.is_active !== undefined && (
                  <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11.5, fontWeight: 600, background: plan.is_active ? "#f0fdf4" : "#fef2f2", color: plan.is_active ? "#16a34a" : "#dc2626" }}>
                    {plan.is_active ? "Active" : "Inactive"}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
