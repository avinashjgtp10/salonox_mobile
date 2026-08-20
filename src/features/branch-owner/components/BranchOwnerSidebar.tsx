import { NavLink } from "react-router-dom";
import { useEffect, useRef } from "react";

// Mirrors DashboardSidebar.tsx exactly (same .sidebar/.nav-btn/.nav-label
// classes, same auto-fit sizing behavior) so the Branch Owner portal reads
// as the same app, not a bespoke skin — just a different NAV array and no
// permission gating (branch owner always sees all 9 + utility items).
const NAV = [
  {
    label: "Dashboard", to: "/branch-owner", end: true,
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>,
  },
  {
    label: "My Salons", to: "/branch-owner/salons",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  },
  {
    label: "Payments", to: "/branch-owner/payments",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  },
  {
    label: "Staff & Permissions", to: "/branch-owner/staff-permissions",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
  {
    label: "Inventory & Stock Transfer", to: "/branch-owner/inventory",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  },
  {
    label: "Multi-Branch Finance", to: "/branch-owner/finance",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  },
  {
    label: "Staff Performance", to: "/branch-owner/staff-performance",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  },
  {
    label: "Membership Sharing", to: "/branch-owner/membership-sharing",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.5 13.5 17 22l-5-3-5 3 1.5-8.5"/></svg>,
  },
  {
    label: "Package Sharing", to: "/branch-owner/package-sharing",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  },
  {
    label: "Settings", to: "/branch-owner/settings",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  },
  {
    label: "Help", to: "/branch-owner/help",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  },
];

export default function BranchOwnerSidebar() {
  const sidebarRef = useRef<HTMLElement>(null);

  // Identical auto-fit behavior to DashboardSidebar.tsx: measure real
  // available height and item count, size each nav-btn to fill it exactly,
  // dropping the label below a legibility threshold instead of scrolling.
  useEffect(() => {
    const el = sidebarRef.current;
    if (!el) return;

    const fit = () => {
      const items = Array.from(el.children).filter((c) => c.classList.contains("nav-btn"));
      const count = items.length;
      if (count === 0) return;

      const perItem = Math.floor(el.clientHeight / count);
      const itemH = Math.max(30, Math.min(60, perItem));
      const iconSize = Math.round(Math.max(16, Math.min(24, itemH * 0.4)));
      const labelSize = Math.max(7, Math.min(10, itemH * 0.17));
      const showLabel = itemH >= 34;

      el.style.setProperty("--nav-item-h", `${itemH}px`);
      el.style.setProperty("--nav-icon-size", `${iconSize}px`);
      el.style.setProperty("--nav-label-size", `${labelSize}px`);
      el.style.setProperty("--nav-label-display", showLabel ? "block" : "none");
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function navClass(isActive: boolean) {
    return isActive ? "nav-btn route-active" : "nav-btn";
  }

  return (
    <aside className="sidebar" ref={sidebarRef}>
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={"end" in item ? (item as any).end : false}
          className={({ isActive }) => navClass(isActive)}
        >
          {item.icon}
          <span className="nav-label">{item.label}</span>
        </NavLink>
      ))}
    </aside>
  );
}
