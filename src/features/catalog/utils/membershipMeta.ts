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
