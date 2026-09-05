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
  redeem_enabled: boolean;        // whether Referral Credit can be redeemed toward a bill at all
  // Most of the bill (before any membership/eWallet/reward/referral
  // deduction) that Referral Credit alone may ever cover — e.g. 20 means a
  // ₹1,000 bill can have at most ₹200 paid via referral credit, however much
  // credit the client has. 100 = no extra cap beyond balance/remaining-bill.
  max_redeem_percent: number;
}

export const DEFAULT_REFERRAL_CONFIG: ReferralConfig = {
  active: false,
  referrer_reward_amount: 100,
  referee_reward_amount: 50,
  min_bill_amount: 1000,
  max_wallet_usage_pct: 100,
  redeem_enabled: true,
  max_redeem_percent: 100,
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
