const LABELS: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  upi: "UPI",
  wallet: "E-Wallet",
  gift_card: "Gift Card",
  package: "Package",
  membership: "Membership",
};

/**
 * Renders sales.payment_method/payment_reference as the actual payment
 * source(s) used — "Package", "Membership", "Cash + Card", etc. — instead of
 * the raw DB enum value. For 'split', payment_reference is a JSON object
 * whose keys are the individual methods used (e.g. {"Cash":200,"Package":150}
 * — see payment-method.util.ts's normalizePaymentMethod()); every key is
 * shown, not just the money amounts, so a bill covered by Package + Cash
 * displays both rather than silently collapsing to just "Cash".
 */
export function formatPaymentMode(
  method: string | null | undefined,
  reference?: string | null
): string {
  const key = (method || "").trim().toLowerCase();
  if (!key) return "N/A";

  if (key === "split" && reference) {
    try {
      const parsed = JSON.parse(reference) as Record<string, unknown>;
      const legs = Object.keys(parsed).filter((k) => k.trim().length > 0);
      if (legs.length > 0) {
        return legs
          .map((leg) => LABELS[leg.toLowerCase()] ?? leg)
          .join(" + ");
      }
    } catch {
      // Malformed/legacy reference — fall through to the plain label below.
    }
  }

  return LABELS[key] ?? (key.charAt(0).toUpperCase() + key.slice(1)).replace(/_/g, " ");
}

/**
 * True if any part of this sale was covered by an already-purchased Package's
 * included sessions — either the whole sale (method === 'package') or one leg
 * of a composite payment (method === 'split' with a "Package" key in
 * payment_reference, e.g. "Package + Cash"). Package has no dedicated numeric
 * column like membership_wallet_used, so this is the only way to detect it.
 */
export function isPackageCoveredSale(
  method: string | null | undefined,
  reference?: string | null
): boolean {
  const key = (method || "").trim().toLowerCase();
  if (key === "package") return true;
  if (key !== "split" || !reference) return false;
  try {
    return Object.keys(JSON.parse(reference)).includes("Package");
  } catch {
    return false;
  }
}
