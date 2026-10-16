import type { AuthUser } from "@/types/auth";
import { canManageStaffLifecycle, canSettleCommission } from "@/utils/userProfile";

export const COMMISSION_RULE_PERMISSIONS = {
  ADD: "add_commission_rule",
  DELETE: "delete_commission_rule",
  EDIT: "edit_commission_rule",
  VIEW: "view_commissions",
} as const;

/** Owners/admins can do everything; others need the same permission key the web checks. */
export const canUseCommissionRules = (user: AuthUser | null | undefined, permissionKey: string): boolean =>
  canSettleCommission(user?.role) || hasCustomPermission(user, permissionKey);

export const CONSUMABLE_PERMISSIONS = {
  ADJUST_STOCK: "stock_adjustment",
  VIEW_INVENTORY: "view_inventory",
} as const;

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

export const hasInventoryPermission = (user: AuthUser | null | undefined, permissionKey: string): boolean => {
  if (canManageStaffLifecycle(user?.role)) {
    return true;
  }

  return hasCustomPermission(user, permissionKey);
};

// Product Audit: Roles & Permissions, or (staff, mobile app only) the owner's
// "Product Audit access" switch, which unlocks viewing and performing audits.
// Approving/rejecting always needs approve_product_audit.
export const canViewProductAudit = (user: AuthUser | null | undefined) =>
  hasInventoryPermission(user, "view_product_audit") || user?.mobileProductAuditAccess === true;

export const canPerformProductAudit = (user: AuthUser | null | undefined) =>
  hasInventoryPermission(user, "create_product_audit") || user?.mobileProductAuditAccess === true;

// Adding a product the audit scanner doesn't recognise. The Product Audit
// switch covers this too (the backend grants view_products + create_products
// with it); otherwise Roles & Permissions decide.
export const canCreateAuditProduct = (user: AuthUser | null | undefined) =>
  user?.mobileProductAuditAccess === true ||
  (hasInventoryPermission(user, "view_products") && hasInventoryPermission(user, "create_products")) ||
  hasInventoryPermission(user, "add_consumable");

export const canViewConsumableInventory = (user: AuthUser | null | undefined) =>
  hasInventoryPermission(user, CONSUMABLE_PERMISSIONS.VIEW_INVENTORY);

export const canAdjustConsumableStock = (user: AuthUser | null | undefined) =>
  hasInventoryPermission(user, CONSUMABLE_PERMISSIONS.ADJUST_STOCK);
