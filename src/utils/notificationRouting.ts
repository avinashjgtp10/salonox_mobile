import type { Href } from "expo-router";

import type { NotificationItem } from "@/types/notification";

// Keyed by the real `type` strings the backend's single notification choke
// point (notificationsService.create) currently sends — "appointment",
// "client", "payment", "whatsapp" — plus a few reasonable ones ahead of
// backend coverage (attendance, staff, sale as a payment alias). This is
// intentionally NOT an exhaustive/closed enum: any `type` not listed here
// falls through to the generic Notifications screen instead of being
// dropped, so a brand-new backend notification type renders/navigates
// correctly with zero frontend changes.
const ROUTE_BUILDERS: Record<string, (referenceId: string | null) => Href> = {
  appointment: (id) => (id ? (`/appointments/${id}` as Href) : ("/bookings" as Href)),
  attendance: () => "/team/attendance" as Href,
  client: (id) => (id ? (`/clients/${id}` as Href) : ("/clients" as Href)),
  payment: (id) => (id ? (`/sales/${id}` as Href) : ("/sales" as Href)),
  sale: (id) => (id ? (`/sales/${id}` as Href) : ("/sales" as Href)),
  staff: (id) => (id ? (`/team/${id}` as Href) : ("/team" as Href)),
};

const FALLBACK_ROUTE = "/notifications" as Href;

export const resolveNotificationRoute = (
  notification: Pick<NotificationItem, "type" | "referenceId">,
): Href => {
  const builder = ROUTE_BUILDERS[notification.type.trim().toLowerCase()];

  return builder ? builder(notification.referenceId) : FALLBACK_ROUTE;
};

// Push payload data survives as loosely-typed JSON (Expo/FCM don't preserve
// our TS types), so this normalizes whatever shape actually arrives before
// handing it to resolveNotificationRoute.
export const resolveRouteFromPushData = (data: unknown): Href => {
  if (!data || typeof data !== "object") {
    return FALLBACK_ROUTE;
  }

  const record = data as Record<string, unknown>;
  const type = typeof record.type === "string" ? record.type : "";
  const referenceId =
    typeof record.referenceId === "string"
      ? record.referenceId
      : typeof record.reference_id === "string"
        ? record.reference_id
        : typeof record.reference === "string"
          ? record.reference
          : null;

  if (!type) {
    return FALLBACK_ROUTE;
  }

  return resolveNotificationRoute({ type, referenceId });
};
