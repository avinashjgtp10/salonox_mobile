export type CommissionRuleSource = "services" | "products" | "memberships" | "packages";
export type CommissionRuleType = "percentage" | "fixed" | "milestone" | "tiered_target";
export type ConditionMetric = "revenue" | "count";
export type CommissionFrequency = "daily" | "weekly" | "biweekly" | "monthly" | "custom";
export type CommissionScopeType = "salon" | "staff" | "role";
export type CommissionRuleStatus = "active" | "draft" | "expired";

export interface CommissionRule {
  id: string;
  salon_id: string;
  name: string;
  source: CommissionRuleSource;
  type: CommissionRuleType;
  /** For tiered_target, this is the commission rate BELOW the monthly target. */
  rate: number | null;
  /** tiered_target only: the commission rate AT/ABOVE the monthly target. */
  rate_after_target: number | null;
  condition_target: number | null;
  condition_metric: ConditionMetric | null;
  frequency: CommissionFrequency;
  scope_type: CommissionScopeType;
  scope_id: string | null;
  status: CommissionRuleStatus;
  created_at: string;
  updated_at: string;
}

/** One logical rule as created via the wizard — may be backed by multiple
 *  CommissionRule rows (one per selected staff member, fanned out server-side). */
export interface RuleGroup {
  key: string;
  /** Representative row — shared fields (name/source/type/rate/condition/frequency/status) are identical across the group. */
  primary: CommissionRule;
  /** Every underlying row in this group. */
  rules: CommissionRule[];
  /** scope_id of every staff-scoped row in this group. */
  staffIds: string[];
}

/** GET /commission-rules/:id/progress response — tiered_target rules only. */
export interface TieredTargetProgress {
  target: number;
  achieved: number;
  remaining: number;
  progressPct: number;
  targetReached: boolean;
}

export interface CommissionRuleFormData {
  name: string;
  source: CommissionRuleSource;
  type: CommissionRuleType;
  rate: number;
  /** tiered_target only: the commission rate AT/ABOVE the monthly target. */
  rate_after_target?: number | null;
  condition_target?: number | null;
  condition_metric?: ConditionMetric | null;
  frequency: CommissionFrequency;
  scope_type: CommissionScopeType;
  scope_id?: string | null;
  scope_ids?: string[];
  status: CommissionRuleStatus;
}
