import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef, Suspense } from "react";
import { PageLoader } from "../../../components/ui";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { setCustomPermissions } from "../../../store/authSlice";
import { performLogout } from "../../../utils/performLogout";
import { getMySalonThunk } from "../../../middleware/salon/salon.thunk";
import { fetchMeThunk } from "../../../middleware/user/user.thunk";
import { fetchSettingsThunk } from "../../../middleware/setting/setting.thunk";
import { fetchCashCounterDashboardThunk } from "../../../middleware/cashCounter/cashCounter.thunk";
import { fetchSpotlightFeaturesThunk } from "../../../middleware/spotlight/spotlight.thunk";
import "../styles/DashboardPage.scss";

import DashboardTopbar from "./DashboardTopbar";
import DeploymentBanner from "./DeploymentBanner";
import DashboardSidebar from "./DashboardSidebar";
import OnlineBookingSubSidebar from "./OnlineBookingSubSidebar";
import CatalogSubSidebar from "./CatalogSubSidebar";
import InventorySubSidebar from "./InventorySubSidebar";
import ClientsSubSidebar from "./ClientsSubSidebar";
import MarketingSubSidebar from "./MarketingSubSidebar";
import TeamSubSidebar from "./TeamSubSidebar";
import UnclosedCounterGate from "../../cash-management/components/UnclosedCounterGate";
import AutoOpenCounterForNewAccount from "../../cash-management/components/AutoOpenCounterForNewAccount";

function detectOpenMenu(pathname: string): string | null {
  if (pathname.startsWith("/dashboard/clients")) return "clients";
  if (pathname.startsWith("/dashboard/catalog")) return "catalog";
  if (pathname.startsWith("/dashboard/inventory")) return "inventory";
  if (pathname.startsWith("/dashboard/online-booking")) return "onlineBooking";
  if (pathname.startsWith("/dashboard/marketing")) return "marketing";
  if (pathname.startsWith("/dashboard/team")) return "team";
  return null;
}

