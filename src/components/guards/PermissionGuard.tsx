import { useRef } from "react";
import { Outlet } from "react-router-dom";
import { ShieldOff, Loader2 } from "lucide-react";
import { usePermissions } from "../../hooks/usePermissions";
import { useAppSelector } from "../../hooks/useAppRedux";

interface Props {
  permKey: string;
}

export default function PermissionGuard({ permKey }: Props) {
  const { can, role } = usePermissions();
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

  return (
    <div className="perm-guard-403">
      <div className="perm-guard-403__icon">
        <ShieldOff size={42} />
      </div>
      <h2 className="perm-guard-403__title">Access Denied</h2>
      <p className="perm-guard-403__sub">
        {role === "staff"
          ? `Your account does not have the "${permKey}" permission. Ask your salon owner to enable it in Settings → Roles & Permissions.`
          : "You do not have access to this page."}
      </p>
      <p className="perm-guard-403__code">403 Forbidden</p>
    </div>
  );
}
