import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { logout } from "../../../store/authSlice";

const NAV = [
  {
    label: "Overview", to: "/super-admin", end: true,
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>,
  },
  {
    label: "Salons", to: "/super-admin/salons",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  },
  {
    label: "Branch Owners", to: "/super-admin/branch-owners",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
  {
    label: "Visited", to: "/super-admin/visited",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  },
  {
    label: "Permissions", to: "/super-admin/permissions",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  },
  {
    label: "Subscription Permissions", to: "/super-admin/subscription-permissions",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/><path d="M6 15h4"/></svg>,
  },
  {
    label: "Support", to: "/super-admin/support",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  },
  {
    label: "Demo Inquiries", to: "/super-admin/demo-inquiries",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  },
  {
    label: "Deployment Announcements", to: "/super-admin/deployment-announcements",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  },
  {
    label: "Chatbot Question History", to: "/super-admin/chatbot-questions",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>,
  },
];

export default function SuperAdminLayout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { role, user } = useAppSelector((s) => s.auth) as any;

  function handleLogout() {
    dispatch(logout());
    navigate("/login", { replace: true });
  }

  const name = user?.first_name
    ? `${user.first_name} ${user.last_name ?? ""}`.trim()
    : "Super Admin";

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", background: "#f8fafc" }}>
      {/* Sidebar */}
      <aside style={{
        width: 240, background: "#ffffff", display: "flex", flexDirection: "column", flexShrink: 0,
        borderRight: "1px solid #e2e8f0", boxShadow: "2px 0 8px rgba(0,0,0,0.04)",
      }}>
        {/* Brand */}
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 8px rgba(99,102,241,0.3)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div>
              <div style={{ color: "#0f172a", fontSize: 15, fontWeight: 700 }}>SalonOx</div>
              <div style={{ color: "#94a3b8", fontSize: 11 }}>Super Admin</div>
            </div>
          </div>
        </div>

        {/* Admin profile */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#f8fafc", padding: "10px 12px", borderRadius: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
              {(user?.first_name?.[0] ?? "S").toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: "#0f172a", fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
              <div style={{ color: "#94a3b8", fontSize: 10.5 }}>Super Admin</div>
            </div>
            <div style={{ marginLeft: "auto", width: 8, height: 8, borderRadius: "50%", background: "#10b981", flexShrink: 0 }} />
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "12px 12px 0", overflowY: "auto" }}>
          <div style={{ color: "#94a3b8", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 8px 10px" }}>Main Menu</div>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={"end" in item ? (item as any).end : false}
              style={({ isActive }) => ({
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", borderRadius: 9, marginBottom: 2,
                color: isActive ? "#6366f1" : "#64748b",
                background: isActive ? "#eef2ff" : "transparent",
                textDecoration: "none", fontSize: 13.5, fontWeight: isActive ? 600 : 500,
                transition: "all 0.15s",
                border: isActive ? "none" : "none",
              })}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Sign out */}
        <div style={{ padding: "12px 12px 16px", borderTop: "1px solid #f1f5f9" }}>
          <button onClick={handleLogout} style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%",
            padding: "9px 12px", borderRadius: 9, border: "none",
            background: "transparent", color: "#ef4444", fontSize: 13.5,
            cursor: "pointer", fontFamily: "inherit", fontWeight: 500,
            transition: "background 0.15s",
          }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: "auto", background: "#f8fafc" }}>
        <Outlet />
      </main>
    </div>
  );
}