export default function DashboardLayout() {
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState<string | null>(() => detectOpenMenu(location.pathname));
  // Manually toggled via the sidebar's own collapse arrow, and also flipped
  // on automatically whenever a flyout submenu opens (Catalog, Inventory,
  // etc.) — that submenu panel already eats its own width, so shrinking the
  // main sidebar down to icon-only alongside it keeps the combined
  // sidebar+submenu footprint from overrunning the page content. It does
  // NOT auto-expand back on close — same as the arrow itself, this only
  // ever needs to actively fire the one way the user asked for.
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const role = useAppSelector((s) => s.auth.role);
  const effectivePermissions = useAppSelector((s) => s.user.profile?.effective_permissions);

  const handleMenuChange = (menu: string | null) => {
    setOpenMenu(menu);
    if (menu) setCollapsed(true);
  };

  useEffect(() => {
    dispatch(getMySalonThunk());
    dispatch(fetchSpotlightFeaturesThunk());
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
      }
    });
  }, [dispatch]);

  // Separate from the mount effect above on purpose — that effect only ever
  // runs once, before effective_permissions has necessarily loaded (it's
  // fetched by fetchMeThunk inside it, asynchronously), so checking the
  // permission there would wrongly see "not granted yet" for a staff member
  // who actually has it and skip this forever. This effect instead reacts
  // to effectivePermissions actually arriving. Previously unconditional —
  // fired for every staff member on every Dashboard-section page load
  // regardless of whether they could even see Cash Management, 403ing (and
  // popping the global "Permission Required" dialog) on literally any page
  // just from landing in the dashboard shell. UnclosedCounterGate/
  // AutoOpenCounterForNewAccount below only matter to someone who can
  // actually open/close the register in the first place.
  const cashCounterLoaded = useAppSelector((s) => s.cashCounter.dashboard !== null);
  const cashCounterLoading = useAppSelector((s) => s.cashCounter.loading);
  const cashCounterError = useAppSelector((s) => s.cashCounter.error);
  const cashCounterRetries = useRef(0);
  useEffect(() => {
    const isOwnerOrAdmin = role === "salon_owner" || role === "admin";
    const canSeeCashManagement = isOwnerOrAdmin || effectivePermissions?.view_cash_management === true;
    if (!canSeeCashManagement || cashCounterLoaded || cashCounterLoading) return;
    // This effect's deps (role, effectivePermissions) can legitimately
    // re-run more than once while auth/permissions settle in — without this
    // guard, every one of those re-runs where canSeeCashManagement is still
    // true fired ANOTHER identical GET, which is what showed up as a
    // duplicate cashdashboard call on a single page load/refresh.
    if (!cashCounterError) {
      dispatch(fetchCashCounterDashboardThunk());
      return;
    }
    // A real fetch failure (network blip, token still settling right after
    // login, etc.) used to leave `dashboard` stuck at null for the rest of
    // the session — nothing else re-triggers this fetch, so both the "open
    // counter" and "stale counter" modals would silently never appear.
    // Retry with a short delay, capped at 3 attempts so a genuine backend
    // outage doesn't retry forever.
    if (cashCounterRetries.current < 3) {
      cashCounterRetries.current += 1;
      const t = setTimeout(() => dispatch(fetchCashCounterDashboardThunk()), 2000);
      return () => clearTimeout(t);
    }
  }, [dispatch, role, effectivePermissions, cashCounterLoaded, cashCounterLoading, cashCounterError]);

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
    performLogout(navigate);
  };

  const isFlushPage =
    location.pathname.includes("/team/add") ||
    location.pathname.includes("/clients/add") ||
    location.pathname.startsWith("/dashboard/settings") ||
    // Add/Edit Product is a self-contained shell (own header + own
    // `calc(100vh - ...)` height, see ConsumableFormPage.scss) built on the
    // same "sits flush, no padding from .main" assumption as Team/Clients
    // "add" — without this it renders with a stray gray margin around it
    // that Create Staff's flush header doesn't have.
    location.pathname.startsWith("/dashboard/catalog/products/create") ||
    location.pathname.startsWith("/dashboard/catalog/products/edit/") ||
    (location.pathname.startsWith("/dashboard/team/") && !["members", "dashboard", "shifts", "payroll", "payruns", "commissions", "attendance", "history"].some((p) => location.pathname.endsWith(p))) ||
    (location.pathname.startsWith("/dashboard/clients/") && !["list", "groups", "reviews", "import"].some((p) => location.pathname.endsWith(p)));

  return (
    <div className="dashboard">
      <DeploymentBanner />
      <DashboardTopbar
        onLogout={handleLogout}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
      />
      <UnclosedCounterGate />
      <AutoOpenCounterForNewAccount />

      <div className={`dashboard-body${collapsed ? " dashboard-body--collapsed" : ""}`}>
        <DashboardSidebar
          openMenu={openMenu}
          onMenuChange={handleMenuChange}
        />

        {openMenu === "clients" && (
          <ClientsSubSidebar onClose={() => setOpenMenu(null)} />
        )}
        {openMenu === "catalog" && (
          <CatalogSubSidebar onClose={() => setOpenMenu(null)} />
        )}
        {openMenu === "inventory" && (
          <InventorySubSidebar onClose={() => setOpenMenu(null)} />
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

        <main className={`main ${openMenu === "team" ? "shifted--team" : openMenu === "marketing" ? "shifted--marketing" : openMenu === "clients" ? "shifted--clients" : openMenu === "catalog" ? "shifted--catalog" : openMenu === "inventory" ? "shifted--inventory" : openMenu ? "shifted" : ""} ${location.pathname === "/dashboard/calendar" ? "main--calendar" : ""} ${location.pathname.startsWith("/dashboard/marketing/inbox") ? "main--inbox" : ""} ${location.pathname === "/dashboard/clients/history" ? "main--history" : ""} ${isFlushPage ? "main--flush" : ""}`}>
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
