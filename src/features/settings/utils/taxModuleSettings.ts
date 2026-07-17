import type { Setting } from "../../../types/setting.types";

// Same fixed-key, single-row convention as REWARD_POINTS_CONFIG
// (rewardPointsSettings.ts) — a salon only has one GST module configuration,
// JSON-encoded into salon_settings' single `value` column.
export const TAX_MODULE_SETTING_KEY = "TAX_MODULE_CONFIG";

export interface TaxModuleConfig {
  // Master on/off — when false, no tax is calculated or shown anywhere,
  // regardless of individual Tax Mapping rows' own `active` flag (see
  // getActiveTaxes() in taxSettings.ts, which checks this first).
  enabled: boolean;
  invoice_prefix: string;
  show_breakup_on_invoice: boolean;
  enable_gst_reports: boolean;
}

export const DEFAULT_TAX_MODULE_CONFIG: TaxModuleConfig = {
  enabled: true,
  invoice_prefix: "INV",
  show_breakup_on_invoice: true,
  enable_gst_reports: true,
};

export function parseTaxModuleValue(raw: Setting["value"]): TaxModuleConfig {
  if (raw && typeof raw === "object") return { ...DEFAULT_TAX_MODULE_CONFIG, ...(raw as Partial<TaxModuleConfig>) };
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return { ...DEFAULT_TAX_MODULE_CONFIG, ...parsed };
    } catch {
      // ignore — fall through to default
    }
  }
  return DEFAULT_TAX_MODULE_CONFIG;
}

export function findTaxModuleSetting(items: Setting[]): Setting | undefined {
  return items.find((s) => s.key === TAX_MODULE_SETTING_KEY);
}

export function getTaxModuleConfig(items: Setting[]): TaxModuleConfig {
  const setting = findTaxModuleSetting(items);
  return setting ? parseTaxModuleValue(setting.value) : DEFAULT_TAX_MODULE_CONFIG;
}
