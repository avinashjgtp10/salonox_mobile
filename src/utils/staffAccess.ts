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
  return payload.type === "attendance" && Array.isArray(payload.recipient_user_ids) && payload.recipient_user_ids.includes(user.id);
};

export const isStaffBusinessWrite = (user: AuthUser | null | undefined, method: string, url: string) =>
  Boolean(user && isStaffExperienceUser(user) && !["get", "head", "options"].includes(method.toLowerCase()) &&
    !(method.toLowerCase() === "post" && /^\/attendance\/check-(in|out)$/.test(url)) &&
    /^\/(appointments|bookings|sales|payments|staff|attendance|devices|clients|services|products|inventory|stock|consumables|memberships|client-memberships|packages|coupons|wallet|inbox|team|settings|salons|branches)(\/|\?|$)/.test(url));
