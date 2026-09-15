import { useRef, useState, useEffect } from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { usePermissions } from "../../hooks/usePermissions";
import { useAppSelector, useAppDispatch } from "../../hooks/useAppRedux";
import { fetchMeThunk } from "../../middleware/user/user.thunk";
import { getFirstAllowedModuleRoute } from "../../utils/moduleAccess";
import NoPermissionPage from "./NoPermissionPage";

interface Props {
  permKey: string;
}

export default function PermissionGuard({ permKey }: Props) {
  const { can, role } = usePermissions();
  const dispatch = useAppDispatch();
  const location = useLocation();
  const settingsLoading = useAppSelector((s) => s.setting.loading.fetchAll);
  const profileLoading = useAppSelector((s) => s.user.loading.fetch);

  // `state.setting.loading.fetchAll` is a global flag shared by every feature
  // that dispatches fetchSettingsThunk (e.g. AppointmentModal refetches tax
  // settings on its own mount). Gating on it unconditionally created a loop:
  // guard shows spinner -> unmounts the routed page -> its effects re-run on
  // next mount -> re-dispatches fetchSettingsThunk -> flag flips again -> guard
  // shows spinner again, forever. Only wait for the *initial* load; once we've
  // resolved a permission decision once, later background refetches elsewhere
  // in the app shouldn't tear the guarded page back down.
  const hasResolvedOnce = useRef(false);
  const isOwnerOrAdmin = role === "salon_owner" || role === "admin";
  const allowed = can(permKey);

  // effective_permissions is fetched exactly once per session, on
  // DashboardLayout's initial mount — it's never refetched automatically
  // after that. If an owner changes this staff member's role/permissions
  // while their session is already open (a different tab, or just staying
  // logged in), this tab keeps enforcing the stale copy until a hard
  // refresh or re-login. Rather than actually deny on possibly-stale data,
  // retry once with a fresh /users/me first — hasRetriedRef makes sure this
  // only ever fires once per mounted guard instance, never loops.
  const hasRetriedRef = useRef(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!isOwnerOrAdmin && !allowed && role === "staff" && !hasRetriedRef.current) {
      hasRetriedRef.current = true;
      setRetrying(true);
      dispatch(fetchMeThunk()).finally(() => setRetrying(false));
    }
  }, [isOwnerOrAdmin, allowed, role, dispatch]);

  // Owners bypass immediately — no need to wait for settings
  if (isOwnerOrAdmin) return <Outlet />;

  // While settings or profile are loading for the first time, show a spinner
  // instead of a premature 403
  if (!hasResolvedOnce.current && (settingsLoading || profileLoading)) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <Loader2 size={28} style={{ animation: "perm-spin 0.75s linear infinite", color: "#9ca3af" }} />
      </div>
    );
  }
  hasResolvedOnce.current = true;

  // Same spinner while the one-time stale-permission retry above is in
  // flight — avoids flashing a denial that a moment later turns out to be
  // wrong once the fresh permissions land.
  if (retrying) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <Loader2 size={28} style={{ animation: "perm-spin 0.75s linear infinite", color: "#9ca3af" }} />
      </div>
    );
  }

  if (allowed) return <Outlet />;

  if (import.meta.env.DEV) {
    console.warn(`[PermissionGuard] Access denied: permKey="${permKey}", role="${role}"`);
  }

  // A staff member blocked from one module/page shouldn't be left on a dead
  // page — send them to the first module they DO have access to instead
  // (e.g. denied Team → Payroll but still has view_team lands them on Team →
  // Members, not a wall). Only the true dead-end case — no module allowed
  // anywhere — falls through to NoPermissionPage below.
  //
  // Dashboard, Quick Sale, Calendar, and the 3 Clients pages are
  // deliberately excluded from this redirect. Dashboard is the default
  // landing page, not "one module among many" — denying view_dashboard
  // should show Not Authorized right there, not silently whisk the user
  // off elsewhere the moment they land on "/". The rest are excluded per
  // explicit ticket requirements: direct URL access when denied must show
  // the Not Authorized page, not a silent redirect to whatever other
  // module the user happens to have.
  const NO_REDIRECT_KEYS = [
    "view_dashboard", "create_sales", "view_calendar",
    "view_clients", "view_referral_rewards", "view_client_history",
    "view_suppliers", "manage_inventory", "view_orders",
    "view_product_inventory", "view_consumable_inventory", "view_product_audit",
    "view_stock_ledger",
    "view_services", "view_digital_menu", "view_products", "view_memberships",
    "view_client_packages", "view_package_templates",
    "view_team", "access_staff", "view_scheduled_shifts", "view_team_commissions",
    "view_attendance_list", "view_payroll", "view_staff_history",
    "view_cash_management", "access_warehouse",
    "view_marketing", "view_marketing_dashboard", "view_marketing_analytics",
    "view_campaigns", "view_templates", "view_scheduled_templates",
    "view_inbox", "view_whatsapp_config",
    "view_reports",
    "access_settings",
    "view_enquiries",
    "view_notifications",
  ];
  if (role === "staff" && !NO_REDIRECT_KEYS.includes(permKey)) {
    const firstAllowed = getFirstAllowedModuleRoute(can);
    if (firstAllowed && firstAllowed !== location.pathname) {
      return <Navigate to={firstAllowed} replace />;
    }
  }

  return <NoPermissionPage permKey={role === "staff" ? permKey : undefined} />;
}
