import { DEFAULT_REWARD_POINTS_CONFIG, type RewardPointsConfig } from "../../settings/utils/rewardPointsSettings";
import { DEFAULT_REFERRAL_CONFIG, type ReferralConfig } from "../../settings/utils/referralSettings";

// ─── Reward / eWallet constants ───────────────────────────────────────────────
export const MEMBERSHIP_TIERS = { Silver: 5000, Gold: 15000, Platinum: 30000 } as const;
export const EWALLET_REDEEM_MINIMUM = 100;

/** Points earned for a bill amount, using the salon's configured rate (falls back to the default rate if omitted). */
export function computePointsEarned(billAmount: number, config: RewardPointsConfig = DEFAULT_REWARD_POINTS_CONFIG): number {
  if (!config.active || config.spend_amount <= 0) return 0;
  return Math.floor((billAmount / config.spend_amount) * config.points_earned);
}

/** ₹ value of a given number of points, using the salon's configured redemption rate. */
export function computeEWalletCredit(points: number, config: RewardPointsConfig = DEFAULT_REWARD_POINTS_CONFIG): number {
  if (config.redeem_points <= 0) return 0;
  return (points / config.redeem_points) * config.redeem_value;
}

/** Max ₹ of a bill that wallet balance is allowed to cover, per the salon's configured cap. */
export function computeMaxWalletUsable(grandTotal: number, config: ReferralConfig = DEFAULT_REFERRAL_CONFIG): number {
  const pct = config.max_wallet_usage_pct > 0 ? config.max_wallet_usage_pct : 100;
  return (grandTotal * pct) / 100;
}

/**
 * Max ₹ of a bill (before any redemption) that Referral Credit alone is
 * allowed to cover, per the salon's configured Redeem settings. Returns 0
 * when redemption is switched off — unlike computeMaxWalletUsable's 0-means-
 * unset fallback, 0% here is a deliberately valid, fully-restrictive setting
 * (see ReferralSettingsPage's 0–100 range), not an "unconfigured" sentinel.
 */
export function computeMaxReferralRedeemable(preRedemptionTotal: number, config: ReferralConfig = DEFAULT_REFERRAL_CONFIG): number {
  if (!config.redeem_enabled) return 0;
  return Math.max(0, (preRedemptionTotal * config.max_redeem_percent) / 100);
}

/** Membership tier label from lifetime revenue */
export function computeMembershipTier(totalRevenue: number): string {
  if (totalRevenue >= MEMBERSHIP_TIERS.Platinum) return "Platinum";
  if (totalRevenue >= MEMBERSHIP_TIERS.Gold) return "Gold";
  if (totalRevenue >= MEMBERSHIP_TIERS.Silver) return "Silver";
  return "NA";
}

/** How much more revenue needed for next tier */
export function nextTierInfo(totalRevenue: number): { name: string; remaining: number } | null {
  if (totalRevenue < MEMBERSHIP_TIERS.Silver) return { name: "Silver", remaining: MEMBERSHIP_TIERS.Silver - totalRevenue };
  if (totalRevenue < MEMBERSHIP_TIERS.Gold)   return { name: "Gold",   remaining: MEMBERSHIP_TIERS.Gold   - totalRevenue };
  if (totalRevenue < MEMBERSHIP_TIERS.Platinum) return { name: "Platinum", remaining: MEMBERSHIP_TIERS.Platinum - totalRevenue };
  return null;
}

/** Pass any non-empty id to the API — don't gate on UUID format */
export function toApiStaffId(id?: string | null): string | undefined {
  return id && String(id).trim().length > 0 ? String(id) : undefined;
}

/** Returns true for a real DB id (non-temp, non-empty) */
export function isRealId(id?: string | null): boolean {
  if (!id) return false;
  const s = String(id);
  return s.length > 0 && !s.startsWith("temp-") && !s.startsWith("local-");
}

