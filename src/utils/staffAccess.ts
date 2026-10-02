import type { AuthUser } from "@/types/auth";
import { isStaffExperienceUser } from "@/utils/routeResolver";
import type { NotificationItem } from "@/types/notification";

export const canReceiveStaffNotification = (user: AuthUser | null | undefined, notification: Pick<NotificationItem, "type" | "recipientUserIds">) =>
  Boolean(user && (!isStaffExperienceUser(user) || (notification.type.toLowerCase() === "appointment" && notification.recipientUserIds?.includes(user.id))));

export const canReceivePush = (user: AuthUser | null | undefined, _data: unknown) => {
  // The unchanged server sends salon-wide pushes. Staff activity is shown
  // inside the app instead; do not display or open remote staff pushes.
  return Boolean(user && !isStaffExperienceUser(user));
};

export const isStaffBusinessWrite = (user: AuthUser | null | undefined, method: string, url: string) =>
  Boolean(user && isStaffExperienceUser(user) && !["get", "head", "options"].includes(method.toLowerCase()) &&
    /^\/(appointments|bookings|sales|payments|staff|attendance|clients|services|products|inventory|stock|consumables|memberships|client-memberships|packages|coupons|wallet|inbox|team|settings|salons|branches)(\/|\?|$)/.test(url));
