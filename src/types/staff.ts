import type { StaffMember } from "@/data/teamData";

export type StaffSortOrder = "ASC" | "DESC";

export type StaffListQuery = {
  limit: number;
  page: number;
  sort_by: "created_at";
  sort_order: StaffSortOrder;
};

export type StaffAddressListQuery = StaffListQuery;

export type CreateStaffRequest = {
  availability?: string;
  email?: string;
  first_name: string;
  gender?: string;
  joining_date?: string;
  last_name?: string;
  leave_balance?: number | string;
  notes?: string;
  phone: string;
  role?: string;
  salon_id?: string;
  services?: string[];
  staff_role?: string;
  status?: string;
  work_end_time?: string;
  work_start_time?: string;
  working_hours?: string;
  employee_code?: string;
};

export type CreateStaffResponse = {
  message?: string;
  staffMember: StaffMember;
};

export type CreateStaffAddressRequest = {
  address?: string;
  address_line?: string;
  address_line_1?: string;
  address_line1?: string;
  city?: string;
  country?: string;
  is_primary?: boolean;
  postal_code?: string;
  salon_id?: string;
  state?: string;
  type?: string;
  zip?: string;
  zip_code?: string;
};

export type CreateEmergencyContactFormFields = {
  address?: string;
  email?: string;
  fullName?: string;
  isPrimary?: boolean;
  name?: string;
  notes?: string;
  phone?: string;
  phoneNumber?: string;
  relationship?: string;
};

export type CreateEmergencyContactRequest = {
  address?: string;
  email?: string;
  full_name?: string;
  is_primary?: boolean;
  name?: string;
  notes?: string;
  phone?: string;
  phone_number?: string;
  relationship?: string;
  salon_id?: string;
};

export type UpdateStaffRequest = Partial<CreateStaffRequest>;

export type UpdateStaffResponse = {
  message?: string;
  staffMember: StaffMember;
};

export type UpdateStaffAddressRequest = Partial<CreateStaffAddressRequest>;

export type UpdateEmergencyContactFormFields = Partial<CreateEmergencyContactFormFields>;

export type UpdateEmergencyContactRequest = Partial<CreateEmergencyContactRequest>;

export type DeleteStaffResponse = {
  message?: string;
  staffId: string;
};

export type DeleteStaffAddressResponse = {
  message?: string;
  recordId: string;
  staffId: string;
};

export type StaffAddressListItem = {
  addressLine: string;
  city: string;
  country: string;
  createdAt: string | null;
  id: string;
  isPrimary: boolean;
  postalCode: string;
  staffId: string;
  state: string;
  type: string;
};

export type StaffEmergencyContactListItem = {
  address: string;
  createdAt: string | null;
  email: string;
  fullName: string;
  id: string;
  isPrimary: boolean;
  notes: string;
  phone: string;
  relationship: string;
  staffId: string;
};

export type CreateStaffAddressResponse = {
  address: StaffAddressListItem;
  message?: string;
  staffId: string;
};

export type CreateEmergencyContactResponse = {
  emergencyContact: StaffEmergencyContactListItem;
  message?: string;
  staffId: string;
};

export type UpdateStaffAddressResponse = CreateStaffAddressResponse & {
  recordId: string;
};

export type UpdateEmergencyContactResponse = CreateEmergencyContactResponse & {
  recordId: string;
};

export type StaffListPagination = {
  hasMore: boolean;
  limit: number;
  nextPage: number;
  page: number;
  totalCount: number;
  totalPages: number | null;
};

export type StaffAddressListPagination = StaffListPagination;

export type StaffListResponse = {
  pagination: StaffListPagination;
  query: StaffListQuery;
  staffMembers: StaffMember[];
};

export type StaffAddressListResponse = {
  addresses: StaffAddressListItem[];
  pagination: StaffAddressListPagination;
  query: StaffAddressListQuery;
  staffId: string;
};

export type EmergencyContactListQuery = StaffListQuery;

export type EmergencyContactListPagination = StaffListPagination;

export type EmergencyContactListResponse = {
  contacts: StaffEmergencyContactListItem[];
  pagination: EmergencyContactListPagination;
  query: EmergencyContactListQuery;
  staffId: string;
};

export type DeleteEmergencyContactResponse = {
  message?: string;
  recordId: string;
  staffId: string;
};
