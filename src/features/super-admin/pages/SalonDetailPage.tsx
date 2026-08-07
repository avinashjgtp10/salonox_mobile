import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchSuperAdminSalonsThunk, fetchSuperAdminUsersThunk } from "../../../middleware/superAdmin/superAdmin.thunk";

function Badge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    active:   { bg: "#f0fdf4", text: "#16a34a" },
    inactive: { bg: "#fef2f2", text: "#dc2626" },
  };
  const c = map[status] ?? { bg: "#f8fafc", text: "#64748b" };
  return <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11.5, fontWeight: 600, background: c.bg, color: c.text, textTransform: "capitalize" }}>{status}</span>;
}

const fmtDateShort = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

const fmt = (n: any) => (n != null ? `₹${Number(n).toLocaleString("en-IN")}` : "—");

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 18px", minWidth: 140 }}>
      <div style={{ color: "#94a3b8", fontSize: 11.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>{label}</div>
      <div style={{ color: "#0f172a", fontSize: 17, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

export default function SalonDetailPage() {
  const { salonId } = useParams<{ salonId: string }>();
  const dispatch = useAppDispatch();
  const { salons, users, loading } = useAppSelector((s) => s.superAdmin);

  useEffect(() => {
    if (salons.length === 0) dispatch(fetchSuperAdminSalonsThunk());
    dispatch(fetchSuperAdminUsersThunk({}));
  }, [dispatch, salons.length]);

  const salon: any = salons.find((s: any) => s.id === salonId);
  const staff = users.filter((u: any) => u.salon_id === salonId);

  if (loading.salons && !salon) {
    return (
      <div style={{ padding: "28px 28px 40px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", color: "#94a3b8", fontSize: 13.5 }}>
        Loading salon…
      </div>
    );
  }

  if (!salon) {
    return (
      <div style={{ padding: "28px 28px 40px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
        <Link to="/super-admin/salons" style={{ color: "#6366f1", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>← Back to Salons</Link>
        <div style={{ marginTop: 24, color: "#94a3b8", fontSize: 13.5 }}>Salon not found.</div>
      </div>
    );
  }

  return (
    <div style={{ padding: "28px 28px 40px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      <Link to="/super-admin/salons" style={{ color: "#6366f1", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>← Back to Salons</Link>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "16px 0 24px", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>{salon.name}</h1>
          <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>
            {salon.owner_name || "—"} · {salon.owner_email}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Badge status={salon.status} />
          {salon.is_onboarding_complete
            ? <span style={{ color: "#16a34a", fontSize: 12.5, fontWeight: 600 }}>✓ Onboarding Done</span>
            : <span style={{ color: "#d97706", fontSize: 12.5, fontWeight: 600 }}>⚠ Onboarding Pending</span>}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
        <StatCard label="Plan" value={salon.plan_name || "—"} />
        <StatCard label="Staff" value={salon.staff_count ?? "—"} />
        <StatCard label="Clients" value={salon.client_count ?? "—"} />
        <StatCard label="Revenue" value={fmt(salon.revenue)} />
        <StatCard label="Created" value={fmtDateShort(salon.created_at)} />
      </div>

      <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: "0 0 12px" }}>Staff & Users</h2>
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "auto", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 700 }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              {["Name", "Contact", "Role", "Status", "Login Count", "Last Active"].map(h => (
                <th key={h} style={{ padding: "11px 16px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading.users ? (
              <tr><td colSpan={6} style={{ padding: "48px 0", textAlign: "center", color: "#94a3b8", fontSize: 13.5 }}>Loading…</td></tr>
            ) : staff.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: "48px 0", textAlign: "center", color: "#94a3b8", fontSize: 13.5 }}>No staff/users found for this salon</td></tr>
            ) : (
              staff.map((u: any) => (
                <tr key={u.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "13px 16px", color: "#0f172a", fontWeight: 700 }}>{u.name || "—"}</td>
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ color: "#374151", fontSize: 13 }}>{u.email}</div>
                    {u.phone && <div style={{ color: "#94a3b8", fontSize: 11.5 }}>{u.phone}</div>}
                  </td>
                  <td style={{ padding: "13px 16px", color: "#374151", textTransform: "capitalize" }}>{u.role?.replace("_", " ")}</td>
                  <td style={{ padding: "13px 16px" }}>
                    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11.5, fontWeight: 600, background: u.is_active ? "#f0fdf4" : "#fef2f2", color: u.is_active ? "#16a34a" : "#dc2626" }}>
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ padding: "13px 16px", color: "#374151" }}>{u.login_count ?? 0}</td>
                  <td style={{ padding: "13px 16px", color: "#94a3b8", fontSize: 12 }}>
                    {u.last_login ? new Date(u.last_login).toLocaleDateString("en-IN") : "Never"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
