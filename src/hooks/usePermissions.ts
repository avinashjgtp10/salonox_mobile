import { useAppSelector } from "./useAppRedux";

type PermMatrix = Record<string, { owner: boolean; staff: boolean }>;

// Last-resort fallback, used only before /users/me's effective_permissions
// has loaded for the first time (e.g. the instant after login, or a page
// reload before fetchMeThunk resolves) — mirrors permission.middleware.ts's
// own DEFAULT_STAFF_PERMS. This is NOT the source of truth once real data is
// available; see the main resolution below.
const defaultPermsMap: PermMatrix = {
  view_campaigns: { owner: true, staff: false },
  create_campaigns: { owner: true, staff: false },
  design_coupons: { owner: true, staff: false },
  view_calendar: { owner: true, staff: true },
  manage_calendar: { owner: true, staff: false },
  view_clients: { owner: true, staff: true },
  create_clients: { owner: true, staff: true },
  edit_clients: { owner: true, staff: true },
  delete_clients: { owner: true, staff: false },
  view_sales: { owner: true, staff: true },
  create_sales: { owner: true, staff: true },
  view_services: { owner: true, staff: true },
  create_services: { owner: true, staff: false },
  edit_services: { owner: true, staff: false },
  view_digital_menu: { owner: true, staff: true },
  view_products: { owner: true, staff: true },
  create_products: { owner: true, staff: false },
  view_packages: { owner: true, staff: true },
  create_packages: { owner: true, staff: false },
  view_memberships: { owner: true, staff: true },
  create_memberships: { owner: true, staff: false },
  view_inventory: { owner: true, staff: true },
  manage_inventory: { owner: true, staff: false },
  stock_adjustment: { owner: true, staff: false },
  view_booking: { owner: true, staff: true },
  manage_booking: { owner: true, staff: false },
  view_team: { owner: true, staff: true },
  add_team_member: { owner: true, staff: false },
  edit_team_member: { owner: true, staff: false },
  manage_shifts: { owner: true, staff: false },
  view_payroll: { owner: true, staff: false },
  view_reports: { owner: true, staff: false },
  export_reports: { owner: true, staff: false },
  general_settings: { owner: true, staff: false },
  manage_pos_payments: { owner: true, staff: false },
  view_enquiries: { owner: true, staff: true },
};

const DEV = import.meta.env.DEV;

// Some nav-level guards need to gate on "any permission in a group" rather than
// a single matrix key (e.g. the Catalog section covers Services/Products/
// Packages/Memberships/Inventory, which each have their own checkbox).
const VIRTUAL_PERMS: Record<string, string[]> = {
  // Product Inventory's Edit/Delete/Add row actions (Warehouse) navigate
  // into these same Catalog product-edit routes (see ProductInventoryPage.tsx
  // + products.routes.ts's OR'd permissions) — a staff member granted only
  // the newer granular Warehouse keys, without the older blanket
  // view_products/create_products, must still be able to pass these gates.
  view_catalog: ["view_services", "view_products", "view_packages", "view_memberships", "view_inventory", "view_product_inventory", "edit_product", "delete_product", "add_product", "view_client_packages", "view_package_templates"],
  edit_catalog: ["create_services", "edit_services", "create_products", "create_packages", "create_memberships", "manage_inventory", "stock_adjustment", "add_product", "edit_product", "delete_product"],
  // The Commissions page (/dashboard/team/commissions) shows both a
  // Commissions tab and a Tips tab in one screen — either permission is
  // enough to open the page; the individual tabs/actions still check their
  // own specific key.
  view_team_commissions: ["view_commissions", "view_tips"],
  // Marketing's 7 sub-areas (Dashboard/Analytics/Campaigns/Templates/
  // Scheduled Templates/Inbox/WhatsApp Config) each have their own
  // independent view permission now — this umbrella is only the outer
  // "can this staff member enter the Marketing section at all" gate in
  // DashboardRoutes.tsx; each sub-route's own PermissionGuard still checks
  // its specific key on top of this.
  view_marketing: [
    "view_marketing_dashboard", "view_marketing_analytics", "view_campaigns",
    "view_templates", "view_scheduled_templates", "view_inbox", "view_whatsapp_config",
  ],
};

function resolveKeys(permKey: string): string[] {
  return VIRTUAL_PERMS[permKey] ?? [permKey];
}

export function usePermissions() {
  const role = useAppSelector((s) => s.auth.role);
  // The real source of truth — computed server-side by
  // getEffectivePermissionsForUser() using the exact same resolution the
  // backend uses to enforce every request (staff_permission_overrides ->
  // role_permissions -> legacy fallback). Refreshed every time /users/me is
  // called (DashboardLayout mount, and after any permission-editing action).
  const effectivePermissions = useAppSelector((s) => s.user.profile?.effective_permissions ?? null);

  if (role === "salon_owner" || role === "admin") {
    return { can: (_key: string) => true, role };
  }

  if (role === "staff" && effectivePermissions != null) {
    if (DEV) console.log("[Permissions] Source: effective_permissions (backend-resolved)", effectivePermissions);
    return {
      can: (permKey: string) => {
        const result = resolveKeys(permKey).some((k) => effectivePermissions[k] ?? false);
        if (DEV) console.log(`[Permissions] can("${permKey}") -> ${result}`);
        return result;
      },
      role,
    };
  }

  // effective_permissions hasn't loaded yet (first render after login/reload,
  // before fetchMeThunk resolves) — use the static fallback so the UI doesn't
  // flash "no access" everywhere, then re-render with real data a moment later.
  if (DEV && role === "staff") {
    console.warn("[Permissions] effective_permissions not loaded yet — using static fallback until /users/me resolves.");
  }

  const can = (permKey: string): boolean => {
    if (role === "staff") {
      return resolveKeys(permKey).some((k) => defaultPermsMap[k]?.staff ?? false);
    }
    return false;
  };

  return { can, role };
}
