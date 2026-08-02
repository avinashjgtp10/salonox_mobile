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

/** One rung of a loyalty plan's tier ladder — e.g. 10 visits unlocks 20% off. */
export interface LoyaltyTier {
  thresholdValue: number;
  discountPercent: number;
}

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
  /** Optional narrowing of appliesTo to specific service_categories ids —
   *  empty/omitted means unrestricted (every category within appliesTo's scope). */
  categoryIds?: string[];
  pricingType?: MembershipPricingType;
  discountPercent?: number;
  /** 'percentage' only — the depleting pool of discount this plan may hand out. */
  discountBalance?: number;
  /** 'loyalty' only — the tier ladder (visits → discount%), ascending by thresholdValue. */
  loyaltyTiers?: LoyaltyTier[];
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
  /** Optional narrowing of appliesTo to specific service_categories ids —
   *  empty/omitted means unrestricted (every category within appliesTo's scope). */
  categoryIds?: string[];
  pricingType?: MembershipPricingType;
  discountPercent?: number;
  /** 'percentage' only — the depleting pool of discount this plan may hand out. */
  discountBalance?: number;
  /** 'loyalty' only — the tier ladder (visits → discount%), ascending by thresholdValue. */
  loyaltyTiers?: LoyaltyTier[];
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
  /** Plain-text description pulled out of the plan's JSON-encoded description field. */
  description?: string;
  /** Visits accumulated so far. */
  current: number;
  /** True once the client has crossed at least the first tier. */
  eligible: boolean;
  /** The highest tier crossed so far — its discountPercent is what actually
   *  applies (tiers never stack). Null when not yet eligible. */
  currentTier: LoyaltyTier | null;
  /** The next tier still to unlock, for progress display. Null once the
   *  client has crossed every tier the plan defines. */
  nextTier: LoyaltyTier | null;
  /** Pass-through of currentTier.discountPercent (0 when ineligible). */
  discountPercent: number;
  appliesTo: MembershipAppliesTo;
  /** Optional narrowing of appliesTo to specific service_categories ids — empty means unrestricted. */
  categoryIds: string[];
}
