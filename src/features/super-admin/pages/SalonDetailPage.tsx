import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchSuperAdminSalonsThunk, fetchSalonStaffThunk } from "../../../middleware/superAdmin/superAdmin.thunk";
import Pagination from "../components/Pagination";

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
  const { salons, salonStaff, loading } = useAppSelector((s) => s.superAdmin);
  const [page, setPage]       = useState(1);
  const [perPage, setPerPage] = useState(10);

  useEffect(() => {
    if (salons.length === 0) dispatch(fetchSuperAdminSalonsThunk());
    if (salonId) dispatch(fetchSalonStaffThunk(salonId));
  }, [dispatch, salons.length, salonId]);

  const salon: any = salons.find((s: any) => s.id === salonId);
  const owner = salonStaff.find((u: any) => u.role === "owner");
  const staff = salonStaff.filter((u: any) => u.role !== "owner");
  const pagedStaff = staff.slice((page - 1) * perPage, page * perPage);
  const fmtMoney = (n: any) => (n != null ? `₹${Number(n).toLocaleString("en-IN")}` : "—");

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

      <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: "0 0 12px" }}>Salon Owner</h2>
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", padding: "16px 20px", marginBottom: 28, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        {loading.salonStaff && !owner ? (
          <span style={{ color: "#94a3b8", fontSize: 13.5 }}>Loading…</span>
        ) : owner ? (
          <>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
              {owner.name?.[0]?.toUpperCase() || "?"}
            </div>
            <div style={{ minWidth: 160 }}>
              <div style={{ color: "#0f172a", fontWeight: 700, fontSize: 14 }}>{owner.name || "—"}</div>
              <div style={{ color: "#94a3b8", fontSize: 12 }}>{owner.email}{owner.phone ? ` · ${owner.phone}` : ""}</div>
            </div>
            <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11.5, fontWeight: 600, background: "#eef2ff", color: "#6366f1" }}>Owner</span>
            <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11.5, fontWeight: 600, background: owner.is_active ? "#f0fdf4" : "#fef2f2", color: owner.is_active ? "#16a34a" : "#dc2626" }}>
              {owner.is_active ? "Active" : "Inactive"}
            </span>
            <div style={{ marginLeft: "auto", color: "#64748b", fontSize: 12.5 }}>
              Logins: <strong style={{ color: "#374151" }}>{owner.login_count ?? 0}</strong>
              {" · "}Last active: {owner.last_login ? new Date(owner.last_login).toLocaleDateString("en-IN") : "Never"}
            </div>
          </>
        ) : (
          <span style={{ color: "#94a3b8", fontSize: 13.5 }}>No owner found for this salon</span>
        )}
      </div>

      <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: "0 0 12px" }}>Staff</h2>
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "auto", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 780 }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              {["Name", "Contact", "Role", "Status", "Revenue", "Login Count", "Last Active"].map(h => (
                <th key={h} style={{ padding: "11px 16px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading.salonStaff ? (
              <tr><td colSpan={7} style={{ padding: "48px 0", textAlign: "center", color: "#94a3b8", fontSize: 13.5 }}>Loading…</td></tr>
            ) : staff.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: "48px 0", textAlign: "center", color: "#94a3b8", fontSize: 13.5 }}>No staff found for this salon</td></tr>
            ) : (
              pagedStaff.map((u: any) => (
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
                  <td style={{ padding: "13px 16px", color: "#16a34a", fontWeight: 700 }}>{fmtMoney(u.revenue)}</td>
                  <td style={{ padding: "13px 16px", color: "#374151" }}>{u.login_count ?? 0}</td>
                  <td style={{ padding: "13px 16px", color: "#94a3b8", fontSize: 12 }}>
                    {u.last_login ? new Date(u.last_login).toLocaleDateString("en-IN") : "Never"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <Pagination
          total={staff.length} page={page} perPage={perPage}
          onPageChange={setPage} onPerPageChange={setPerPage}
          itemLabel="staff"
        />
      </div>
    </div>
  );
}
