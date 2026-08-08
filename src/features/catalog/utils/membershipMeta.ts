import type { Membership } from "../../../services/api/endpoints/memberships.endpoints";

export interface MembershipMeta {
  description?: string;
  bonusCredit?: number;
}

/** The plan's human-entered description and (Wallet-only) bonus credit are both
 *  packed into the API's `description` string as JSON — there's no dedicated
 *  bonusCredit column server-side. Falls back to treating the raw string as the
 *  plain description for older records saved before this convention existed. */
export function getMembershipMeta(m: Pick<Membership, "description">): MembershipMeta {
  const raw = m.description;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed;
    return { description: raw };
  } catch {
    return { description: raw };
  }
}

export const TYPE_LABEL: Record<string, string> = {
  value: "Wallet",
  percentage: "Discount Balance",
  loyalty: "Loyalty",
};

export const APPLIES_TO_LABEL: Record<string, string> = {
  services: "Services",
  products: "Products",
  both: "Services & Products",
};

/** Flattened Benefit text for a Loyalty plan — every tier on one line. Used as
 *  the list cell's title attribute, since the cell itself truncates. */
export function loyaltyBenefit(m: Pick<Membership, "loyaltyTiers">): string {
  const tiers = m.loyaltyTiers ?? [];
  return tiers.length
    ? tiers.map((t) => `${t.thresholdValue} Visits → ${t.discountPercent}%`).join(", ")
    : "No tiers configured";
}

/** Same, for a Wallet plan: the credit plus any bonus. Deliberately omits the
 *  "Wallet" prefix — the list's Membership Type column already says it. */
export function walletBenefit(
  m: Pick<Membership, "price">,
  meta: MembershipMeta,
  formatAmount: (n: number) => string,
): string {
  const bonus = Number(meta.bonusCredit) || 0;
  return `${formatAmount(Number(m.price) || 0)}${bonus > 0 ? ` +${formatAmount(bonus)} bonus` : ""}`;
}
