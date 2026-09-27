import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAppSelector } from "../../../hooks/useAppRedux";
import { performLogout } from "../../../utils/performLogout";
import salonoxLogo from "../../../assets/salonox_full_logo.png";
import salonoxMark from "../../../assets/salonox_full_logo.png";

const MAIN_NAV = [
  {
    label: "Dashboard", to: "/branch-owner", end: true,
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>,
  },
  {
    label: "My Salons", to: "/branch-owner/salons",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  },
  {
    label: "Payments", to: "/branch-owner/payments",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  },
  {
    label: "Staff & Permissions", to: "/branch-owner/staff-permissions",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
  {
    label: "Inventory & Stock Transfer", to: "/branch-owner/inventory",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  },
  {
    label: "Multi-Branch Finance", to: "/branch-owner/finance",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  },
  {
    label: "Staff Performance", to: "/branch-owner/staff-performance",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  },
  {
    label: "Settings", to: "/branch-owner/settings",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  },
];

const HELP_ITEM = {
  label: "Help", to: "/branch-owner/help",
  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
};

// Bespoke — not the shared .sidebar/.nav-btn auto-fit rail every other
// portal uses (see BranchOwnerTheme.scss for how it repositions .topbar/
// .main around this). Full viewport height with its own brand/collapse
// header, a scrollable nav list, and a pinned profile card at the bottom —
// structurally different from the shared shell (which has no per-portal
// header or footer), so reusing those classes wasn't an option here.
export default function BranchOwnerSidebar() {
  const navigate = useNavigate();
  const { user } = useAppSelector((s) => s.auth) as any;
  const [collapsed, setCollapsed] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // This sidebar is fixed-position and self-contained (own width/collapse
  // state), so .topbar (shared, fixed, left:0 by default) and .main (fixed
  // margin-left) need to know its current width to sit correctly beside it
  // instead of underneath it — done via a CSS var rather than lifting state
  // up through BranchOwnerLayout, since nothing else needs this value.
  useEffect(() => {
    document.documentElement.style.setProperty("--bo-sidebar-w", collapsed ? "72px" : "232px");
    return () => { document.documentElement.style.removeProperty("--bo-sidebar-w"); };
  }, [collapsed]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfileMenu(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const name = user?.first_name ? `${user.first_name} ${user.last_name ?? ""}`.trim() : "Branch Owner";
  const initials = (user?.first_name?.[0] ?? "B").toUpperCase() + (user?.last_name?.[0] ?? "").toUpperCase();

  function handleLogout() {
    performLogout(navigate);
  }

  function navStyle(isActive: boolean): React.CSSProperties {
    return {
      display: "flex", alignItems: "center", gap: 12,
      padding: collapsed ? "10px 0" : "10px 14px",
      justifyContent: collapsed ? "center" : "flex-start",
      borderRadius: 10, marginBottom: 2,
      color: isActive ? "#fff" : "#374151",
      background: isActive ? "#0f172a" : "transparent",
      textDecoration: "none", fontSize: 13.5, fontWeight: isActive ? 600 : 500,
      transition: "all 0.15s", whiteSpace: "nowrap", overflow: "hidden",
    };
  }

  return (
    <aside style={{
      width: collapsed ? 72 : 232, flexShrink: 0, height: "100vh", position: "fixed", left: 0, top: 0, zIndex: 1001,
      background: "#fff", borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column",
      transition: "width 0.2s ease",
    }}>
      {/* Brand + collapse toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 14px", borderBottom: "1px solid #f1f5f9", flexShrink: 0 }}>
        {collapsed
          ? <img src={salonoxMark} alt="SalonoX" style={{ width: 28, height: 28, objectFit: "contain" }} />
          : <img src={salonoxLogo} alt="SalonoX" style={{ height: 28, width: "auto", objectFit: "contain" }} />}
        <button
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: collapsed ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "10px 10px 0" }}>
        {MAIN_NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={"end" in item ? (item as any).end : false}
            style={({ isActive }) => navStyle(isActive)} title={collapsed ? item.label : undefined}>
            {item.icon}
            {!collapsed && <span style={{ textOverflow: "ellipsis", overflow: "hidden" }}>{item.label}</span>}
          </NavLink>
        ))}

        <div style={{ height: 1, background: "#f1f5f9", margin: "10px 4px" }} />

        <NavLink to={HELP_ITEM.to} style={({ isActive }) => navStyle(isActive)} title={collapsed ? HELP_ITEM.label : undefined}>
          {HELP_ITEM.icon}
          {!collapsed && <span>{HELP_ITEM.label}</span>}
        </NavLink>
      </nav>

      {/* Profile footer */}
      <div ref={profileRef} style={{ position: "relative", padding: 10, borderTop: "1px solid #f1f5f9", flexShrink: 0 }}>
        {showProfileMenu && (
          <div style={{ position: "absolute", bottom: "100%", left: 10, right: 10, marginBottom: 6, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: 6, display: "flex", flexDirection: "column", gap: 2 }}>
            <button onClick={() => { setShowProfileMenu(false); navigate("/branch-owner/settings"); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 7, border: "none", background: "transparent", color: "#374151", fontSize: 12.5, fontWeight: 600, cursor: "pointer", textAlign: "left" }}>
              Settings
            </button>
            <button onClick={handleLogout}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 7, border: "none", background: "transparent", color: "#dc2626", fontSize: 12.5, fontWeight: 600, cursor: "pointer", textAlign: "left" }}>
              Logout
            </button>
          </div>
        )}
        <button
          onClick={() => setShowProfileMenu((v) => !v)}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: 8, borderRadius: 10, border: "none", background: showProfileMenu ? "#f8fafc" : "transparent", cursor: "pointer", textAlign: "left" }}
        >
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
            {initials}
          </div>
          {!collapsed && (
            <>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ color: "#0f172a", fontSize: 12.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
                <div style={{ color: "#94a3b8", fontSize: 11 }}>Owner</div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
