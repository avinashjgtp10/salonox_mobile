import type { AuthUser } from "@/types/auth";
import { isStaffExperienceUser } from "@/utils/routeResolver";
import type { NotificationItem } from "@/types/notification";
import { canCreateAuditProduct, canPerformProductAudit, canViewProductAudit, hasCustomPermission } from "@/utils/permissions";

export const canReceiveStaffNotification = (user: AuthUser | null | undefined, notification: Pick<NotificationItem, "type" | "recipientUserIds">) =>
  Boolean(user && (!isStaffExperienceUser(user) || (["appointment", "attendance"].includes(notification.type.toLowerCase()) && notification.recipientUserIds?.includes(user.id))));

export const canReceivePush = (user: AuthUser | null | undefined, data: unknown) => {
  if (!user) return false;
  if (!isStaffExperienceUser(user)) return true;
  if (!data || typeof data !== "object") return false;
  const payload = data as { type?: string; recipient_user_ids?: unknown };
  // Staff see only their own appointment/attendance pushes: the backend lists
  // the assigned staff's user ids in recipient_user_ids. Appointment pushes
  // were previously dropped here, so staff missed their own bookings while
  // the app was open.
  return (payload.type === "appointment" || payload.type === "attendance") &&
    Array.isArray(payload.recipient_user_ids) && payload.recipient_user_ids.includes(user.id);
};

// Calendar Quick Sale follows the backend-resolved web permission map.
export const canUseStaffQuickSale = (user: AuthUser | null | undefined) =>
  Boolean(user && isStaffExperienceUser(user) && hasCustomPermission(user, "view_calendar") && hasCustomPermission(user, "access_quick_sale"));

// These operations remain subject to their individual backend permission checks.
const STAFF_QUICK_SALE_WRITES: [method: string, path: RegExp][] = [
  ["post", /^\/(sales|appointments|payments|clients)$/],
  ["post", /^\/(sales|appointments)\/[^/]+\/checkout$/],
  ["patch", /^\/(sales|appointments)\/[^/]+$/],
  ["delete", /^\/sales\/[^/]+$/],
  ["post", /^\/coupons\/validate$/],
];

const isStaffQuickSaleWrite = (user: AuthUser | null | undefined, method: string, url: string) => {
  if (!canUseStaffQuickSale(user)) return false;
  const path = url.split("?")[0];
  return STAFF_QUICK_SALE_WRITES.some(([allowedMethod, pattern]) => allowedMethod === method && pattern.test(path));
};

// Audit is an explicitly delegated workflow. Keep the general staff write
// guard intact and allow only its permission-matched API operations.
export const isStaffAuditWrite = (user: AuthUser | null | undefined, method: string, url: string) => {
  if (!user || !canViewProductAudit(user)) return false;
  const path = url.split("?")[0];
  const verb = method.toLowerCase();
  const perform = canPerformProductAudit(user);
  if (verb === "post" && /^\/inventory\/product-audits\/[^/]+\/(approve|reject)$/.test(path)) return hasCustomPermission(user, "approve_product_audit");
  if (!perform) return false;
  if (verb === "post" && (path === "/inventory/product-audits" || /^\/inventory\/product-audits\/[^/]+\/(items|submit|reopen|recognize)$/.test(path))) return true;
  if (["patch", "delete"].includes(verb) && /^\/inventory\/product-audits\/[^/]+\/items\/[^/]+$/.test(path)) return true;
  if (verb === "post" && path === "/products") return canCreateAuditProduct(user);
  if (verb === "post" && path === "/products/brands") return hasCustomPermission(user, "create_products") || hasCustomPermission(user, "manage_my_brands");
  return false;
};

export const isStaffBusinessWrite = (user: AuthUser | null | undefined, method: string, url: string) =>
  Boolean(user && isStaffExperienceUser(user) && !["get", "head", "options"].includes(method.toLowerCase()) &&
    !(method.toLowerCase() === "post" && /^\/attendance\/check-(in|out)$/.test(url)) &&
    !isStaffQuickSaleWrite(user, method.toLowerCase(), url) &&
    !isStaffAuditWrite(user, method.toLowerCase(), url) &&
    /^\/(appointments|bookings|sales|payments|staff|attendance|devices|clients|services|products|inventory|stock|consumables|memberships|client-memberships|packages|coupons|wallet|inbox|team|settings|salons|branches)(\/|\?|$)/.test(url));
