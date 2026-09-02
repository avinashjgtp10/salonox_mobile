import { Outlet } from "react-router-dom";
import { ShieldOff } from "lucide-react";
import { useAppSelector } from "../../hooks/useAppRedux";

// Restricts a route to salon_owner/admin — for screens that shouldn't be
// grantable to staff via custom_permissions at all (unlike PermissionGuard,
// which staff can be given access to).
export default function OwnerGuard() {
  const role = useAppSelector((s) => s.auth.role);

  if (role === "salon_owner" || role === "admin") return <Outlet />;

  return (
    <div className="perm-guard-403">
      <div className="perm-guard-403__icon">
        <ShieldOff size={42} />
      </div>
      <h2 className="perm-guard-403__title">Access Denied</h2>
      <p className="perm-guard-403__sub">You do not have access to this page.</p>
      <p className="perm-guard-403__code">403 Forbidden</p>
    </div>
  );
}
