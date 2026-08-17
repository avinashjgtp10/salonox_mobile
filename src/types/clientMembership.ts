export type ClientMembershipStatus = "active" | "cancelled" | "expired" | "inactive";

export type ClientMembershipPricingType = "percentage" | "value";

export type ClientMembershipAppliesTo = "both" | "products" | "services";

export type ClientMembershipBenefit = {
  remaining: number | null;
  serviceId: string;
  serviceName: string;
  total: number | null;
  used: number | null;
};

export type ClientMembershipHistoryItem = {
  action: string;
  date: string | null;
  id: string;
  membershipId: string | null;
  membershipName: string;
  note: string | null;
  status: ClientMembershipStatus;
};

export type ClientMembershipAssignment = {
  appliesTo: ClientMembershipAppliesTo | null;
  assignedAt: string | null;
  benefits: ClientMembershipBenefit[];
  cancelledAt: string | null;
  categoryIds: string[];
  clientId: string;
  clientName: string;
  discountBalanceRemaining: number | null;
  expiresAt: string | null;
  history: ClientMembershipHistoryItem[];
  id: string;
  membershipId: string;
  membershipName: string;
  pricingType: ClientMembershipPricingType | null;
  remainingBenefits: number | null;
  renewedAt: string | null;
  startsAt: string | null;
  status: ClientMembershipStatus;
  walletBalance: number | null;
};

export type ClientMembershipAssignmentRequest = {
  clientId: string;
  membershipId: string;
  startDate?: string;
};

export type ChangeClientMembershipRequest = {
  membershipId: string;
  startDate?: string;
};

export type RenewClientMembershipRequest = {
  startDate?: string;
};

export type CancelClientMembershipRequest = {
  reason?: string;
};
