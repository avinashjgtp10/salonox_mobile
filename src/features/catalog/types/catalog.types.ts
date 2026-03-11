export interface Service {
    id: string;
    name: string;
    categoryId: string;
    categoryName: string;
    duration: number;
    price: number;
    onlineBookingEnabled: boolean;
    active: boolean;
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

export interface AddOnService {
    id: string;
    name: string;
    duration: number;
    price: number;
}

export interface ServiceAddOnsData {
    selectedAddonIds: string[];
    availableAddons: AddOnService[];
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
