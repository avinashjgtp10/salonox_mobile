import type { AppointmentListItem } from "@/types/appointment";

const roundMoney = (value: number) => Math.round(value * 100) / 100;

/**
 * The bill's Grand Total, as the web's bookingMapper (grandTotalVal) works it
 * out — GST, discounts and extra charges included:
 * - a saved bill total (grand_total / total_amount) when the API sends one,
 * - else computed_grand_total (sent only for unpaid or edited-after-payment
 *   appointments),
 * - else, once paid or partly paid, paid + due — the bill as actually
 *   charged (e.g. ₹35 + 10% GST = ₹38.50, rounded to ₹39),
 * - else the item prices plus tax.
 * Wallet/eWallet/points/referral redemptions settle the bill, so they come off
 * the saved figures (paid + due already has them taken off).
 */
export const getAppointmentGrandTotal = (appointment: AppointmentListItem) => {
  const raw = appointment.raw as Record<string, unknown>;
  const present = (value: unknown) => value !== undefined && value !== null && value !== "";
  const items = (["services", "product_items", "package_items", "membership_items"] as const)
    .flatMap((key) => (Array.isArray(raw[key]) ? raw[key] as Record<string, unknown>[] : []));

  const isPackagePaid = String(raw.payment_method ?? "").toLowerCase() === "package" && (Number(raw.paid_amount ?? 0) || 0) === 0;
  const status = String(raw.status ?? "booked").toLowerCase();
  const reconstructedFromPayment = status === "paid" || status === "partial"
    ? (Number(raw.paid_amount ?? 0) || 0) + (Number(raw.due_amount ?? 0) || 0)
    : null;
  const persistedTotal = present(raw.grand_total) ? raw.grand_total : raw.total_amount;
  const hasPersistedTotal = present(persistedTotal);
  const computedGrandTotal = present(raw.computed_grand_total) ? Number(raw.computed_grand_total) : null;
  const taxFromBreakdown = (Array.isArray(raw.tax_breakdown) ? raw.tax_breakdown : [])
    .reduce((sum: number, entry) => sum + (Number((entry as Record<string, unknown> | null)?.amount) || 0), 0);
  const itemsTotal = items.reduce((sum, item) => {
    const total = Number(item.total ?? 0) || 0;
    if (total > 0) return sum + total;
    return sum + (Number(item.price ?? item.unit_price ?? 0) || 0) * (Number(item.quantity ?? item.qty ?? 1) || 1);
  }, 0);
  const hasPackageService = items.some((item) => Boolean(item.is_package_service));
  const usesSettledFigure = !hasPersistedTotal && computedGrandTotal === null && reconstructedFromPayment !== null;

  const revenueTotal = isPackagePaid ? 0
    : hasPackageService
      ? Math.max(0, items.reduce((sum, item) => sum + (item.is_package_service ? 0 : Number(item.total ?? item.price ?? 0) || 0), 0)) + taxFromBreakdown
      : hasPersistedTotal
        ? Number(persistedTotal) || 0
        : computedGrandTotal ?? reconstructedFromPayment ?? itemsTotal + taxFromBreakdown;
  if (isPackagePaid || usesSettledFigure) return revenueTotal;

  const redemptionsUsed = ["membership_wallet_used", "ewallet_used", "reward_points_value", "referral_credit_used"]
    .reduce((sum, key) => sum + (Number(raw[key]) || 0), 0);
  return Math.max(0, roundMoney(revenueTotal - redemptionsUsed));
};
