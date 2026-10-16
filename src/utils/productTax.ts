const PRODUCT_TAX_CODES = ["no_tax", "gst_5", "gst_12", "gst_18", "gst_28", "custom"] as const;
export type ProductTaxCode = typeof PRODUCT_TAX_CODES[number];

export function productTaxCode(value: string): ProductTaxCode {
  const normalized = value.trim().toLowerCase();
  if (PRODUCT_TAX_CODES.includes(normalized as ProductTaxCode)) return normalized as ProductTaxCode;
  if (normalized === "no tax") return "no_tax";
  const gst = normalized.match(/^gst\s*(5|12|18|28)\s*%?$/);
  if (gst) return `gst_${gst[1]}` as ProductTaxCode;
  throw new Error("Select a valid tax type: No tax, GST 5%, GST 12%, GST 18%, GST 28%, or Custom.");
}
