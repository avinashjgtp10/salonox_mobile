import type { Href } from "expo-router";

import type { NotificationItem } from "@/types/notification";

type NotificationRouteScope = "owner" | "staff";

const OWNER_ROUTE_BUILDERS: Record<string, (referenceId: string | null) => Href> = {
  appointment: (id) => (id ? (`/appointments/${id}` as Href) : ("/bookings" as Href)),
  attendance: () => "/team/attendance" as Href,
  client: (id) => (id ? (`/clients/${id}` as Href) : ("/clients" as Href)),
  payment: (id) => (id ? (`/sales/${id}` as Href) : ("/sales" as Href)),
  sale: (id) => (id ? (`/sales/${id}` as Href) : ("/sales" as Href)),
  staff: (id) => (id ? (`/team/${id}` as Href) : ("/team" as Href)),
  whatsapp: (id) => (id ? (`/inbox/${encodeURIComponent(id)}` as Href) : ("/inbox" as Href)),
};

const STAFF_ROUTE_BUILDERS: Record<string, (referenceId: string | null) => Href> = {
  appointment: (id) =>
    id ? (`/(staff)/appointment-details/${id}` as Href) : ("/(staff)/appointments" as Href),
  attendance: () => "/(staff)/home" as Href,
  general: () => "/(staff)/notifications" as Href,
  payment: () => "/(staff)/appointments" as Href,
  reminder: () => "/(staff)/calendar" as Href,
  sale: () => "/(staff)/appointments" as Href,
  staff: () => "/(staff)/profile" as Href,
};

const FALLBACK_ROUTE = "/notifications" as Href;
const STAFF_FALLBACK_ROUTE = "/(staff)/notifications" as Href;

export const resolveNotificationRoute = (
  notification: Pick<NotificationItem, "type" | "referenceId">,
  scope: NotificationRouteScope = "owner",
): Href => {
  const type = notification.type.trim().toLowerCase();
  const builders = scope === "staff" ? STAFF_ROUTE_BUILDERS : OWNER_ROUTE_BUILDERS;
  const builder = builders[type];

  return builder ? builder(notification.referenceId) : scope === "staff" ? STAFF_FALLBACK_ROUTE : FALLBACK_ROUTE;
};

export const resolveRouteFromPushData = (
  data: unknown,
  scope: NotificationRouteScope = "owner",
): Href => {
  if (!data || typeof data !== "object") {
    return scope === "staff" ? STAFF_FALLBACK_ROUTE : FALLBACK_ROUTE;
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
    return scope === "staff" ? STAFF_FALLBACK_ROUTE : FALLBACK_ROUTE;
  }

  return resolveNotificationRoute({ type, referenceId }, scope);
};
