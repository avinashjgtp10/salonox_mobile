import { useRef } from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { usePermissions } from "../../hooks/usePermissions";
import { useAppSelector } from "../../hooks/useAppRedux";
import { getFirstAllowedModuleRoute } from "../../utils/moduleAccess";
import NoPermissionPage from "./NoPermissionPage";

interface Props {
  permKey: string;
}

export default function PermissionGuard({ permKey }: Props) {
  const { can, role } = usePermissions();
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

  // Owners bypass immediately — no need to wait for settings
  if (role === "salon_owner" || role === "admin") return <Outlet />;

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

  if (can(permKey)) return <Outlet />;

  if (import.meta.env.DEV) {
    console.warn(`[PermissionGuard] Access denied: permKey="${permKey}", role="${role}"`);
  }

  // A staff member blocked from one module/page shouldn't be left on a dead
  // page — send them to the first module they DO have access to instead
  // (e.g. denied Team → Payroll but still has view_team lands them on Team →
  // Members, not a wall). Only the true dead-end case — no module allowed
  // anywhere — falls through to NoPermissionPage below.
  if (role === "staff") {
    const firstAllowed = getFirstAllowedModuleRoute(can);
    if (firstAllowed && firstAllowed !== location.pathname) {
      return <Navigate to={firstAllowed} replace />;
    }
  }

  return <NoPermissionPage permKey={role === "staff" ? permKey : undefined} />;
}
