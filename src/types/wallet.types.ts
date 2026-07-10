// ── Client wallet breakdown ────────────────────────────────────────────────────
// Powers the "ⓘ" popup beside a client's Wallet Balance (GET EWALLET.BREAKDOWN(id),
// backed by the real ewallet_ledger table) — distinct from the per-membership
// wallet tracked separately in clientMemberships.endpoints.ts.
export interface WalletBreakdown {
  referral_rewards: number;
  reward_credits: number;
  other_credits: number;
  wallet_debits: number;
  balance: number;
}

export interface WalletBreakdownResponse {
  data: WalletBreakdown;
}

export const EMPTY_WALLET_BREAKDOWN: WalletBreakdown = {
  referral_rewards: 0,
  reward_credits: 0,
  other_credits: 0,
  wallet_debits: 0,
  balance: 0,
};
