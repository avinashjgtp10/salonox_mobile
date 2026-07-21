// Centralized pricing engine for product Supply/Retail price + markup calculations.
// Used by both the Create Product and Edit Product forms so the math stays in one place.

export type MarkupMethod = "percentage" | "flat";

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Retail price from supply price + markup percentage. */
export function retailFromMarkupPercent(supplyPrice: number, markupPercent: number): number {
  return round2(supplyPrice + (supplyPrice * markupPercent) / 100);
}

/** Retail price from supply price + flat markup amount. */
export function retailFromFlatAmount(supplyPrice: number, flatAmount: number): number {
  return round2(supplyPrice + flatAmount);
}

/** Markup percentage implied by a given supply/retail pair. */
export function markupPercentFromRetail(supplyPrice: number, retailPrice: number): number {
  if (supplyPrice <= 0) return 0;
  return round2(((retailPrice - supplyPrice) / supplyPrice) * 100);
}

/** Flat markup amount implied by a given supply/retail pair. */
export function flatAmountFromRetail(supplyPrice: number, retailPrice: number): number {
  return round2(retailPrice - supplyPrice);
}

/** Recompute retail price from whichever markup method is currently active. */
export function retailFromActiveMethod(
  supplyPrice: number,
  method: MarkupMethod,
  markupPercent: number,
  flatAmount: number
): number {
  return method === "percentage"
    ? retailFromMarkupPercent(supplyPrice, markupPercent)
    : retailFromFlatAmount(supplyPrice, flatAmount);
}
