export interface IncludedService {
  serviceId: string;
  serviceName: string;
  durationMinutes?: number;
}

/**
 * 'value'      — wallet: pay a fee, get a spendable balance drawn down at face value.
 * 'percentage' — discount balance: N% off every service, where the discount GIVEN
 *                depletes a separate pool.
 * 'loyalty'    — free/automatic: unlocks N% off once a visit threshold is met,
 *                then applies indefinitely with no cap.
 */
export type MembershipPricingType = 'value' | 'percentage' | 'loyalty';

/** Which line items a membership's benefit is eligible to cover. */
export type MembershipAppliesTo = 'services' | 'products' | 'both';

export interface Membership {
  id: string;
  name: string;
  description?: string;
  includedServices: IncludedService[];
  sessionType: string;
  numberOfSessions?: number;
  validFor: string;
  price: number;
  taxRate?: number;
  colour: string;
  enableOnlineSales: boolean;
  enableOnlineRedemption: boolean;
  termsAndConditions?: string;
  /** Defaults to 'services' server-side when omitted. */
  appliesTo?: MembershipAppliesTo;
  pricingType?: MembershipPricingType;
  discountPercent?: number;
  /** 'percentage' only — the depleting pool of discount this plan may hand out. */
  discountBalance?: number;
  /** 'loyalty' only — how many visits have to accumulate before the discount unlocks. */
  loyaltyThresholdValue?: number;
  createdAt: Date;
  updatedAt: Date;
  // Optional client association (if backend supports it)
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
  client?: { id?: string; name?: string; first_name?: string; last_name?: string; phone_number?: string; phone?: string; };
}

export interface CreateMembershipDTO {
  name: string;
  description?: string;
  includedServices: IncludedService[];
  sessionType: string;
  numberOfSessions?: number;
  validFor: string;
  price: number;
  taxRate?: number;
  colour: string;
  enableOnlineSales: boolean;
  enableOnlineRedemption: boolean;
  termsAndConditions?: string;
  /** Defaults to 'services' server-side when omitted. */
  appliesTo?: MembershipAppliesTo;
  pricingType?: MembershipPricingType;
  discountPercent?: number;
  /** 'percentage' only — the depleting pool of discount this plan may hand out. */
  discountBalance?: number;
  /** 'loyalty' only — how many visits have to accumulate before the discount unlocks. */
  loyaltyThresholdValue?: number;
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
}

export interface UpdateMembershipDTO extends Partial<CreateMembershipDTO> {}

export interface MembershipsListQuery {
  sessionType?: string;
  colour?: string;
  validFor?: string;
  page?: number;
  limit?: number;
}

export interface MembershipsListResponse {
  items: Membership[];
  total: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface LoyaltyEligibility {
  membershipId: string;
  name: string;
  discountPercent: number;
  thresholdValue: number;
  /** Visits accumulated so far. */
  current: number;
  eligible: boolean;
  appliesTo: MembershipAppliesTo;
}
