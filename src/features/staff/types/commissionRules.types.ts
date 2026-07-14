export type CommissionRuleSource = "services" | "products" | "memberships" | "packages";
export type CommissionRuleType = "percentage" | "fixed" | "milestone";
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
  rate: number | null;
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

export interface CommissionRuleFormData {
  name: string;
  source: CommissionRuleSource;
  type: CommissionRuleType;
  rate: number;
  condition_target?: number | null;
  condition_metric?: ConditionMetric | null;
  frequency: CommissionFrequency;
  scope_type: CommissionScopeType;
  scope_id?: string | null;
  scope_ids?: string[];
  status: CommissionRuleStatus;
}
