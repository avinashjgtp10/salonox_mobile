import { useAppSelector } from "./useAppRedux";

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
  // Sidebar nav dimming ticket: Warehouse and Staff each have several
  // independent top-level master keys (7 for Warehouse — Suppliers/Orders/
  // Product Inventory/Consumable Inventory/Product Audit/Stock Ledger/
  // Inventory itself; 5 for Staff — Staff List/Payroll/Scheduled Shifts/
  // Commissions/Tips) with no single real permission uniting them, unlike
  // Catalog/Marketing/Reports which already had one. Purely frontend-only
  // virtual keys, same shape as view_catalog/view_marketing above — used
  // for the sidebar nav item's own visible-but-disabled state (and as
  // Warehouse/Staff's MODULE_ACCESS_LIST fallback route), not as a real
  // catalog permission. access_staff is ALSO used as Team's outer
  // DashboardRoutes.tsx route guard (replacing the too-narrow view_team,
  // which incorrectly blocked the whole /dashboard/team/* tree for a staff
  // member granted only e.g. view_payroll).
  access_warehouse: [
    "view_suppliers", "view_orders", "view_product_inventory",
    "view_consumable_inventory", "view_product_audit", "view_stock_ledger", "view_inventory",
  ],
  access_staff: ["view_team", "view_payroll", "view_scheduled_shifts", "view_commissions", "view_tips"],
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
  // Reports ticket: view_reports used to be the one real permission every
  // report route checked directly. Now each report has its own dedicated
  // view_report_<id> key (see ReportsPage.tsx's REPORTS array), gated behind
  // 8 category parents — view_reports becomes the outer "can enter the
  // Reports section at all" umbrella (route guard in DashboardRoutes.tsx),
  // same OR-of-children pattern as view_marketing above.
  //
  // view_reports is included alongside its 8 children (not replaced by
  // them) so the catalog's still-real, still-toggleable "View Reports" row
  // stays meaningful as a one-switch "grant every report category" master
  // permission, instead of silently doing nothing when granted on its own —
  // that gap is what broke access for a staff member granted only this row
  // and one specific report, with none of the 8 categories set (2026-09-11).
  view_reports: [
    "view_reports", "view_reports_sales", "view_reports_payments", "view_reports_customers",
    "view_reports_appointments", "view_reports_inventory", "view_reports_staff",
    "view_reports_packages", "view_reports_marketing",
  ],
  // Online Booking Channels ticket: view_booking used to be the one real
  // permission gating both "can enter this module" AND marketplace's own
  // read routes. The routes now check view_marketplace directly (see
  // marketplace.routes.ts), leaving view_booking backend-dead on its own —
  // same situation view_reports was in, same fix: keep it as a real,
  // toggleable "General" row (a one-switch "grant every channel" master),
  // OR'd together with its 4 children instead of replaced by them.
  view_booking: [
    "view_booking", "view_marketplace", "view_reserve_with_google",
    "view_social_bookings", "view_link_builder",
  ],
  // Settings ticket: the outer "can enter the Settings section at all"
  // route guard in DashboardRoutes.tsx — OR of all 18 section-specific
  // keys, so a staff member granted only e.g. "View Branches" isn't blocked
  // from ever reaching it.
  //
  // access_settings is now ALSO a real, toggleable catalog permission in
  // its own right (add_access_settings_master_permission_key.sql), included
  // here in its own OR-list same as view_reports below — a single master
  // switch an owner can flip instead of having to enable every section
  // individually, without removing the per-section granularity.
  access_settings: [
    "access_settings",
    "view_settings_profile", "view_settings_business", "view_settings_account_security",
    "view_branches", "view_settings_notifications", "view_roles",
    "view_settings_integrations", "view_settings_pos_payments", "view_settings_billing",
    "view_settings_currency", "view_settings_tax_mapping", "view_settings_reward_points",
    "view_settings_referral", "view_coupons", "view_settings_packages",
    "view_settings_print", "view_settings_bulk_billing_import", "view_settings_data_privacy",
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
  // before fetchMeThunk resolves). Roles & Permissions (RolesPermissionsPage.tsx
  // / roles.thunk.ts) is fully backend-configurable per salon now — an owner
  // can grant or revoke any permission on any role at any time — so there is
  // no fixed client-side default that could stand in for it without risking
  // staff seeing (or being blocked from) the wrong things for a moment. Deny
  // by default instead of guessing; effective_permissions above takes over
  // within one request round-trip of fetchMeThunk resolving.
  if (DEV && role === "staff") {
    console.warn("[Permissions] effective_permissions not loaded yet — denying by default until /users/me resolves.");
  }

  return { can: () => false, role };
}
