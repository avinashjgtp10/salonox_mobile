import { api } from "@/services/api";
import type { ApiResponse } from "@/types/auth";
import type { RedemptionRules } from "@/features/quickSale/utils/automaticRedemptions";

const document = (value: unknown): Record<string, unknown> => {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch { return {}; }
};
const number = (value: unknown, fallback: number) => Number.isFinite(Number(value)) && value !== null && value !== undefined ? Math.max(0, Number(value)) : fallback;
export const redemptionRulesService = {
  async get(): Promise<RedemptionRules> {
    const response = await api.get<ApiResponse<{ key: string; value: unknown }[]>>("/settings");
    const settings = response.data.data;
    const reward = document(settings.find(s => s.key === "REWARD_POINTS_CONFIG")?.value);
    const referral = document(settings.find(s => s.key === "REFERRAL_CONFIG")?.value);
    // Defaults match the web app. A failed settings request is not replaced
    // with defaults: checkout needs the real salon's redemption limits.
    return {
      pointsPerRedemption: number(reward.redeem_points, 100),
      valuePerRedemption: number(reward.redeem_value, 50),
      rewardMaxPercent: Math.min(100, number(reward.max_redeem_percent, 100)),
      walletMaxPercent: Math.min(100, number(referral.max_wallet_usage_pct, 100)) || 100,
      referralEnabled: referral.redeem_enabled !== false,
      referralMaxPercent: Math.min(100, number(referral.max_redeem_percent, 100)),
    };
  },
};
