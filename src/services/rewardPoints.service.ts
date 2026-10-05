import type { ClientHistorySummary } from "@/types/client";
import type { RewardPointsBalance } from "@/types/wallet";

export const rewardPointsService = {
  getBalanceFromHistorySummary(summary: ClientHistorySummary): RewardPointsBalance {
    return { balance: summary.rewardPointsBalance };
  },
};
