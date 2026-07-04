import type { Setting } from "../../../types/setting.types";

export const TAX_TYPES = ["CGST", "SGST", "IGST", "GST", "VAT", "CESS", "Other"];

export function inferTaxType(key: string): string {
  const upper = key.trim().toUpperCase();
  for (const t of TAX_TYPES) {
    if (t === "Other") continue;
    if (upper === t || upper.startsWith(t)) return t;
  }
  return "";
}

// The backend's `salon_settings` table only has key/value/description columns
// (see settings.repository.ts — INSERT/UPDATE only touch those three), so any
// extra top-level fields sent in the payload are silently dropped. Notification
// Preferences works around this by JSON-encoding its structured data into the
// single `value` column; Tax Mapping follows the same convention here.
export interface TaxApplicableFor {
  service: boolean;
  product: boolean;
  membership: boolean;
  packages: boolean;
}

export interface TaxValuePayload {
  tax_type: string;
  tax_value: string;
  active: boolean;
  inclusive_taxes: boolean;
  applicable_for: TaxApplicableFor;
}

export function parseTaxValue(raw: Setting["value"]): Partial<TaxValuePayload> {
  if (raw && typeof raw === "object") return raw as Partial<TaxValuePayload>;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // Legacy/plain value (just the numeric tax value, no JSON metadata)
    }
  }
  return {};
}

export function isTaxSetting(s: Setting): boolean {
  // Tax rows always carry these keys inside the JSON `value` (set in
  // taxFormToPayload); other settings (e.g. notification_preferences) use a
  // different shape, so this keeps unrelated settings rows out of the list.
  const parsed = parseTaxValue(s.value);
  return parsed.tax_type !== undefined || parsed.applicable_for !== undefined;
}

export interface TaxRow {
  id: Setting["id"];
  tax_name: string;
  tax_type: string;
  tax_value: number;
  inclusive_taxes: boolean;
  applicable_for: TaxApplicableFor;
}

// Active, applicable taxes for use in bill/total calculations.
export function getActiveTaxes(items: Setting[]): TaxRow[] {
  return items
    .filter((s) => isTaxSetting(s) && parseTaxValue(s.value).active)
    .map((s) => {
      const parsed = parseTaxValue(s.value);
      const applicable = parsed.applicable_for ?? {};
      return {
        id: s.id,
        tax_name: s.key ?? "",
        tax_type: parsed.tax_type || inferTaxType(s.key ?? ""),
        tax_value: Number(parsed.tax_value) || 0,
        inclusive_taxes: Boolean(parsed.inclusive_taxes),
        applicable_for: {
          service: Boolean(applicable.service),
          product: Boolean(applicable.product),
          membership: Boolean(applicable.membership),
          packages: Boolean(applicable.packages),
        },
      };
    });
}
