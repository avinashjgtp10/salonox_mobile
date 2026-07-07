import type {
  EmergencyContactFormValues,
  StaffAddressFormValues,
  StaffProfileFormValues,
} from "@/features/staff/types/staffFeature.types";
import type { CreateStaffAddressRequest, CreateStaffRequest } from "@/types/staff";

export const trimValue = (value?: string) => {
  const trimmedValue = value?.trim();

  return trimmedValue || undefined;
};

export const splitStaffFullName = (fullName: string) => {
  const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ");

  return {
    first_name: firstName,
    last_name: lastName,
  };
};

export const mapStaffFormToRequest = (
  values: StaffProfileFormValues,
  nextAutoCode?: string,
): Omit<CreateStaffRequest, "salon_id"> => {
  const name = splitStaffFullName(values.fullName);
  const employeeCode = values.isAutoGenerate ? nextAutoCode : values.employeeCode;

  const workingHours = (values.work_start_time && values.work_end_time)
    ? `${values.work_start_time} - ${values.work_end_time}`
    : undefined;

  return {
    email: trimValue(values.email),
    first_name: name.first_name,
    gender: trimValue(values.gender),
    joining_date: trimValue(values.joining_date),
    last_name: name.last_name,
    notes: trimValue(values.notes),
    phone: values.phone.trim(),
    role: trimValue(values.role),
    work_start_time: trimValue(values.work_start_time),
    work_end_time: trimValue(values.work_end_time),
    working_hours: trimValue(workingHours),
    employee_code: trimValue(employeeCode),
  };
};

export const mapStaffAddressFormToRequest = (
  values: StaffAddressFormValues,
): Omit<CreateStaffAddressRequest, "salon_id"> => ({
  ...values,
  address: trimValue(values.address),
  address_line: trimValue(values.address_line),
  city: trimValue(values.city),
  country: trimValue(values.country),
  postal_code: trimValue(values.postal_code),
  state: trimValue(values.state),
  type: trimValue(values.type),
});

export const mapEmergencyContactFormToRequest = (values: EmergencyContactFormValues) => {
  const fullName = trimValue(values.fullName) ?? trimValue(values.name);
  const phone = trimValue(values.phone) ?? trimValue(values.phoneNumber);

  return {
    ...(trimValue(values.address) ? { address: trimValue(values.address) } : {}),
    ...(trimValue(values.email) ? { email: trimValue(values.email) } : {}),
    ...(fullName ? { fullName, name: fullName } : {}),
    ...(typeof values.isPrimary === "boolean" ? { isPrimary: values.isPrimary } : {}),
    ...(trimValue(values.notes) ? { notes: trimValue(values.notes) } : {}),
    ...(phone ? { phone, phoneNumber: phone } : {}),
    ...(trimValue(values.relationship) ? { relationship: trimValue(values.relationship) } : {}),
  };
};
