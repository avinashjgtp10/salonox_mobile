// Shared input handling for the per-row Qty / "Disc %" fields in Quick Sale
// and the Calendar (ServicesPanel's membership/package/product rows and
// ServiceRow). Both flows render the same components, so these keep all four
// rows behaving identically.

/** Decimal places a discount percentage may carry. */
const MAX_DECIMALS = 2;

/** Longest string sanitizeDiscountPercentInput can return ("99.99"). */
export const DISCOUNT_INPUT_MAX_LENGTH = 5;

/**
 * Upper bound on a single line's Qty.
 *
 * Deliberately loose. The rows used to cap at 99 via three separate limits
 * (maxLength, a slice, and a Math.min), which meant a product with 100 in
 * stock could not be sold in full — 99 went through and 100 did not. The
 * REAL limit for a product is its available stock, enforced separately by
 * stockErrorFor(); this only stops an absurd typo from reaching the totals.
 */
export const MAX_LINE_QTY = 9999;

/** Digits the Qty field accepts — wide enough for MAX_LINE_QTY. */
export const QTY_INPUT_MAX_LENGTH = String(MAX_LINE_QTY).length;

/**
 * Cleans a decimal field's raw text as the user types — digits, at most one
 * dot, at most MAX_DECIMALS places. No range cap: a Flat (₹) bill discount or
 * an extra charge can be any size.
 *
 * Returns TEXT rather than a number on purpose: a half-typed "2." has to
 * survive keystroke-to-keystroke, otherwise re-rendering the input from a
 * parsed number would drop the dot the moment it's pressed and the decimal
 * could never be entered at all.
 */
export function sanitizeDecimalInput(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (cleaned === "") return "";

  // Only the first dot separates decimals; any others the user types are dropped.
  const firstDot = cleaned.indexOf(".");
  const hasDot = firstDot !== -1;
  // Strip leading zeros ("007" -> "7") but keep a lone "0" so "0.5" is typable.
  const intPart = (hasDot ? cleaned.slice(0, firstDot) : cleaned).replace(/^0+(?=\d)/, "");
  const decPart = hasDot ? cleaned.slice(firstDot + 1).replace(/\./g, "").slice(0, MAX_DECIMALS) : "";

  return hasDot ? `${intPart || "0"}.${decPart}` : intPart;
}

/** As above, but for a 0–100 percentage — the per-row "Disc %" fields. */
export function sanitizeDiscountPercentInput(raw: string): string {
  const text = sanitizeDecimalInput(raw);
  // Clamp the text too, not just the parsed value — otherwise the field can
  // read "555" while 100% is what actually comes off the row.
  return Number(text) > 100 ? "100" : text;
}

/** The numeric percentage a sanitized field currently represents. */
export function parseDiscountPercent(text: string): number {
  const n = parseFloat(text);
  if (!isFinite(n) || n <= 0) return 0;
  // Round rather than truncate so 2.5 stays 2.5 (parseInt used to floor it to 2).
  return Math.min(100, Math.round(n * 10 ** MAX_DECIMALS) / 10 ** MAX_DECIMALS);
}

/** Blur-time display text — "" for zero, and no trailing ".0" for whole numbers. */
export function formatDiscountPercent(value: number): string {
  return value > 0 ? String(value) : "";
}
