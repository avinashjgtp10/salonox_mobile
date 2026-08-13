import { parsePhoneNumber } from "libphonenumber-js";

import type {
  EmergencyContactFormValues,
  StaffAddressFormValues,
  StaffProfileFormValues,
} from "@/features/staff/types/staffFeature.types";
import type { CreateStaffAddressRequest, CreateStaffRequest, SetStaffWagesRequest } from "@/types/staff";

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

// Matches the Web Create Staff dropdown: only "Staff" and "Manager" are
// offered, mapped onto the same permission_level values the API expects.
const ROLE_TO_PERMISSION_LEVEL: Record<string, string> = {
  Staff: "low",
  Manager: "manager",
};

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const splitIsoDate = (isoDate: string) => {
  const match = ISO_DATE_PATTERN.exec(isoDate);

  if (!match) {
    return null;
  }

  return { day: Number(match[3]), month: Number(match[2]) };
};

// The Contact field is collected as a full E.164 string via the shared
// PhoneInput/country-code component; the backend wants it split into a plain
// national number plus a separate dial code (mirrors what Web sends).
const mapPhoneToRequest = (e164Phone: string) => {
  const trimmedPhone = e164Phone.trim();

  if (!trimmedPhone) {
    return { phone: "", phoneCountryCode: undefined as string | undefined };
  }

  try {
    const parsed = parsePhoneNumber(trimmedPhone);

    return {
      phone: parsed.nationalNumber,
      phoneCountryCode: `+${parsed.countryCallingCode}`,
    };
  } catch {
    return { phone: trimmedPhone.replace(/^\+/, ""), phoneCountryCode: undefined as string | undefined };
  }
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

  const { phone, phoneCountryCode } = mapPhoneToRequest(values.phone);
  const dob = values.dob ? splitIsoDate(values.dob) : null;

  const payload: Omit<CreateStaffRequest, "salon_id"> = {
    address: trimValue(values.address),
    allow_calendar_bookings: true,
    avatar_url: trimValue(values.avatarUrl),
    birthday_day: dob?.day,
    birthday_month: dob?.month,
    email: trimValue(values.email),
    employee_code: trimValue(employeeCode),
    first_name: name.first_name,
    gender: trimValue(values.gender),
    holidays: values.holidays.trim() ? Number(values.holidays) : undefined,
    job_title: trimValue(values.designation),
    joined_date: trimValue(values.joiningDate),
    last_name: name.last_name,
    notes: trimValue(values.notes),
    permission_level: ROLE_TO_PERMISSION_LEVEL[values.roleLevel] ?? "low",
    phone,
    phone_country_code: phoneCountryCode,
    work_end_time: trimValue(values.work_end_time),
    work_start_time: trimValue(values.work_start_time),
    working_hours: trimValue(workingHours),
    working_hours_per_day: values.workingHoursPerDay.trim() ? Number(values.workingHoursPerDay) : undefined,
  };

  // Mirrors Web exactly: a password is only attached when Staff Login is
  // enabled AND a password was actually typed. Leaving it blank (with login
  // enabled) intentionally sends no password field at all, which is what
  // triggers the backend's e-mail invitation flow instead of an immediate
  // credential — see staffService/staff.thunk for the create/invite branch.
  if (values.isLoginEnabled && values.password.trim()) {
    payload.password = values.password.trim();
  }

  return payload;
};

export const mapStaffWagesToRequest = (values: StaffProfileFormValues): SetStaffWagesRequest | null => {
  const hourlyRate = values.hourlyRate.trim();
  const fixedSalary = values.fixedSalary.trim();

  if (!hourlyRate && !fixedSalary) {
    return null;
  }

  // Compensation is mutually exclusive (enforced by validateStaffForm), but
  // hourly wins if both were somehow set — matches Web's own tie-break.
  return {
    compensationType: hourlyRate ? "hourly" : "salary",
    fixedSalary: !hourlyRate && fixedSalary ? Number(fixedSalary) : null,
    hourlyRate: hourlyRate ? Number(hourlyRate) : null,
    wagesEnabled: true,
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
