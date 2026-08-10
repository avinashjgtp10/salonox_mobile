import type { Setting } from "../../../types/setting.types";

// Same fixed-key, single-row convention as TAX_MODULE_CONFIG
// (taxModuleSettings.ts) — one JSON blob per salon in salon_settings' single
// `value` column. Read server-side by getPackageNoShowPolicy() in
// salon_mgm_backend/src/modules/client-packages/package-settings.util.ts;
// the key name and the `policy` field must stay identical to that reader.
export const PACKAGE_NO_SHOW_POLICY_KEY = "package_no_show_policy";

export type PackageNoShowPolicy = "do_not_deduct" | "deduct_package";

export interface PackageNoShowConfig {
  // What happens to a package session when a client no-shows an appointment
  // that was booked out of a package sale. Defaults to NOT deducting: the
  // session stays available and the visit can simply be rebooked, which is
  // the forgiving option and matches how a cancellation already behaves.
  policy: PackageNoShowPolicy;
}

export const DEFAULT_PACKAGE_NO_SHOW_CONFIG: PackageNoShowConfig = {
  policy: "do_not_deduct",
};

export function parsePackageNoShowValue(raw: Setting["value"]): PackageNoShowConfig {
  const coerce = (v: any): PackageNoShowConfig =>
    v?.policy === "deduct_package" ? { policy: "deduct_package" } : DEFAULT_PACKAGE_NO_SHOW_CONFIG;

  if (raw && typeof raw === "object") return coerce(raw);
  if (typeof raw === "string") {
    try {
      return coerce(JSON.parse(raw));
    } catch {
      // ignore — fall through to default
    }
  }
  return DEFAULT_PACKAGE_NO_SHOW_CONFIG;
}

export function findPackageNoShowSetting(items: Setting[]): Setting | undefined {
  return items.find((s) => s.key === PACKAGE_NO_SHOW_POLICY_KEY);
}

export function getPackageNoShowConfig(items: Setting[]): PackageNoShowConfig {
  const setting = findPackageNoShowSetting(items);
  return setting ? parsePackageNoShowValue(setting.value) : DEFAULT_PACKAGE_NO_SHOW_CONFIG;
}
