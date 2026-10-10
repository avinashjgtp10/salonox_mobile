import type { Ionicons } from "@expo/vector-icons";

import type {
  CommissionFrequency,
  CommissionRule,
  CommissionRuleFormData,
  CommissionRuleGroup,
  CommissionRuleSource,
  CommissionRuleType,
} from "@/types/commissionRules";

export const RULE_SOURCES: CommissionRuleSource[] = ["services", "products", "memberships", "packages"];

export const SOURCE_META: Record<CommissionRuleSource, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  memberships: { icon: "pricetag-outline", label: "Memberships" },
  packages: { icon: "cube-outline", label: "Packages" },
  products: { icon: "bag-outline", label: "Products" },
  services: { icon: "construct-outline", label: "Services" },
};

// Same four choices the web wizard offers ("milestone" is legacy and edited as Percentage).
export const RULE_TYPE_OPTIONS: { icon: keyof typeof Ionicons.glyphMap; key: CommissionRuleType; label: string; sub: string }[] = [
  { icon: "trending-up-outline", key: "percentage", label: "Percentage", sub: "A % of every sale" },
  { icon: "cash-outline", key: "fixed", label: "Fixed Amount", sub: "A flat amount per sale" },
  { icon: "locate-outline", key: "tiered_target", label: "Monthly Target", sub: "Higher % once the monthly target is hit" },
  { icon: "podium-outline", key: "milestone_ladder", label: "Milestone Ladder", sub: "Stacking bonuses at revenue milestones" },
];

export const RULE_TYPE_LABELS: Record<CommissionRuleType, string> = {
  fixed: "Fixed Amount",
  milestone: "Milestone",
  milestone_ladder: "Milestone Ladder",
  percentage: "Percentage",
  tiered_target: "Monthly Target",
};

export const FREQUENCY_OPTIONS: CommissionFrequency[] = ["daily", "monthly"];

export const FREQUENCY_LABELS: Record<CommissionFrequency, string> = {
  biweekly: "Bi-Weekly",
  custom: "Custom Date",
  daily: "Daily",
  monthly: "Monthly",
  weekly: "Weekly",
};

export const formatRupees = (amount: number) => `Rs. ${amount.toLocaleString("en-IN")}`;

/** Collapses the per-staff rows created by one save back into one rule (same as the web). */
export function groupCommissionRules(rules: CommissionRule[]): CommissionRuleGroup[] {
  const groups = new Map<string, CommissionRuleGroup>();

  for (const rule of rules) {
    const key = [rule.name, rule.source, rule.type, rule.rate, rule.rate_after_target, JSON.stringify(rule.tiers ?? null),
      rule.condition_target, rule.condition_metric, rule.frequency, rule.status].join("::");
    let group = groups.get(key);

    if (!group) {
      group = { key, primary: rule, rules: [], staffIds: [] };
      groups.set(key, group);
    }

    group.rules.push(rule);
    if (rule.scope_type === "staff" && rule.scope_id) group.staffIds.push(rule.scope_id);
  }

  return [...groups.values()];
}

/** One-line description of what the rule pays. */
export function describeRule(rule: CommissionRule): string {
  switch (rule.type) {
    case "fixed":
      return `${formatRupees(rule.rate ?? 0)} per sale`;
    case "tiered_target":
      return `${rule.rate ?? 0}% below ${formatRupees(rule.condition_target ?? 0)}, ${rule.rate_after_target ?? 0}% after`;
    case "milestone_ladder": {
      const steps = rule.tiers?.length ?? 0;
      return `${steps} milestone${steps === 1 ? "" : "s"} · up to ${formatRupees(rule.rate ?? 0)}`;
    }
    case "milestone":
    case "percentage":
    default:
      return `${rule.rate ?? 0}% of every sale`;
  }
}

/**
 * Active rules that would clash with `data`: a Milestone Ladder and a regular rule
 * can't both be active for the same staff and source. Rows of the rule being
 * edited are ignored because the edit replaces them. Mirrors the web app and the
 * server's RULE_KIND_CONFLICT check.
 */
export function findKindConflicts(
  rules: CommissionRule[],
  data: CommissionRuleFormData,
  ignoreRuleIds: string[] = [],
): CommissionRule[] {
  if (data.status !== "active") return [];
  const staffIds = new Set(data.scope_ids ?? (data.scope_id ? [data.scope_id] : []));
  const ignored = new Set(ignoreRuleIds);
  const wantsLadder = data.type === "milestone_ladder";

  return rules.filter((rule) =>
    rule.status === "active" && rule.scope_type === "staff" && rule.scope_id != null && staffIds.has(rule.scope_id) &&
    rule.source === data.source && (rule.type === "milestone_ladder") !== wantsLadder && !ignored.has(rule.id),
  );
}
