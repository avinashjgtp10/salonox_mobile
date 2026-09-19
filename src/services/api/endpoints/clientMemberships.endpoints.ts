import type { MembershipAppliesTo, MembershipBenefitType } from "./memberships.endpoints";

export const CLIENT_MEMBERSHIPS = {
  BASE:    '/api/v1/client-memberships',
  BY_ID:   (id: string) => `/api/v1/client-memberships/${id}`,
  CONSUME: (id: string) => `/api/v1/client-memberships/${id}/consume`,
  CANCEL:  (id: string) => `/api/v1/client-memberships/${id}/cancel`,
} as const;

export interface ClientMembership {
  id: string;
  salonId: string;
  clientId: string;
  clientName: string;
  mobile?: string;
  email?: string;
  membershipId: string;
  membershipName: string;
  colour?: string;
  totalSessions: number;    // 0 = unlimited
  usedSessions: number;
  remainingSessions: number;
  purchasedAt: string;
  expiresAt?: string;
  status: 'active' | 'expired' | 'exhausted' | 'cancelled';
  pricePaid?: number;
  membershipWalletBalance: number;
  /** Denormalized from the membership plan at purchase time. */
  appliesTo: MembershipAppliesTo;
  /** Optional narrowing of appliesTo to specific service_categories ids —
   *  independent per side, empty means unrestricted on that side. Already
   *  present on every API response (see client-memberships.repository.ts's
   *  toClientMembership) — declared here so the client-side "how much could
   *  this wallet cover" estimate (membershipEligibleTotal in
   *  AppointmentModal.tsx) can filter by the SAME restriction checkout
   *  actually enforces, instead of only the coarse appliesTo signal. */
  serviceCategoryIds?: string[];
  productCategoryIds?: string[];
  /** Further, additive narrowing to specific services/products. */
  serviceIds?: string[];
  productIds?: string[];
  /** Denormalized plain-text description from the plan at purchase time. */
  description?: string;
  pricingType?: 'value' | 'percentage' | 'loyalty';
  discountPercent?: number;
  /** 'percentage' only — the benefit model this membership was SOLD under,
   *  snapshotted at purchase. 'validity' has no balance and runs until expiry;
   *  'discount_balance' (the default, and everything sold before this existed)
   *  spends discountBalanceRemaining down and stops at 0. */
  benefitType?: MembershipBenefitType;
  /** 'percentage' + 'discount_balance' only — discount still available to hand
   *  out, depletes by discount given. Always 0 on a validity membership, which
   *  is why nothing may treat 0 here as "no benefit" without checking the type. */
  discountBalanceRemaining?: number;
  usageLog?: UsageLogEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface UsageLogEntry {
  id: string;
  clientMembershipId: string;
  appointmentId?: string;
  serviceName?: string;
  sessionsConsumed: number;
  notes?: string;
  usedAt: string;
  amountDeducted?: number;
  remainingBalance?: number;
  serviceId?: string;
}

export interface ClientMembershipsListResponse {
  items: ClientMembership[];
  total: number;
}

export interface CreateClientMembershipDTO {
  clientId: string;
  membershipId: string;
  membershipName: string;
  colour?: string;
  totalSessions: number;
  expiresAt?: string;
  pricePaid?: number;
  paymentMethod: string;
  /** Method -> amount breakdown, present only when paymentMethod is a split combo. */
  splitDetails?: Record<string, number>;
}

export interface ConsumeSessionDTO {
  appointmentId?: string;
  serviceName?: string;
  sessionsToConsume?: number;
  notes?: string;
}

export interface ClientMembershipsListQuery {
  clientId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}
