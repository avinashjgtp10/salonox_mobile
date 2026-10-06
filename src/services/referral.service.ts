import type { ClientHistorySummary } from "@/types/client";
import type { ReferralBalance } from "@/types/wallet";

export const referralService = {
  getBalanceFromHistorySummary(summary: ClientHistorySummary): ReferralBalance {
    return { balance: summary.referralBalance };
  },
};
