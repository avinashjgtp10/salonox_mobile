import { api, ApiError } from "@/services/api";
import { COMMISSION_RULES } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";
import type {
  CommissionRule,
  CommissionRuleFormData,
  CommissionRuleStatus,
  TieredTargetProgress,
} from "@/types/commissionRules";

const toNumberOrNull = (value: unknown) => (value == null || value === "" ? null : Number(value));

// Postgres numerics arrive as strings; normalize so the UI can compare and format them.
const normalizeRule = (rule: CommissionRule): CommissionRule => ({
  ...rule,
  condition_target: toNumberOrNull(rule.condition_target),
  rate: toNumberOrNull(rule.rate),
  rate_after_target: toNumberOrNull(rule.rate_after_target),
  tiers: Array.isArray(rule.tiers)
    ? rule.tiers.map((tier) => ({ reward: Number(tier.reward), target: Number(tier.target) }))
    : null,
});

// A row that is already gone still counts as deleted (e.g. a retried delete).
const deleteIgnoringMissing = (ruleId: string) =>
  api.delete(COMMISSION_RULES.BY_ID(ruleId)).catch((error: unknown) => {
    if (!(error instanceof ApiError && error.status === 404)) throw error;
  });

export const commissionRulesService = {
  async list(): Promise<CommissionRule[]> {
    const response = await api.get<ApiResponse<{ items?: CommissionRule[] }>>(COMMISSION_RULES.BASE);
    return (response.data.data?.items ?? []).map(normalizeRule);
  },

  async create(data: CommissionRuleFormData): Promise<string | undefined> {
    const response = await api.post<ApiResponse<unknown>>(COMMISSION_RULES.BASE, data);
    return response.data.message;
  },

  async deleteRules(ruleIds: string[]): Promise<void> {
    await Promise.all(ruleIds.map(deleteIgnoringMissing));
  },

  /** Same as the web: an edit deletes the group's rows and creates fresh ones,
   *  so staff added to or removed from the rule are handled by the recreate. */
  async replace(ruleIds: string[], data: CommissionRuleFormData): Promise<void> {
    await Promise.all(ruleIds.map(deleteIgnoringMissing));
    await api.post(COMMISSION_RULES.BASE, data);
  },

  async setStatus(ruleIds: string[], status: CommissionRuleStatus): Promise<void> {
    await Promise.all(ruleIds.map((id) => api.patch(COMMISSION_RULES.STATUS(id), { status })));
  },

  async getProgress(ruleId: string): Promise<TieredTargetProgress | null> {
    const response = await api.get<ApiResponse<TieredTargetProgress>>(COMMISSION_RULES.PROGRESS(ruleId));
    return response.data.data ?? null;
  },
};
