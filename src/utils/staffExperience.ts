import type { AuthUser } from "@/types/auth";
import { hasCustomPermission } from "./permissions";

export const isStaffAccount = (user?: AuthUser | null) =>
  ["staff", "employee", "stylist", "team_member", "team-member", "manager"].includes((user?.role ?? "").toLowerCase());
export const isManagerAccount = (user?: AuthUser | null) =>
  isStaffAccount(user) && (user?.roleName ?? user?.role ?? "").trim().toLowerCase() === "manager";
export const hasBusinessDashboard = (user?: AuthUser | null) =>
  Boolean(user && (!isStaffAccount(user) || hasCustomPermission(user, "view_dashboard")));
export const canAccessLunox = (user?: AuthUser | null) => Boolean(user &&
  (!isStaffAccount(user) || (isManagerAccount(user) && hasCustomPermission(user, "use_ai_assistant"))));
export const canAccessBusinessModule = (user: AuthUser | null | undefined, ...permissions: string[]) =>
  Boolean(user && (!isStaffAccount(user) || permissions.some(key => hasCustomPermission(user, key))));
