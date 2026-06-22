import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchSuperAdminStatsThunk, fetchSuperAdminSalonsThunk, fetchSuperAdminPaymentsThunk, fetchRecentLoginsThunk, fetchFrequentLoginsThunk, fetchUsersNoPlanThunk } from "../../../middleware/superAdmin/superAdmin.thunk";

function StatCard({ label, value, sub, icon, accent, bg }: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; accent: string; bg: string;
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
  return <div style={{ background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "sa-shimmer 1.4s infinite", borderRadius: 14, height: h }} />;
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

export default function OverviewPage() {
  const dispatch = useAppDispatch();
  const { stats, salons, payments, recentLogins, frequentLogins, usersNoPlan, loading } = useAppSelector((s) => s.superAdmin);

  useEffect(() => {
    dispatch(fetchSuperAdminStatsThunk());
    dispatch(fetchSuperAdminSalonsThunk(undefined));
    dispatch(fetchSuperAdminPaymentsThunk(undefined));
    dispatch(fetchRecentLoginsThunk(10));
    dispatch(fetchFrequentLoginsThunk(10));
    dispatch(fetchUsersNoPlanThunk(20));
  }, [dispatch]);

  const fmt = (n: any) => n != null ? `₹${Number(n).toLocaleString("en-IN")}` : "—";
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div style={{ padding: "28px 28px 40px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>Dashboard Overview</h1>
          <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>{today}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 14px" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} />
          <span style={{ color: "#64748b", fontSize: 12.5, fontWeight: 500 }}>All systems operational</span>
        </div>
      </div>

      {/* Top 4 KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 14 }}>
        {loading.stats ? [...Array(4)].map((_, i) => <Shimmer key={i} />) : (<>
          <StatCard label="Total Salons" value={stats?.total_salons ?? "—"}
            sub={stats?.new_salons_this_month ? `${stats.new_salons_this_month} new` : undefined}
            bg="#eff6ff" accent="#2563eb"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>}
          />
          <StatCard label="Total Revenue" value={fmt(stats?.total_revenue)}
            sub={stats?.mrr ? `${fmt(stats.mrr)}/mo` : undefined}
            bg="#f0fdf4" accent="#16a34a"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
          />
          <StatCard label="Total Users" value={stats?.total_users ?? "—"}
            sub={stats?.signups_today ? `${stats.signups_today} today` : undefined}
            bg="#faf5ff" accent="#7c3aed"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
          />
          <StatCard label="Active Subscriptions" value={stats?.active_subscriptions ?? "—"}
            bg="#fff7ed" accent="#ea580c"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>}
          />
        </>)}
      </div>

      {/* Second row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
        {loading.stats ? [...Array(4)].map((_, i) => <Shimmer key={i} />) : (<>
          <StatCard label="Active Salons" value={stats?.active_salons ?? "—"}
            bg="#f0fdf4" accent="#16a34a"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
          />
          <StatCard label="Bookings Today" value={stats?.bookings_today ?? "—"}
            sub={stats?.total_bookings ? `${stats.total_bookings} total` : undefined}
            bg="#eff6ff" accent="#2563eb"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
          />
          <StatCard label="Signups This Week" value={stats?.signups_this_week ?? "—"}
            sub={stats?.signups_this_month ? `${stats.signups_this_month} this month` : undefined}
            bg="#faf5ff" accent="#7c3aed"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>}
          />
          <StatCard label="Failed Payments" value={stats?.failed_payments ?? "0"}
            bg="#fef2f2" accent="#dc2626"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
          />
        </>)}
      </div>

      {/* User breakdown */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
          {[
            { label: "Salon Owners", value: stats.total_owners ?? 0, color: "#6366f1", bg: "#eef2ff" },
            { label: "Staff Members", value: stats.total_staff ?? 0,  color: "#8b5cf6", bg: "#faf5ff" },
            { label: "Clients",       value: stats.total_clients ?? 0, color: "#0891b2", bg: "#ecfeff" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} style={{ background: "#fff", borderRadius: 14, padding: "18px 22px", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 11, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              </div>
              <div>
                <div style={{ color: "#64748b", fontSize: 12.5, fontWeight: 500 }}>{label}</div>
                <div style={{ color: "#0f172a", fontSize: 22, fontWeight: 800, letterSpacing: "-0.3px" }}>{value.toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tables row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* Recent Salons */}
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Recent Salons</h3>
            <span style={{ color: "#94a3b8", fontSize: 12 }}>{salons.length} total</span>
          </div>
          {loading.salons ? (
            <div style={{ padding: 16 }}>{[...Array(4)].map((_, i) => <Shimmer key={i} h={36} />).map((el, i) => <div key={i} style={{ marginBottom: 6 }}>{el}</div>)}</div>
          ) : salons.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No salons yet</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Name", "Owner", "Status"].map(h => <th key={h} style={{ padding: "9px 16px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {salons.slice(0, 6).map((s: any) => (
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
                {payments.slice(0, 6).map((p: any) => (
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

      {/* Recent User Logins */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                <polyline points="10 17 15 12 10 7"/>
                <line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
            </div>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Recent User Logins</h3>
          </div>
          <span style={{ color: "#94a3b8", fontSize: 12 }}>Last {recentLogins.length} logins</span>
        </div>

        {loading.recentLogins ? (
          <div style={{ padding: 16, display: "grid", gap: 6 }}>{[...Array(5)].map((_, i) => <Shimmer key={i} h={44} />)}</div>
        ) : recentLogins.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div style={{ color: "#cbd5e1", fontSize: 32, marginBottom: 8 }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block" }}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              </svg>
            </div>
            <div style={{ color: "#94a3b8", fontSize: 13 }}>No login activity yet</div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["User", "Email", "Role", "Salon", "Last Login", "Status"].map(h => (
                  <th key={h} style={{ padding: "9px 16px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentLogins.map((u: any, i: number) => {
                const roleColors: Record<string, { bg: string; text: string }> = {
                  salon_owner: { bg: "#eef2ff", text: "#6366f1" },
                  staff:       { bg: "#f0fdf4", text: "#16a34a" },
                  client:      { bg: "#fffbeb", text: "#d97706" },
                  admin:       { bg: "#fef2f2", text: "#dc2626" },
                };
                const rc = roleColors[u.role] ?? { bg: "#f8fafc", text: "#64748b" };
                const initials = (u.name || u.email || "?").split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase();
                const avatarColors = ["#6366f1","#8b5cf6","#0891b2","#16a34a","#d97706","#dc2626"];
                const ac = avatarColors[i % avatarColors.length];
                const loginTime = u.last_login
                  ? new Date(u.last_login).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                  : "—";
                const minutesAgo = u.last_login
                  ? Math.round((Date.now() - new Date(u.last_login).getTime()) / 60000)
                  : null;
                const timeAgo = minutesAgo === null ? "" : minutesAgo < 60
                  ? `${minutesAgo}m ago`
                  : minutesAgo < 1440
                    ? `${Math.round(minutesAgo / 60)}h ago`
                    : `${Math.round(minutesAgo / 1440)}d ago`;
                return (
                  <tr key={u.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: ac, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{initials}</div>
                        <span style={{ color: "#0f172a", fontWeight: 600 }}>{u.name || "—"}</span>
                      </div>
                    </td>
                    <td style={{ padding: "10px 16px", color: "#64748b", fontSize: 12 }}>{u.email}</td>
                    <td style={{ padding: "10px 16px" }}>
                      <span style={{ padding: "3px 9px", borderRadius: 20, fontSize: 11.5, fontWeight: 600, background: rc.bg, color: rc.text, textTransform: "capitalize" }}>{u.role.replace("_", " ")}</span>
                    </td>
                    <td style={{ padding: "10px 16px", color: "#64748b", fontSize: 12 }}>{u.salon_name || "—"}</td>
                    <td style={{ padding: "10px 16px" }}>
                      <div style={{ color: "#0f172a", fontSize: 12, fontWeight: 500 }}>{loginTime}</div>
                      {timeAgo && <div style={{ color: "#94a3b8", fontSize: 11 }}>{timeAgo}</div>}
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: u.is_active ? "#10b981" : "#94a3b8" }} />
                        <span style={{ color: u.is_active ? "#16a34a" : "#94a3b8", fontSize: 12, fontWeight: 500 }}>{u.is_active ? "Active" : "Inactive"}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Two-column panels: Frequent Logins + No-Plan Users */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 20 }}>

        {/* Frequent Logins Panel */}
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: "#faf5ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Frequent Users</h3>
                <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>Sorted by total login count</p>
              </div>
            </div>
            <span style={{ fontSize: 11.5, color: "#7c3aed", fontWeight: 600, background: "#faf5ff", border: "1px solid #e9d5ff", padding: "3px 10px", borderRadius: 20 }}>Top {frequentLogins.length}</span>
          </div>

          {loading.frequentLogins ? (
            <div style={{ padding: 16, display: "grid", gap: 6 }}>{[...Array(5)].map((_, i) => <Shimmer key={i} h={52} />)}</div>
          ) : frequentLogins.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center" }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", marginBottom: 8 }}>
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
              <div style={{ color: "#94a3b8", fontSize: 13 }}>No login data yet — data builds up as users log in</div>
            </div>
          ) : (
            <div>
              {frequentLogins.map((u: any, i: number) => {
                const avatarColors = ["#6366f1","#7c3aed","#0891b2","#16a34a","#d97706","#dc2626","#0ea5e9","#8b5cf6","#ec4899","#14b8a6"];
                const ac = avatarColors[i % avatarColors.length];
                const initials = (u.name || u.email || "?").split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase();
                const lastSeen = u.last_login
                  ? (() => {
                      const mins = Math.round((Date.now() - new Date(u.last_login).getTime()) / 60000);
                      return mins < 60 ? `${mins}m ago` : mins < 1440 ? `${Math.round(mins/60)}h ago` : `${Math.round(mins/1440)}d ago`;
                    })()
                  : "Never";
                return (
                  <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 20px", borderBottom: "1px solid #f8fafc" }}>
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: ac, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700 }}>{initials}</div>
                      <div style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderRadius: "50%", background: u.is_active ? "#10b981" : "#94a3b8", border: "2px solid #fff" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: "#0f172a", fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.name || "—"}</div>
                      <div style={{ color: "#94a3b8", fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.email}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "flex-end" }}>
                        <span style={{ fontSize: 18, fontWeight: 800, color: "#7c3aed", lineHeight: 1 }}>{u.login_count ?? 0}</span>
                        <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500 }}>logins</span>
                      </div>
                      <div style={{ color: "#94a3b8", fontSize: 10 }}>{lastSeen}</div>
                    </div>
                    <div style={{ background: "#f1f5f9", borderRadius: 8, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>#{i + 1}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Users Without Subscription Panel */}
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #fee2e2", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #fef2f2", background: "#fef2f2", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                  <line x1="12" y1="15" x2="12.01" y2="15"/>
                </svg>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#991b1b" }}>No Subscription Plan</h3>
                <p style={{ margin: 0, fontSize: 11, color: "#ef4444" }}>Active salon owners without a paid plan</p>
              </div>
            </div>
            {usersNoPlan.length > 0 && (
              <span style={{ fontSize: 12, fontWeight: 700, background: "#dc2626", color: "#fff", padding: "3px 10px", borderRadius: 20 }}>{usersNoPlan.length} users</span>
            )}
          </div>

          {loading.usersNoPlan ? (
            <div style={{ padding: 16, display: "grid", gap: 6 }}>{[...Array(5)].map((_, i) => <Shimmer key={i} h={52} />)}</div>
          ) : usersNoPlan.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div style={{ color: "#16a34a", fontSize: 13, fontWeight: 600 }}>All salon owners have an active plan</div>
            </div>
          ) : (
            <div style={{ maxHeight: 380, overflowY: "auto" }}>
              {usersNoPlan.map((u: any, i: number) => {
                const avatarColors = ["#dc2626","#ea580c","#d97706","#ca8a04","#16a34a","#0891b2","#6366f1","#7c3aed","#ec4899","#64748b"];
                const ac = avatarColors[i % avatarColors.length];
                const initials = (u.name || u.email || "?").split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase();
                const lastSeen = u.last_login
                  ? (() => {
                      const mins = Math.round((Date.now() - new Date(u.last_login).getTime()) / 60000);
                      return mins < 60 ? `${mins}m ago` : mins < 1440 ? `${Math.round(mins/60)}h ago` : `${Math.round(mins/1440)}d ago`;
                    })()
                  : "Never logged in";
                return (
                  <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 20px", borderBottom: "1px solid #fef2f2" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: ac, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{initials}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: "#0f172a", fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.name || "—"}</div>
                      <div style={{ color: "#94a3b8", fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.email}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      {u.salon_name && <div style={{ fontSize: 11.5, color: "#64748b", fontWeight: 500 }}>{u.salon_name}</div>}
                      <div style={{ fontSize: 10, color: "#94a3b8" }}>{lastSeen}</div>
                    </div>
                    <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "3px 8px", flexShrink: 0 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#dc2626" }}>No Plan</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      <style>{`@keyframes sa-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  );
}
