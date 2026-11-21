export type MembershipExportFormat = "csv" | "excel" | "pdf";

export type IncludedService = {
  serviceId: string;
  serviceName: string;
  durationMinutes?: number;
};

/**
 * The three membership plan types, matching the web catalog exactly.
 *
 * "value"      — Wallet: pay a fee, credit a spendable wallet balance
 *                (fee + optional bonus credit), drawn down at face value.
 * "percentage" — Discount Balance: pay a fee, get N% off every eligible bill.
 *                The discount GIVEN either depletes a pool ("discount_balance")
 *                or simply runs until the membership expires ("validity").
 * "loyalty"    — free/automatic: crossing a visit threshold unlocks that
 *                tier's discount; the highest crossed tier applies, never stacked.
 */
export type MembershipPricingType = "loyalty" | "percentage" | "value";

/**
 * The two mutually exclusive benefit models a percentage plan can run on.
 * "discount_balance": hand out the % until the monetary pool is spent, then stop.
 * "validity": no pool — the % applies to every eligible bill until expiry.
 * Defaults to "discount_balance" server-side.
 */
export type MembershipBenefitType = "discount_balance" | "validity";

/** Which line items a membership's benefit is eligible to cover. */
export type MembershipAppliesTo = "both" | "products" | "services";

/** One rung of a loyalty plan's tier ladder — e.g. 10 visits unlocks 20% off. */
export type LoyaltyTier = {
  discountPercent: number;
  thresholdValue: number;
};

export type CreateMembershipRequest = {
  name: string;
  description?: string;
  includedServices: IncludedService[];
  privileges?: unknown;
  metadata?: unknown;
  bonusCredit?: number;
  sessionType: string;
  numberOfSessions?: number;
  validFor: string;
  price: number;
  taxRate?: number;
  colour: string;
  enableOnlineSales: boolean;
  enableOnlineRedemption: boolean;
  termsAndConditions?: string;
  /** Wallet / Discount Balance / Loyalty — see MembershipPricingType. */
  pricingType?: MembershipPricingType;
  /** "percentage" only — the discount the plan hands out. */
  discountPercent?: number;
  /** "percentage" only — which benefit model the plan runs on. */
  benefitType?: MembershipBenefitType;
  /** "percentage" + "discount_balance" only — the depleting pool of discount. */
  discountBalance?: number;
  /** "loyalty" only — the tier ladder, ascending by thresholdValue. */
  loyaltyTiers?: LoyaltyTier[];
  /** Defaults to "services" server-side when omitted. */
  appliesTo?: MembershipAppliesTo;
  /** Optional narrowing of appliesTo to specific category ids — tracked
   *  independently per side, since service_categories is one shared table and
   *  a category tagged "both" is a valid pick on either side. Empty means
   *  unrestricted on that side. */
  serviceCategoryIds?: string[];
  productCategoryIds?: string[];
  /** Further, additive narrowing to individual services/products. Empty means
   *  no individual-item narrowing. */
  serviceIds?: string[];
  productIds?: string[];
};

export type UpdateMembershipRequest = Partial<CreateMembershipRequest>;

export type Membership = CreateMembershipRequest & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type MembershipRow = {
  id: string;
  name: string;
  description: string | null;
  privileges?: unknown;
  metadata?: unknown;
  bonus_credit?: string | number | null;
  bonusCredit?: string | number | null;
  session_type: string;
  number_of_sessions: number | null;
  valid_for: string;
  price: string;
  tax_rate: string | null;
  colour: string;
  pricing_type?: string | null;
  pricingType?: string | null;
  applies_to?: string | null;
  appliesTo?: string | null;
  discount_percent?: string | number | null;
  discountPercent?: string | number | null;
  benefit_type?: string | null;
  benefitType?: string | null;
  discount_balance?: string | number | null;
  discountBalance?: string | number | null;
  loyalty_tiers?: unknown;
  loyaltyTiers?: unknown;
  service_category_ids?: unknown;
  serviceCategoryIds?: unknown;
  product_category_ids?: unknown;
  productCategoryIds?: unknown;
  service_ids?: unknown;
  serviceIds?: unknown;
  product_ids?: unknown;
  productIds?: unknown;
  enable_online_sales: boolean;
  enable_online_redemption: boolean;
  terms_and_conditions: string | null;
  created_at: string;
  updated_at: string;
  services: IncludedService[] | null;
};

export type MembershipListQuery = {
  search?: string;
  sessionType?: string;
  colour?: string;
  validFor?: string;
  page?: number;
  limit?: number;
};

export type MembershipListResponse = {
  items: Membership[];
  total: number;
};

export type CreateMembershipResponse = Membership;

export type UpdateMembershipResponse = Membership;

export type DeleteMembershipResponse = Record<string, never>;

export type MembershipExportQuery = Omit<MembershipListQuery, "page" | "limit">;

export type MembershipExportResponse =
  | {
      contentType: "text/csv";
      data: string;
      filename?: string;
      format: "csv";
    }
  | {
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      data: ArrayBuffer;
      filename?: string;
      format: "excel";
    }
  | {
      contentType: "application/pdf";
      data: ArrayBuffer;
      filename?: string;
      format: "pdf";
    };
