import type { SingleMethod } from "../types";

// ─── Reward / eWallet constants ───────────────────────────────────────────────
export const MEMBERSHIP_TIERS = { Silver: 5000, Gold: 15000, Platinum: 30000 } as const;
export const EWALLET_REDEEM_MINIMUM = 100;
export const POINTS_PER_RUPEE = 0.1;    // 1 pt per ₹10
export const WALLET_CREDIT_PER_POINT = 0.5; // ₹0.50 per point

/** 1 point per ₹10 spent */
export function computePointsEarned(billAmount: number): number {
  return Math.floor(billAmount * POINTS_PER_RUPEE);
}

/** ₹0.50 eWallet credit per point */
export function computeEWalletCredit(points: number): number {
  return points * WALLET_CREDIT_PER_POINT;
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
  singleMethod: SingleMethod | null,
  methods: Record<string, number>,
): string {
  if (paymentMode === "split") {
    return Object.keys(methods)
      .filter((k) => k !== "eWallet" && methods[k] > 0)
      .join("+") || "Split";
  }
  return singleMethod || "Cash";
}

/** Computes the total of a split entries map */
export function splitTotal(methods: Record<string, number>): number {
  return Object.values(methods).reduce((a, b) => a + b, 0);
}
