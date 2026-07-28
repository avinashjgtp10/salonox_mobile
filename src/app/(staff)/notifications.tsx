import NotificationsScreen from "../notifications";
import type { Href } from "expo-router";

export default function StaffNotificationsRoute() {
  return (
    <NotificationsScreen
      backFallback={"/(staff)/home" as Href}
      enableDeepLinks
      requireStaffIdentity
      routeScope="staff"
      showDetailMeta
    />
  );
}
