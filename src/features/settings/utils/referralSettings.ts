import type { Setting } from "../../../types/setting.types";

// Single fixed key — a salon only has one referral configuration. Stored the
// same way Reward Points stores its structured data: JSON-encoded into the
// `value` column (see rewardPointsSettings.ts).
export const REFERRAL_SETTING_KEY = "REFERRAL_CONFIG";

export interface ReferralConfig {
  active: boolean;
  referrer_reward_amount: number; // ₹ credited to the referrer's wallet
  referee_reward_amount: number;  // ₹ credited to the new/referred customer's wallet
  min_bill_amount: number;        // referred customer's first paid bill must be ≥ this to unlock rewards
  max_wallet_usage_pct: number;   // max % of a bill that can be paid using wallet balance
}

export const DEFAULT_REFERRAL_CONFIG: ReferralConfig = {
  active: false,
  referrer_reward_amount: 100,
  referee_reward_amount: 50,
  min_bill_amount: 1000,
  max_wallet_usage_pct: 30,
};

export function parseReferralValue(raw: Setting["value"]): ReferralConfig {
  if (raw && typeof raw === "object") return { ...DEFAULT_REFERRAL_CONFIG, ...(raw as Partial<ReferralConfig>) };
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return { ...DEFAULT_REFERRAL_CONFIG, ...parsed };
    } catch {
      // ignore — fall through to default
    }
  }
  return DEFAULT_REFERRAL_CONFIG;
}

export function findReferralSetting(items: Setting[]): Setting | undefined {
  return items.find((s) => s.key === REFERRAL_SETTING_KEY);
}

export function getReferralConfig(items: Setting[]): ReferralConfig {
  const setting = findReferralSetting(items);
  return setting ? parseReferralValue(setting.value) : DEFAULT_REFERRAL_CONFIG;
}
