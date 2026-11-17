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
  MOBILE_INVALID_MESSAGE,
  PASSWORD_MIN_LENGTH,
  PHONE_DIGIT_COUNT,
  PHONE_INVALID_MESSAGE,
} from "@/utils/validation";

const isPresent = (value: unknown) =>
  typeof value === "string" ? value.trim().length > 0 : value !== undefined && value !== null;

// Length is checked first so a short/long number gets the digit-count message;
// a 10-digit number the country's numbering plan rejects gets the generic one.
const getStaffPhoneError = (value: string) => {
  try {
    if (parsePhoneNumber(value).nationalNumber.length !== PHONE_DIGIT_COUNT) {
      return PHONE_INVALID_MESSAGE;
    }
  } catch {
    return PHONE_INVALID_MESSAGE;
  }

  return isValidPhoneNumber(value) ? undefined : MOBILE_INVALID_MESSAGE;
};

const result = (errors: Record<string, string>): ValidationResult => ({
  errors,
  isValid: Object.keys(errors).length === 0,
});

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
    if (values.isLoginEnabled) {
      errors.email = "Email is required to enable Staff Login.";
    }
  } else if (!isValidEmail(values.email!)) {
    errors.email = EMAIL_INVALID_MESSAGE;
  }

  if (!isPresent(values.phone)) {
    errors.phone = "Contact number is required.";
  } else {
    const phoneError = getStaffPhoneError(values.phone!);
    if (phoneError) {
      errors.phone = phoneError;
    }
  }

  if (isPresent(values.gender) && !(STAFF_GENDER_OPTIONS as readonly string[]).includes(values.gender!)) {
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

  for (const [field, label] of [["startTime", "Start Time"], ["endTime", "End Time"]] as const) {
    if (!isPresent(values[field])) {
      errors[field] = `${label} is required.`;
    } else if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(values[field]!)) {
      errors[field] = `Select a valid ${label.toLowerCase()}.`;
    }
  }
  if (!errors.startTime && !errors.endTime && values.endTime! <= values.startTime!) {
    errors.endTime = "End Time must be later than Start Time.";
  }

  if (isPresent(values.fixedSalary) && !(Number(values.fixedSalary) > 0)) {
    errors.fixedSalary = "Fixed salary must be greater than 0.";
  }

  if (isPresent(values.workingHoursPerDay)) {
    const workingHours = Number(values.workingHoursPerDay);

    if (!Number.isFinite(workingHours) || workingHours < 0 || workingHours > 24) {
      errors.workingHoursPerDay = "Must be between 0 and 24.";
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

  if (!isPresent(values.address_name)) {
    errors.address_name = "Address name is required.";
  }

  if (!isPresent(values.address)) {
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
  } else if (!["spouse", "parent", "sibling", "child", "friend", "colleague", "other"].includes(values.relationship!.trim().toLowerCase())) {
    errors.relationship = "Choose spouse, parent, sibling, child, friend, colleague or other.";
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
