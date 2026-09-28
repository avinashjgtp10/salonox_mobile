import type { ClientMembershipAssignment } from "@/types/clientMembership";

export const hasMembershipDiscount = (assignment: ClientMembershipAssignment) =>
  assignment.status === "active"
  && assignment.pricingType === "percentage"
  && (assignment.discountPercent ?? 0) > 0
  && (assignment.benefitType === "validity" || (assignment.discountBalanceRemaining ?? 0) > 0);
