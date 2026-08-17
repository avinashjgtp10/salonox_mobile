import type { AuthUser } from "@/types/auth";
import { canManageStaffLifecycle } from "@/utils/userProfile";

// Backend-defined permission keys carried on AuthUser.custom_permissions —
// see src/types/auth.ts. The backend is authoritative (every gated endpoint
// still enforces this server-side with a 403); these checks only decide
// what the UI offers, matching Web's own reliance on custom_permissions for
// per-staff-member feature access.
export const CONSUMABLE_PERMISSIONS = {
  ADJUST_STOCK: "stock_adjustment",
  VIEW_INVENTORY: "view_inventory",
} as const;

// custom_permissions comes back as either a flat string[] allow-list or a
// { [key]: truthy } record — normalizeAuthUser (src/utils/authUser.ts)
// preserves whichever shape the backend sent rather than picking one, so
// both must be handled here.
export const hasCustomPermission = (user: AuthUser | null | undefined, permissionKey: string): boolean => {
  const permissions = user?.custom_permissions;

  if (Array.isArray(permissions)) {
    return permissions.includes(permissionKey);
  }

  if (permissions && typeof permissions === "object") {
    return Boolean((permissions as Record<string, unknown>)[permissionKey]);
  }

  return false;
};

// Owner/manager-tier roles (see canManageStaffLifecycle) implicitly have
// every permission — custom_permissions is a scoped allow-list layered on
// top for staff-tier accounts, not a replacement for the owner's full
// access. This mirrors how the rest of the app already splits access at
// the owner/staff boundary; there is no richer RBAC contract in this repo
// to check against custom_permissions for owner-tier users.
export const hasInventoryPermission = (user: AuthUser | null | undefined, permissionKey: string): boolean => {
  if (canManageStaffLifecycle(user?.role)) {
    return true;
  }

  return hasCustomPermission(user, permissionKey);
};

export const canViewConsumableInventory = (user: AuthUser | null | undefined) =>
  hasInventoryPermission(user, CONSUMABLE_PERMISSIONS.VIEW_INVENTORY);

export const canAdjustConsumableStock = (user: AuthUser | null | undefined) =>
  hasInventoryPermission(user, CONSUMABLE_PERMISSIONS.ADJUST_STOCK);
