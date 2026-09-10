import type { Setting } from "../../../types/setting.types";

// Single fixed key — a salon only has one reward points configuration
// (unlike tax mappings, which can have many rows). Stored the same way Tax
// Mapping stores its structured data: JSON-encoded into the `value` column,
// since salon_settings only has key/value/description (see taxSettings.ts).
export const REWARD_POINTS_SETTING_KEY = "REWARD_POINTS_CONFIG";

export interface RewardPointsConfig {
  active: boolean;
  spend_amount: number;   // customer spends this much...
  points_earned: number;  // ...to earn this many points
  redeem_points: number;  // this many points...
  redeem_value: number;   // ...are worth this much ₹ off the bill
  // Most of the bill (before any membership/eWallet/reward/referral
  // deduction) that reward points alone may ever cover — e.g. 20 means a
  // ₹1,000 bill can have at most ₹200 paid via points, however many points
  // the client has. 100 = no extra cap beyond balance/remaining-bill.
  max_redeem_percent: number;
}

export const DEFAULT_REWARD_POINTS_CONFIG: RewardPointsConfig = {
  active: false,
  spend_amount: 1000,
  points_earned: 100,
  redeem_points: 100,
  redeem_value: 50,
  max_redeem_percent: 100,
};

export function parseRewardPointsValue(raw: Setting["value"]): RewardPointsConfig {
  if (raw && typeof raw === "object") return { ...DEFAULT_REWARD_POINTS_CONFIG, ...(raw as Partial<RewardPointsConfig>) };
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return { ...DEFAULT_REWARD_POINTS_CONFIG, ...parsed };
    } catch {
      // ignore — fall through to default
    }
  }
  return DEFAULT_REWARD_POINTS_CONFIG;
}

export function findRewardPointsSetting(items: Setting[]): Setting | undefined {
  return items.find((s) => s.key === REWARD_POINTS_SETTING_KEY);
}

export function getRewardPointsConfig(items: Setting[]): RewardPointsConfig {
  const setting = findRewardPointsSetting(items);
  return setting ? parseRewardPointsValue(setting.value) : DEFAULT_REWARD_POINTS_CONFIG;
}
