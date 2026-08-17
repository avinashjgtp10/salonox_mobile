import type { ClientHistorySummary } from "@/types/client";
import type { ReferralBalance } from "@/types/wallet";

// Referral credit has no dedicated balance endpoint on the backend — the
// balance is only available as `referral_balance` on the client history
// response, so this derives from that instead of calling an API.
export const referralService = {
  getBalanceFromHistorySummary(summary: ClientHistorySummary): ReferralBalance {
    return { balance: summary.referralBalance };
  },
};
