import type { StaffMember } from "@/data/teamData";
import type {
  EmergencyContactFormValues,
  StaffAddressFormValues,
  StaffProfileFormValues,
  ValidationResult,
} from "@/features/staff/types/staffFeature.types";
import { parseTimeToMinutes } from "@/features/staff/utils/timeUtils";
import {
  DATE_INVALID_MESSAGE,
  EMAIL_INVALID_MESSAGE,
  isValidEmail,
  isValidIsoDate,
  isValidPhoneDigits,
  PHONE_INVALID_MESSAGE,
} from "@/utils/validation";

const isPresent = (value: unknown) =>
  typeof value === "string" ? value.trim().length > 0 : value !== undefined && value !== null;

const result = (errors: Record<string, string>): ValidationResult => ({
  errors,
  isValid: Object.keys(errors).length === 0,
});

export const validateStaffForm = (
  values: Partial<StaffProfileFormValues>,
  staffMembers?: StaffMember[],
  currentStaffId?: string | null,
): ValidationResult => {
  const errors: Record<string, string> = {};

  if (!isPresent(values.fullName)) {
    errors.fullName = "Staff name is required.";
  }

  if (!isPresent(values.phone)) {
    errors.phone = "Phone number is required.";
  } else if (!isValidPhoneDigits(values.phone!)) {
    errors.phone = PHONE_INVALID_MESSAGE;
  }

  if (isPresent(values.email) && !isValidEmail(values.email!)) {
    errors.email = EMAIL_INVALID_MESSAGE;
  }

  if (!isPresent(values.role)) {
    errors.role = "Role is required.";
  }

  if (isPresent(values.joining_date) && !isValidIsoDate(values.joining_date!)) {
    errors.joining_date = DATE_INVALID_MESSAGE;
  }

  if (!isPresent(values.work_start_time)) {
    errors.work_start_time = "Start time is required.";
  }

  if (!isPresent(values.work_end_time)) {
    errors.work_end_time = "End time is required.";
  } else if (isPresent(values.work_start_time)) {
    const startMins = parseTimeToMinutes(values.work_start_time);
    const endMins = parseTimeToMinutes(values.work_end_time);
    if (endMins <= startMins) {
      errors.work_end_time = "End time must be after start time.";
    }
  }

  if (values.isAutoGenerate === false) {
    if (!isPresent(values.employeeCode)) {
      errors.employeeCode = "Employee code is required.";
    } else if (staffMembers) {
      const codeToCheck = values.employeeCode!.trim().toLowerCase();
      const isDuplicate = staffMembers.some(
        (member) =>
          member.id !== currentStaffId &&
          member.employeeCode?.trim().toLowerCase() === codeToCheck,
      );
      if (isDuplicate) {
        errors.employeeCode = "Employee code already exists in this salon.";
      }
    }
  }

  return result(errors);
};

export const validateStaffAddressForm = (
  values: Partial<StaffAddressFormValues>,
): ValidationResult => {
  const errors: Record<string, string> = {};

  if (!isPresent(values.address) && !isPresent(values.address_line)) {
    errors.address = "Address is required.";
  }

  return result(errors);
};

export const validateEmergencyContactForm = (
  values: Partial<EmergencyContactFormValues>,
): ValidationResult => {
  const errors: Record<string, string> = {};
  const fullName = values.fullName ?? values.name;
  const phone = values.phone ?? values.phoneNumber;

  if (!isPresent(fullName)) {
    errors.fullName = "Emergency contact name is required.";
  }

  if (!isPresent(values.relationship)) {
    errors.relationship = "Relationship is required.";
  }

  if (!isPresent(phone)) {
    errors.phone = "Phone number is required.";
  } else if (!isValidPhoneDigits(phone!)) {
    errors.phone = PHONE_INVALID_MESSAGE;
  }

  if (isPresent(values.email) && !isValidEmail(values.email!)) {
    errors.email = EMAIL_INVALID_MESSAGE;
  }

  return result(errors);
};
