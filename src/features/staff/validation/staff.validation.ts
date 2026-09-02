import { isValidPhoneNumber, parsePhoneNumber } from "libphonenumber-js";

import type {
  EmergencyContactFormValues,
  StaffAddressFormValues,
  StaffProfileFormValues,
  ValidationResult,
} from "@/features/staff/types/staffFeature.types";
import {
  DATE_INVALID_MESSAGE,
  EMAIL_INVALID_MESSAGE,
  isValidEmail,
  isValidIsoDate,
  isValidPhoneDigits,
  PASSWORD_MIN_LENGTH,
  PHONE_INVALID_MESSAGE,
} from "@/utils/validation";

const isPresent = (value: unknown) =>
  typeof value === "string" ? value.trim().length > 0 : value !== undefined && value !== null;

const isValidTenDigitPhone = (value: string) => {
  if (!isValidPhoneNumber(value)) {
    return false;
  }

  return parsePhoneNumber(value).nationalNumber.length === 10;
};

const result = (errors: Record<string, string>): ValidationResult => ({
  errors,
  isValid: Object.keys(errors).length === 0,
});

// Same casing/values used by the Profile and Client forms elsewhere in the app.
export const STAFF_GENDER_OPTIONS = ["Female", "Male", "Other"] as const;
export const STAFF_ROLE_OPTIONS = ["Staff", "Manager"] as const;

const toIsoDateString = (date: Date) =>
  [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");

const getTodayIsoDate = () => toIsoDateString(new Date());

const getMinAdultIsoDate = () => {
  const today = new Date();

  return toIsoDateString(new Date(today.getFullYear() - 18, today.getMonth(), today.getDate()));
};

export const validateStaffForm = (
  values: Partial<StaffProfileFormValues>,
): ValidationResult => {
  const errors: Record<string, string> = {};

  if (!isPresent(values.fullName)) {
    errors.fullName = "Staff name is required.";
  }

  if (!isPresent(values.email)) {
    errors.email = "Email is required.";
  } else if (!isValidEmail(values.email!)) {
    errors.email = EMAIL_INVALID_MESSAGE;
  }

  if (!isPresent(values.phone)) {
    errors.phone = "Contact number is required.";
  } else if (!isValidTenDigitPhone(values.phone!)) {
    errors.phone = PHONE_INVALID_MESSAGE;
  }

  if (!isPresent(values.gender)) {
    errors.gender = "Gender is required.";
  } else if (!(STAFF_GENDER_OPTIONS as readonly string[]).includes(values.gender!)) {
    errors.gender = "Select a valid gender.";
  }

  if (isPresent(values.dob)) {
    if (!isValidIsoDate(values.dob!)) {
      errors.dob = DATE_INVALID_MESSAGE;
    } else if (values.dob! > getTodayIsoDate()) {
      errors.dob = "Date of birth cannot be in the future.";
    } else if (values.dob! > getMinAdultIsoDate()) {
      errors.dob = "Staff must be at least 18 years old.";
    }
  }

  if (isPresent(values.joiningDate)) {
    if (!isValidIsoDate(values.joiningDate!)) {
      errors.joiningDate = DATE_INVALID_MESSAGE;
    } else if (values.joiningDate! > getTodayIsoDate()) {
      errors.joiningDate = "Date of joining cannot be in the future.";
    }
  }

  const hourlyRatePresent = isPresent(values.hourlyRate);
  const fixedSalaryPresent = isPresent(values.fixedSalary);

  if (hourlyRatePresent && !(Number(values.hourlyRate) > 0)) {
    errors.hourlyRate = "Hourly rate must be greater than 0.";
  }

  if (fixedSalaryPresent && !(Number(values.fixedSalary) > 0)) {
    errors.fixedSalary = "Fixed salary must be greater than 0.";
  }

  if (hourlyRatePresent && fixedSalaryPresent && !errors.hourlyRate && !errors.fixedSalary) {
    errors.hourlyRate =
      "A Fixed Salary is already set below — clear it to switch this staff member to an Hourly Rate.";
    errors.fixedSalary =
      "An Hourly Rate is already set above — clear it to switch this staff member to a Fixed Salary.";
  }

  if (isPresent(values.workingHoursPerDay)) {
    const workingHours = Number(values.workingHoursPerDay);

    if (!Number.isFinite(workingHours) || workingHours < 0 || workingHours > 24) {
      errors.workingHoursPerDay = "Must be between 0 and 24.";
    }
  }

  if (isPresent(values.holidays)) {
    const holidays = Number(values.holidays);

    if (!Number.isInteger(holidays) || holidays < 0) {
      errors.holidays = "Holidays cannot be negative.";
    }
  }

  if (values.isLoginEnabled) {
    const password = values.password?.trim() ?? "";

    if (password && password.length < PASSWORD_MIN_LENGTH) {
      errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
    }

    if (password && values.confirmPassword !== values.password) {
      errors.confirmPassword = "Passwords do not match";
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
