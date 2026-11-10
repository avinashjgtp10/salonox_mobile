import type { Href } from "expo-router";

import type { AuthUser, LoginResponseData } from "@/types/auth";
import { canManageStaffLifecycle } from "@/utils/userProfile";
import { canViewProductAudit } from "@/utils/permissions";
import { hasBusinessDashboard, isStaffAccount, canAccessBusinessModule } from "./staffExperience";

export const OWNER_HOME_ROUTE = "/dashboard" as Href;
export const STAFF_HOME_ROUTE = "/(staff)/home" as Href;
export const OWNER_CALENDAR_ROUTE = "/(tabs)/calendar" as Href;
export const STAFF_CALENDAR_ROUTE = "/(staff)/calendar" as Href;
export const SUBSCRIPTION_ROUTE = "/subscription" as Href;
export const STAFF_ROUTE_GROUP = "(staff)";
const STAFF_SHARED_ROUTES = new Set(["change-password", "privacy-policy", "notification-settings", "appearance"]);
// Opened from the staff Calendar only when the owner turned on the staff
// member's Calendar & Quick Sale access.
const STAFF_QUICK_SALE_ROUTE = "quick-sale";
export const isStaffBusinessTabAllowed = (tab: string | undefined, user?: AuthUser | null) => {
  if (!hasBusinessDashboard(user)) return false;
  if (!tab || ["dashboard", "more"].includes(tab)) return true;
  if (tab === "quick-sale-action") return canAccessBusinessModule(user, "view_calendar") && canAccessBusinessModule(user, "access_quick_sale");
  const permissions: Record<string, string[]> = {
    calendar: ["view_calendar"],
    whatsapp: ["view_inbox"], team: ["view_staff"],
  };
  return permissions[tab]?.some(key => canAccessBusinessModule(user, key)) ?? false;
};
export const isStaffAllowedRoute = (segment?: string | null, user?: AuthUser | null) =>
  segment === STAFF_ROUTE_GROUP ||
  STAFF_SHARED_ROUTES.has(segment ?? "") ||
  (segment === "(tabs)" && hasBusinessDashboard(user)) ||
  (hasBusinessDashboard(user) && Boolean(BUSINESS_ROUTE_PERMISSIONS[segment ?? ""]?.some(key => canAccessBusinessModule(user, key)))) ||
  (segment === "product-audits" && canViewProductAudit(user)) ||
  (segment === STAFF_QUICK_SALE_ROUTE && canAccessBusinessModule(user, "access_quick_sale") && canAccessBusinessModule(user, "view_calendar"));

const BUSINESS_ROUTE_PERMISSIONS: Record<string, string[]> = {
  clients: ["view_clients"], bookings: ["view_calendar", "view_appointment"], appointments: ["view_appointment"],
  sales: ["view_sales", "access_quick_sale"], reports: ["view_reports"], catalog: ["view_services", "view_products", "view_memberships", "view_packages"],
  services: ["view_services"], stock: ["view_products", "view_inventory"], memberships: ["view_memberships"],
  team: ["view_staff", "view_attendance", "view_commissions", "view_tips"], marketing: ["view_marketing_dashboard", "view_marketing_analytics"],
  inbox: ["view_inbox"], "today-revenue": ["view_dashboard_card_today_revenue"], "monthly-revenue": ["view_dashboard_card_total_revenue"],
  "month-overview": ["view_dashboard_card_revenue_overview"],
};

export const isStaffExperienceUser = (user?: AuthUser | null) =>
  isStaffAccount(user) || !canManageStaffLifecycle(user?.role);

export const resolveAuthenticatedRoute = (user?: AuthUser | null): Href =>
  isStaffExperienceUser(user) && !hasBusinessDashboard(user) ? STAFF_HOME_ROUTE : OWNER_HOME_ROUTE;

export const resolveLoginRoute = (authData: LoginResponseData): Href =>
  resolveAuthenticatedRoute(authData.user);

export const isStaffRouteGroup = (segment?: string | null) => segment === STAFF_ROUTE_GROUP;
