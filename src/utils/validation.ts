
export const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export const EMAIL_INVALID_MESSAGE = "Please enter a valid email address.";

export const PASSWORD_MIN_LENGTH = 8;

export const isValidPassword = (value: string) => /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(value);

export const PASSWORD_REQUIREMENT_MESSAGE =
  "Password must be at least 8 characters and contain letters and numbers.";

// Change Password on the API (users.validator changePasswordSchema) also
// requires an uppercase letter; checking it here gives a clear message instead
// of the server's generic "Validation failed".
export const isValidChangedPassword = (value: string) => /^(?=.*[A-Z])(?=.*d).{8,}$/.test(value);

export const CHANGED_PASSWORD_REQUIREMENT_MESSAGE =
  "Password must be at least 8 characters and contain an uppercase letter and a number.";

export const CONFIRM_PASSWORD_MISMATCH_MESSAGE = "Confirm Password must match New Password.";
export const CONFIRM_PASSWORD_MISMATCH_MESSAGE_GENERIC = "Confirm Password must match Password.";

export const PHONE_DIGIT_COUNT = 10;

// Native maxLength for phone fields. It is longer than PHONE_DIGIT_COUNT so a
// pasted "98235 68647" or "+91 98235-68647" reaches onChangeText intact instead
// of being cut mid-number; the digits are normalized to PHONE_DIGIT_COUNT there.
export const PHONE_INPUT_MAX_LENGTH = 20;

const DEFAULT_PHONE_DIAL_CODE = "+91";

// Strips spaces/dashes/brackets and a leading country code or trunk "0"
// (+91, 0091, 091, 0) from typed or pasted text. A prefix is only removed when
// exactly PHONE_DIGIT_COUNT digits remain, so a national number that itself
// starts with "91" or "0" is never shortened.
export const sanitizePhoneDigits = (value: string, dialCode: string = DEFAULT_PHONE_DIAL_CODE) => {
  const digits = value.replace(/\D/g, "");

  if (digits.length > PHONE_DIGIT_COUNT) {
    const dialDigits = dialCode.replace(/\D/g, "");
    const prefixes = dialDigits ? [dialDigits, `0${dialDigits}`, `00${dialDigits}`, "0"] : ["0"];
    const prefix = prefixes.find(
      (candidate) => digits.startsWith(candidate) && digits.length - candidate.length === PHONE_DIGIT_COUNT,
    );

    if (prefix) {
      return digits.slice(prefix.length);
    }
  }

  return digits.slice(0, PHONE_DIGIT_COUNT);
};

export const isValidPhoneDigits = (value: string) =>
  new RegExp(`^\\d{${PHONE_DIGIT_COUNT}}$`).test(value.trim());

export const PHONE_INVALID_MESSAGE = "Phone number must contain exactly 10 digits.";

export const MOBILE_INVALID_MESSAGE = "Please enter a valid mobile number.";

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
