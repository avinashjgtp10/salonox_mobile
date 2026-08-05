import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { logout, setCustomPermissions } from "../../../store/authSlice";
import { getMySalonThunk } from "../../../middleware/salon/salon.thunk";
import { fetchMeThunk } from "../../../middleware/user/user.thunk";
import { fetchSettingsThunk } from "../../../middleware/setting/setting.thunk";
import "../styles/DashboardPage.scss";

import DashboardTopbar from "./DashboardTopbar";
import DeploymentBanner from "./DeploymentBanner";
import DashboardSidebar from "./DashboardSidebar";
import OnlineBookingSubSidebar from "./OnlineBookingSubSidebar";
import CatalogSubSidebar from "./CatalogSubSidebar";
import ClientsSubSidebar from "./ClientsSubSidebar";
import MarketingSubSidebar from "./MarketingSubSidebar";
import TeamSubSidebar from "./TeamSubSidebar";

function detectOpenMenu(pathname: string): string | null {
  if (pathname.startsWith("/dashboard/clients")) return "clients";
  if (pathname.startsWith("/dashboard/catalog")) return "catalog";
  if (pathname.startsWith("/dashboard/online-booking")) return "onlineBooking";
  if (pathname.startsWith("/dashboard/marketing")) return "marketing";
  if (pathname.startsWith("/dashboard/team")) return "team";
  return null;
}

export default function DashboardLayout() {
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState<string | null>(() => detectOpenMenu(location.pathname));
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(getMySalonThunk());
    dispatch(fetchSettingsThunk());

    // Fetch user profile; for staff, sync custom_permissions into auth state.
    // Check role from the thunk's own fresh payload, not an outer selector —
    // this effect only runs once on mount ([dispatch] deps), so closing over
    // the outer `role` would capture a stale value (e.g. still null/undefined
    // if this runs before session-restore resolves on a hard refresh) and
    // silently skip the sync even though the fetch succeeded.
    dispatch(fetchMeThunk()).then((result) => {
      if (fetchMeThunk.fulfilled.match(result) && result.payload.role === "staff") {
        const cp = result.payload.custom_permissions ?? null;
        dispatch(setCustomPermissions(cp));
        if (import.meta.env.DEV) {
          console.log("[Auth] custom_permissions synced to auth state:", cp);
        }
      }
    });
  }, [dispatch]);

  useEffect(() => {
    setOpenMenu(detectOpenMenu(location.pathname));
  }, [location.pathname]);

  // Listen for child pages requesting the sub-sidebar to close
  // (e.g. Client History page wanting full-width when a client is selected)
  useEffect(() => {
    const handler = () => setOpenMenu(null);
    window.addEventListener("chp:closeSubSidebar", handler);
    return () => window.removeEventListener("chp:closeSubSidebar", handler);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const isFlushPage =
    location.pathname.includes("/team/add") ||
    location.pathname.includes("/clients/add") ||
    location.pathname.startsWith("/dashboard/settings") ||
    (location.pathname.startsWith("/dashboard/team/") && !["members", "dashboard", "shifts", "payroll", "payruns", "commissions", "attendance", "history"].some((p) => location.pathname.endsWith(p))) ||
    (location.pathname.startsWith("/dashboard/clients/") && !["list", "groups", "reviews", "import"].some((p) => location.pathname.endsWith(p)));

  return (
    <div className="dashboard">
      <DeploymentBanner />
      <DashboardTopbar onLogout={handleLogout} />

      <div className="dashboard-body">
        <DashboardSidebar openMenu={openMenu} onMenuChange={setOpenMenu} />

        {openMenu === "clients" && (
          <ClientsSubSidebar onClose={() => setOpenMenu(null)} />
        )}
        {openMenu === "catalog" && (
          <CatalogSubSidebar onClose={() => setOpenMenu(null)} />
        )}
        {openMenu === "onlineBooking" && (
          <OnlineBookingSubSidebar onClose={() => setOpenMenu(null)} />
        )}
        {openMenu === "marketing" && (
          <MarketingSubSidebar onClose={() => setOpenMenu(null)} />
        )}
        {openMenu === "team" && (
          <TeamSubSidebar onClose={() => setOpenMenu(null)} />
        )}

        <main className={`main ${openMenu === "team" ? "shifted--team" : openMenu === "marketing" ? "shifted--marketing" : openMenu === "clients" ? "shifted--clients" : openMenu === "catalog" ? "shifted--catalog" : openMenu ? "shifted" : ""} ${location.pathname === "/dashboard/calendar" ? "main--calendar" : ""} ${location.pathname.startsWith("/dashboard/marketing/inbox") ? "main--inbox" : ""} ${isFlushPage ? "main--flush" : ""}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
