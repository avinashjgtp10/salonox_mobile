export interface ServiceStaffMember {
  staff_id: string;
  name: string;
}

// How a per-service commission override is applied to that service's revenue.
// "percentage" → % of the service's revenue; "fixed" → flat ₹ per unit sold.
export type ServiceCommissionKind = "percentage" | "fixed";

export interface ServiceConsultationFormEntry {
  id: string;
  service_id: string;
  name: string;
  is_selected: boolean;
  values: ServiceConsultationFormValues | null;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string | number;
  name: string;
  // backend field names
  category_id: string | number | null;
  category_name: string | null;
  price_type?: "fixed" | "from" | "free";
  price: string | number; // string from backend ("65.00"), display via useCurrency()
  discounted_price?: string | number | null;
  duration: number;
  description?: string;
  padding_before?: number;  // extra processing time before service (minutes)
  padding_after?: number;   // extra processing time after service (minutes)
  // The backend never returns all_members/team_member_ids — team assignment
  // is only exposed via `staff` (only present on the single-item GET-by-ID
  // response). No staff rows = every team member can perform the service.
  staff?: ServiceStaffMember[];
  staff_ids?: string[]; // write-only: sent on create/update requests
  // Also only present on the single-item GET-by-ID response, same as `staff`.
  consultation_forms?: ServiceConsultationFormEntry[];
  online_booking?: boolean;
  // Legacy and inert — false on every row, read by nothing in the commission
  // engine. Per-service commission is commission_rate/commission_kind below.
  commission_enabled?: boolean;
  // Per-service commission override. null = no override, i.e. this service
  // earns under the staff's commission rules (Staff → Commissions).
  commission_rate?: string | number | null;
  commission_kind?: ServiceCommissionKind | null;
  resource_required?: boolean;
  is_active: boolean;
  salon_id?: string | null;
  gender_preference?: string | null;
  image_url?: string | null;
  treatment_type?: string | null;
  consumables_used?: { product_id: string; product_name?: string; qty: number; unit: string }[];
  created_at?: string;
  updated_at?: string;
}

// Only fields the backend actually persists. discountedPrice, paddingBefore,
// paddingAfter, genderPreference and imageUrl were removed: no column exists
// for any of them, so the API silently dropped them and still returned 201.
export interface BasicDetailsData {
  name: string;
  categoryId: string;
  duration: number;
  price: number;
  description: string;
  active: boolean;
}

export interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

// An empty selection means "every staff member can perform this service" —
// that's how the backend reads it too (no service_staff rows = all staff), so
// there is no separate allMembers flag to keep in sync with the list.
export interface TeamMembersData {
  selectedMemberIds: string[];
}

export interface ConsumableUsageEntry {
  id: string;
  productId: string;
  productName: string;
  qty: number;
  unit: string;
}

export interface ConsumablesData {
  items: ConsumableUsageEntry[];
}

export interface ConsumableUsagePayloadItem {
  product_id: string;
  qty: number;
  unit: string;
}

// Only `enabled` is persisted — it gates the public booking catalogue
// (bookings.repository.ts). onlineDescription/maxAdvanceDays/minNoticeHours/
// deposit were collected by the old form and never sent anywhere; booking
// windows and deposits are salon-level policy, not per-service.
export interface OnlineBookingData {
  enabled: boolean;
}

// Per-service commission override. `enabled: false` sends both columns as null,
// which means "no override" — the service earns under whatever commission rules
// the staff member has, exactly as every service did before this existed.
// When enabled, this rate REPLACES the staff rule for this service's revenue;
// it is not added on top, or the same money would pay commission twice.
export interface ServiceCommissionData {
  enabled: boolean;
  kind: ServiceCommissionKind;
  value: number;
}

export interface ServiceConsultationFormValues {
  customerName: string;
  mobileNumber: string;
  date: string;
  consultantName: string;

  serviceInterestedIn: string;
  customerRequirement: string;
  currentCondition: string;
  recommendedService: string;
  whyRecommended: string;

  expectedResult: {
    instantResult: boolean;
    gradualImprovement: boolean;
    multipleSessionsRequired: boolean;
  };
  expectedOutcome: string;

  sessionsRecommended: string;
  recommendedInterval: "weekly" | "every_15_days" | "monthly" | "other" | "";
  recommendedIntervalOther: string;

  homeCareProducts: string;
  homeCareInstructions: string;

  estimatedCost: string;
  packageSuggested: string;

  notes: string;

  customerDecision: "accepted" | "booked_later" | "declined" | "";
  decisionReason: string;
}

export interface ServiceForm {
  id: string;
  name: string;
  createdAt: string;
  values?: ServiceConsultationFormValues;
}

export interface FormsData {
  selectedFormIds: string[];
  availableForms: ServiceForm[];
}

export interface Category {
  id: string;
  name: string;
  serviceCount: number;
}

// Sections dropped: `resources` (fixture data — the picker was hardcoded to a
// fake "Room 1"/"Chair 1" and nothing in scheduling reads resource_required),
// `addons` (its tab had zero importers), `portfolio` (uploader that never
// uploaded) and `settings` (every field duplicated salon-level config that
// already works elsewhere).
//
// `commission` is back, but as a real field this time. The old CommissionTab
// collected a service default plus per-staff overrides and sent none of it —
// there was no column and no endpoint. This one persists to
// services.commission_rate/_kind and is read by commissionCalculation.service.
export interface CatalogFormData {
  basic: BasicDetailsData;
  team: TeamMembersData;
  consumables: ConsumablesData;
  onlineBooking: OnlineBookingData;
  commission: ServiceCommissionData;
  forms: FormsData;
}
