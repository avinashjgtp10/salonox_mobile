
export const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export const EMAIL_INVALID_MESSAGE = "Please enter a valid email address.";

export const PASSWORD_MIN_LENGTH = 8;

export const isValidPassword = (value: string) => /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(value);

export const PASSWORD_REQUIREMENT_MESSAGE =
  "Password must be at least 8 characters and contain letters and numbers.";

export const CONFIRM_PASSWORD_MISMATCH_MESSAGE = "Confirm Password must match New Password.";
export const CONFIRM_PASSWORD_MISMATCH_MESSAGE_GENERIC = "Confirm Password must match Password.";

export const PHONE_DIGIT_COUNT = 10;

export const sanitizePhoneDigits = (value: string) =>
  value.replace(/\D/g, "").slice(0, PHONE_DIGIT_COUNT);

export const isValidPhoneDigits = (value: string) =>
  new RegExp(`^\\d{${PHONE_DIGIT_COUNT}}$`).test(value.trim());

export const PHONE_INVALID_MESSAGE = "Phone number must contain exactly 10 digits.";

export const isValidPersonName = (value: string) => {
  const trimmed = value.trim();

  return trimmed.length >= 2 && /^[\p{L}][\p{L}\s'.-]*$/u.test(trimmed) && /\p{L}.*\p{L}/u.test(trimmed);
};

export const PERSON_NAME_INVALID_MESSAGE = "Please enter a valid name (letters only, at least 2 characters).";

export const isValidIsoDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

export const DATE_INVALID_MESSAGE = "Enter a valid date in YYYY-MM-DD format.";
