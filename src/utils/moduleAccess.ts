// Canonical top-level module list, in the same order as DashboardSidebar's
// nav — used by PermissionGuard to find somewhere to send a staff member
// who was just blocked from a module, instead of leaving them on a dead
// page. Each entry's permKey matches exactly what DashboardRoutes.tsx (or
// the module's own default landing route) actually guards that module with.
export interface ModuleAccessEntry {
  permKey: string;
  route: string;
}

export const MODULE_ACCESS_LIST: ModuleAccessEntry[] = [
  { permKey: "view_dashboard", route: "/dashboard" },
  { permKey: "create_sales", route: "/dashboard/sales/quick" },
  { permKey: "view_calendar", route: "/dashboard/calendar" },
  { permKey: "view_clients", route: "/dashboard/clients/list" },
  { permKey: "view_catalog", route: "/dashboard/catalog/services" },
  { permKey: "access_warehouse", route: "/dashboard/inventory/suppliers" },
  { permKey: "access_staff", route: "/dashboard/team/members" },
  { permKey: "view_cash_management", route: "/dashboard/cash-management" },
  { permKey: "view_campaigns", route: "/dashboard/marketing" },
  { permKey: "view_booking", route: "/dashboard/online-booking" },
  { permKey: "view_enquiries", route: "/dashboard/enquiries" },
  { permKey: "view_reports", route: "/reports" },
  { permKey: "access_settings", route: "/dashboard/settings" },
];

/** First module route the given `can()` check allows, or null if none. */
export function getFirstAllowedModuleRoute(can: (permKey: string) => boolean): string | null {
  return MODULE_ACCESS_LIST.find((m) => can(m.permKey))?.route ?? null;
}

/** True if `can()` allows none of the canonical modules at all. */
export function hasNoModuleAccess(can: (permKey: string) => boolean): boolean {
  return getFirstAllowedModuleRoute(can) === null;
}
