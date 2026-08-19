import { Outlet, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { logout } from "../../../store/authSlice";

export default function BranchOwnerLayout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((s) => s.auth) as any;

  function handleLogout() {
    dispatch(logout());
    navigate("/login", { replace: true });
  }

  const name = user?.first_name
    ? `${user.first_name} ${user.last_name ?? ""}`.trim()
    : "Branch Owner";

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", background: "#f8fafc" }}>
      <aside style={{
        width: 240, background: "#ffffff", display: "flex", flexDirection: "column", flexShrink: 0,
        borderRight: "1px solid #e2e8f0", boxShadow: "2px 0 8px rgba(0,0,0,0.04)",
      }}>
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 8px rgba(99,102,241,0.3)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div>
              <div style={{ color: "#0f172a", fontSize: 15, fontWeight: 700 }}>SalonOx</div>
              <div style={{ color: "#94a3b8", fontSize: 11 }}>Branch Owner</div>
            </div>
          </div>
        </div>

        <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#f8fafc", padding: "10px 12px", borderRadius: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
              {(user?.first_name?.[0] ?? "B").toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: "#0f172a", fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
              <div style={{ color: "#94a3b8", fontSize: 10.5 }}>Branch Owner</div>
            </div>
            <div style={{ marginLeft: "auto", width: 8, height: 8, borderRadius: "50%", background: "#10b981", flexShrink: 0 }} />
          </div>
        </div>

        <nav style={{ flex: 1, padding: "12px 12px 0", overflowY: "auto" }}>
          <div style={{ color: "#94a3b8", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 8px 10px" }}>Main Menu</div>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "9px 12px", borderRadius: 9, marginBottom: 2,
            color: "#6366f1", background: "#eef2ff",
            fontSize: 13.5, fontWeight: 600,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            My Salons
          </div>
        </nav>

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

      <main style={{ flex: 1, overflow: "auto", background: "#f8fafc" }}>
        <Outlet />
      </main>
    </div>
  );
}
