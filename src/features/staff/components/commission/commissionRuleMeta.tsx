import { Tools, Bag, Tag, BoxSeam } from "react-bootstrap-icons";
import type { CommissionRuleSource, CommissionFrequency, CommissionRule, RuleGroup } from "../../types/commissionRules.types";

export const SOURCE_META: Record<CommissionRuleSource, { label: string; icon: React.ReactNode; bg: string; color: string }> = {
  services:    { label: "Services",    icon: <Tools size={15} />,   bg: "#ede9fe", color: "#7c3aed" },
  products:    { label: "Products",    icon: <Bag size={15} />,     bg: "#dcfce7", color: "#16a34a" },
  memberships: { label: "Memberships", icon: <Tag size={15} />,     bg: "#dbeafe", color: "#2563eb" },
  packages:    { label: "Packages",    icon: <BoxSeam size={15} />, bg: "#fce7f3", color: "#db2777" },
};

export const FREQUENCY_LABELS: Record<CommissionFrequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Bi-Weekly",
  monthly: "Monthly",
  custom: "Custom Date",
};

export function fmtMoney(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}

/** Collapses fanned-out staff-scoped rows (one CommissionRule row per staff member,
 *  created together from a single wizard submission) back into one logical rule
 *  per card. Rows are grouped by every field a user actually sets in the wizard —
 *  two rows only merge if they're identical except for which staff member they target. */
export function groupCommissionRules(rules: CommissionRule[]): RuleGroup[] {
  const map = new Map<string, RuleGroup>();

  for (const r of rules) {
    const key = [r.name, r.source, r.type, r.rate, r.condition_target, r.condition_metric, r.frequency, r.status].join("::");

    let group = map.get(key);
    if (!group) {
      group = { key, primary: r, rules: [], staffIds: [] };
      map.set(key, group);
    }
    group.rules.push(r);
    if (r.scope_type === "staff" && r.scope_id) group.staffIds.push(r.scope_id);
  }

  return [...map.values()];
}
