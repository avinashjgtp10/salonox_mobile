import type { ClientHistorySummary } from "@/types/client";
import type { RewardPointsBalance } from "@/types/wallet";

// Reward points have no dedicated balance endpoint on the backend — the
// balance is only available as `reward_points_balance` on the client
// history response, so this derives from that instead of calling an API.
export const rewardPointsService = {
  getBalanceFromHistorySummary(summary: ClientHistorySummary): RewardPointsBalance {
    return { balance: summary.rewardPointsBalance };
  },
};
