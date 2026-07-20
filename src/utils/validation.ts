// Shared validation rules for concepts that repeat across many independent
// screens (email, password, plain-text phone fields). Centralizing these
// means a policy change only needs to happen once, and the same input is
// always judged the same way regardless of which screen collected it.

export const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export const EMAIL_INVALID_MESSAGE = "Please enter a valid email address.";

export const PASSWORD_MIN_LENGTH = 8;

// At least one letter, at least one digit, minimum length — matches the
// policy already enforced by the backend at registration.
export const isValidPassword = (value: string) => /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(value);

export const PASSWORD_REQUIREMENT_MESSAGE =
  "Password must be at least 8 characters and contain letters and numbers.";

// Two canonical variants, matched to whichever label the confirming field
// actually has on a given screen — "New Password" when changing/resetting an
// existing password, plain "Password" when setting one for the first time
// (registration, invite acceptance). Screens should pick the one matching
// their own field label rather than inventing a third wording.
export const CONFIRM_PASSWORD_MISMATCH_MESSAGE = "Confirm Password must match New Password.";
export const CONFIRM_PASSWORD_MISMATCH_MESSAGE_GENERIC = "Confirm Password must match Password.";

// For screens that collect a phone number via a plain text field rather than
// the full libphonenumber-js-backed PhoneInput (used at registration): a
// looser but still real format check — optional leading "+", 7-15 digits
// (E.164's own max length), ignoring spaces/dashes the user may have typed.
// This intentionally doesn't validate per-country rules; it only rejects
// obviously-not-a-phone-number input (letters, too short/long strings).
export const isValidPhoneDigits = (value: string) => {
  const compact = value.trim().replace(/[\s-]/g, "");

  return /^\+?\d{7,15}$/.test(compact);
};

export const PHONE_INVALID_MESSAGE = "Please enter a valid phone number.";

// Requires at least two letters (so single-initial or all-punctuation input
// like "A" or "--" is rejected) and only allows characters real names use —
// letters, spaces, hyphens, apostrophes, periods (for "Jr.", "St. John").
export const isValidPersonName = (value: string) => {
  const trimmed = value.trim();

  return trimmed.length >= 2 && /^[\p{L}][\p{L}\s'.-]*$/u.test(trimmed) && /\p{L}.*\p{L}/u.test(trimmed);
};

export const PERSON_NAME_INVALID_MESSAGE = "Please enter a valid name (letters only, at least 2 characters).";

// Real-calendar-date check (rejects "2024-02-30", "2024-13-01", etc.) on top
// of the plain YYYY-MM-DD shape — `new Date(y, m, d)` silently rolls invalid
// day/month values over into the next month, so the shape check alone isn't
// enough to catch a nonsense date.
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
