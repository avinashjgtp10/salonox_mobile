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
