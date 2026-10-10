// Mirrors the web app's commissionRules.types.ts and the /commission-rules API.
export type CommissionRuleSource = "services" | "products" | "memberships" | "packages";
export type CommissionRuleType = "percentage" | "fixed" | "milestone" | "tiered_target" | "milestone_ladder";
export type CommissionFrequency = "daily" | "weekly" | "biweekly" | "monthly" | "custom";
export type CommissionScopeType = "salon" | "staff" | "role";
export type CommissionRuleStatus = "active" | "draft" | "expired";

/** One step of a milestone_ladder rule: reaching `target` monthly revenue earns a one-time `reward`. */
export type LadderTier = { reward: number; target: number };

export type CommissionRule = {
  condition_metric: "revenue" | "count" | null;
  condition_target: number | null;
  frequency: CommissionFrequency;
  id: string;
  name: string;
  /** tiered_target: the rate below the target. milestone_ladder: the sum of all rewards. */
  rate: number | null;
  /** tiered_target only: the rate at/above the monthly target. */
  rate_after_target: number | null;
  scope_id: string | null;
  scope_type: CommissionScopeType;
  source: CommissionRuleSource;
  status: CommissionRuleStatus;
  tiers?: LadderTier[] | null;
  type: CommissionRuleType;
};

/**
 * One rule as created in the form. The API stores one row per selected staff
 * member, so rows identical except for their staff are shown as one group.
 */
export type CommissionRuleGroup = {
  key: string;
  primary: CommissionRule;
  rules: CommissionRule[];
  staffIds: string[];
};

export type CommissionRuleFormData = {
  condition_metric?: "revenue" | null;
  condition_target?: number | null;
  frequency: CommissionFrequency;
  name: string;
  rate: number;
  rate_after_target?: number | null;
  scope_id?: string | null;
  scope_ids?: string[];
  scope_type: "staff";
  source: CommissionRuleSource;
  status: CommissionRuleStatus;
  tiers?: LadderTier[] | null;
  type: CommissionRuleType;
};

/** GET /commission-rules/:id/progress — tiered_target rules only. */
export type TieredTargetProgress = {
  achieved: number;
  progressPct: number;
  remaining: number;
  target: number;
  targetReached: boolean;
};
