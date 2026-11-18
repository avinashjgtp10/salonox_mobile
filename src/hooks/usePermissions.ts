import { useAuth } from "@/context/AuthContext";
import { useCallback, useMemo } from "react";

/**
 * Mobile-side `can(permKey)` — mirrors the web's usePermissions hook. Reads
 * the resolved permission map that the backend emits on login (and that
 * useStaffCalendarAccess keeps in sync), stored on
 * `AuthUser.effective_permissions`. Owners/admins get a blanket `true`.
 *
 * Backend `requirePermission()` middleware enforces the same keys on every
 * mutating endpoint — this is purely for hiding/disabling UI affordances a
 * user can't actually use.
 */
export function usePermissions() {
  const { user } = useAuth();
  const isPrivileged = user?.role === "salon_owner" || user?.role === "admin";
  const permissions = user?.effective_permissions ?? null;

  const can = useCallback(
    (permKey: string) => (isPrivileged ? true : permissions?.[permKey] === true),
    [isPrivileged, permissions],
  );

  return useMemo(() => ({ can, isOwner: user?.role === "salon_owner", isAdmin: user?.role === "admin", isPrivileged }), [can, isPrivileged, user?.role]);
}
