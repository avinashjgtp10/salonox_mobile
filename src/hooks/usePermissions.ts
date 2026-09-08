import { useAppSelector } from "./useAppRedux";

type PermMatrix = Record<string, { owner: boolean; staff: boolean }>;

// Last-resort fallback, used only when a salon has no role_permissions
// setting saved yet — mirrors permission.middleware.ts's own
// DEFAULT_STAFF_PERMS on the backend (which is deliberately kept as a
// hardcoded constant there too, not moved into the DB-backed permissions
// catalog — the catalog is the list of *what permissions exist*, not each
// role's default grant, which now lives in the roles/role_permissions
// tables per salon). Keep the two in sync when adding a new
// requirePermission() key on the backend.
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
  view_catalog: ["view_services", "view_products", "view_packages", "view_memberships", "view_inventory"],
  edit_catalog: ["create_services", "edit_services", "create_products", "create_packages", "create_memberships", "manage_inventory", "stock_adjustment"],
};

function resolveKeys(permKey: string): string[] {
  return VIRTUAL_PERMS[permKey] ?? [permKey];
}

export function usePermissions() {
  const role = useAppSelector((s) => s.auth.role);
  // Fresh data — set every time DashboardLayout mounts via fetchMeThunk
  const profileCustomPerms = useAppSelector((s) => s.user.profile?.custom_permissions ?? null);
  // Persisted fallback — restored from localStorage on page reload before fetchMeThunk completes
  const authCustomPerms = useAppSelector((s) => s.auth.custom_permissions);
  const settingItems = useAppSelector((s) => s.setting.items);

  if (role === "salon_owner" || role === "admin") {
    return { can: (_key: string) => true, role };
  }

  // Prefer fresh profile data; fall back to persisted auth value on first render after reload
  const customPermissions = profileCustomPerms ?? authCustomPerms;

  // Per-staff custom permissions take priority over role-level defaults
  if (role === "staff" && customPermissions != null) {
    if (DEV) {
      console.log("[Permissions] Source: CUSTOM (per-staff override)", customPermissions);
    }
    return {
      can: (permKey: string) => {
        const result = resolveKeys(permKey).some((k) => customPermissions[k] ?? false);
        if (DEV) {
          console.log(`[Permissions] can("${permKey}") → ${result} [custom]`);
        }
        return result;
      },
      role,
    };
  }

  // Fall back to global role_permissions setting, then to built-in defaults
  let perms: PermMatrix = defaultPermsMap;
  const permSetting = settingItems.find((s) => s.key === "role_permissions");
  if (permSetting) {
    try {
      const raw = permSetting.value;
      perms = typeof raw === "string" ? JSON.parse(raw) : (raw as PermMatrix);
      if (DEV) console.log("[Permissions] Source: role_permissions setting", perms);
    } catch {
      if (DEV) console.warn("[Permissions] role_permissions setting is malformed JSON — using built-in defaults");
    }
  } else if (DEV) {
    console.log("[Permissions] Source: built-in defaultPermissions (no role_permissions setting found)");
  }

  if (DEV && role === "staff" && customPermissions == null) {
    console.warn("[Permissions] custom_permissions is NULL for staff — using role defaults. Check if /users/me returns custom_permissions.");
  }

  const can = (permKey: string): boolean => {
    if (role === "salon_owner" || role === "admin") return true;
    if (role === "staff") {
      const result = resolveKeys(permKey).some((k) => perms[k]?.staff ?? false);
      if (DEV) console.log(`[Permissions] can("${permKey}") → ${result} [role default]`);
      return result;
    }
    return false;
  };

  return { can, role };
}
