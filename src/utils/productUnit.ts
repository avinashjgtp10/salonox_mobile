// A product's pack/unit size shown as its own value, e.g. "500 ml" or "250 g".
// Booking and billing show this next to the line quantity instead of folding
// the two into one number, so "2 × 500 ml" reads as quantity 2, unit size
// 500 ml rather than a combined 1000 ml.
export const formatUnitSize = (bottleSize?: number | string | null, measureUnit?: string | null): string => {
  const size = typeof bottleSize === "number" ? bottleSize : Number(bottleSize);
  if (!size || !Number.isFinite(size) || size <= 0) return "";
  const unit = (measureUnit ?? "").trim();
  return unit ? `${size} ${unit}` : String(size);
};
