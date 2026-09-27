import { useRef, useState, useEffect } from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
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
  // Durable "has the profile fetch actually completed at least once" signal —
  // unlike profileLoading (a boolean that also reads false before the fetch
  // has even started), this can't be misread as "already resolved" on the
  // very first render after a hard reload, before DashboardLayout's mount
  // effect has had a chance to dispatch fetchMeThunk at all.
  const hasProfile = useAppSelector((s) => s.user.profile != null);

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

  // While settings/profile are still loading for the first time, or the
  // one-time stale-permission retry is in flight, render <Outlet/> instead
  // of a spinner — the routed page's own API calls already enforce the real
  // permission server-side, so nothing sensitive is exposed by rendering its
  // shell a moment early. This previously returned a spinner <div> here and
  // <Outlet/> once resolved — a different element at the same position,
  // which made React unmount and remount everything under it (the routed
  // page, including its own data-fetching effects) the instant loading
  // finished, firing those effects a second time on every page refresh for
  // every staff account. Deferring the DENIAL decision (not the rendering)
  // until resolved keeps the "no premature 403" guarantee without the
  // remount.
  // Latching hasResolvedOnce on any render where settingsLoading/profileLoading
  // merely happened to read false was itself the bug — on a hard reload,
  // React's first render of this whole subtree runs before DashboardLayout's
  // mount effect has dispatched fetchMeThunk/fetchSettingsThunk, so both
  // loading flags are still at their untouched initial `false`. That first
  // render would latch "resolved" immediately, based on loading never having
  // STARTED yet rather than having finished — permanently disabling the wait
  // for that guard instance and letting `allowed` (which fails closed while
  // effective_permissions is still empty) fall through to a denial. Waiting
  // for hasProfile as well closes that window: the guard only ever commits to
  // "resolved" once the profile fetch has genuinely completed at least once.
  const stillResolving = (!hasResolvedOnce.current && (settingsLoading || profileLoading || !hasProfile)) || retrying;
  if (stillResolving) return <Outlet />;
  hasResolvedOnce.current = true;

  if (allowed) return <Outlet />;

  if (import.meta.env.DEV) {
    console.warn(`[PermissionGuard] Access denied: permKey="${permKey}", role="${role}"`);
  }

  // A staff member blocked from one module/page shouldn't be left on a dead
  // page — send them to the first module they DO have access to instead
  // (e.g. denied Team → Attendance but still has view_team lands them on
  // Team → Members, not a wall). Only the true dead-end case — no module
  // allowed anywhere — falls through to NoPermissionPage below.
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
    "view_attendance_list", "view_staff_history",
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
