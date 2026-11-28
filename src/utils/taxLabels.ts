/**
 * Country-based tax wording, mirroring the web app's config/taxRegime.ts.
 *
 * India says GST, the UAE says VAT, and a salon in a country we ship no
 * locale for keeps GST — that is what every salon outside the UAE has always
 * seen, so nothing changes for them.
 *
 * Only the *wording* changes. Slugs, endpoints and data keys (`gst-report`,
 * `/api/report/gst`, `include_gst`, `gstAmount`) stay exactly as they are,
 * because the backend contract is the same either way.
 */
import { getCountryLocale } from "@/config/countries";

export type TaxName = "GST" | "VAT";

export const taxNameForCountry = (country?: string | null): TaxName =>
  getCountryLocale(country).taxRegime === "VAT" ? "VAT" : "GST";

/**
 * Swaps GST for the salon's tax name in a piece of display text, the same way
 * the web's ReportsPage does it.
 *
 * Matches "GST" and the "Gst" that humanizeReportKey() produces from camelCase
 * data keys, as whole words — so "Non-GST Report" becomes "Non-VAT Report"
 * while nothing else in the sentence is touched.
 */
export const applyTaxName = (text: string, taxName: TaxName) =>
  taxName === "GST" ? text : text.replace(/\bGST\b/g, taxName).replace(/\bGst\b/g, taxName);

/**
 * The tax-registration label a salon's bills should carry: GSTIN in India,
 * TRN in the UAE. Same fallback rule as taxNameForCountry.
 */
export const taxIdLabelForCountry = (country?: string | null) =>
  taxNameForCountry(country) === "VAT" ? "TRN" : "GSTIN";

/**
 * Columns and summary tiles that exist only to report tax: the tax amount, the
 * rate, and the CGST/SGST/IGST split. "Taxable amount" is deliberately not one
 * of them — it is the base the bill was charged on, and stays useful whether or
 * not any tax was applied.
 */
export const isTaxColumnKey = (key: string) => /gst|vat|tax/i.test(key) && !/taxable/i.test(key);

/**
 * True when a tax cell holds nothing worth a column: null, blank, or zero —
 * including the "0", "0.00" and "₹0.00" the reports API sends for a salon that
 * charges no tax.
 */
export const isBlankTaxValue = (value: unknown) => {
  if (value == null || value === "" || value === false) return true;
  const numeric = typeof value === "number" ? value : Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) && numeric === 0;
};
