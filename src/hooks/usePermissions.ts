import { useAppSelector } from "./useAppRedux";
import { defaultPermissions } from "../features/settings/data/permissionMatrix";

type PermMatrix = Record<string, { owner: boolean; staff: boolean }>;

const defaultPermsMap: PermMatrix = Object.fromEntries(
  defaultPermissions.map((p) => [p.key, { owner: p.owner, staff: p.staff }])
);

const DEV = import.meta.env.DEV;

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
        const result = customPermissions[permKey] ?? false;
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
      const result = perms[permKey]?.staff ?? false;
      if (DEV) console.log(`[Permissions] can("${permKey}") → ${result} [role default]`);
      return result;
    }
    return false;
  };

  return { can, role };
}
