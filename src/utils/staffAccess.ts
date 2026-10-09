import type { AuthUser } from "@/types/auth";
import { isStaffExperienceUser } from "@/utils/routeResolver";
import type { NotificationItem } from "@/types/notification";

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

// Owner-controlled, mobile-only switch (Edit Staff → Calendar & Quick Sale
// access): lets the staff member book and bill Quick Sales from their Calendar.
export const canUseStaffQuickSale = (user: AuthUser | null | undefined) =>
  Boolean(user && isStaffExperienceUser(user) && user.mobileCalendarAccess === true);

// The writes a Calendar Quick Sale makes. The backend still checks each one
// against the same switch, so this only stops the app from refusing them early.
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

export const isStaffBusinessWrite = (user: AuthUser | null | undefined, method: string, url: string) =>
  Boolean(user && isStaffExperienceUser(user) && !["get", "head", "options"].includes(method.toLowerCase()) &&
    !(method.toLowerCase() === "post" && /^\/attendance\/check-(in|out)$/.test(url)) &&
    !isStaffQuickSaleWrite(user, method.toLowerCase(), url) &&
    /^\/(appointments|bookings|sales|payments|staff|attendance|devices|clients|services|products|inventory|stock|consumables|memberships|client-memberships|packages|coupons|wallet|inbox|team|settings|salons|branches)(\/|\?|$)/.test(url));
