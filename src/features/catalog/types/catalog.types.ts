export interface Service {
  id: string | number;
  name: string;
  // backend field names
  category_id: string | number | null;
  category_name: string | null;
  price_type?: "fixed" | "from" | "free";
  price: string | number; // string from backend ("65.00"), display with ₹
  duration: number;
  online_booking?: boolean;
  commission_enabled?: boolean;
  resource_required?: boolean;
  is_active: boolean;
  salon_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BasicDetailsData {
  name: string;
  categoryId: string;
  duration: number;
  price: number;
  paddingBefore: number;
  paddingAfter: number;
  description: string;
  active: boolean;
}

export interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface TeamMembersData {
  allMembers: boolean;
  selectedMemberIds: string[];
  availableMembers: TeamMember[];
}

export interface Resource {
  id: string;
  name: string;
}

export interface ResourcesData {
  requireResource: boolean;
  selectedResourceId: string;
  availableResources: Resource[];
}

export interface AddOnOption {
  id: string;
  name: string;
  duration: number;
  price: number;
}

export interface AddOnGroup {
  id: string;
  name: string;
  prompt: string;
  options: AddOnOption[];
  minQuantityRequired: boolean;
  maxQuantityEnabled: boolean;
  allowMultipleSame: boolean;
  linkedServiceIds: string[];
}

export interface ServiceAddOnsData {
  selectedGroupIds: string[];
  availableGroups: AddOnGroup[];
}

export interface OnlineBookingData {
  enabled: boolean;
  onlineDescription: string;
  maxAdvanceDays: number;
  minNoticeHours: number;
  requireDeposit: boolean;
  depositAmount: number;
}

export interface PortfolioImage {
  id: string;
  url: string;
  file?: File;
}

export interface PortfolioData {
  images: PortfolioImage[];
}

export interface ServiceForm {
  id: string;
  name: string;
  createdAt: string;
}

export interface FormsData {
  selectedFormIds: string[];
  availableForms: ServiceForm[];
}

export interface MemberCommission {
  memberId: string;
  memberName: string;
  commissionType: "percentage" | "flat";
  commissionValue: number;
}

export interface CommissionData {
  defaultType: "percentage" | "flat";
  defaultValue: number;
  memberCommissions: MemberCommission[];
}

export interface SettingsData {
  cancellationNoticeHours: number;
  chargeCancellationFee: boolean;
  cancellationFeeAmount: number;
  visibleToClients: boolean;
  taxable: boolean;
  colorLabel: string;
}

export interface Category {
  id: string;
  name: string;
  serviceCount: number;
}

export interface Membership {
  id: string;
  name: string;
  servicesCovered: string; // e.g., "All services"
  validFor: string; // e.g., "1 month"
  sessions: string; // e.g., "5 sessions"
  price: number;
  image?: string;
}

export interface CatalogFormData {
  basic: BasicDetailsData;
  team: TeamMembersData;
  resources: ResourcesData;
  addons: ServiceAddOnsData;
  onlineBooking: OnlineBookingData;
  portfolio: PortfolioData;
  forms: FormsData;
  commission: CommissionData;
  settings: SettingsData;
}
