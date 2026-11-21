// Shared membership presentation helpers — the app-side twin of the web's
// features/catalog/utils/membershipMeta.ts, so both clients read and label the
// same stored plan identically.
import type {
  Membership,
  MembershipAppliesTo,
  MembershipPricingType,
} from "@/types/membership";
import { formatCurrency } from "@/utils/currency";

export type MembershipMeta = {
  bonusCredit?: number;
  description?: string;
};

/**
 * A plan's human-entered description and (Wallet-only) bonus credit are both
 * packed into the API's `description` string as JSON — there is no dedicated
 * bonusCredit column server-side. Falls back to treating the raw string as the
 * plain description, for records saved before that convention existed.
 */
export const getMembershipMeta = (membership: Pick<Membership, "description">): MembershipMeta => {
  const raw = membership.description;
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const record = parsed as Record<string, unknown>;
      const description = typeof record.description === "string" ? record.description : undefined;
      const bonusCredit = Number(record.bonusCredit);

      return {
        ...(description !== undefined ? { description } : {}),
        ...(Number.isFinite(bonusCredit) && bonusCredit > 0 ? { bonusCredit } : {}),
      };
    }

    return { description: raw };
  } catch {
    return { description: raw };
  }
};

/** Packs the description + bonus credit back into the single stored string. */
export const buildMembershipDescription = (description: string, bonusCredit?: number) =>
  JSON.stringify({
    description,
    ...(bonusCredit !== undefined ? { bonusCredit } : {}),
  });

export const MEMBERSHIP_TYPE_LABEL: Record<MembershipPricingType, string> = {
  loyalty: "Loyalty",
  percentage: "Discount Balance",
  value: "Wallet",
};

export const MEMBERSHIP_APPLIES_TO_LABEL: Record<MembershipAppliesTo, string> = {
  both: "Services & Products",
  products: "Products",
  services: "Services",
};

/** A plan with no stored pricingType predates the three types — those were all wallets. */
export const getMembershipPricingType = (
  membership: Pick<Membership, "pricingType">,
): MembershipPricingType => membership.pricingType ?? "value";

export const getMembershipTypeLabel = (membership: Pick<Membership, "pricingType">) =>
  MEMBERSHIP_TYPE_LABEL[getMembershipPricingType(membership)];

export const getMembershipAppliesToLabel = (membership: Pick<Membership, "appliesTo">) =>
  MEMBERSHIP_APPLIES_TO_LABEL[membership.appliesTo ?? "services"];

/** Flattened benefit text for a Loyalty plan — every tier on one line. */
export const loyaltyBenefit = (membership: Pick<Membership, "loyaltyTiers">) => {
  const tiers = membership.loyaltyTiers ?? [];

  return tiers.length > 0
    ? tiers.map((tier) => `${tier.thresholdValue} visits → ${tier.discountPercent}%`).join(", ")
    : "No tiers configured";
};

/**
 * Same, for a Wallet plan: the credit plus any bonus. Deliberately omits the
 * "Wallet" prefix — whatever shows this already says the type.
 */
export const walletBenefit = (membership: Pick<Membership, "price">, meta: MembershipMeta) => {
  const bonus = Number(meta.bonusCredit) || 0;

  return `${formatCurrency(Number(membership.price) || 0)}${bonus > 0 ? ` +${formatCurrency(bonus)} bonus` : ""}`;
};

/** The one-line benefit summary for a plan of any of the three types. */
export const membershipBenefitSummary = (membership: Membership) => {
  const type = getMembershipPricingType(membership);

  if (type === "loyalty") return loyaltyBenefit(membership);

  if (type === "percentage") {
    const percent = membership.discountPercent ?? 0;

    return membership.benefitType === "validity"
      ? `${percent}% off until expiry`
      : `${percent}% off, ${formatCurrency(membership.discountBalance ?? (Number(membership.price) || 0))} balance`;
  }

  return walletBenefit(membership, getMembershipMeta(membership));
};

const DEFAULT_VALID_DAYS = 365;

/** 100 years — well past the legacy "lifetime" bucket. */
export const MAX_VALID_DAYS = 36500;

/**
 * Reads a stored `validFor` back into a day count. The plan's expiry is stored
 * as a relative "N days" duration, applied from whenever a client actually buys
 * the plan — so the day count is the real setting and a calendar date is only
 * ever a preview of it. Also handles the fixed buckets older plans still carry.
 */
export const parseValidForToDays = (validFor: string | null | undefined): string => {
  const daysMatch = /^(\d+)\s*days?$/i.exec((validFor ?? "").trim());
  if (daysMatch?.[1]) return daysMatch[1];

  switch (validFor) {
    case "1 month":
      return "30";
    case "3 months":
      return "90";
    case "6 months":
      return "180";
    case "1 year":
      return "365";
    case "lifetime":
      return String(365 * 50);
    default:
      return String(DEFAULT_VALID_DAYS);
  }
};

export const DEFAULT_MEMBERSHIP_VALID_DAYS = DEFAULT_VALID_DAYS;
