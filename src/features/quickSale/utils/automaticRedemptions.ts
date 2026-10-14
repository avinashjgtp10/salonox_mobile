import type { CalculateTotalsBody, CalculateTotalsResponse } from "@/types/pricing";
import type { RedemptionPricingFlags } from "@/features/quickSale/hooks/useRedemptions";

export type RedemptionRules = {
  pointsPerRedemption: number; valuePerRedemption: number; rewardMaxPercent: number;
  walletMaxPercent: number; referralEnabled: boolean; referralMaxPercent: number;
};
export type RedemptionContext = { eWalletBalance: number; rewardPointsBalance: number; referralBalance: number; rules: RedemptionRules | null };
const safe = (n: number) => Number.isFinite(n) ? Math.max(0, n) : 0;
const requested = (manual: number | undefined, max: number) => Math.min(manual === undefined ? max : safe(manual), safe(max));

export function resolveAutomaticRedemptions(body: CalculateTotalsBody, base: CalculateTotalsResponse, context: RedemptionContext): RedemptionPricingFlags {
  const { rules } = context;
  if (!rules) throw new Error("Unable to load redemption limits. Refresh the client's balances and try again.");
  const preTotal = safe(base.preRedemptionTotal);
  let remaining = Math.max(0, preTotal - safe(base.appliedMembershipWallet));
  const wallet = body.applyEwallet ? requested(body.eWalletRequested, context.eWalletBalance >= 100 ? Math.min(context.eWalletBalance, remaining * rules.walletMaxPercent / 100) : 0) : 0;
  remaining = Math.max(0, remaining - wallet);
  const pointRate = rules.pointsPerRedemption > 0 && rules.valuePerRedemption > 0 ? rules.pointsPerRedemption / rules.valuePerRedemption : 0;
  const points = body.applyRewardPoints ? Math.floor(requested(body.rewardPointsToRedeem, Math.min(context.rewardPointsBalance, Math.floor(Math.min(remaining, preTotal * rules.rewardMaxPercent / 100) * pointRate)))) : 0;
  remaining = Math.max(0, remaining - (pointRate ? points / pointRate : 0));
  const referral = body.applyReferralCredit && rules.referralEnabled ? requested(body.referralCreditRequested, Math.min(context.referralBalance, remaining, preTotal * rules.referralMaxPercent / 100)) : 0;
  return {
    ...(body.applyEwallet ? { applyEwallet: true, eWalletRequested: wallet } : {}),
    ...(body.applyRewardPoints ? { applyRewardPoints: true, rewardPointsToRedeem: points } : {}),
    ...(body.applyReferralCredit ? { applyReferralCredit: true, referralCreditRequested: referral } : {}),
  };
}

export async function calculateAutomaticRedemptions(body: CalculateTotalsBody, context: RedemptionContext, calculate: (body: CalculateTotalsBody) => Promise<CalculateTotalsResponse>) {
  let flags: RedemptionPricingFlags = {
    applyMembershipWallet: body.applyMembershipWallet, membershipWalletRequested: body.membershipWalletRequested,
    applyMembershipDiscount: body.applyMembershipDiscount, applyLoyaltyDiscount: body.applyLoyaltyDiscount,
  };
  let totals: CalculateTotalsResponse;
  if (body.applyEwallet || body.applyRewardPoints || body.applyReferralCredit) {
    if (!context.rules) throw new Error("Unable to load redemption limits. Refresh the client's balances and try again.");
    // Let the shared backend determine eligible membership coverage first.
    // Remaining benefits use the same sequential caps as the web app.
    const base = await calculate({ ...body, applyEwallet: false, applyRewardPoints: false, applyReferralCredit: false });
    flags = { ...flags, ...resolveAutomaticRedemptions(body, base, context) };
    totals = await calculate({ ...body, ...flags });
  } else {
    totals = await calculate(body);
  }
  // Checkout receives exactly what the authoritative preview applied, never
  // the full available balance or points used only to request a maximum.
  const rules = context.rules;
  return { totals, flags: {
    ...flags,
    ...(body.applyMembershipWallet ? { membershipWalletRequested: totals.appliedMembershipWallet } : {}),
    ...(body.applyEwallet ? { eWalletRequested: totals.appliedEWallet } : {}),
    ...(body.applyRewardPoints ? { rewardPointsToRedeem: rules && rules.valuePerRedemption > 0 ? Math.round(totals.appliedRewardPointsValue * rules.pointsPerRedemption / rules.valuePerRedemption) : 0 } : {}),
    ...(body.applyReferralCredit ? { referralCreditRequested: totals.appliedReferralCredit } : {}),
  } satisfies RedemptionPricingFlags };
}
