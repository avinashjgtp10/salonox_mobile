export type ClientMembershipStatus = "active" | "cancelled" | "expired" | "inactive";

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
  assignedAt: string | null;
  benefits: ClientMembershipBenefit[];
  cancelledAt: string | null;
  clientId: string;
  clientName: string;
  expiresAt: string | null;
  history: ClientMembershipHistoryItem[];
  id: string;
  membershipId: string;
  membershipName: string;
  remainingBenefits: number | null;
  renewedAt: string | null;
  startsAt: string | null;
  status: ClientMembershipStatus;
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
