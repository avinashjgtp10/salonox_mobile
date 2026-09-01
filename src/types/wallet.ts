export type EWalletBalance = {
  balance: number;
};

export type RewardPointsBalance = {
  balance: number;
};

export type ReferralBalance = {
  balance: number;
};

export type LoyaltyTier = {
  discountPercent: number;
  thresholdValue: number;
};

export type LoyaltyEligibility = {
  discountPercent: number;
  eligible: boolean;
  name: string | null;
  nextTier: LoyaltyTier | null;
};
