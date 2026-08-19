import type {
  CreateEmergencyContactFormFields,
  CreateStaffAddressRequest,
  CreateStaffRequest,
  StaffAddressListItem,
  StaffEmergencyContactListItem,
  UpdateEmergencyContactFormFields,
  UpdateStaffAddressRequest,
  UpdateStaffRequest,
} from "@/types/staff";

export type StaffModuleSectionKey =
  | "profile"
  | "address"
  | "emergencyContacts"
  | "wages"
  | "payRuns"
  | "commissions"
  | "schedule"
  | "leaves"
  | "blockedTimes"
  | "invitations"
  | "documents"
  | "notes"
  | "importStaff";

export type StaffModuleSection = {
  description: string;
  key: StaffModuleSectionKey;
  label: string;
  route: string | null;
  status: "connected" | "future-ready";
};

export type StaffFormValues = Omit<CreateStaffRequest, "salon_id">;
export type StaffUpdateFormValues = Omit<UpdateStaffRequest, "salon_id">;

export type StaffRoleLevel = "Staff" | "Manager";

export type StaffProfileFormValues = {
  address: string;
  avatarUrl: string;
  confirmPassword: string;
  designation: string;
  dob: string;
  email: string;
  fixedSalary: string;
  fullName: string;
  gender: string;
  holidays: string;
  hourlyRate: string;
  isLoginEnabled: boolean;
  joiningDate: string;
  notes: string;
  password: string;
  phone: string;
  phoneCountry: string;
  roleLevel: StaffRoleLevel | "";
  workingHoursPerDay: string;
};
export type StaffAddressFormValues = Omit<CreateStaffAddressRequest, "salon_id">;
export type StaffAddressUpdateFormValues = Omit<UpdateStaffAddressRequest, "salon_id">;
export type EmergencyContactFormValues = CreateEmergencyContactFormFields;
export type EmergencyContactUpdateFormValues = UpdateEmergencyContactFormFields;

export type ValidationResult = {
  errors: Record<string, string>;
  isValid: boolean;
};

export type StaffAddressFormFields = {
  addressLine: string;
  city: string;
  country: string;
  postalCode: string;
  state: string;
  type: string;
};

export type StaffAddressController = {
  addresses: StaffAddressListItem[];
  closeForm: () => void;
  createError: string | null;
  creating: boolean;
  deleteAddress: (recordId: string) => Promise<{ message?: string; success: boolean }>;
  editingAddress: StaffAddressListItem | null;
  error: string | null;
  fetchMore: () => void;
  form: StaffAddressFormFields;
  formErrors: Record<string, string>;
  isFormOpen: boolean;
  isFormValid: boolean;
  listError: string | null;
  loading: boolean;
  loadingMore: boolean;
  openCreateForm: () => void;
  openEditForm: (address: StaffAddressListItem) => void;
  refresh: () => void;
  refreshing: boolean;
  save: () => Promise<boolean>;
  saving: boolean;
  updateError: string | null;
  updateField: (field: keyof StaffAddressFormFields, value: string) => void;
  updating: boolean;
};

export type EmergencyContactController = {
  closeForm: () => void;
  contacts: StaffEmergencyContactListItem[];
  createError: string | null;
  creating: boolean;
  deleteContact: (recordId: string) => Promise<{ message?: string; success: boolean }>;
  editingContact: StaffEmergencyContactListItem | null;
  error: string | null;
  fetchMore: () => void;
  form: Required<
    Pick<
      EmergencyContactFormValues,
      "address" | "email" | "fullName" | "notes" | "phone" | "relationship"
    >
  >;
  formErrors: Record<string, string>;
  isFormOpen: boolean;
  isFormValid: boolean;
  listError: string | null;
  listLoading: boolean;
  loadingMore: boolean;
  openCreateForm: () => void;
  openEditForm: (contact: StaffEmergencyContactListItem) => void;
  refresh: () => void;
  refreshing: boolean;
  save: () => Promise<boolean>;
  saving: boolean;
  updateError: string | null;
  updateField: (field: keyof EmergencyContactController["form"], value: string) => void;
  updating: boolean;
};