/** Builds a human-readable payment method label from methods map */
export function buildMethodLabel(
  paymentMode: "single" | "split",
  // string, not SingleMethod — also called for the async Payment Machine
  // flow (buildPaymentPayload in usePayment.ts), which passes "Payment
  // Machine" through as a genuine method value, not just Cash/Card/UPI.
  singleMethod: string | null,
  methods: Record<string, number>,
): string {
  if (paymentMode === "split") {
    const cashLegs = Object.keys(methods).filter((k) => k !== "eWallet" && methods[k] > 0);
    if (cashLegs.length > 0) return cashLegs.join("+");
    return (methods["eWallet"] || 0) > 0 ? "eWallet" : "Split";
  }
  if (singleMethod) return singleMethod;
  // No Cash/Card/UPI method was ever picked — the bill was fully covered by
  // eWallet, so that's what actually paid for it, not "Cash".
  return (methods["eWallet"] || 0) > 0 ? "eWallet" : "Cash";
}

/** Computes the total of a split entries map */
export function splitTotal(methods: Record<string, number>): number {
  return Object.values(methods).reduce((a, b) => a + b, 0);
}

// ─── Payment method breakdown (Sales Summary panel + receipt/PDF) ─────────────
//
// splitDetails (sales.payment_reference) is only ever written by the backend
// when payment_method === "split" (see sales.service.ts) — a plain
// single-method payment leaves it empty and the one real method is only
// recorded in paymentMode. getSplitPaymentEntries/getEwalletUsedAmount below
// are the exact same computation receipt.ts's printReceipt() uses for its own
// "Paid via X" lines; ViewBillModal.tsx's Payment Method section calls the
// same two functions (via getPaymentMethodBreakdown) so the panel can never
// drift from what the receipt/PDF prints for the same booking.

export interface PaymentMethodEntry { method: string; amount: number }

type PaymentBookingLike = {
  splitDetails?: Record<string, number> | null;
  ewalletUsed?: number | null;
  paymentMode?: string | null;
  payingNow?: number | null;
};

/** Raw split-payment legs (Cash/Card/UPI/…), eWallet excluded — it's tracked separately below. */
export function getSplitPaymentEntries(booking: PaymentBookingLike): PaymentMethodEntry[] {
  const raw = booking.splitDetails || {};
  return Object.entries(raw)
    .map(([method, amt]) => ({ method, amount: Number(amt) || 0 }))
    .filter((e) => e.amount > 0 && e.method.toLowerCase() !== "ewallet");
}

/** ₹ of this payment covered by eWallet — arrives either as its own field or as a leg inside splitDetails (older records). */
export function getEwalletUsedAmount(booking: PaymentBookingLike): number {
  const raw = booking.splitDetails || {};
  const splitEwallet = Number(Object.entries(raw).find(([k]) => k.toLowerCase() === "ewallet")?.[1]) || 0;
  return Number(booking.ewalletUsed || 0) || splitEwallet;
}

/**
 * Every real-money method that actually paid for this booking (Cash/Card/
 * UPI/…), each with its own amount — never the full bill total. Deliberately
 * excludes eWallet: booking.payingNow (backend payments.paid_amount) already
 * excludes it too — eWallet is a pre-payment credit that reduces what's owed
 * BEFORE this figure, tracked by its own separate "eWallet Used" deduction
 * line (see billBreakdown.ts/receipt.ts) — so the entries returned here
 * always sum to exactly `payingNow`, matching the ticket's own
 * "Cash ₹500, Card ₹300, Total Paid ₹800" example. Falls back to paymentMode
 * + the total paid when splitDetails is empty — the plain single-method case
 * that never gets a splitDetails row at all.
 */
export function getPaymentMethodBreakdown(booking: PaymentBookingLike): PaymentMethodEntry[] {
  const entries = getSplitPaymentEntries(booking);
  if (entries.length > 0) return entries;

  const mode = String(booking.paymentMode || "").trim();
  const paid = Number(booking.payingNow || 0);
  if (mode && !["package", "split", "ewallet"].includes(mode.toLowerCase()) && paid > 0) {
    return [{ method: mode, amount: paid }];
  }
  return [];
}
