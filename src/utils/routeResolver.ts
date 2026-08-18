import type { Href } from "expo-router";

import type { AuthUser, LoginResponseData } from "@/types/auth";
import { canManageStaffLifecycle } from "@/utils/userProfile";

export const OWNER_HOME_ROUTE = "/dashboard" as Href;
export const STAFF_HOME_ROUTE = "/(staff)/home" as Href;
export const ONBOARDING_ROUTE = "/onboarding" as Href;
export const SUBSCRIPTION_ROUTE = "/subscription" as Href;
export const OWNER_ROUTE_GROUP = "(tabs)";
export const STAFF_ROUTE_GROUP = "(staff)";
const OWNER_ONLY_TOP_LEVEL_ROUTES = new Set([
  "appointments",
  "bookings",
  "clients",
  "dashboard",
  "memberships",
  "profile",
  "quick-sale",
  "sales",
  "salon-settings",
  "services",
  "stock",
  "team",
  "users",
]);

// SCRUM-1838: no longer gated on isOnboardingComplete — the onboarding step
// (salon setup wizard, src/app/onboarding.tsx) was removed from the launch
// flow, so role is the only thing that decides staff vs owner experience.
export const isStaffExperienceUser = (user?: AuthUser | null) =>
  !canManageStaffLifecycle(user?.role);

export const resolveAuthenticatedRoute = (user?: AuthUser | null): Href =>
  isStaffExperienceUser(user) ? STAFF_HOME_ROUTE : OWNER_HOME_ROUTE;

export const resolveLoginRoute = (authData: LoginResponseData): Href =>
  resolveAuthenticatedRoute(authData.user);

export const isOwnerRouteGroup = (segment?: string | null) => segment === OWNER_ROUTE_GROUP;

export const isStaffRouteGroup = (segment?: string | null) => segment === STAFF_ROUTE_GROUP;

export const isOwnerOnlyRoute = (segment?: string | null) =>
  Boolean(segment && OWNER_ONLY_TOP_LEVEL_ROUTES.has(segment));
