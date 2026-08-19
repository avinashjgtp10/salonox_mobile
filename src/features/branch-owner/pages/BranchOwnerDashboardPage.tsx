import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchMySalonsThunk, fetchBranchOwnerStatsThunk, fetchBranchOwnerPaymentsThunk } from "../../../middleware/branchOwner/branchOwner.thunk";

function StatCard({ label, value, sub, icon, bg }: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; bg: string;
}) {
  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: "20px 22px", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ width: 42, height: 42, borderRadius: 11, background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {icon}
        </div>
        {sub && <span style={{ fontSize: 11.5, color: "#10b981", fontWeight: 600, background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "2px 8px", borderRadius: 20 }}>↑ {sub}</span>}
      </div>
      <div>
        <div style={{ color: "#64748b", fontSize: 12.5, fontWeight: 500, marginBottom: 4 }}>{label}</div>
        <div style={{ color: "#0f172a", fontSize: 26, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.5px" }}>{value}</div>
      </div>
    </div>
  );
}

function Shimmer({ h = 110 }: { h?: number }) {
  return <div style={{ background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "bod-shimmer 1.4s infinite", borderRadius: 14, height: h }} />;
}

const statusStyle: Record<string, { bg: string; text: string }> = {
  active:    { bg: "#f0fdf4", text: "#16a34a" },
  inactive:  { bg: "#f8fafc", text: "#64748b" },
  paid:      { bg: "#f0fdf4", text: "#16a34a" },
  completed: { bg: "#f0fdf4", text: "#16a34a" },
  pending:   { bg: "#fffbeb", text: "#d97706" },
  failed:    { bg: "#fef2f2", text: "#dc2626" },
  partial:   { bg: "#eff6ff", text: "#2563eb" },
};

function Badge({ status }: { status: string }) {
  const c = statusStyle[status] ?? { bg: "#f8fafc", text: "#64748b" };
  return <span style={{ padding: "3px 9px", borderRadius: 20, fontSize: 11.5, fontWeight: 600, background: c.bg, color: c.text, textTransform: "capitalize" }}>{status}</span>;
}

export default function BranchOwnerDashboardPage() {
  const dispatch = useAppDispatch();
  const { stats, salons, payments, loading } = useAppSelector((s) => s.branchOwner);

  useEffect(() => {
    dispatch(fetchBranchOwnerStatsThunk());
    dispatch(fetchMySalonsThunk());
    dispatch(fetchBranchOwnerPaymentsThunk(undefined));
  }, [dispatch]);

  const fmt = (n: any) => n != null ? `₹${Number(n).toLocaleString("en-IN")}` : "—";
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div style={{ padding: "28px 28px 40px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>Dashboard</h1>
          <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>{today}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 14px" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} />
          <span style={{ color: "#64748b", fontSize: 12.5, fontWeight: 500 }}>{salons.length} salon{salons.length !== 1 ? "s" : ""} under you</span>
        </div>
      </div>

      {/* Top KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 14 }}>
        {loading.stats ? [...Array(4)].map((_, i) => <Shimmer key={i} />) : (<>
          <StatCard label="Total Salons" value={stats?.total_salons ?? salons.length}
            bg="#eff6ff"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>}
          />
          <StatCard label="Total Revenue" value={fmt(stats?.total_revenue)}
            bg="#f0fdf4"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
          />
          <StatCard label="Total Staff" value={stats?.total_staff ?? "—"}
            bg="#faf5ff"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
          />
          <StatCard label="Total Bookings" value={stats?.total_bookings ?? "—"}
            sub={stats?.bookings_today ? `${stats.bookings_today} today` : undefined}
            bg="#fff7ed"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
          />
        </>)}
      </div>

      {/* Tables row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* Salons */}
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>My Salons</h3>
            <span style={{ color: "#94a3b8", fontSize: 12 }}>{salons.length} total</span>
          </div>
          {loading.salons ? (
            <div style={{ padding: 16 }}>{[...Array(4)].map((_, i) => <div key={i} style={{ marginBottom: 6 }}><Shimmer h={36} /></div>)}</div>
          ) : salons.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No salons assigned yet</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Name", "Owner", "Status"].map(h => <th key={h} style={{ padding: "9px 16px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {salons.slice(0, 6).map((s) => (
                  <tr key={s.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "11px 16px", color: "#0f172a", fontWeight: 600, fontSize: 13 }}>{s.name}</td>
                    <td style={{ padding: "11px 16px", color: "#64748b", fontSize: 12 }}>{s.owner_email}</td>
                    <td style={{ padding: "11px 16px" }}><Badge status={s.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Recent Payments */}
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Recent Payments</h3>
            <span style={{ color: "#94a3b8", fontSize: 12 }}>{payments.length} total</span>
          </div>
          {loading.payments ? (
            <div style={{ padding: 16 }}>{[...Array(4)].map((_, i) => <div key={i} style={{ marginBottom: 6 }}><Shimmer h={36} /></div>)}</div>
          ) : payments.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No payments yet</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Salon", "Amount", "Status"].map(h => <th key={h} style={{ padding: "9px 16px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {payments.slice(0, 6).map((p) => (
                  <tr key={p.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "11px 16px", color: "#0f172a", fontWeight: 600 }}>{p.salon_name}</td>
                    <td style={{ padding: "11px 16px", color: "#16a34a", fontWeight: 700 }}>{fmt(p.amount)}</td>
                    <td style={{ padding: "11px 16px" }}><Badge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Bottom quick-stat row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {loading.stats ? [...Array(3)].map((_, i) => <Shimmer key={i} h={84} />) : (<>
          <div style={{ background: "#fff", borderRadius: 14, padding: "16px 20px", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "#faf5ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
            </div>
            <div>
              <div style={{ color: "#64748b", fontSize: 12, fontWeight: 500 }}>New Clients Today</div>
              <div style={{ color: "#0f172a", fontSize: 20, fontWeight: 800 }}>{stats?.new_clients_today ?? 0}</div>
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: 14, padding: "16px 20px", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div>
              <div style={{ color: "#64748b", fontSize: 12, fontWeight: 500 }}>Today's Revenue</div>
              <div style={{ color: "#0f172a", fontSize: 20, fontWeight: 800 }}>{fmt(stats?.revenue_today)}</div>
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: 14, padding: "16px 20px", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            </div>
            <div>
              <div style={{ color: "#64748b", fontSize: 12, fontWeight: 500 }}>Active Subscriptions</div>
              <div style={{ color: "#0f172a", fontSize: 20, fontWeight: 800 }}>{stats?.active_subscriptions ?? 0}</div>
            </div>
          </div>
        </>)}
      </div>

      <style>{`@keyframes bod-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  );
}
